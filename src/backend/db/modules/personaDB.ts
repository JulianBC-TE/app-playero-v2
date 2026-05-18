// srcDBmodules/personaDB.ts
//
// Módulo de base de datos local para la entidad Persona.
//
// REGLAS DE NEGOCIO:
//   - Las personas pueden crearse localmente (offline) y sincronizarse después.
//   - El campo `sync` indica el estado: 0 = pendiente de sync, 1 = sincronizado.
//   - savePersonas() hace upsert masivo de datos bajados del servidor (sync=1).
//   - savePersonaLocal() guarda una persona creada offline (sync=0).
//   - getPersonasPendientesSync() devuelve las personas aún no enviadas al servidor.
//   - markAsSynced() marca una persona como sincronizada tras un POST exitoso.
//
// NOTA: La tabla `personas` también es usada por authDB para el login offline.
//       Este módulo NO toca los campos de autenticación (usuariosApp).

import { db } from "@/backend/db/client";
import { personas, syncs } from "@/backend/db/schema";
import { eq, like, or, sql } from "drizzle-orm";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de personas.
const SYNC_KEY = "__last_sync_personas__";

// ---------------------------------------------------------------------------
// savePersonas
// Upsert masivo de personas recibidas del servidor.
// Todos se marcan como sync=1 (ya están en el servidor).
// ---------------------------------------------------------------------------

