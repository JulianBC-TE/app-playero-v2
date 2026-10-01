/**
 * @module Playero/Backend/API/sucursalAPI
 * @category HTTP Clients
 * 
 * Todas las llamadas HTTP relacionadas a la entidad Sucursal.
 * Las pantallas y contextos importan de aquí — nunca usan axios directamente.
 * Utiliza SYNC_CONFIG para centralizar endpoints y httpClient.
 *
 * ENDPOINTS:
 *   GET /sync/usuario-bodega-traspaso/sucursales/:cedula → sucursales destino por usuario
 */

import { SYNC_CONFIG } from "./syncConfig";
import { SucursalDTO } from "@/dto/sucursalDTO";

// ---------------------------------------------------------------------------
// getSucursalesDestinoTraspasoPorUsuario
// GET /sync/usuario-bodega-traspaso/sucursales/:cedula
// Obtiene las sucursales disponibles como destino para traspasos
// filtradas por USUARIO (via cedula).
// ---------------------------------------------------------------------------

/**
 * Obtiene las sucursales destino disponibles para traspasos filtradas por usuario.
 *
 * @param cedula - Cédula del usuario logueado
 * @returns Array de sucursales destino disponibles para el usuario
 * @throws Si la llamada al servidor falla
 */
export async function getSucursalesDestinoTraspasoPorUsuario(
  cedula: number
): Promise<SucursalDTO[]> {
  const endpoint = SYNC_CONFIG.endpoints.syncSucursalesDestinoV2
    .replace(":cedula", String(cedula));

  const { data } = await SYNC_CONFIG.http.syncGet<SucursalDTO[]>(endpoint);

  if (!Array.isArray(data)) {
    throw new Error(
      "Respuesta inválida del servidor: sucursales destino no es un array"
    );
  }

  return data;
}
