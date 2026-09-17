import type {
  SecureTimeResult,
  TimeConfidence,
  SyncResult,
  TimeConfidenceLevel,
  TimeConfidenceContext,
} from "./types";

// ── Estado de sincronización ──────────────────────────────────────────────────
// Almacena el ancla de tiempo: el momento en que se sincronizó y cuál era el
// timestamp del servidor. A partir de ahí se calcula el tiempo actual usando
// elapsedRealtime (monótono, inmune a cambios de reloj de pared).

let anchorServerMs: number | null = null;  // Timestamp del servidor en el momento del sync
let anchorLocalMs: number | null = null;    // Date.now() local en el momento del sync
let anchorElapsedMs: number | null = null;  // performance.now() en el momento del sync (monótono)
let lastDriftMs: number = 0;
let everNetworkVerified: boolean = false;

// ── sync() ───────────────────────────────────────────────────────────────────
// Obtiene la hora del servidor vía HTTP Date header. Establece el ancla.
// Solo toca la red cuando se llama explícitamente.

export async function sync(): Promise<SyncResult> {
  const serverTimeMs = await fetchServerTime();

  const now = Date.now();
  const elapsed = getElapsed();

  anchorServerMs = serverTimeMs;
  anchorLocalMs = now;
  anchorElapsedMs = elapsed;
  lastDriftMs = now - serverTimeMs;
  everNetworkVerified = true;

  const result: SyncResult = {
    timestampMs: serverTimeMs,
    driftMs: lastDriftMs,
  };

  const fecha = new Date(serverTimeMs).toISOString();
  console.log("🕐 SYNC -> Ancla establecida:", {
    timestampMs: serverTimeMs,
    driftMs: lastDriftMs,
    fechaSincronizada: fecha,
    fechaLocal: new Date(now).toISOString(),
  });

  return result;
}

// ── getTimestamp() ────────────────────────────────────────────────────────────
// Retorna el timestamp basado en el ancla. Si no hay ancla, retorna Date.now()
// con confianza baja. Nunca toca la red.

export async function getTimestamp(): Promise<SecureTimeResult> {
  if (anchorServerMs === null || anchorElapsedMs === null) {
    console.log("🕐 getTimestamp -> Sin ancla, usando reloj local (UNTRUSTED)");
    return {
      timestampMs: Date.now(),
      confidence: buildConfidence("UNTRUSTED_MANUAL", 1, "Sin sincronización de red aún."),
    };
  }

  const elapsed = getElapsed();
  const elapsedSinceSync = elapsed - anchorElapsedMs;
  const monotonicTs = anchorServerMs + elapsedSinceSync;

  console.log("🕐 getTimestamp ->", {
    timestampMs: monotonicTs,
    fecha: new Date(monotonicTs).toISOString(),
    level: "MONOTONIC",
    elapsedSinceSyncMs: Math.round(elapsedSinceSync),
    driftMs: lastDriftMs,
  });

  return {
    timestampMs: monotonicTs,
    confidence: buildConfidence("MONOTONIC", 4, "Basado en ancla de red + elapsedRealtime.", {
      syncedAtEpochMs: anchorServerMs,
      elapsedSinceSyncMs: elapsedSinceSync,
      lastDriftMs,
      autoTimeEnabled: true,
      rebootedSinceLastSync: false,
      everNetworkVerified: true,
    }),
  };
}

// ── getConfidence() ──────────────────────────────────────────────────────────

export async function getConfidence(): Promise<TimeConfidence> {
  const result = await getTimestamp();
  return result.confidence;
}

// ── meetsMinimumConfidence() ─────────────────────────────────────────────────

export async function meetsMinimumConfidence(
  minLevel: TimeConfidenceLevel
): Promise<boolean> {
  const result = await getTimestamp();
  return result.confidence.rank >= RANKS[minLevel];
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function getElapsed(): number {
  // performance.now() es monótono (no se ve afectado por cambios de Settings)
  // En React Native está disponible globalmente
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  // Fallback: usar Date.now() (no monótono, pero mejor que nada)
  return Date.now();
}

async function fetchServerTime(): Promise<number> {
  // Intento 1: HEAD a google.com → header Date
  try {
    const t0 = Date.now();
    const res = await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      cache: "no-store",
    });
    const t1 = Date.now();
    const dateHeader = res.headers.get("date");
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      const roundTrip = t1 - t0;
      // Ajustar por mitad del round trip
      const adjusted = serverMs + Math.round(roundTrip / 2);
      console.log("🕐 fetchServerTime -> google.com OK:", {
        dateHeader,
        roundTrip,
        adjusted: new Date(adjusted).toISOString(),
      });
      return adjusted;
    }
  } catch (e) {
    console.warn("🕐 fetchServerTime -> google.com falló:", e);
  }

  // Intento 2: HEAD a worldtimeapi.org
  try {
    const t0 = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/timezone/America/Guayaquil", {
      cache: "no-store",
    });
    const t1 = Date.now();
    if (res.ok) {
      const data = await res.json();
      if (data.unixtime) {
        const serverMs = data.unixtime * 1000;
        const roundTrip = t1 - t0;
        const adjusted = serverMs + Math.round(roundTrip / 2);
        console.log("🕐 fetchServerTime -> worldtimeapi OK:", {
          adjusted: new Date(adjusted).toISOString(),
        });
        return adjusted;
      }
    }
  } catch (e) {
    console.warn("🕐 fetchServerTime -> worldtimeapi falló:", e);
  }

  // Fallback: usar Date.now() local
  console.warn("🕐 fetchServerTime -> Todos los servidores fallaron, usando Date.now()");
  return Date.now();
}

// ── Construcción de confianza ────────────────────────────────────────────────

const RANKS: Record<TimeConfidenceLevel, number> = {
  UNKNOWN: 0,
  UNTRUSTED_MANUAL: 1,
  SOFT_LOW: 2,
  SOFT_HIGH: 3,
  MONOTONIC: 4,
};

function buildConfidence(
  level: TimeConfidenceLevel,
  rank: number,
  reason: string,
  ctx?: Partial<TimeConfidenceContext>
): TimeConfidence {
  return {
    level,
    rank,
    reason,
    context: {
      syncedAtEpochMs: ctx?.syncedAtEpochMs ?? 0,
      elapsedSinceSyncMs: ctx?.elapsedSinceSyncMs ?? 0,
      lastDriftMs: ctx?.lastDriftMs ?? lastDriftMs,
      autoTimeEnabled: ctx?.autoTimeEnabled ?? true,
      rebootedSinceLastSync: ctx?.rebootedSinceLastSync ?? false,
      everNetworkVerified: ctx?.everNetworkVerified ?? everNetworkVerified,
    },
  };
}

export type {
  SecureTimeResult,
  TimeConfidence,
  SyncResult,
  TimeConfidenceLevel,
} from "./types";
