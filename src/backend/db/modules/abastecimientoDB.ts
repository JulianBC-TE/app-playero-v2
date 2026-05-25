/**
 * Módulo de acceso a datos para abastecimientos (reposiciones de combustible).
 *
 * Los abastecimientos se crean offline con `sync = 0` y son enviados
 * al servidor por el proceso de sincronización.
 *
 * @module Playero/Backend/DB/Modules/Abastecimiento
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { abastecimientos, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { AbastecimientoDTO } from "@/dto/AbastecimientoDTO";

const SYNC_KEY = "__last_sync_abastecimientos__";


/**
 * Inserta un nuevo abastecimiento pendiente de sincronización.
 *
 * @param input - Datos del abastecimiento a guardar.
 * @returns ID generado por SQLite (`lastInsertRowId`).
 */
export async function saveAbastecimientoLocal(dto: AbastecimientoDTO): Promise<number> {
  const result = await db.insert(abastecimientos).values({
    json: JSON.stringify(dto),
    tipo: "ABASTECIMIENTO",
    sync: 0,
    fecha: Date.now(),
    hora: Date.now(),
  });
  return (result as any).lastInsertRowId ?? 0;
}

/**
 * Devuelve todos los abastecimientos que aún no han sido sincronizados (`sync = 0`),
 * ordenados por fecha descendente.
 *
 * @returns Lista de registros con el campo `json` ya parseado a `AbastecimientoInput`.
 */
export async function getAbastecimientosPendientes() {
  const rows = await db.select().from(abastecimientos).where(eq(abastecimientos.sync, 0)).orderBy(desc(abastecimientos.fecha));
  return rows.map((r) => ({
    ...r,
    dto: JSON.parse(r.json) as AbastecimientoDTO,
  }));
}

/**
 * Marca un abastecimiento como sincronizado con el servidor (`sync = 1`).
 *
 * @param id - ID del abastecimiento en la tabla local.
 */
export async function marcarAbastecimientoSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: 1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}

/**
 * Marca un abastecimiento con error de sincronización (`sync = -1`).
 * Permite reintentar en el próximo ciclo de sync.
 *
 * @param id - ID del abastecimiento en la tabla local.
 */
export async function marcarAbastecimientoErrorSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: -1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}
/**
 * Devuelve el timestamp de la última sincronización exitosa de abastecimientos.
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
