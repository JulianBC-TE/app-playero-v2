/**
 * Módulo de acceso a datos para abastecimientos (reposiciones de combustible).
 *
 * Los abastecimientos se crean offline con `sync = 0` y son enviados
 * al servidor por el proceso de sincronización.
 *
 * @module Backend/DB/Modules/Abastecimiento
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { abastecimientos, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

const SYNC_KEY = "__last_sync_abastecimientos__";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * 
 * Medición de un tanque tomada al inicio y al final del abastecimiento.
 */
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

/**
 * Payload completo de un abastecimiento para persistir en BD local
 * y enviar al endpoint `/api/Abastecimientos-V2`.
 * @category inputType
 */
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

/**
 * Inserta un nuevo abastecimiento pendiente de sincronización.
 *
 * @param input - Datos del abastecimiento a guardar.
 * @returns ID generado por SQLite (`lastInsertRowId`).
 */
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

/**
 * Devuelve todos los abastecimientos que aún no han sido sincronizados (`sync = 0`),
 * ordenados por fecha descendente.
 *
 * @returns Lista de registros con el campo `json` ya parseado a `AbastecimientoInput`.
 */
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
