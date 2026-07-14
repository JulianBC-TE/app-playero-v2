/**
 * @module Playero/Backend/API/picoAPI
 * API centralizada para obtener picos filtrados por bodegas.
 * Utiliza SYNC_CONFIG para el endpoint y httpClient para la comunicación.
 */
import { PicoDTO } from "@/dto/PicosDTO";
import { SYNC_CONFIG } from "./syncConfig";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type SyncPicoRequest = {
  bodegas: number[];
};

// ---------------------------------------------------------------------------
// fetchPicosPorBodegas
// POST /sync/pico
// Obtiene los picos desde el servidor filtrados por bodegas.
// ---------------------------------------------------------------------------

/**
 * Obtiene los picos desde el servidor filtrados por bodegas.
 * Responsable únicamente del request HTTP y tipado de respuesta.
 *
 * @param idsBodegas - IDs de bodegas autorizadas para filtrar
 * @returns Array de picos obtenidos del servidor
 * @throws Si la llamada al servidor falla o la respuesta no es un array válido
 */
export async function fetchPicosPorBodegas(
  idsBodegas: number[]
): Promise<PicoDTO[]> {
  if (!Array.isArray(idsBodegas) || idsBodegas.length === 0) {
    throw new Error("Se requiere al menos una bodega para obtener picos");
  }

  const payload: SyncPicoRequest = { bodegas: idsBodegas };

  const { data: picosServidor } = await SYNC_CONFIG.http.syncPost<PicoDTO[]>(
    SYNC_CONFIG.endpoints.syncPicos,
    payload
  );

  if (!Array.isArray(picosServidor)) {
    throw new Error("Respuesta inválida del servidor: picos no es un array");
  }

  return picosServidor;
}