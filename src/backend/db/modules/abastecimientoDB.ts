// srcDBmodules/abastecimientoDB.ts
//
// Módulo de base de datos para abastecimientos.
// Reemplaza las llamadas a:
//   - api.get(`api/registros/turno/status/...`)  → usar getTurnoStatusLocal()
//   - api.get(`/api/bodegas/...`)                → usar getBodegasByIdSucursal()
//   - api.post("/api/Abastecimientos-V2")        → saveAbastecimientoLocal()
//
// REGLAS DE NEGOCIO:
//   - Los abastecimientos se crean localmente con sync=0.
//   - Un proceso de sincronización posterior los envía al servidor.

import { db } from "@/backend/db/client";
import { abastecimientos, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

const SYNC_KEY = "__last_sync_abastecimientos__";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MedicionTanqueInput = {
  id_tanque: number;
  inicio: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string;
  };
  fin: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string;
  };
};

export type AbastecimientoInput = {
  id_suc: number;
  id_bod: number;
  fecha: string;
  hora: string;
  nro_oc: number;
  nro_remision: string;
  litros_remision: number;
  playero: number;
  foto_rev_docs: string[];
  zeta_no_llega: number;
  id_pico_para_zeta: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  litros_zeta: number;
  obs_repos: string;
  foto_obs_repos: string[];
  litros_total_repos: string;
  mediciones_tanque: MedicionTanqueInput[];
};

// ---------------------------------------------------------------------------
// saveAbastecimientoLocal
// Inserta un abastecimiento pendiente de sincronización.
// Devuelve el ID generado por SQLite.
// ---------------------------------------------------------------------------

export async function saveAbastecimientoLocal(
  input: AbastecimientoInput,
): Promise<number> {
  const result = await db.insert(abastecimientos).values({
    json: JSON.stringify(input),
    tipo: "ABASTECIMIENTO",
    sync: 0,
    fecha: Date.now(),
    hora: Date.now(),
  });

  return (result as any).lastInsertRowId ?? 0;
}

// ---------------------------------------------------------------------------
// getAbastecimientosPendientes
// Devuelve los registros aún no sincronizados (sync = 0).
// ---------------------------------------------------------------------------

export async function getAbastecimientosPendientes() {
  const rows = await db
    .select()
    .from(abastecimientos)
    .where(eq(abastecimientos.sync, 0))
    .orderBy(desc(abastecimientos.fecha));

  return rows.map((r) => ({
    ...r,
    json: JSON.parse(r.json) as AbastecimientoInput,
  }));
}

// ---------------------------------------------------------------------------
// marcarAbastecimientoSync
// ---------------------------------------------------------------------------

export async function marcarAbastecimientoSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: 1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}

// ---------------------------------------------------------------------------
// marcarAbastecimientoErrorSync
// ---------------------------------------------------------------------------

export async function marcarAbastecimientoErrorSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: -1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}

// ---------------------------------------------------------------------------
// getLastSyncDate
// ---------------------------------------------------------------------------

export async function getLastSyncDate(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, SYNC_KEY))
      .limit(1);

    return result[0] ? result[0].fecha : null;
  } catch {
    return null;
  }
}
