/**
 * @module Backend/DB/Modules/Vehiculo
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
//   - markAsSynced() marca un vehículo como sincronizado tras un POST exitoso.
//   - getVehiculosByRuc() filtra por el RUC del cliente propietario.

import { db } from "@/backend/db/client";
import { vehiculos, syncs } from "@/backend/db/schema";
import { eq, like, or } from "drizzle-orm";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { AppError } from "@/utils/AppError";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de vehículos.
const SYNC_KEY = "__last_sync_vehiculos__";

// ---------------------------------------------------------------------------
// saveVehiculos
// Upsert masivo de vehículos recibidos del servidor.
// Todos se marcan como sync=1 (ya están en el servidor).
// ---------------------------------------------------------------------------

export async function saveVehiculos(items: VehiculoDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
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
      sync: 0, // Marcamos que aún no está sincronizado con el servidor
    });
  } catch (error: any) {
    // Verificamos si es un error de restricción de unicidad (SQLITE_CONSTRAINT_PRIMARYKEY)
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

// Definimos una interfaz para la respuesta que coincida con lo que espera response.data
interface PaginatedVehiculos {
  vehiculos: VehiculoDTO[];
}

export async function getVehiculosPaginado(
  filter: string,
  page: number,
  limit: number,
): Promise<PaginatedVehiculos> {
  // Calculamos el offset (salto de registros) para la paginación
  const offset = (page - 1) * limit;

  // Realizamos la consulta con filtros y paginación
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
            like(vehiculos.ruc, `%${filter}%`),
          )
        : undefined,
    )
    .limit(limit)
    .offset(offset);

  // Mapeamos al formato DTO que espera el frontend [cite: 17]
  const result: VehiculoDTO[] = rows.map((r) => ({
    id_vehiculo: r.idVehiculo,
    descripcion_vehiculo: r.descripcionVehiculo,
    ruc: r.ruc,
  }));

  // Retornamos el objeto con la propiedad 'vehiculos' para que response.data.vehiculos funcione
  return {
    vehiculos: result,
  };
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

// ---------------------------------------------------------------------------
// getLastSyncDate
// Devuelve la fecha de la última sincronización con el servidor.
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

// ====================== SINCRONIZACIÓN ======================

export async function syncVehiculosFromCentral(lastTimestamp: number = 0) {
  try {
    const { data } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.clientesGet, {
      params: { createdAt: lastTimestamp },
    });

    const items = Array.isArray(data) ? data : [];
    
    if (items.length > 0) {
      await saveVehiculos(items);
      console.log(`✅ ${items.length} clientes sincronizados desde central`);
    }
    return items.length;
  } catch (error) {
    console.error("❌ Error syncClientesFromCentral:", error);
    throw error;
  }
}

export async function syncVehiculosToCentral() {
  const pendientes = await getVehiculosPendientesSync();
  if (pendientes.length === 0) return 0;

  try {
    await SYNC_CONFIG.http.post(SYNC_CONFIG.endpoints.clientesPost, {
      clientes: pendientes,
    });

    for (const c of pendientes) {
      await markVehiculoAsSynced(c.ruc);
    }

    console.log(`✅ ${pendientes.length} clientes enviados al central`);
    return pendientes.length;
  } catch (error) {
    console.error("❌ Error syncClientesToCentral:", error);
    throw error;
  }
}