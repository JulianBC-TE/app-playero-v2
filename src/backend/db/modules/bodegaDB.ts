// src/backend/db/modules/bodegaDB.ts
//
// Módulo de base de datos para bodegas.
// Las bodegas son catálogo de solo lectura sincronizado desde el servidor.
//
// REGLAS DE NEGOCIO:
//   - Las bodegas no se crean localmente, solo se descargan del servidor.
//   - Cada bodega pertenece a una sucursal (idSucursal).
//   - getBodegasByIdSucursal() filtra por la sucursal activa del contexto.
//   - El campo `trapaso` indica si la bodega puede ser destino de un traspaso.

import { db } from "@/backend/db/client";
import { bodegas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { BodegaDTO } from "@/dto/BodegaDTO";

// Clave en tabla syncs para registrar la última sincronización de bodegas.
const SYNC_KEY = "__last_sync_bodegas__";

// ---------------------------------------------------------------------------
// Tipo extendido interno
// El DTO público solo tiene id_bodega y descripcion_bodega.
// Internamente necesitamos idSucursal para filtrar.
// ---------------------------------------------------------------------------

type BodegaRow = {
  id_bodega: string;
  descripcion_bodega: string;
  id_sucursal: number;
  trapaso: boolean;
};

// ---------------------------------------------------------------------------
// saveBodegas
// Upsert masivo de bodegas recibidas del servidor.
// ---------------------------------------------------------------------------

export async function saveBodegas(items: BodegaRow[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(bodegas)
      .values({
        idBodega: Number(item.id_bodega),
        descripcionBodega: item.descripcion_bodega,
        idSucursal: item.id_sucursal,
        trapaso: item.trapaso ?? false,
      })
      .onConflictDoUpdate({
        target: bodegas.idBodega,
        set: {
          descripcionBodega: item.descripcion_bodega,
          idSucursal: item.id_sucursal,
          trapaso: item.trapaso ?? false,
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
// getBodegas
// Devuelve todas las bodegas del catálogo local.
// ---------------------------------------------------------------------------

export async function getBodegas(): Promise<BodegaDTO[]> {
  const rows = await db
    .select({
      idBodega: bodegas.idBodega,
      descripcionBodega: bodegas.descripcionBodega,
    })
    .from(bodegas);

  return rows.map((r) => ({
    id_bodega: String(r.idBodega),
    descripcion_bodega: r.descripcionBodega,
  }));
}

// ---------------------------------------------------------------------------
// getBodegasByIdSucursal
// Devuelve las bodegas que pertenecen a la sucursal activa.
// Usado en los Select de Turno, Abastecimiento, Traspaso.
// ---------------------------------------------------------------------------

export async function getBodegasByIdSucursal(
  idSucursal: number
): Promise<BodegaDTO[]> {
  const rows = await db
    .select({
      idBodega: bodegas.idBodega,
      descripcionBodega: bodegas.descripcionBodega,
    })
    .from(bodegas)
    .where(eq(bodegas.idSucursal, idSucursal));

  return rows.map((r) => ({
    id_bodega: String(r.idBodega),
    descripcion_bodega: r.descripcionBodega,
  }));
}

// ---------------------------------------------------------------------------
// getBodegasTraspaso
// Devuelve las bodegas habilitadas como destino de traspaso.
// Usado en el Select de bodega destino en la pantalla Traspaso.
// ---------------------------------------------------------------------------

export async function getBodegasTraspaso(
  idSucursal: number
): Promise<BodegaDTO[]> {
  const rows = await db
    .select({
      idBodega: bodegas.idBodega,
      descripcionBodega: bodegas.descripcionBodega,
    })
    .from(bodegas)
    .where(eq(bodegas.idSucursal, idSucursal));

  // Filtramos en memoria porque drizzle-orm necesita and() para múltiples where.
  // Si el volumen es grande se puede usar and(eq(...), eq(...)).
  return rows
    .filter((r) => {
      // trapaso viene como 0/1 desde SQLite; lo evaluamos como boolean
      return (r as any).trapaso === 1 || (r as any).trapaso === true;
    })
    .map((r) => ({
      id_bodega: String(r.idBodega),
      descripcion_bodega: r.descripcionBodega,
    }));
}

// ---------------------------------------------------------------------------
// getBodegaById
// Devuelve una bodega por su ID.
// ---------------------------------------------------------------------------

export async function getBodegaById(
  idBodega: number
): Promise<BodegaDTO | null> {
  const rows = await db
    .select({
      idBodega: bodegas.idBodega,
      descripcionBodega: bodegas.descripcionBodega,
    })
    .from(bodegas)
    .where(eq(bodegas.idBodega, idBodega))
    .limit(1);

  if (!rows[0]) return null;

  return {
    id_bodega: String(rows[0].idBodega),
    descripcion_bodega: rows[0].descripcionBodega,
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