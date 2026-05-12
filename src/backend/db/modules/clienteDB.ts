// src/backend/db/modules/clienteDB.ts
//
// Módulo de base de datos local para la entidad Cliente.
//
// REGLAS DE NEGOCIO:
//   - Los clientes pueden crearse localmente (offline) y sincronizarse después.
//   - El campo `sync` indica el estado: 0 = pendiente de sync, 1 = sincronizado.
//   - saveClientes() hace upsert masivo de datos bajados del servidor (sync=1).
//   - saveClienteLocal() guarda un cliente creado offline (sync=0).
//   - getPendientesSync() devuelve los clientes aún no enviados al servidor.
//   - markAsSynced() marca un cliente como sincronizado tras un POST exitoso.

import { db } from "@/backend/db/client";
import { clientes, syncs } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import { ClienteDTO } from "@/dto/ClienteDTO";

// Clave en tabla syncs para registrar la última sincronización de clientes.
const SYNC_KEY = "__last_sync_clientes__";

// ---------------------------------------------------------------------------
// saveClientes
// Upsert masivo de clientes recibidos del servidor.
// Todos se marcan como sync=1 (ya están en el servidor).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// saveClienteLocal
// Guarda un cliente creado offline. Se marca como sync=0 (pendiente).
// Lanza error si el RUC ya existe.
// ---------------------------------------------------------------------------

export async function saveClienteLocal(data: ClienteDTO): Promise<void> {
  await db.insert(clientes).values({
    ruc: data.ruc,
    descripcionCliente: data.descripcion_cliente,
    timestamp: Date.now(),
    sync: 0,
  });
}

// ---------------------------------------------------------------------------
// getClientes
// Devuelve todos los clientes del catálogo local.
// ---------------------------------------------------------------------------

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



// ---------------------------------------------------------------------------
// getClienteByRuc
// Devuelve un cliente por su RUC. Devuelve null si no existe.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// buscarClientes
// Búsqueda local por RUC o nombre (parcial, case-insensitive).
// Útil para resultados offline en BuscarCliente.tsx.
// ---------------------------------------------------------------------------

export async function buscarClientesLocal(query: string): Promise<ClienteDTO[]> {
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
        r.descripcionCliente.toLowerCase().includes(q)
    )
    .map((r) => ({
      ruc: r.ruc,
      descripcion_cliente: r.descripcionCliente,
    }));
}

// ---------------------------------------------------------------------------
// getPendientesSync
// Devuelve los clientes creados offline que aún no fueron enviados al servidor.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// markAsSynced
// Marca un cliente como sincronizado (sync=1) tras un POST exitoso al servidor.
// ---------------------------------------------------------------------------

export async function markClienteAsSynced(ruc: string): Promise<void> {
  await db
    .update(clientes)
    .set({ sync: 1 })
    .where(eq(clientes.ruc, ruc));
}

// ---------------------------------------------------------------------------
// actualizarCliente
// Actualiza los datos de un cliente existente en la BD local.
// Pone sync=0 si el cambio fue hecho offline (para re-sincronizar).
// ---------------------------------------------------------------------------

export async function actualizarClienteLocal(
  ruc: string,
  data: Partial<ClienteDTO>,
  synced = false
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

// ---------------------------------------------------------------------------
// eliminarCliente
// Elimina un cliente de la BD local.
// ---------------------------------------------------------------------------

export async function eliminarClienteLocal(ruc: string): Promise<void> {
  await db.delete(clientes).where(eq(clientes.ruc, ruc));
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