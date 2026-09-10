/**
 * @module Playero/Backend/DB/Modules/Vehiculo
 * @category Database Modules
 */
// Módulo de base de datos local para la entidad Vehículo.
//
// REGLAS DE NEGOCIO:
//   - Los vehículos pueden crearse localmente (offline) y sincronizarse después.
//   - El campo `sync` indica el estado: 0 = pendiente de sync, 1 = sincronizado.
//   - saveVehiculos() hace upsert masivo de datos bajados del servidor (sync=1).
//   - saveVehiculoLocal() guarda un vehículo creado offline (sync=0).
//   - getVehiculosPendientesSync() devuelve los vehículos aún no enviados al servidor.
//   - markVehiculoAsSynced() marca un vehículo como sincronizado tras un POST exitoso.
//   - getVehiculosByRuc() filtra por el RUC del cliente propietario.

import { db } from "@/backend/db/client";
import { vehiculos, syncs } from "@/backend/db/schema";
import { eq, like, or } from "drizzle-orm";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { AppError } from "@/utils/AppError";
import { syncGetVehiculos, syncPostVehiculos } from "@/backend/api/vehiculoAPI";
import { syncsController } from "./syncsDB";


// Clave en tabla syncs para registrar la última sincronización de vehículos.
const SYNC_KEY = "__last_sync_vehiculos__";

// ---------------------------------------------------------------------------
// saveVehiculos
// Upsert masivo de vehículos recibidos del servidor.
// Todos se marcan como sync=1 (ya están en el servidor).
// ---------------------------------------------------------------------------

export async function saveVehiculos(items: VehiculoDTO[]): Promise<{ saved: number; deleted: number }> {
  if (items.length === 0) return { saved: 0, deleted: 0 };

  let saved = 0;
  let deleted = 0;

  for (const item of items) {
    if (item.is_deleted) {
      const existia = await db
        .select({ id: vehiculos.idVehiculo })
        .from(vehiculos)
        .where(eq(vehiculos.idVehiculo, item.id_vehiculo))
        .get();
      if (existia) {
        await eliminarVehiculoLocal(item.id_vehiculo);
        deleted++;
      }
      continue;
    }

    await db
      .insert(vehiculos)
      .values({
        idVehiculo: item.id_vehiculo,
        descripcionVehiculo: item.descripcion_vehiculo,
        ruc: item.ruc,
        timestamp: Date.now(),
        sync: 1,
      })
      .onConflictDoUpdate({
        target: vehiculos.idVehiculo,
        set: {
          descripcionVehiculo: item.descripcion_vehiculo,
          ruc: item.ruc,
          timestamp: Date.now(),
          sync: 1,
        },
      });
    saved++;
  }

  // Registrar timestamp de sincronización
  await db
    .insert(syncs)
    .values({ tipo: SYNC_KEY, fecha: Date.now() })
    .onConflictDoUpdate({
      target: syncs.tipo,
      set: { fecha: Date.now() },
    });

  return { saved, deleted };
}

// ---------------------------------------------------------------------------
// saveVehiculoLocal
// Guarda un vehículo creado offline. Se marca como sync=0 (pendiente).
// Lanza error si el id_vehiculo ya existe.
// ---------------------------------------------------------------------------

