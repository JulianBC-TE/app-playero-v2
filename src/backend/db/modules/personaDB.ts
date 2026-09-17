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
import { syncGetPersonas, syncPostPersonas } from "@/backend/api/personaAPI";
import { syncsController } from "./syncsDB";
import { crearLog } from "../logs/logModule";

// Clave en tabla syncs para registrar la última sincronización de personas.
const SYNC_KEY = "__last_sync_personas__";

/**
 * Upsert masivo de personas recibidas del servidor. Todos quedan con `sync = 1`.
 *
 * @param items - Lista de {@link PersonaDTO} a insertar o actualizar.
 */
export async function savePersonas(items: PersonaDTO[]): Promise<{ saved: number; deleted: number }> {
  if (items.length === 0) return { saved: 0, deleted: 0 };

  let saved = 0;
  let deleted = 0;

  for (const item of items) {
    if (item.is_deleted) {
      const existia = await db
        .select({ id: personas.cedula })
        .from(personas)
        .where(eq(personas.cedula, item.cedula))
        .get();
      if (existia) {
        await eliminarPersonaLocal(item.cedula);
        deleted++;
      }
      continue;
    }

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

/**
 * Guarda una persona creada offline con `sync = 0`.
 *
 * @param data - Datos de la persona.
 * @throws Error si la cédula ya existe en la tabla local.
 */
export async function savePersonaLocal(data: PersonaDTO): Promise<void> {
  await db.insert(personas).values({
    cedula: data.cedula,
    nombreApellido: data.nombre_apellido,
    timestamp: Date.now(),
    sync: 0,
  });
  await crearLog({
    tipo: "persona",
    accion: "creacion",
    registroId: data.cedula,
    detalle: `CI: ${data.cedula}`,
    payload: data as any,
  });
}

/**
 * Devuelve todas las personas del catálogo local.
 *
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
 *
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
 *
 * @param query - Texto a buscar.
 * @returns Lista de {@link PersonaDTO} que coinciden.
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
 *
 * @returns Lista de {@link PersonaDTO} con `sync = 0`.
 */
export async function getPersonasPendientesSync(incluirErrores: boolean = false): Promise<PersonaDTO[]> {
  const filtro = incluirErrores
    ? or(eq(personas.sync, 0), eq(personas.sync, -1))
    : eq(personas.sync, 0);
  const rows = await db
    .select({
      cedula: personas.cedula,
      nombre_apellido: personas.nombreApellido,
      createdAt: personas.timestamp,  // ✅ Agregado
    })
    .from(personas)
    .where(filtro);

  return rows.map((r) => ({
    cedula: r.cedula,
    nombre_apellido: r.nombre_apellido,
    createdAt: r.createdAt?? Date.now(),  // ✅ Agregado
  }));
}

/**
 * Marca una persona como sincronizada (`sync = 1`).
 *
 * @param cedula - Cédula de la persona.
 */
export async function markPersonaAsSynced(cedula: number): Promise<void> {
  await db.update(personas).set({ sync: 1 }).where(eq(personas.cedula, cedula));
}

/**
 * Actualiza una persona en la BD local. Pone `sync = 0` si `synced = false`.
 *
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
 *
 * @remarks No eliminar personas que tengan registros en `usuariosApp`.
 * @param cedula - Cédula de la persona a eliminar.
 */
export async function eliminarPersonaLocal(cedula: number): Promise<void> {
  await db.delete(personas).where(eq(personas.cedula, cedula));
}

/**
 * Devuelve el timestamp de la última sincronización de personas utilizando el controlador.
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
 * Descarga personas nuevas/modificadas desde el servidor central.
 *
 * @param lastTimestamp - Solo se traen registros posteriores a este timestamp.
 * @returns Objeto con { saved: cantidad guardados, deleted: cantidad eliminados realmente }.
 * @throws Error si la petición HTTP falla.
 */
export async function syncPersonasFromCentral(): Promise<{ saved: number; deleted: number }> {
  try {
    const items = await syncGetPersonas(await syncsController.getTimestamp(SYNC_KEY));
    let result = { saved: 0, deleted: 0 };
    if (items.length > 0) {
      result = await savePersonas(items);
    }
    await syncsController.saveOrUpdate(SYNC_KEY, Date.now());
    if (result.saved > 0) console.log(`✅ PERSONAS -> guardados (+${result.saved})`);
    if (result.deleted > 0) console.log(`🗑️ PERSONAS -> eliminados (-${result.deleted})`);
    return result;
  } catch (error) {
    console.error("❌ PERSONAS -> Error:", error.message || error);
    throw error;
  }
}

export async function syncPersonasFromCentralInit(): Promise<{ saved: number; deleted: number }> {
  try {
    const items = await syncGetPersonas(0);
    let result = { saved: 0, deleted: 0 };
    if (items.length > 0) {
      result = await savePersonas(items);
    }
    await syncsController.saveOrUpdate(SYNC_KEY, Date.now());
    if (result.saved > 0) console.log(`✅ PERSONAS -> guardados (+${result.saved})`);
    if (result.deleted > 0) console.log(`🗑️ PERSONAS -> eliminados (-${result.deleted})`);
    return result;
  } catch (error) {
    console.error("❌ PERSONAS -> Error:", error.message || error);
    throw error;
  }
}

/**
 * Envía al servidor central las personas creadas offline pendientes de sync.
 *
 * @returns Número de personas enviadas.
 * @throws Error si la petición HTTP falla.
 */
export async function syncPersonasToCentral(incluirErrores: boolean = false): Promise<number> {
  const pendientes = await getPersonasPendientesSync(incluirErrores);
  if (pendientes.length === 0) {
    //console.log("⚪ PERSONAS -> Nada pendiente para subir");
    return 0;
  }

  try {
    await syncPostPersonas(pendientes);
    
    for (const p of pendientes) {
      await markPersonaAsSynced(p.cedula);
      await crearLog({
        tipo: "persona",
        accion: "sync_ok",
        registroId: p.cedula,
        detalle: `CI: ${p.cedula}`,
        payload: p as any,
      });
    }

    console.log(`➡️ PERSONAS -> subidas ok (-${pendientes.length})`);
    return pendientes.length;
  } catch (error) {
    console.error("❌ PERSONAS -> Error al subir:", error.message || error);
    throw error;
  }
}