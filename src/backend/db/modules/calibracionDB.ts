// srcDBmodules/calibracionDB.ts
//
// Módulo de base de datos para calibraciones / verificaciones.
// Reemplaza la llamada api.post("/api/calibraciones") en Calibracion.tsx.
//
// REGLAS DE NEGOCIO:
//   - Las calibraciones se crean localmente con sync=0.
//   - Un proceso de sincronización posterior las envía al servidor.
//   - tipo puede ser "VERIFICACION" o "CALIBRACION".

import { db } from "@/backend/db/client";
import { calibraciones, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

const SYNC_KEY = "__last_sync_calibraciones__";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CalibracionDetalleInput = {
  val_medicion: string;
  foto_med_balde: string;
  taxilitro_carga: string;
};

export type CalibracionInput = {
  fecha_hora: string;
  hora: string;
  bodega: number;
  obs_gral: string;
  ci_encargado: number;
  nombre_encargado: string;
  pico: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  nro_precinto_retirado: string;
  nro_precinto_colocado: string;
  foto_precinto_retirado: string;
  foto_precinto_colocado: string;
  firma_calibrador: string;
  tipo_operacion: "VERIFICACION" | "CALIBRACION";
  detalles: CalibracionDetalleInput[];
};

// ---------------------------------------------------------------------------
// saveCalibracionLocal
// Inserta un registro de calibración pendiente de sincronización.
// Devuelve el ID generado por SQLite.
// ---------------------------------------------------------------------------

export async function saveCalibracionLocal(
  input: CalibracionInput,
): Promise<number> {
  const result = await db.insert(calibraciones).values({
    json: JSON.stringify(input),
    tipo: input.tipo_operacion,
    sync: 0,
    fecha: Date.now(),
    hora: Date.now(),
  });

  // drizzle-orm expo-sqlite devuelve lastInsertRowId en result
  return (result as any).lastInsertRowId ?? 0;
}

// ---------------------------------------------------------------------------
// getCalibracionesPendientes
// Devuelve los registros aún no sincronizados (sync = 0).
// ---------------------------------------------------------------------------

export async function getCalibracionesPendientes() {
  const rows = await db
    .select()
    .from(calibraciones)
    .where(eq(calibraciones.sync, 0))
    .orderBy(desc(calibraciones.fecha));

  return rows.map((r) => ({
    ...r,
    json: JSON.parse(r.json) as CalibracionInput,
  }));
}

// ---------------------------------------------------------------------------
// marcarCalibracionSync
// Marca una calibración como sincronizada con el servidor.
// ---------------------------------------------------------------------------

export async function marcarCalibracionSync(
  idCalibracion: number,
): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: 1 })
    .where(eq(calibraciones.idCalibracion, idCalibracion));
}

// ---------------------------------------------------------------------------
// marcarCalibracionErrorSync
// Marca una calibración con error de sincronización.
// ---------------------------------------------------------------------------

export async function marcarCalibracionErrorSync(
  idCalibracion: number,
): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: -1 })
    .where(eq(calibraciones.idCalibracion, idCalibracion));
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