export async function savePersonas(items: PersonaDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(personas)
      .values({
        cedula: item.cedula,
        nombreApellido: item.nombre_apellido,
        timestamp: Date.now(),
        sync: 1,
      })
      .onConflictDoUpdate({
        target: personas.cedula,
        set: {
          nombreApellido: item.nombre_apellido,
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
// savePersonaLocal
// Guarda una persona creada offline. Se marca como sync=0 (pendiente).
// Lanza error si la cédula ya existe.
// ---------------------------------------------------------------------------

export async function savePersonaLocal(data: PersonaDTO): Promise<void> {
  await db.insert(personas).values({
    cedula: data.cedula,
    nombreApellido: data.nombre_apellido,
    timestamp: Date.now(),
    sync: 0,
  });
}

// ---------------------------------------------------------------------------
// getPersonas
// Devuelve todas las personas del catálogo local.
// ---------------------------------------------------------------------------

export async function getPersonas(): Promise<PersonaDTO[]> {
  const rows = await db
    .select({
      cedula: personas.cedula,
      nombreApellido: personas.nombreApellido,
    })
    .from(personas);

  return rows.map((r) => ({
    cedula: r.cedula,
    nombre_apellido: r.nombreApellido,
  }));
}

interface PaginatedPersonas {
  personas: PersonaDTO[];
}

export async function getPersonasPaginado(
  filter: string,
  page: number,
  limit: number,
): Promise<PaginatedPersonas> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      cedula: personas.cedula,
      nombre: personas.nombreApellido,
    })
    .from(personas)
    .where(
      filter
        ? or(
            like(personas.nombreApellido, `%${filter}%`),
            sql`CAST(${personas.cedula} AS TEXT) LIKE ${`%${filter}%`}`,
          )
        : undefined,
    )
    .limit(limit)
    .offset(offset);

  const result: PersonaDTO[] = rows.map((r) => ({
    cedula: r.cedula,
    nombre_apellido: r.nombre,
  }));

  return { personas: result };
}

// ---------------------------------------------------------------------------
// getPersonaByCedula
// Devuelve una persona por su cédula. Devuelve null si no existe.
// ---------------------------------------------------------------------------

export async function getPersonaByCedula(
  cedula: number,
): Promise<PersonaDTO | null> {
  const rows = await db
    .select({
      cedula: personas.cedula,
      nombreApellido: personas.nombreApellido,
    })
    .from(personas)
    .where(eq(personas.cedula, cedula))
    .limit(1);

  if (!rows[0]) return null;

  return {
    cedula: rows[0].cedula,
    nombre_apellido: rows[0].nombreApellido,
  };
}

// ---------------------------------------------------------------------------
// buscarPersonasLocal
// Búsqueda local por cédula o nombre (parcial, case-insensitive).
// Útil para resultados offline en BuscarPersona.tsx.
// ---------------------------------------------------------------------------

export async function buscarPersonasLocal(
  query: string,
): Promise<PersonaDTO[]> {
  const rows = await db
    .select({
      cedula: personas.cedula,
      nombreApellido: personas.nombreApellido,
    })
    .from(personas);

  const q = query.toLowerCase();
  return rows
    .filter(
      (r) =>
        String(r.cedula).includes(q) ||
        r.nombreApellido.toLowerCase().includes(q),
    )
    .map((r) => ({
      cedula: r.cedula,
      nombre_apellido: r.nombreApellido,
    }));
}

// ---------------------------------------------------------------------------
// getPersonasPendientesSync
// Devuelve las personas creadas offline que aún no fueron enviadas al servidor.
// ---------------------------------------------------------------------------

export async function getPersonasPendientesSync(): Promise<PersonaDTO[]> {
  const rows = await db
    .select({
      cedula: personas.cedula,
      nombreApellido: personas.nombreApellido,
    })
    .from(personas)
    .where(eq(personas.sync, 0));

  return rows.map((r) => ({
    cedula: r.cedula,
    nombre_apellido: r.nombreApellido,
  }));
}

// ---------------------------------------------------------------------------
// markPersonaAsSynced
// Marca una persona como sincronizada (sync=1) tras un POST exitoso al servidor.
// ---------------------------------------------------------------------------

export async function markPersonaAsSynced(cedula: number): Promise<void> {
  await db.update(personas).set({ sync: 1 }).where(eq(personas.cedula, cedula));
}

// ---------------------------------------------------------------------------
// actualizarPersonaLocal
// Actualiza los datos de una persona existente en la BD local.
// Pone sync=0 si el cambio fue hecho offline (para re-sincronizar).
// ---------------------------------------------------------------------------

export async function actualizarPersonaLocal(
  cedula: number,
  data: Partial<PersonaDTO>,
  synced = false,
): Promise<void> {
  await db
    .update(personas)
    .set({
      ...(data.nombre_apellido !== undefined && {
        nombreApellido: data.nombre_apellido,
      }),
      timestamp: Date.now(),
      sync: synced ? 1 : 0,
    })
    .where(eq(personas.cedula, cedula));
}

// ---------------------------------------------------------------------------
// eliminarPersonaLocal
// Elimina una persona de la BD local.
// ATENCIÓN: No eliminar personas que tengan registros en usuariosApp.
// ---------------------------------------------------------------------------

export async function eliminarPersonaLocal(cedula: number): Promise<void> {
  await db.delete(personas).where(eq(personas.cedula, cedula));
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

export async function syncPersonasFromCentral(lastTimestamp: number = 0) {
  try {
    const { data } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.clientesGet, {
      params: { createdAt: lastTimestamp },
    });

    const items = Array.isArray(data) ? data : [];
    
    if (items.length > 0) {
      await savePersonas(items);
      console.log(`✅ ${items.length} clientes sincronizados desde central`);
    }
    return items.length;
  } catch (error) {
    console.error("❌ Error syncClientesFromCentral:", error);
    throw error;
  }
}

export async function syncPersonasToCentral() {
  const pendientes = await getPersonasPendientesSync();
  if (pendientes.length === 0) return 0;

  try {
    await SYNC_CONFIG.http.post(SYNC_CONFIG.endpoints.clientesPost, {
      clientes: pendientes,
    });

    for (const c of pendientes) {
      await markPersonaAsSynced(c.cedula);
    }

    console.log(`✅ ${pendientes.length} clientes enviados al central`);
    return pendientes.length;
  } catch (error) {
    console.error("❌ Error syncClientesToCentral:", error);
    throw error;
  }
}