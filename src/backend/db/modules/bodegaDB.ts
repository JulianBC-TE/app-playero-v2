/**
 * Módulo de acceso a datos para bodegas.
 * Las bodegas son catálogo de solo lectura descargado desde el servidor.
 *
 * @remarks
 * La sincronización filtra bodegas por reglas de negocio:
 * se guardan las bodegas de la sucursal activa **y** las habilitadas para traspaso
 * de otras sucursales.
 *
 * @module Backend/DB/Modules/Bodega
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { bodegas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de bodegas.
const SYNC_KEY = "__last_sync_bodegas__";

/** Fila interna extendida con `idSucursal` y `trapaso` para filtrado. */
type BodegaRow = {
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
 * @returns {@link BodegaDTO} o `null` si no existe.
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

// ====================== SINCRONIZACIÓN ESPECIAL BODEGAS ======================
/**
 * Sincroniza bodegas desde el servidor central.
 * Aplica las reglas de negocio:
 * - Todas las bodegas de la sucursal actual.
 * - Más las bodegas de otras sucursales habilitadas para traspaso.
 *
 * @param idSucursalActual - ID de la sucursal activa.
 * @returns Número de bodegas guardadas localmente.
 * @throws Error si la petición HTTP falla.
 */
export async function syncBodegasFromCentral(idSucursalActual: number): Promise<number> {
  try {
    console.log(`🔄 Sincronizando bodegas para sucursal ${idSucursalActual}...`);

    // 1. Traer todas las bodegas
    const { data: todasBodegas } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.bodegas);

    // 2. Traer habilitados para traspaso
    const { data: habilitados } = await SYNC_CONFIG.http.get('/api/habilitados-traspaso');

    if (!Array.isArray(todasBodegas)) {
      console.warn("⚠️ No se recibieron bodegas del servidor");
      return 0;
    }

    // Convertir habilitados a un Set para búsqueda rápida
    const habilitadosSet = new Set(
      Array.isArray(habilitados) 
        ? habilitados.map((h: any) => Number(h.id_bodega)) 
        : []
    );

    // 3. Filtrar según reglas
    const bodegasAFiltrar = todasBodegas.filter((b: any) => {
      const idBodega = Number(b.id_bodega);
      const idSucursalBodega = Number(b.id_sucursal);

      return (
        idSucursalBodega === idSucursalActual ||           // Bodegas de mi sucursal
        habilitadosSet.has(idBodega)                       // Bodegas habilitadas para traspaso
      );
    });

    // 4. Guardar en local
    await saveBodegas(bodegasAFiltrar);

    console.log(`✅ ${bodegasAFiltrar.length} bodegas guardadas localmente (de ${todasBodegas.length} totales)`);
    return bodegasAFiltrar.length;

  } catch (error) {
    console.error("❌ Error en syncBodegasFromCentral:", error);
    throw error;
  }
}