/**
 * @module Playero/Backend/API/bodegaAPI
 * API centralizada para operaciones de sincronización de bodegas y traspasos.
 * Utiliza SYNC_CONFIG para todos los endpoints.
 */
import { SYNC_CONFIG } from "./syncConfig";

// ---------------------------------------------------------------------------
// Tipos de respuesta
// ---------------------------------------------------------------------------

export type BodegaServerSyncDTO = {
  id_bodega: number;
  descripcion_bodega: string;
  id_sucursal: number;
  trapaso: boolean;
};

export type RelacionTraspasoServerDTO = {
  id_sucursal: number;
  id_bodega_destino: number;
};

// Define primero el formato de cada relación individual (opcional pero recomendado para mantener orden)
export type RelacionUsuarioBodegaServerDTO = {
  cedula: number;
  id_bodega: number;
};

// Actualiza tu respuesta unificada
export type FullBodegaSyncResponse = {
  bodegas_propias: BodegaServerSyncDTO[];
  bodegas_traspaso: BodegaServerSyncDTO[];
  relaciones_traspaso: RelacionTraspasoServerDTO[];
  usuario_bodegas: RelacionUsuarioBodegaServerDTO[];
};

// Respuesta V2: relaciones_traspaso usa cedula en vez de id_sucursal
export type FullBodegaSyncResponseV2 = {
  bodegas_propias: BodegaServerSyncDTO[];
  bodegas_traspaso: BodegaServerSyncDTO[];
  relaciones_traspaso: { cedula: number; id_bodega_destino: number }[];
  usuario_bodegas: RelacionUsuarioBodegaServerDTO[];
};

export type SucursalConTraspasoDTO = {
  id_sucursal: number;
  descripcion_sucursal: string;
};

/**
 * Obtiene el paquete completo de bodegas del usuario, bodegas destino de traspaso
 * y el mapa de relaciones intermedias desde el servidor central.
 *
 * @param idSucursal - ID de la sucursal del usuario
 * @param cedula - Cédula del usuario para identificar sus bodegas
 * @returns FullBodegaSyncResponse con bodegas propias, traspaso y relaciones
 * @throws Si la llamada al servidor falla
 */
export async function getFullDataSincronizacionBodegas(
  idSucursal: number,
  cedula: number
): Promise<FullBodegaSyncResponse> {
  const endpoint = SYNC_CONFIG.endpoints.syncBodegasCompleto
    .replace(":id_sucursal", String(idSucursal))
    .replace(":cedula", String(cedula));

  const { data } = await SYNC_CONFIG.http.get<FullBodegaSyncResponse>(endpoint);
  return data;
}

/**
 * Obtiene las sucursales destino disponibles para traspasos.
 * Se ejecuta desde una sucursal específica para obtener las sucursales a las
 * que se pueden hacer traspasos.
 *
 * @param idSucursal - ID de la sucursal origen
 * @returns Array de sucursales destino con su información
 * @throws Si la llamada al servidor falla
 */
export async function getSucursalesDestinoTraspaso(
  idSucursal: number
): Promise<SucursalConTraspasoDTO[]> {
  const endpoint = SYNC_CONFIG.endpoints.syncSucursalesDestino
    .replace(":id_sucursal", String(idSucursal));

  const { data } = await SYNC_CONFIG.http.syncGet<SucursalConTraspasoDTO[]>(endpoint);

  if (!Array.isArray(data)) {
    throw new Error("Respuesta inválida del servidor: no es un array de sucursales");
  }

  return data;
}

/**
 * Obtiene el paquete completo de bodegas del usuario usando la V2 (por cedula).
 * Filtra las relaciones de traspaso por USUARIO en vez de por sucursal.
 *
 * @param cedula - Cédula del usuario
 * @returns FullBodegaSyncResponseV2 con bodegas propias, traspaso y relaciones
 * @throws Si la llamada al servidor falla
 */
export async function getFullDataSincronizacionBodegasV2(
  cedula: number
): Promise<FullBodegaSyncResponseV2> {
  const endpoint = SYNC_CONFIG.endpoints.syncBodegasCompletoV2
    .replace(":cedula", String(cedula));

  const { data } = await SYNC_CONFIG.http.get<FullBodegaSyncResponseV2>(endpoint);
  return data;
}