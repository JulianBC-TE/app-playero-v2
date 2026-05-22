/**
 * Constantes y utilidades relacionadas con el estado de los turnos.
 *
 * @module Playero/Backend/DB/Constants/TurnoEstado
 * @category Constants
 */
export enum TurnoEstado {
  ACTIVO = 1,
  ANULADO = 0,
  CERRADO = 2,
  ANULADO_ADMIN = 3, // ← nombrar el estado 3
}
