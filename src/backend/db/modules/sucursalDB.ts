/**
 * Módulo de acceso a datos para sucursales.
 *
 * @remarks
 * - Las sucursales son un catálogo de solo lectura que se sincroniza desde el servidor.
 * - `saveSucursales()` hace upsert masivo de datos del servidor.
 * - `syncSucursalesFromCentral()` descarga las sucursales disponibles para el usuario actual,
 *   enviando su `idSucursal` al servidor.
 * - Solo hay un usuario app guardado en cada momento.
 *
 * @module Playero/Backend/DB/Modules/Sucursal
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { sucursales, syncs, usuariosApp } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { getSucursalesDestinoTraspasoPorUsuario } from "@/backend/api/sucursalAPI";

// Clave en tabla syncs para registrar la última sincronización de sucursales.
const SYNC_KEY = "__last_sync_sucursales__";

/**
 * Upsert masivo de sucursales recibidas del servidor.
 *
 * @param items - Lista de {@link SucursalDTO} a insertar o actualizar.
 */
export async function saveSucursales(items: SucursalDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(sucursales)
      .values({
        idSucursal: item.id_sucursal,
        descripcionSucursal: item.descripcion_sucursal,
      })
      .onConflictDoUpdate({
        target: sucursales.idSucursal,
        set: { descripcionSucursal: item.descripcion_sucursal },
      });
  }

  // Registrar timestamp de sincronización
  await db
    .insert(syncs)
    .values({ tipo: SYNC_KEY, fecha: Date.now() })
    .onConflictDoUpdate({
      target: syncs.tipo,
      set: { fecha: Date.now() },
    });
}

/**
 * Devuelve todas las sucursales del catálogo local.
 *
 * @returns Lista de {@link SucursalDTO}.
 */
export async function getSucursales(): Promise<SucursalDTO[]> {
  const rows = await db
    .select({
      idSucursal: sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(sucursales);

  return rows.map((r) => ({
    id_sucursal: r.idSucursal,
    descripcion_sucursal: r.descripcionSucursal,
  }));
}

/**
 * Devuelve una sucursal por su ID.
 *
 * @param idSucursal - ID de la sucursal.
 * @returns un {@link SucursalDTO} o `null` si no existe.
 */
export async function getSucursalById(
  idSucursal: number,
): Promise<SucursalDTO | null> {
  const rows = await db
    .select({
      idSucursal: sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(sucursales)
    .where(eq(sucursales.idSucursal, idSucursal))
    .limit(1);

  if (!rows[0]) return null;

  return {
    id_sucursal: rows[0].idSucursal,
    descripcion_sucursal: rows[0].descripcionSucursal,
  };
}

/**
 * Devuelve el timestamp de la última sincronización de sucursales.
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

/**
 * Obtiene el idSucursal del usuario app actualmente guardado.
 * Como solo hay un usuario app en cada momento, devuelve el primero.
 *
 * @returns `idSucursal` del usuario actual, o `null` si no hay usuario guardado.
 */
export async function getCurrentUserAppIdSucursal(): Promise<number | null> {
  try {
    const result = await db
      .select({ idSucursal: usuariosApp.idSucursal })
      .from(usuariosApp)
      .limit(1);

    return result[0] ? result[0].idSucursal : null;
  } catch (error) {
    console.error("Error obtener idSucursal del usuario actual:", error);
    return null;
  }
}

/**
 * Obtiene los datos completos del usuario app actualmente guardado.
 * Incluye la sucursal asociada.
 *
 * @returns Objeto con datos del usuario y sucursal, o `null` si no existe.
 */
export async function getSucursalUsuarioActivoLocal() {
  try {
    const resultado = await db
      .select({
        cedula: usuariosApp.cedula,
        idSucursal: sucursales.idSucursal,
        descripcionSucursal: sucursales.descripcionSucursal,
      })
      .from(usuariosApp)
      .innerJoin(
        sucursales,
        eq(usuariosApp.idSucursal, sucursales.idSucursal),
      )
      .limit(1);

    return resultado[0] || null;
  } catch (error) {
    console.error("Error getSucursalUsuarioActivoLocal:", error);
    return null;
  }
}

// ====================== SINCRONIZACIÓN ======================

/**
 * Descarga las sucursales disponibles para el usuario actual desde el servidor central.
 * Usa la V2 del endpoint: filtra por USUARIO (cedula) en vez de por sucursal.
 *
 * @returns Número de sucursales sincronizadas.
 * @throws Error si la petición HTTP falla o no hay usuario guardado.
 */
export async function syncSucursalesFromCentral(): Promise<number> {
  try {
    // Obtener cedula del usuario local
    const result = await db
      .select({ cedula: usuariosApp.cedula })
      .from(usuariosApp)
      .limit(1);

    const cedula = result[0]?.cedula;
    if (!cedula) throw new Error("No se detectó usuario app local.");

    const items = await getSucursalesDestinoTraspasoPorUsuario(cedula);
    if (items.length > 0) {
      await saveSucursales(items);
    }

    if(items.length > 0)console.log(`✅ SUCURSALES -> ok (+${items.length})`);
    return items.length;
  } catch (error) {
    console.error("❌ SUCURSALES -> Error:", error.message || error);
    throw error;
  }
}