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
import { bodegas, syncs, usuariosBodegas, habilitadosTrapaso, usuariosApp } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { getCurrentUserAppIdSucursal } from "./sucursalDB"; // Importamos la función de sucursalDB
import { getFullDataSincronizacionBodegas } from "@/backend/api/bodegaAPI";
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
 * Devuelve las bodegas habilitadas como destino de traspaso para una sucursal,
 * basándose en la tabla de relación `habilitadosTrapaso`.
 *
 * @param idSucursal - ID de la sucursal activa.
 * @returns Lista de {@link BodegaDTO} con `trapaso = true` vinculadas a la sucursal.
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
    // Hacemos un JOIN con la tabla intermedia
    .innerJoin(
      habilitadosTrapaso,
      eq(bodegas.idBodega, habilitadosTrapaso.idBodega)
    )
    .where(
      and(
        // Filtramos por la sucursal que hace el traspaso
        eq(habilitadosTrapaso.idSucursal, idSucursal),
        // Movemos el filtro del boolean directamente a la query SQL
        eq(bodegas.trapaso, true)
      )
    );

  // Mapeamos el resultado al DTO deseado
  return rows.map((r) => ({
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

/**
 * Devuelve los IDs de bodegas autorizadas para un operario desde la BD local.
 *
 * @param cedula - Cédula del operario.
 * @returns Array de `idBodega` autorizados, o `[]` si no hay registros.
 */
export async function getIdsBodegasDelUsuario(cedula: number): Promise<number[]> {
  try {
    const rows = await db
      .select({ idBodega: usuariosBodegas.idBodega })
      .from(usuariosBodegas)
      .where(eq(usuariosBodegas.cedula, cedula));

    return rows.map((r) => r.idBodega);
  } catch (error) {
    console.error("[DB] Error al obtener bodegas del usuario:", error);
    return [];
  }
}

/**
 * Devuelve todas las bodegas autorizadas y relacionadas con un usuario específico
 * basándose en la tabla intermedia `usuarios_bodegas`.
 *
 * @param cedula - Cédula del operario logueado.
 * @returns Lista de {@link BodegaDTO} asociadas al usuario.
 */
export async function getBodegasDelUsuario(
  cedula: number
): Promise<BodegaDTO[]> {
  try {
    const result = await db
      .select({
        idBodega: bodegas.idBodega,
        descripcionBodega: bodegas.descripcionBodega,
      })
      .from(usuariosBodegas)
      .innerJoin(
        bodegas,
        eq(usuariosBodegas.idBodega, bodegas.idBodega)
      )
      .where(eq(usuariosBodegas.cedula, cedula));

    // Mapeamos los campos al formato de retorno esperado por el frontend (BodegaDTO)
    return result.map((row) => ({
      id_bodega: String(row.idBodega),
      descripcion_bodega: row.descripcionBodega,
    }));
  } catch (error) {
    console.error(`[DB] Error en getBodegasDelUsuario para cédula ${cedula}:`, error);
    return [];
  }
}

/**
 * Obtiene todas las bodegas de destino a las que una sucursal específica puede hacer traspasos.
 * Usa un INNER JOIN explícito para evitar problemas de esquema genérico en Drizzle.
 * * @param idSucursalOrigen - ID de la sucursal que envía el traspaso.
 * @returns Lista de {@link BodegaDTO} habilitadas como destino.
 */
export async function getBodegasDestinoTraspaso(
  idSucursalOrigen: number
): Promise<BodegaDTO[]> {
  try {
    const result = await db
      .select({
        idBodega: bodegas.idBodega,
        descripcionBodega: bodegas.descripcionBodega,
      })
      .from(habilitadosTrapaso)
      .innerJoin(
        bodegas, 
        eq(habilitadosTrapaso.idBodega, bodegas.idBodega)
      )
      .where(eq(habilitadosTrapaso.idSucursal, idSucursalOrigen));

    // Drizzle ya infiere el tipo exacto basándose en el objeto select de arriba,
    // eliminando por completo los errores de tipo implícito 'any'.
    return result.map((row) => ({
      id_bodega: String(row.idBodega),
      descripcion_bodega: row.descripcionBodega,
    }));
  } catch (error) {
    console.error(`[DB] Error en getBodegasDestinoTraspaso para sucursal ${idSucursalOrigen}:`, error);
    return [];
  }
}

async function getDatosUsuarioLogueadoLocal(): Promise<{ cedula: number; idSucursal: number } | null> {
  try {
    const res = await db
      .select({
        cedula: usuariosApp.cedula,
        idSucursal: usuariosApp.idSucursal,
      })
      .from(usuariosApp)
      .limit(1);

    return res[0] || null;
  } catch (error) {
    console.error("[DB] Error al buscar usuario logueado local:", error);
    return null;
  }
}

/**
 * Sincroniza en una sola operación atómica todas las bodegas del operario,
 * las bodegas externas de traspaso y el mapa intermedio de habilitados.
 * @returns Total de registros de bodegas procesados de forma local.
 */
export async function syncCatalogoYTraspasosBodega(): Promise<number> {
  try {
    const usuarioLocal = await getDatosUsuarioLogueadoLocal();
    if (!usuarioLocal) throw new Error("No hay usuario activo local.");

    const { idSucursal, cedula } = usuarioLocal;
    
    const { 
      bodegas_propias, 
      bodegas_traspaso, 
      relaciones_traspaso,
      usuario_bodegas 
    } = await getFullDataSincronizacionBodegas(idSucursal, cedula);

    await db.transaction(async (tx) => {
      await tx.delete(usuariosBodegas).where(eq(usuariosBodegas.cedula, cedula));
      await tx.delete(habilitadosTrapaso).where(eq(habilitadosTrapaso.idSucursal, idSucursal));

      for (const bp of bodegas_propias) {
        await tx.insert(bodegas).values({
          idBodega: bp.id_bodega,
          descripcionBodega: bp.descripcion_bodega,
          idSucursal: bp.id_sucursal,
          trapaso: bp.trapaso,
        }).onConflictDoUpdate({
          target: bodegas.idBodega,
          set: { descripcionBodega: bp.descripcion_bodega, idSucursal: bp.id_sucursal, trapaso: bp.trapaso },
        });
      }

      if (usuario_bodegas && usuario_bodegas.length > 0) {
        for (const ub of usuario_bodegas) {
          await tx.insert(usuariosBodegas).values({ cedula: ub.cedula, idBodega: ub.id_bodega }).onConflictDoNothing();
        }
      }

      for (const bt of bodegas_traspaso) {
        await tx.insert(bodegas).values({
          idBodega: bt.id_bodega,
          descripcionBodega: bt.descripcion_bodega,
          idSucursal: bt.id_sucursal,
          trapaso: bt.trapaso,
        }).onConflictDoUpdate({
          target: bodegas.idBodega,
          set: { descripcionBodega: bt.descripcion_bodega, idSucursal: bt.id_sucursal, trapaso: bt.trapaso },
        });
      }

      for (const rel of relaciones_traspaso) {
        await tx.insert(habilitadosTrapaso).values({ idSucursal: rel.id_sucursal, idBodega: rel.id_bodega_destino });
      }
    });

    const total = bodegas_propias.length + bodegas_traspaso.length;
    console.log(`✅ BODEGAS -> ok (+${total}) [Propias: ${bodegas_propias.length} | Traspasos: ${bodegas_traspaso.length}]`);
    
    return total;
  } catch (error) {
    console.error("❌ BODEGAS -> Error:", error.message || error);
    throw error;
  }
}