export async function saveVehiculoLocal(data: VehiculoDTO): Promise<void> {
  try {
    await db.insert(vehiculos).values({
      idVehiculo: data.id_vehiculo,
      descripcionVehiculo: data.descripcion_vehiculo,
      ruc: data.ruc,
      timestamp: Date.now(),
      sync: 0,
    });
  } catch (error: any) {
    if (
      error.message?.includes("UNIQUE") ||
      error.code === "SQLITE_CONSTRAINT"
    ) {
      throw new AppError("Ya existe un vehiculo con este registro", 409);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// getVehiculos
// Devuelve todos los vehículos del catálogo local.
// ---------------------------------------------------------------------------

export async function getVehiculos(): Promise<VehiculoDTO[]> {
  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos);

  return rows.map((r) => ({
    id_vehiculo: r.idVehiculo,
    descripcion_vehiculo: r.descripcionVehiculo,
    ruc: r.ruc,
  }));
}

export interface PaginatedVehiculos {
  vehiculos: VehiculoDTO[];
}

export async function getVehiculosPaginado(
  filter: string,
  page: number,
  limit: number,
): Promise<PaginatedVehiculos> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos)
    .where(
      filter
        ? or(
            like(vehiculos.descripcionVehiculo, `%${filter}%`),
            // ✅ CORREGIDO: filtrar por idVehiculo (PK), no por ruc
            like(vehiculos.idVehiculo, `%${filter}%`),
          )
        : undefined,
    )
    .limit(limit)
    .offset(offset);

  const result: VehiculoDTO[] = rows.map((r) => ({
    id_vehiculo: r.idVehiculo,
    descripcion_vehiculo: r.descripcionVehiculo,
    ruc: r.ruc,
  }));

  return { vehiculos: result };
}

// ---------------------------------------------------------------------------
// getVehiculoById
// Devuelve un vehículo por su id. Devuelve null si no existe.
// ---------------------------------------------------------------------------

export async function getVehiculoById(
  idVehiculo: string,
): Promise<VehiculoDTO | null> {
  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos)
    .where(eq(vehiculos.idVehiculo, idVehiculo))
    .limit(1);

  if (!rows[0]) return null;

  return {
    id_vehiculo: rows[0].idVehiculo,
    descripcion_vehiculo: rows[0].descripcionVehiculo,
    ruc: rows[0].ruc,
  };
}

// ---------------------------------------------------------------------------
// getVehiculosByRuc
// Devuelve los vehículos que pertenecen a un cliente (filtro por RUC).
// Usado en pantallas que seleccionan vehículos del cliente activo.
// ---------------------------------------------------------------------------

export async function getVehiculosByRuc(ruc: string): Promise<VehiculoDTO[]> {
  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos)
    .where(eq(vehiculos.ruc, ruc));

  return rows.map((r) => ({
    id_vehiculo: r.idVehiculo,
    descripcion_vehiculo: r.descripcionVehiculo,
    ruc: r.ruc,
  }));
}

// ---------------------------------------------------------------------------
// buscarVehiculosLocal
// Búsqueda local por id o descripción (parcial, case-insensitive).
// Útil para resultados offline en BuscarVehiculo.tsx.
// ---------------------------------------------------------------------------

export async function buscarVehiculosLocal(
  query: string,
): Promise<VehiculoDTO[]> {
  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos);

  const q = query.toLowerCase();
  return rows
    .filter(
      (r) =>
        r.idVehiculo.toLowerCase().includes(q) ||
        r.descripcionVehiculo.toLowerCase().includes(q),
    )
    .map((r) => ({
      id_vehiculo: r.idVehiculo,
      descripcion_vehiculo: r.descripcionVehiculo,
      ruc: r.ruc,
    }));
}

// ---------------------------------------------------------------------------
// getVehiculosPendientesSync
// Devuelve los vehículos creados offline que aún no fueron enviados al servidor.
// ---------------------------------------------------------------------------

export async function getVehiculosPendientesSync(): Promise<VehiculoDTO[]> {
  const rows = await db
    .select({
      idVehiculo: vehiculos.idVehiculo,
      descripcionVehiculo: vehiculos.descripcionVehiculo,
      ruc: vehiculos.ruc,
    })
    .from(vehiculos)
    .where(eq(vehiculos.sync, 0));
  if (rows.length > 0) {
    console.log(`⚪ VEHÍCULOS -> Pendientes de sync: ${rows.length}`);
  }
  return rows.map((r) => ({
    id_vehiculo: r.idVehiculo,
    descripcion_vehiculo: r.descripcionVehiculo,
    ruc: r.ruc,
  }));
}

// ---------------------------------------------------------------------------
// markVehiculoAsSynced
// Marca un vehículo como sincronizado (sync=1) tras un POST exitoso al servidor.
// ---------------------------------------------------------------------------

