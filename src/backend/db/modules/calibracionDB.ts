/**
 * Módulo de acceso a datos para calibraciones y verificaciones de picos.
 *
 * @remarks
 * - Las calibraciones se crean offline con `sync = 0`.
 * - `tipo` puede ser `"VERIFICACION"` o `"CALIBRACION"`.
 *
 * @module Playero/Backend/DB/Modules/Calibracion
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { calibraciones, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { CalibracionDTO } from "@/dto/CalibracionDTO";


const SYNC_KEY = "__last_sync_calibraciones__";

/**
 * Inserta un registro de calibración pendiente de sincronización.
 *
 * @param input - Datos de la calibración.
 * @returns ID generado por SQLite.
 */
export async function saveCalibracionLocal(dto: CalibracionDTO): Promise<number> {
  const result = await db.insert(calibraciones).values({
    json: JSON.stringify(dto),
    tipo: dto.tipo_operacion,
    sync: 0,
    fecha: Date.now(),
    hora: Date.now(),
  });
  return (result as any).lastInsertRowId ?? 0;
}

/**
 * Devuelve las calibraciones pendientes de sincronización (`sync = 0`),
 * ordenadas por fecha descendente.
 *
 * @returns Lista con `json` parseado a {@link CalibracionInput}.
 */
export async function getCalibracionesPendientes() {
  const rows = await db.select().from(calibraciones).where(eq(calibraciones.sync, 0)).orderBy(desc(calibraciones.fecha));
  return rows.map((r) => ({
    ...r,
    dto: JSON.parse(r.json) as CalibracionDTO,
  }));
}

/**
 * Marca una calibración como sincronizada (`sync = 1`).
 *
 * @param idCalibracion - ID del registro en la tabla local.
 */
export async function marcarCalibracionSync(
  idCalibracion: number,
): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: 1 })
    .where(eq(calibraciones.idCalibracion, idCalibracion));
}

/**
 * Marca una calibración con error de sincronización (`sync = -1`).
 *
 * @param idCalibracion - ID del registro en la tabla local.
 */
export async function marcarCalibracionErrorSync(
  idCalibracion: number,
): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: -1 })
    .where(eq(calibraciones.idCalibracion, idCalibracion));
}

/**
 * Devuelve el timestamp de la última sincronización de calibraciones.
 *
 * @returns Timestamp Unix en ms, o `null` si nunca se sincronizó.
 */
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
