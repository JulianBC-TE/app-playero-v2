/**
 * @module Playero/Backend/API/tanqueAPI
 * API centralizada para obtener tanques filtrados por bodegas.
 * Utiliza SYNC_CONFIG para el endpoint y httpClient para la comunicación.
 */
import { TanqueDTO } from "@/dto/TanqueDTO";
import { SYNC_CONFIG } from "./syncConfig";
import { TanqueInput } from "../db/modules/tanqueDB";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type SyncTanqueRequest = {
  bodegas: number[];
};

// ---------------------------------------------------------------------------
// fetchTanquesPorBodegas
// POST /sync/tanque
// Obtiene los tanques desde el servidor filtrados por bodegas.
// ---------------------------------------------------------------------------

/**
 * Obtiene los tanques desde el servidor filtrados por bodegas.
 * Responsable únicamente del request HTTP y tipado de respuesta.
 *
 * @param idsBodegas - IDs de bodegas autorizadas para filtrar
 * @returns Array de tanques obtenidos del servidor
 * @throws Si la llamada al servidor falla o la respuesta no es un array válido
 */
export async function fetchTanquesPorBodegas(
  idsBodegas: number[]
): Promise<TanqueInput[]> {
  if (!Array.isArray(idsBodegas) || idsBodegas.length === 0) {
    throw new Error("Se requiere al menos una bodega para obtener tanques");
  }

  const payload: SyncTanqueRequest = { bodegas: idsBodegas };

  const { data: tanquesServidor } = await SYNC_CONFIG.http.syncPost<TanqueInput[]>(
    SYNC_CONFIG.endpoints.syncTanques,
    payload
  );

  if (!Array.isArray(tanquesServidor)) {
    throw new Error("Respuesta inválida del servidor: tanques no es un array");
  }

  return tanquesServidor;
}