/**
 * @module Playero/Backend/DB/Modules/Modulos
 * @category Database Modules
 */
// Persiste y consulta los módulos habilitados del usuario activo
// en la tabla local `modulos_usuarios`.
//
// FLUJO:
//   Login online  →  sincronizarModulos(cedula)   (escribe la fila)
//   Pantalla      →  getModulosDelUsuario(cedula)  (lee sin internet)

import { db } from "@/backend/db/client";
import { modulosUsuarios } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { getModulosTraducidos } from "@/backend/api/modulosAPI";
import type { ModulosLocal } from "@/dto/modulosDTO";

// ---------------------------------------------------------------------------
// sincronizarModulos
// Debe invocarse justo después del login online exitoso.
// ---------------------------------------------------------------------------

/**
 * Sincroniza los módulos habilitados para un operario con el servidor:
 * obtiene la lista traducida de la API y hace un upsert en `modulos_usuarios`.
 *
 * @param cedula - Cédula del operario autenticado.
 * @returns El objeto `ModulosLocal` que quedó persistido.
 * @throws Si la llamada al servidor falla (sin conexión u otro error HTTP).
 *
 * @example
 * ```ts
 * // En AuthContext, justo después de login online:
 * await sincronizarModulos(cedula);
 * ```
 */
export async function sincronizarModulos(cedula: string): Promise<ModulosLocal> {
  const modulos = await getModulosTraducidos(cedula);

  await db
    .insert(modulosUsuarios)
    .values(modulos)
    .onConflictDoUpdate({
      target: modulosUsuarios.cedula,
      set: {
        abastecimiento: modulos.abastecimiento,
        calibracion:    modulos.calibracion,
        traspaso:       modulos.traspaso,
        salida:         modulos.salida,
        vehiculo:       modulos.vehiculo,
        persona:        modulos.persona,
      },
    });

  return modulos;
}

// ---------------------------------------------------------------------------
// getModulosDelUsuario
// Consulta local, no requiere internet.
// ---------------------------------------------------------------------------

/**
 * Devuelve todos los módulos del usuario desde la BD local.
 * No requiere conexión a internet.
 *
 * @param cedula - Cédula del operario.
 * @returns Objeto `ModulosLocal` con todos los permisos, o `null` si el
 *          usuario nunca sincronizó (primer uso, sin login online previo).
 *
 * @example
 * ```ts
 * const permisos = await getModulosDelUsuario("12345678");
 * if (permisos?.despacho) { ... }
 * ```
 */
export async function getModulosDelUsuario(
  cedula: string
): Promise<ModulosLocal | null> {
  try {
    const rows = await db
      .select()
      .from(modulosUsuarios)
      .where(eq(modulosUsuarios.cedula, Number(cedula)))
      .limit(1);

    if (!rows[0]) return null;

    // Drizzle ya convierte 0/1 a boolean gracias a { mode: "boolean" }
    return rows[0] as ModulosLocal;
  } catch (error) {
    console.error("[DB] Error al obtener módulos del usuario:", error);
    return null;
  }
}