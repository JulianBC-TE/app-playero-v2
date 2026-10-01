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
import { bodegas, picos, tanques, syncs, usuariosBodegas, habilitadosTrapaso } from "@/backend/db/schema";
import { eq, and, inArray, not } from "drizzle-orm";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { getCurrentUserAppIdSucursal } from "./sucursalDB"; // Importamos la función de sucursalDB
import { getUsuarioSesionLocal } from "./usuarioSesionDB";
import { getFullDataSincronizacionBodegasV2 } from "@/backend/api/bodegaAPI";
import { getBodegasRetenidas } from "./retencionPendientes";
// Clave en tabla syncs para registrar la última sincronización de bodegas.
const SYNC_KEY = "__last_sync_bodegas__";

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
 * Devuelve las bodegas habilitadas como destino de traspaso para un usuario,
 * basándose en la tabla de relación `habilitadosTrapaso` (ahora por cedula).
 *
 * @param cedula - Cédula del usuario logueado.
 * @returns Lista de {@link BodegaDTO} con `trapaso = true` vinculadas al usuario.
 */
export async function getBodegasTraspaso(
  cedula: number,
): Promise<BodegaDTO[]> {
  const rows = await db
    .select({
      idBodega: bodegas.idBodega,
      descripcionBodega: bodegas.descripcionBodega,
    })
    .from(bodegas)
    .innerJoin(
      habilitadosTrapaso,
      eq(bodegas.idBodega, habilitadosTrapaso.idBodega)
    )
    .where(
      and(
        eq(habilitadosTrapaso.cedula, cedula),
        eq(bodegas.trapaso, true)
      )
    );

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
 * Obtiene todas las bodegas de destino a las que un usuario específico puede hacer traspasos.
 * Usa cedula en vez de idSucursal para filtrar por usuario.
 *
 * @param cedula - Cédula del usuario que realiza el traspaso.
 * @returns Lista de {@link BodegaDTO} habilitadas como destino.
 */
export async function getBodegasDestinoTraspaso(
  cedula: number
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
      .where(eq(habilitadosTrapaso.cedula, cedula));

    return result.map((row) => ({
      id_bodega: String(row.idBodega),
      descripcion_bodega: row.descripcionBodega,
    }));
  } catch (error) {
    console.error(`[DB] Error en getBodegasDestinoTraspaso para cedula ${cedula}:`, error);
    return [];
  }
}

export async function getDatosUsuarioLogueadoLocal(): Promise<{ cedula: number; idSucursal: number } | null> {
  try {
    const usuario = await getUsuarioSesionLocal();
    if (!usuario) return null;

    return { cedula: usuario.cedula, idSucursal: usuario.idSucursal };
  } catch (error) {
    console.error("[DB] Error al buscar usuario logueado local:", error);
    return null;
  }
}

/**
 * Sincroniza en una sola operación atómica todas las bodegas del operario,
 * las bodegas externas de traspaso y el mapa intermedio de habilitados.
 * Usa la V2 del endpoint (filtrado por USUARIO via cedula).
 * @returns Total de registros de bodegas procesados de forma local.
 */
export async function syncCatalogoYTraspasosBodega(): Promise<number> {
  try {
    const usuarioLocal = await getDatosUsuarioLogueadoLocal();
    if (!usuarioLocal) throw new Error("No hay usuario activo local.");

    const { cedula } = usuarioLocal;
    
    // V2: usa cedula para filtrar relaciones de traspaso por USUARIO
    const { 
      bodegas_propias, 
      bodegas_traspaso, 
      relaciones_traspaso,
      usuario_bodegas 
    } = await getFullDataSincronizacionBodegasV2(cedula);

    const remoteBodegaIds = [
      ...bodegas_propias.map((b) => b.id_bodega),
      ...bodegas_traspaso.map((b) => b.id_bodega),
    ];

    // Bodegas a conservar: las del servidor + las que tienen registros
    // pendientes de subir (sync = 0) o fallidos (sync = -1).
    const bodegasRetenidas = await getBodegasRetenidas(remoteBodegaIds);

    await db.transaction(async (tx) => {
      // Limpiar relaciones por CEDULA (ya no por idSucursal)
      await tx.delete(usuariosBodegas).where(eq(usuariosBodegas.cedula, cedula));
      await tx.delete(habilitadosTrapaso).where(eq(habilitadosTrapaso.cedula, cedula));

      if (bodegasRetenidas.length > 0) {
        await tx.delete(picos).where(not(inArray(picos.idBodega, bodegasRetenidas)));
        await tx.delete(tanques).where(not(inArray(tanques.idBodega, bodegasRetenidas)));
        await tx.delete(bodegas).where(not(inArray(bodegas.idBodega, bodegasRetenidas)));
      } else {
        await tx.delete(picos);
        await tx.delete(tanques);
        await tx.delete(bodegas);
      }

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

      // V2: relaciones_traspaso viene con { cedula, id_bodega_destino }
      for (const rel of relaciones_traspaso) {
        await tx.insert(habilitadosTrapaso).values({ cedula: rel.cedula, idBodega: rel.id_bodega_destino });
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