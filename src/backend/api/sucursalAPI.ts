/**
 * @module Playero/Backend/API/sucursalAPI
 * @category HTTP Clients
 * 
 * Todas las llamadas HTTP relacionadas a la entidad Sucursal.
 * Las pantallas y contextos importan de aquí — nunca usan axios directamente.
 * Utiliza SYNC_CONFIG para centralizar endpoints y httpClient.
 *
 * ENDPOINTS:
 *   GET /api/sucursales                    → listar todas
 *   GET /api/sucursales/:idSucursal        → buscar por ID
 *   GET /sync/sucursal-bodega-traspaso/sucursales/:id_sucursal → sucursales destino
 */

import { SYNC_CONFIG } from "./syncConfig";
import { SucursalDTO } from "@/dto/sucursalDTO";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export type SucursalResponse = {
  id_sucursal: number;
  descripcion_sucursal: string;
};

// ---------------------------------------------------------------------------
// getSucursales
// GET /api/sucursales
// Devuelve todas las sucursales del servidor.
// ---------------------------------------------------------------------------

/**
 * Obtiene todas las sucursales disponibles del servidor.
 *
 * @returns Array con todas las sucursales
 * @throws Si la llamada al servidor falla
 */
export async function getSucursales(): Promise<SucursalDTO[]> {
  const { data } = await SYNC_CONFIG.http.get<SucursalDTO[]>(
    SYNC_CONFIG.endpoints.sucursales
  );
  return data;
}

// ---------------------------------------------------------------------------
// getSucursalById
// GET /api/sucursales/:idSucursal
// Devuelve una sucursal por su ID. Devuelve null si no existe (404).
// ---------------------------------------------------------------------------

/**
 * Obtiene una sucursal específica por su ID.
 *
 * @param idSucursal - ID de la sucursal a buscar
 * @returns Sucursal encontrada, o null si no existe (error 404)
 * @throws Si ocurre un error diferente a 404
 */
export async function getSucursalById(
  idSucursal: number
): Promise<SucursalDTO | null> {
  try {
    const { data } = await SYNC_CONFIG.http.get<SucursalDTO>(
      `${SYNC_CONFIG.endpoints.sucursales}/${idSucursal}`
    );
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message?.includes("404")) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// getSucursalesDestinoTraspaso
// GET /sync/sucursal-bodega-traspaso/sucursales/:id_sucursal
// Obtiene las sucursales disponibles como destino para traspasos desde
// una sucursal específica.
// ---------------------------------------------------------------------------

/**
 * Obtiene las sucursales destino disponibles para traspasos desde una sucursal.
 * 
 * Se ejecuta desde una sucursal específica para obtener el catálogo de sucursales
 * a las que se pueden hacer traspasos de bodegas.
 *
 * @param idSucursal - ID de la sucursal origen
 * @returns Array de sucursales destino disponibles
 * @throws Si la llamada al servidor falla
 */
export async function getSucursalesDestinoTraspaso(
  idSucursal: number
): Promise<SucursalDTO[]> {
  const endpoint = SYNC_CONFIG.endpoints.syncSucursalesDestino
    .replace(":id_sucursal", String(idSucursal));
  // ✅ Usa syncGet sin pasar nada extra
  // El token JWT viene automáticamente en el header Authorization
  const { data } = await SYNC_CONFIG.http.syncGet<SucursalDTO[]>(endpoint);
  //console.log("flag", data);

  if (!Array.isArray(data)) {
    throw new Error(
      "Respuesta inválida del servidor: sucursales destino no es un array"
    );
  }

  return data;
}

/**
 * ⚠️ DEPRECATED: Usar getSucursalesDestinoTraspaso() en su lugar
 * 
 * Mantiene compatibilidad hacia atrás.
 * @deprecated
 */
export async function syncGetSucursales(
  idSucursal: number
): Promise<SucursalDTO[]> {
  return getSucursalesDestinoTraspaso(idSucursal);
}