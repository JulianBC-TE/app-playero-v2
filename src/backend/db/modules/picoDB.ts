
/**
 * @module Playero/Backend/DB/Modules/Pico
 * @category Database Modules
 */
//
// Módulo de base de datos para picos (surtidores).
// Los picos son catálogo de solo lectura sincronizado desde el servidor.
//
// REGLAS DE NEGOCIO:
//   - Los picos no se crean localmente, solo se descargan del servidor.
//   - Cada pico pertenece a una bodega (idBodega) y tiene un número de surtidor (idPicoSurtidor).
//   - getPicosByBodega() es la función principal: usada en Salida, Traspaso, CargaCombustible
//     y Calibracion para poblar el Select de picos disponibles.

import { db } from "@/backend/db/client";
import { picos, syncs } from "@/backend/db/schema";
import { eq, and, inArray, not } from "drizzle-orm";
import { PicoDTO } from "@/dto/PicosDTO";
import { getIdsBodegasLocales } from "./bodegaDB";
import { getIdsBodegasConPendientes } from "./retencionPendientes";
import { fetchPicosPorBodegas } from "@/backend/api/picoAPI";


// Clave en tabla syncs para registrar la última sincronización de picos.
const SYNC_KEY = "__last_sync_picos__";

// ---------------------------------------------------------------------------
// savePicos
// Upsert masivo de picos recibidos del servidor.
// ---------------------------------------------------------------------------

export async function savePicos(items: PicoDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(picos)
      .values({
        idPico: item.id_pico,
        descripcionPico: item.descripcion_pico,
        idBodega: item.id_bodega,
        idPicoSurtidor: item.id_pico_surtidor,
      })
      .onConflictDoUpdate({
        target: picos.idPico,
        set: {
          descripcionPico: item.descripcion_pico,
          idBodega: item.id_bodega,
          idPicoSurtidor: item.id_pico_surtidor,
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
// getPicos
// Devuelve todos los picos del catálogo local.
// ---------------------------------------------------------------------------

export async function getPicos(): Promise<PicoDTO[]> {
  const rows = await db
    .select({
      idPico: picos.idPico,
      descripcionPico: picos.descripcionPico,
      idBodega: picos.idBodega,
      idPicoSurtidor: picos.idPicoSurtidor,
    })
    .from(picos);

  return rows.map((r) => ({
    id_pico: r.idPico,
    descripcion_pico: r.descripcionPico,
    id_bodega: r.idBodega,
    id_pico_surtidor: r.idPicoSurtidor,
  }));
}

// ---------------------------------------------------------------------------
// getPicosByBodega
// Devuelve los picos de una bodega específica.
// Usado en los Select de Salida, Traspaso, CargaCombustible y Calibracion.
// ---------------------------------------------------------------------------

export async function getPicosByBodega(idBodega: number): Promise<PicoDTO[]> {
  const rows = await db
    .select({
      idPico: picos.idPico,
      descripcionPico: picos.descripcionPico,
      idBodega: picos.idBodega,
      idPicoSurtidor: picos.idPicoSurtidor,
    })
    .from(picos)
    .where(eq(picos.idBodega, idBodega));

  return rows.map((r) => ({
    id_pico: r.idPico,
    descripcion_pico: r.descripcionPico,
    id_bodega: r.idBodega,
    id_pico_surtidor: r.idPicoSurtidor,
  }));
}

// ---------------------------------------------------------------------------
// getPicoById
// Devuelve un pico por su ID.
// Útil para mostrar datos del pico seleccionado en el resumen de operación.
// ---------------------------------------------------------------------------

export async function getPicoById(idPico: number): Promise<PicoDTO> {
  const rows = await db
    .select({
      idPico: picos.idPico,
      descripcionPico: picos.descripcionPico,
      idBodega: picos.idBodega,
      idPicoSurtidor: picos.idPicoSurtidor,
    })
    .from(picos)
    .where(eq(picos.idPico, idPico))
    .limit(1);

  if (!rows[0]) return {
    id_pico: -1,
    descripcion_pico: "error",
    id_bodega: -1,
    id_pico_surtidor: -1,
  };

  return {
    id_pico: rows[0].idPico,
    descripcion_pico: rows[0].descripcionPico,
    id_bodega: rows[0].idBodega,
    id_pico_surtidor: rows[0].idPicoSurtidor,
  };
}

// ---------------------------------------------------------------------------
// getLastSyncDate
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
// ---------------------------------------------------------------------------
// syncPicosDelOperario  (reemplaza a syncPicosFromCentral)
// Envía los IDs de bodegas autorizadas como filtro a la API.
// ---------------------------------------------------------------------------

/**
 * Descarga y sincroniza los picos de todas las bodegas presentes en el dispositivo.
 * Lee los IDs desde el catálogo local, obtiene los picos del servidor y los guarda localmente.
 *
 * @param _cedula - Cédula del operario autenticado. Se conserva por compatibilidad con el flujo actual de sync.
 * @returns Cantidad de picos sincronizados.
 * @throws Si la llamada al servidor falla o hay error en persistencia.
 */
export async function syncPicosDelOperario(_cedula: number): Promise<number> {
  try {
    const idsBodegas = await getIdsBodegasLocales();
    const bodegasPendientes = await getIdsBodegasConPendientes();

    if (idsBodegas.length === 0) {
      console.log("⚠️ PICOS -> Omitido (no hay bodegas)");
      return 0;
    }

    const picosRemotos = await fetchPicosPorBodegas(idsBodegas);
    const remotePicoIds = picosRemotos.map((p) => p.id_pico);

    const conservaPendientes =
      bodegasPendientes.length > 0
        ? not(inArray(picos.idBodega, bodegasPendientes))
        : undefined;

    if (remotePicoIds.length > 0) {
      const sinPicoRemoto = not(inArray(picos.idPico, remotePicoIds));
      await db
        .delete(picos)
        .where(conservaPendientes ? and(sinPicoRemoto, conservaPendientes) : sinPicoRemoto);
    } else if (conservaPendientes) {
      await db.delete(picos).where(conservaPendientes);
    } else {
      await db.delete(picos);
    }

    if (picosRemotos.length > 0) {
      await savePicos(picosRemotos);
    }
   
    console.log(`✅ PICOS -> ok (+${picosRemotos.length})`);
    return picosRemotos.length;
  } catch (error) {
    console.error("❌ PICOS -> Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}
