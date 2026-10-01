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

// Define primero el formato de cada relación individual (opcional pero recomendado para mantener orden)
export type RelacionUsuarioBodegaServerDTO = {
  cedula: number;
  id_bodega: number;
};

// Respuesta V2: relaciones_traspaso usa cedula en vez de id_sucursal
export type FullBodegaSyncResponseV2 = {
  bodegas_propias: BodegaServerSyncDTO[];
  bodegas_traspaso: BodegaServerSyncDTO[];
  relaciones_traspaso: { cedula: number; id_bodega_destino: number }[];
  usuario_bodegas: RelacionUsuarioBodegaServerDTO[];
};

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
