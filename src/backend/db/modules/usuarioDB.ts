/**
 * @module Playero/Backend/DB/Modules/Usuario
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { usuariosApp, sucursales } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

export async function getSesionUsuarioActivoLocal() {
  try {
    // Al haber un solo registro en usuarios_app, traemos su cédula
    // y hacemos el innerJoin para obtener los datos de su sucursal vinculada.
    const resultado = await db
      .select({
        cedula: usuariosApp.cedula,
        id_sucursal: sucursales.idSucursal,
        descripcion_sucursal: sucursales.descripcionSucursal,
      })
      .from(usuariosApp)
      .innerJoin(sucursales, eq(usuariosApp.idSucursal, sucursales.idSucursal))
      .limit(1);

    return resultado[0] || null;
  } catch (error) {
    console.error("[DB] Error al obtener la sesión del usuario activo:", error);
    throw error;
  }
}