export async function markVehiculoAsSynced(idVehiculo: string): Promise<void> {
  await db
    .update(vehiculos)
    .set({ sync: 1 })
    .where(eq(vehiculos.idVehiculo, idVehiculo));
}

// ---------------------------------------------------------------------------
// actualizarVehiculoLocal
// Actualiza los datos de un vehículo existente en la BD local.
// Pone sync=0 si el cambio fue hecho offline (para re-sincronizar).
// ---------------------------------------------------------------------------

export async function actualizarVehiculoLocal(
  idVehiculo: string,
  data: Partial<VehiculoDTO>,
  synced = false,
): Promise<void> {
  await db
    .update(vehiculos)
    .set({
      ...(data.descripcion_vehiculo !== undefined && {
        descripcionVehiculo: data.descripcion_vehiculo,
      }),
      ...(data.ruc !== undefined && { ruc: data.ruc }),
      timestamp: Date.now(),
      sync: synced ? 1 : 0,
    })
    .where(eq(vehiculos.idVehiculo, idVehiculo));
}

// ---------------------------------------------------------------------------
// eliminarVehiculoLocal
// Elimina un vehículo de la BD local.
// ---------------------------------------------------------------------------

export async function eliminarVehiculoLocal(idVehiculo: string): Promise<void> {
  await db.delete(vehiculos).where(eq(vehiculos.idVehiculo, idVehiculo));
}

/**
 * Devuelve el timestamp de la última sincronización de vahículos utilizando el controlador.
 *
 * @returns Timestamp Unix en ms, o `null` si nunca se sincronizó.
 * @description Lee directamente de la caché en memoria de forma ultra rápida.
 */
export async function getLastSyncDate(): Promise<number | null> {
  try {
    // Obtenemos el timestamp directamente desde la caché en memoria del controlador
    return await syncsController.getTimestamp(SYNC_KEY);
  } catch (error) {
    console.error("❌ Error en getLastSyncDate:", error);
    return null;
  }
}

// ====================== SINCRONIZACIÓN ======================

/**
 * Descarga vehículos nuevos/modificados desde el servidor central.
 *
 * @param lastTimestamp - Solo se traen registros posteriores a este timestamp.
 * @returns Objeto con { saved: cantidad guardados, deleted: cantidad eliminados realmente }.
 * @throws Error si la petición HTTP falla.
 */
export async function syncVehiculosFromCentral(): Promise<{ saved: number; deleted: number }> {
  try {
    const items = await syncGetVehiculos(await syncsController.getTimestamp(SYNC_KEY));
    let result = { saved: 0, deleted: 0 };
    if (items.length > 0) {
      result = await saveVehiculos(items);
    }
    await syncsController.saveOrUpdate(SYNC_KEY, Date.now());
    if (result.saved > 0) console.log(`✅ VEHÍCULOS -> guardados (+${result.saved})`);
    if (result.deleted > 0) console.log(`🗑️ VEHÍCULOS -> eliminados (-${result.deleted})`);
    return result;
  } catch (error) {
    console.error("❌ VEHÍCULOS -> Error:", error.message || error);
    throw error;
  }
}

/**
 * Envía al servidor central los vehículos creados offline pendientes de sync.
 *
 * @returns Número de vehículos enviados.
 * @throws Error si la petición HTTP falla.
 */
export async function syncVehiculosToCentral(): Promise<number> {
  const pendientes = await getVehiculosPendientesSync();
  if (pendientes.length === 0) {
    //console.log("⚪ VEHÍCULOS -> Nada pendiente para subir");
    return 0;
  }

  try {
    await syncPostVehiculos(pendientes);

    for (const v of pendientes) {
      await markVehiculoAsSynced(v.id_vehiculo);
    }

    console.log(`➡️ VEHÍCULOS -> subidos ok (-${pendientes.length})`);
    return pendientes.length;
  } catch (error) {
    console.error("❌ VEHÍCULOS -> Error al subir:", error.message || error);
    throw error;
  }
}