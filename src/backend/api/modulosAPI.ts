/**
 * @module Playero/Backend/API/modulosApi
 * @category HTTP Clients
 */
// Consume el endpoint de privilegios del servidor y traduce la respuesta
// al formato de columnas booleanas de la tabla modulos_usuarios.

import { httpClient } from "./httpClient";
import type {
  ModulosServerResponse,
  ModulosLocal,
  ModuloKey,
} from "@/dto/modulosDTO";

// Conjunto de claves válidas: coincide exactamente con las columnas de la tabla.
const MODULOS_VALIDOS = new Set<ModuloKey>([
  "abastecimiento",
  "calibracion",
  "traspaso",
  "salida",
  "vehiculo",
  "persona",
]);

function isModuloKey(value: string): value is ModuloKey {
  return MODULOS_VALIDOS.has(value as ModuloKey);
}

// ---------------------------------------------------------------------------
// fetchModulos  —  GET /api/privilegios/:cedula
// ---------------------------------------------------------------------------

/**
 * Llama al endpoint de privilegios con la cédula del operario autenticado.
 *
 * @param cedula - Cédula del operario que inició sesión.
 * @returns Matriz de permisos en formato del servidor.
 */
async function fetchModulos(cedula: string): Promise<ModulosServerResponse> {
  const { data } = await httpClient.get<ModulosServerResponse>(
    `/api/privilegios/${cedula}`
  );
  return data;
}

// ---------------------------------------------------------------------------
// translateModulos  —  formato servidor → columnas booleanas locales
// ---------------------------------------------------------------------------

/**
 * Convierte la matriz de permisos del servidor en un objeto `ModulosLocal`
 * con valores booleanos, listo para insertarse en `modulos_usuarios`.
 *
 * - Módulos desconocidos (no son columnas de la tabla) se ignoran silenciosamente.
 * - Módulos ausentes en la respuesta quedan en `false` (valor por defecto seguro).
 *
 * @param cedula - Cédula del operario (PK de la fila).
 * @param serverData - Respuesta cruda del endpoint de privilegios.
 * @returns Objeto con todos los campos de `modulos_usuarios` completos.
 */
export function translateModulos(
  cedula: string,
  serverData: ModulosServerResponse
): ModulosLocal {
  // Partir de todos los módulos deshabilitados por defecto
  const resultado: ModulosLocal = {
    cedula: Number(cedula),
    abastecimiento: false,
    calibracion: false,
    traspaso: false,
    salida: false,
    vehiculo: false,
    persona: false,
  };

  for (const row of serverData) {
    if (isModuloKey(row.modulo)) {
      resultado[row.modulo] = row.habilitado === 1;
    }
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// getModulosTraducidos  —  orquesta fetch + traducción
// ---------------------------------------------------------------------------

/**
 * Obtiene los módulos habilitados para un operario desde el servidor
 * y los devuelve ya traducidos como `ModulosLocal`.
 *
 * Es la única función que consume `modulosDB.ts` para sincronizar.
 *
 * @param cedula - Cédula del operario que inició sesión.
 * @returns Objeto `ModulosLocal` listo para persistir en la BD.
 * @throws Si el servidor no está disponible o devuelve un error HTTP.
 */
export async function getModulosTraducidos(cedula: string): Promise<ModulosLocal> {
  const serverData = await fetchModulos(cedula);
  return translateModulos(cedula, serverData);
}