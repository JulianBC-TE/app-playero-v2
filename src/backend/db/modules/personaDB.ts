/**
 * Módulo de acceso a datos para personas físicas.
 *
 * @remarks
 * - Este módulo **no toca** los campos de autenticación (`usuariosApp`).
 *   Para eso, usar {@link Playero/Backend.Playero/Backend/DB/Modules/Auth}.
 * - `sync = 0` → pendiente; `sync = 1` → sincronizado con el servidor.
 *
 * @module Playero/Backend/DB/Modules/Persona
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { personas, syncs } from "@/backend/db/schema";
import { eq, like, or, sql } from "drizzle-orm";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de personas.
const SYNC_KEY = "__last_sync_personas__";

/**
 * Upsert masivo de personas recibidas del servidor.
 * @param items - Lista de {@link PersonaDTO}.
 */

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

/**
 * Guarda una persona creada offline con `sync = 0`.
 * @param data - Datos de la persona.
 * @throws Error si la cédula ya existe.
 */

export async function savePersonaLocal(data: PersonaDTO): Promise<void> {
  await db.insert(personas).values({
    cedula: data.cedula,
    nombreApellido: data.nombre_apellido,
    timestamp: Date.now(),
    sync: 0,
  });
}

/**
 * Devuelve todas las personas del catálogo local.
 * @returns Lista de {@link PersonaDTO}.
 */

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

/** Resultado paginado de búsqueda de personas. */
export interface PaginatedPersonas {
  personas: PersonaDTO[];
}

/**
 * Devuelve una página de personas filtradas por nombre o cédula.
 *
 * @param filter - Texto de búsqueda (vacío = sin filtro).
 * @param page - Número de página (base 1).
 * @param limit - Tamaño de página.
 * @returns Objeto con array `personas` de {@link PersonaDTO}.
 */
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

/**
 * Devuelve una persona por su cédula.
 * @param cedula - Cédula numérica.
 * @returns un {@link PersonaDTO} o `null`.
 */

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

/**
 * Búsqueda local por cédula o nombre (parcial, case-insensitive).
 * @param query - Texto a buscar.
 */
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

/**
 * Devuelve las personas pendientes de enviar al servidor (`sync = 0`).
 */
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

/** Marca una persona como sincronizada (`sync = 1`). @param cedula */
export async function markPersonaAsSynced(cedula: number): Promise<void> {
  await db.update(personas).set({ sync: 1 }).where(eq(personas.cedula, cedula));
}

/**
 * Actualiza una persona en la BD local. Pone `sync = 0` si `synced = false`.
 * @param cedula - Cédula de la persona.
 * @param data - Campos a modificar.
 * @param synced - Si `true`, marca como ya sincronizado. Por defecto `false`.
 */
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

/**
 * Elimina una persona de la BD local.
 * @remarks No eliminar personas que tengan registros en `usuariosApp`.
 * @param cedula - Cédula de la persona a eliminar.
 */
export async function eliminarPersonaLocal(cedula: number): Promise<void> {
  await db.delete(personas).where(eq(personas.cedula, cedula));
}

/** Timestamp de la última sync de personas. @returns ms Unix o `null`. */
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
/* 
* Descarga personas nuevas/modificadas desde el servidor central.
 * @param lastTimestamp - Solo se traen registros posteriores a este timestamp.
 */
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

/** Envía al servidor central las personas creadas offline pendientes de sync. */
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