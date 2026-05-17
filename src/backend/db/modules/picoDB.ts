// srcDBmodules/picoDB.ts
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
import { eq } from "drizzle-orm";
import { PicoDTO } from "@/dto/PicosDTO";

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

export async function getPicoById(idPico: number): Promise<PicoDTO | null> {
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

  if (!rows[0]) return null;

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
