/**
 * @module Playero/DTO/Modulos
 * @category DTO
 */

// ---------------------------------------------------------------------------
// Formato del servidor (matriz de permisos raw)
// ---------------------------------------------------------------------------

/**
 * Nombre de módulos válidos tal como los envía el servidor.
 * Deben coincidir con los campos de la tabla `modulos_usuarios`.
 */
export type ModuloKey =
  | "abastecimiento"
  | "calibracion"
  | "traspaso"
  | "salida"
  | "vehiculo"
  | "persona";

/**
 * Representa una fila de la matriz de permisos tal como la envía el servidor.
 */
export type ModuloServerRow = {
  modulo: string;
  habilitado: number; // 1 | 0
};

/**
 * Respuesta completa del endpoint de privilegios.
 */
export type ModulosServerResponse = ModuloServerRow[];

// ---------------------------------------------------------------------------
// Formato local (columnas booleanas de modulos_usuarios)
// ---------------------------------------------------------------------------

/**
 * Espejo exacto de las columnas de `modulos_usuarios` en TypeScript.
 * Todos los campos son booleanos (Drizzle convierte 0/1 automáticamente).
 */
export type ModulosLocal = {
  cedula: number;
  abastecimiento: boolean;
  calibracion: boolean;
  traspaso: boolean;
  salida: boolean;
  vehiculo: boolean;
  persona: boolean;
};