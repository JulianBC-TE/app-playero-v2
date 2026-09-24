/**
 * Helper compartido para detectar registros duplicados.
 * Compara un registro nuevo contra el último registro de la misma bodega.
 *
 * @module Playero/Backend/DB/Modules/DuplicadosHelper
 * @category Database Modules
 */

/**
 * Compara dos objetos usando solo los campos indicados.
 * Para campos numéricos, compara con tolerancia de 0.001 (para floats).
 *
 * @returns true si TODOS los campos coinciden (es duplicado)
 */
export function compararCamposClave(
  nuevos: Record<string, any>,
  ultimo: Record<string, any>,
  campos: string[]
): boolean {
  return campos.every((campo) => {
    const valNuevo = nuevos[campo];
    const valUltimo = ultimo[campo];

    // Si ambos son null/undefined, se consideran iguales
    if (valNuevo == null && valUltimo == null) return true;
    // Si uno es null y el otro no, son diferentes
    if (valNuevo == null || valUltimo == null) return false;

    // Para campos numéricos (floats), comparar con tolerancia
    if (typeof valNuevo === 'number' && typeof valUltimo === 'number') {
      return Math.abs(valNuevo - valUltimo) < 0.001;
    }

    // Para todo lo demás, comparación exacta
    return String(valNuevo) === String(valUltimo);
  });
}
