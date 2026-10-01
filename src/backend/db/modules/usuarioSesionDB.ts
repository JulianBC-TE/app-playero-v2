/**
 * Módulo de acceso al usuario con sesión activa en el dispositivo.
 *
 * @remarks
 * La tabla `usuarios_app` puede contener más de una fila (cada login online
 * hace un upsert por cédula y el cierre de sesión no borra la fila). Por eso
 * no basta con `LIMIT 1`: hay que apoyarse en la cédula del último usuario
 * autenticado online (`syncs.__last_online_user__`) para no leer la sucursal
 * o el estado de bloqueo de otro usuario.
 *
 * @module Playero/Backend/DB/Modules/UsuarioSesion
 */
import { db } from "@/backend/db/client";
import { syncs, usuariosApp } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

/** Clave en la tabla `syncs` que guarda la cédula del último login online. */
export const LAST_USER_KEY = "__last_online_user__";

export type UsuarioSesion = {
  cedula: number;
  idUser: number;
  idSucursal: number;
  bloqueado: boolean;
};

/**
 * Cédula del último usuario que inició sesión online en este dispositivo.
 * @returns Cédula como número, o `null` si nunca hubo login online.
 */
export async function getCedulaUsuarioActivo(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, LAST_USER_KEY))
      .limit(1);

    return result[0] ? Number(result[0].fecha) : null;
  } catch (error) {
    console.error("Error getCedulaUsuarioActivo:", error);
    return null;
  }
}

/**
 * Fila de `usuarios_app` correspondiente al usuario con sesión activa.
 * Si no hay registro del último usuario, cae al primero (compatibilidad con
 * bases sembradas sin `__last_online_user__`).
 */
export async function getUsuarioSesionLocal(): Promise<UsuarioSesion | null> {
  try {
    const cedula = await getCedulaUsuarioActivo();

    if (cedula !== null) {
      const rows = await db
        .select({
          cedula: usuariosApp.cedula,
          idUser: usuariosApp.idUser,
          idSucursal: usuariosApp.idSucursal,
          bloqueado: usuariosApp.bloqueado,
        })
        .from(usuariosApp)
        .where(eq(usuariosApp.cedula, cedula))
        .limit(1);

      if (rows[0]) return rows[0];
    }

    const rows = await db
      .select({
        cedula: usuariosApp.cedula,
        idUser: usuariosApp.idUser,
        idSucursal: usuariosApp.idSucursal,
        bloqueado: usuariosApp.bloqueado,
      })
      .from(usuariosApp)
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error("Error getUsuarioSesionLocal:", error);
    return null;
  }
}
