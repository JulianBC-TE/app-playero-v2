/**
 * Módulo de acceso a datos para clientes.
 *
 * @remarks
 * - Los clientes pueden crearse offline (`sync = 0`) y sincronizarse después.
 * - `saveClientes()` hace upsert masivo de datos del servidor (marca `sync = 1`).
 * - `saveClienteLocal()` guarda un cliente offline y lanza error si el RUC ya existe.
 *
 * @module Playero/Backend/DB/Modules/Cliente
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { clientes, syncs } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import { ClienteDTO } from "@/dto/ClienteDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de clientes.
const SYNC_KEY = "__last_sync_clientes__";

/**
 * Upsert masivo de clientes recibidos del servidor. Todos quedan con `sync = 1`.
 *
 * @param items - Lista de {@link ClienteDTO} a insertar o actualizar.
 */
export async function saveClientes(items: ClienteDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(clientes)
      .values({
        ruc: item.ruc,
        descripcionCliente: item.descripcion_cliente,
        timestamp: Date.now(),
        sync: 1,
      })
      .onConflictDoUpdate({
        target: clientes.ruc,
        set: {
          descripcionCliente: item.descripcion_cliente,
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

/**
 * Guarda un cliente creado offline con `sync = 0`.
 *
 * @param data - Datos del cliente.
 * @throws Error si el RUC ya existe en la tabla local.
 */
export async function saveClienteLocal(data: ClienteDTO): Promise<void> {
  await db.insert(clientes).values({
    ruc: data.ruc,
    descripcionCliente: data.descripcion_cliente,
    timestamp: Date.now(),
    sync: 0,
  });
}

/**
 * Devuelve todos los clientes del catálogo local.
 *
 * @returns Lista de {@link ClienteDTO}.
 */
export async function getClientes(): Promise<ClienteDTO[]> {
  const rows = await db
    .select({
      ruc: clientes.ruc,
      descripcionCliente: clientes.descripcionCliente,
    })
    .from(clientes);

  return rows.map((r) => ({
    ruc: r.ruc,
    descripcion_cliente: r.descripcionCliente,
  }));
}

/**
 * Devuelve un cliente por su RUC.
 *
 * @param ruc - RUC del cliente.
 * @returns un {@link ClienteDTO} o `null` si no existe.
 */
export async function getClienteByRuc(ruc: string): Promise<ClienteDTO | null> {
  const rows = await db
    .select({
      ruc: clientes.ruc,
      descripcionCliente: clientes.descripcionCliente,
    })
    .from(clientes)
    .where(eq(clientes.ruc, ruc))
    .limit(1);

  if (!rows[0]) return null;

  return {
    ruc: rows[0].ruc,
    descripcion_cliente: rows[0].descripcionCliente,
  };
}

/**
 * Búsqueda local por RUC o nombre (parcial, case-insensitive).
 * Útil para resultados offline en `BuscarCliente.tsx`.
 *
 * @param query - Texto a buscar.
 * @returns Lista de {@link ClienteDTO} que coinciden.
 */
export async function buscarClientesLocal(
  query: string,
): Promise<ClienteDTO[]> {
  const rows = await db
    .select({
      ruc: clientes.ruc,
      descripcionCliente: clientes.descripcionCliente,
    })
    .from(clientes);

  const q = query.toLowerCase();
  return rows
    .filter(
      (r) =>
        r.ruc.toLowerCase().includes(q) ||
        r.descripcionCliente.toLowerCase().includes(q),
    )
    .map((r) => ({
      ruc: r.ruc,
      descripcion_cliente: r.descripcionCliente,
    }));
}

/**
 * Devuelve los clientes creados offline que aún no fueron enviados al servidor.
 *
 * @returns Lista de {@link ClienteDTO} con `sync = 0`.
 */
export async function getClientesPendientesSync(): Promise<ClienteDTO[]> {
  const rows = await db
    .select({
      ruc: clientes.ruc,
      descripcionCliente: clientes.descripcionCliente,
    })
    .from(clientes)
    .where(eq(clientes.sync, 0));

  return rows.map((r) => ({
    ruc: r.ruc,
    descripcion_cliente: r.descripcionCliente,
  }));
}

/**
 * Marca un cliente como sincronizado (`sync = 1`) tras un POST exitoso al servidor.
 *
 * @param ruc - RUC del cliente.
 */
export async function markClienteAsSynced(ruc: string): Promise<void> {
  await db.update(clientes).set({ sync: 1 }).where(eq(clientes.ruc, ruc));
}

/**
 * Actualiza los datos de un cliente en la BD local.
 * Pone `sync = 0` si el cambio fue hecho offline para re-sincronizar posteriormente.
 *
 * @param ruc - RUC del cliente a actualizar.
 * @param data - Campos a modificar (parcial).
 * @param synced - Si `true`, marca como ya sincronizado (`sync = 1`). Por defecto `false`.
 */
export async function actualizarClienteLocal(
  ruc: string,
  data: Partial<ClienteDTO>,
  synced = false,
): Promise<void> {
  await db
    .update(clientes)
    .set({
      ...(data.descripcion_cliente !== undefined && {
        descripcionCliente: data.descripcion_cliente,
      }),
      timestamp: Date.now(),
      sync: synced ? 1 : 0,
    })
    .where(eq(clientes.ruc, ruc));
}

/**
 * Elimina un cliente de la BD local.
 *
 * @param ruc - RUC del cliente a eliminar.
 */
export async function eliminarClienteLocal(ruc: string): Promise<void> {
  await db.delete(clientes).where(eq(clientes.ruc, ruc));
}

/**
 * Devuelve el timestamp de la última sincronización de clientes.
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

// ====================== SINCRONIZACIÓN ======================
/**
 * Descarga clientes nuevos/modificados desde el servidor central.
 *
 * @param lastTimestamp - Timestamp de la última sync; solo se traen registros posteriores.
 * @returns Número de clientes sincronizados.
 * @throws Error si la petición HTTP falla.
 */
export async function syncClientesFromCentral(lastTimestamp: number = 0) {
  try {
    const { data } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.clientesGet, {
      params: { createdAt: lastTimestamp },
    });

    const items = Array.isArray(data) ? data : [];
    
    if (items.length > 0) {
      await saveClientes(items);
      console.log(`✅ ${items.length} clientes sincronizados desde central`);
    }
    return items.length;
  } catch (error) {
    console.error("❌ Error syncClientesFromCentral:", error);
    throw error;
  }
}

/**
 * Envía al servidor central los clientes creados offline pendientes de sync.
 *
 * @returns Número de clientes enviados.
 * @throws Error si la petición HTTP falla.
 */
export async function syncClientesToCentral() {
  const pendientes = await getClientesPendientesSync();
  if (pendientes.length === 0) return 0;

  try {
    await SYNC_CONFIG.http.post(SYNC_CONFIG.endpoints.clientesPost, {
      clientes: pendientes,
    });

    for (const c of pendientes) {
      await markClienteAsSynced(c.ruc);
    }

    console.log(`✅ ${pendientes.length} clientes enviados al central`);
    return pendientes.length;
  } catch (error) {
    console.error("❌ Error syncClientesToCentral:", error);
    throw error;
  }
}