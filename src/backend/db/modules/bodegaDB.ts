/**
 * Módulo de acceso a datos para bodegas.
 * Las bodegas son catálogo de solo lectura descargado desde el servidor.
 *
 * @remarks
 * La sincronización filtra bodegas por reglas de negocio:
 * se guardan las bodegas de la sucursal activa **y** las habilitadas para traspaso
 * de otras sucursales.
 *
 * @module Playero/Backend/DB/Modules/Bodega
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { bodegas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import { usuariosBodegas } from "@/backend/db/schema";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de bodegas.
const SYNC_KEY = "__last_sync_bodegas__";

/** Fila interna extendida con `idSucursal` y `trapaso` para filtrado. */
export type BodegaRow = {
  id_bodega: string;
  descripcion_bodega: string;
  id_sucursal: number;
  trapaso: boolean;
};

/**
 * Upsert masivo de bodegas recibidas del servidor.
 * Registra el timestamp de sincronización en la tabla `syncs`.
 *
 * @param items - Array de bodegas a insertar o actualizar.
 */
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

/**
 * Devuelve todas las bodegas del catálogo local.
 *
 * @returns Lista de {@link BodegaDTO}.
 */
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

/**
 * Devuelve las bodegas que pertenecen a la sucursal activa.
 * Usado en los selectores de Turno, Abastecimiento y Traspaso.
 *
 * @param idSucursal - ID de la sucursal activa del contexto.
 * @returns Lista de {@link BodegaDTO}.
 */
export async function getBodegasByIdSucursal(
  idSucursal: number,
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

/**
 * Devuelve las bodegas habilitadas como destino de traspaso para una sucursal.
 *
 * @param idSucursal - ID de la sucursal activa.
 * @returns Lista de {@link BodegaDTO} con `trapaso = true`.
 */
export async function getBodegasTraspaso(
  idSucursal: number,
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

/**
 * Devuelve una bodega por su ID.
 *
 * @param idBodega - ID numérico de la bodega.
 * @returns un {@link BodegaDTO}. o `null` si no existe.
 */
export async function getBodegaById(
  idBodega: number,
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

/**
 * Devuelve el timestamp de la última sincronización de bodegas.
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

// ---------------------------------------------------------------------------
// getIdsBodegasDelUsuario
// Lee la tabla intermedia y devuelve los IDs autorizados para el operario.
// La usan picoDB y tanqueDB como filtro antes de llamar a la API.
// ---------------------------------------------------------------------------

/**
 * Devuelve los IDs de bodegas autorizadas para un operario desde la BD local.
 * No requiere internet.
 *
 * @param cedula - Cédula del operario.
 * @returns Array de `idBodega` autorizados, o `[]` si no hay registros.
 */
export async function getIdsBodegasDelUsuario(cedula: string): Promise<number[]> {
  try {
    const rows = await db
      .select({ idBodega: usuariosBodegas.idBodega })
      .from(usuariosBodegas)
      .where(eq(usuariosBodegas.cedula, Number(cedula)));

    return rows.map((r) => r.idBodega);
  } catch (error) {
    console.error("[DB] Error al obtener bodegas del usuario:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// syncBodegasDelOperario
// Reemplaza la sincronización masiva anterior.
// Transacción: limpia + guarda bodegas del operario en usuarios_bodegas,
// y hace upsert de las bodegas en la tabla principal.
// ---------------------------------------------------------------------------

/**
 * Sincroniza las bodegas autorizadas para un operario específico.
 *
 * Pasos en una sola transacción:
 * 1. Elimina los registros previos de `usuarios_bodegas` para esa cédula.
 * 2. Llama al endpoint `/api/bodegas/operario/:cedula` que devuelve
 *    solo las bodegas de ese operario.
 * 3. Hace upsert de las bodegas en la tabla `bodegas`.
 * 4. Inserta las relaciones en `usuarios_bodegas`.
 *
 * @param cedula - Cédula del operario autenticado.
 * @returns Cantidad de bodegas sincronizadas.
 * @throws Si la llamada al servidor falla.
 */
export async function syncBodegasDelOperario(cedula: string): Promise<number> {
  console.log(`🔄 Sincronizando bodegas del operario ${cedula}...`);

  // Llamada a la API — solo las bodegas de este operario
  const { data: bodegasServidor } = await SYNC_CONFIG.http.get(
    `${SYNC_CONFIG.endpoints.bodegas}/operario/${cedula}`
  );

  if (!Array.isArray(bodegasServidor) || bodegasServidor.length === 0) {
    console.log("📭 No se recibieron bodegas para este operario");
    return 0;
  }

  const cedulaNum = Number(cedula);

  await db.transaction(async (tx) => {
    // 1. Limpiar la relación anterior del operario
    await tx
      .delete(usuariosBodegas)
      .where(eq(usuariosBodegas.cedula, cedulaNum));

    // 2. Upsert de cada bodega en la tabla principal
    for (const b of bodegasServidor) {
      await tx
        .insert(bodegas)
        .values({
          idBodega:          b.id_bodega,
          descripcionBodega: b.descripcion_bodega,
          idSucursal:        b.id_sucursal,
          trapaso:           b.trapaso ?? false,
        })
        .onConflictDoUpdate({
          target: bodegas.idBodega,
          set: {
            descripcionBodega: b.descripcion_bodega,
            idSucursal:        b.id_sucursal,
            trapaso:           b.trapaso ?? false,
          },
        });

      // 3. Insertar en la tabla intermedia
      await tx
        .insert(usuariosBodegas)
        .values({ cedula: cedulaNum, idBodega: b.id_bodega })
        .onConflictDoNothing();
    }
  });

  console.log(`✅ ${bodegasServidor.length} bodegas sincronizadas para cédula ${cedula}`);
  return bodegasServidor.length;
}