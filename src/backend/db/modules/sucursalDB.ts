/**
 * @module Backend/DB/Modules/Sucursal
 * @category Database Modules
 */
// Módulo de base de datos para sucursales.
// Las sucursales son un catálogo de solo lectura que se sincroniza desde el servidor.
//
// REGLAS DE NEGOCIO:
//   - Las sucursales no se crean localmente, solo se descargan del servidor.
//   - saveSucursales() hace upsert masivo para mantener el catálogo actualizado.
//   - getSucursales() devuelve todas las sucursales para el Select de Setup.
//   - getSucursalById() devuelve una sucursal por ID para mostrar en la UI.

import { db } from "@/backend/db/client";
import { sucursales, syncs, usuariosApp } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";
import axios from "axios"; // solo como fallback

// Clave en tabla syncs para registrar la última sincronización de sucursales.
const SYNC_KEY = "__last_sync_sucursales__";

// ---------------------------------------------------------------------------
// saveSucursales
// Upsert masivo de sucursales recibidas del servidor.
// Llamar tras un fetch exitoso a /api/sucursales (o similar).
// ---------------------------------------------------------------------------

export async function saveSucursales(items: SucursalDTO[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(sucursales)
      .values({
        idSucursal: item.id_sucursal,
        descripcionSucursal: item.descripcion_sucursal,
      })
      .onConflictDoUpdate({
        target: sucursales.idSucursal,
        set: { descripcionSucursal: item.descripcion_sucursal },
      });
  }

  // Registrar timestamp de sincronización
  await db
    .insert(syncs)
    .values({ tipo: SYNC_KEY, fecha: Date.now() })
    .onConflictDoUpdate({
      target: syncs.tipo,
      set: { fecha: Date.now() },
    });
}

// ---------------------------------------------------------------------------
// getSucursales
// Devuelve todas las sucursales del catálogo local.
// Usado en el Select de la pantalla Setup.
// ---------------------------------------------------------------------------

export async function getSucursales(): Promise<SucursalDTO[]> {
  const rows = await db
    .select({
      idSucursal: sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(sucursales);

  return rows.map((r) => ({
    id_sucursal: r.idSucursal,
    descripcion_sucursal: r.descripcionSucursal,
  }));
}

// ---------------------------------------------------------------------------
// getSucursalById
// Devuelve una sucursal por su ID.
// Usado para mostrar el nombre de la sucursal activa en la UI.
// ---------------------------------------------------------------------------

export async function getSucursalById(
  idSucursal: number,
): Promise<SucursalDTO | null> {
  const rows = await db
    .select({
      idSucursal: sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(sucursales)
    .where(eq(sucursales.idSucursal, idSucursal))
    .limit(1);

  if (!rows[0]) return null;

  return {
    id_sucursal: rows[0].idSucursal,
    descripcion_sucursal: rows[0].descripcionSucursal,
  };
}

// ---------------------------------------------------------------------------
// getLastSyncDate
// Devuelve el timestamp de la última sincronización de sucursales.
// Retorna null si nunca se sincronizó.
// ---------------------------------------------------------------------------

export async function getLastSyncDate(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, SYNC_KEY))
      .limit(1);

    return result[0] ? result[0].fecha : null;
  } catch {
    return null;
  }
}

//Sync
export async function syncSucursalesFromCentral() {
  try {
    const { data } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.sucursales);
    await saveSucursales(data);
    console.log(`✅ ${data.length} sucursales sincronizadas`);
    return data.length;
  } catch (error) {
    console.error("❌ Error sync sucursales:", error);
    throw error;
  }
}

export async function getSucursalUsuarioActivoLocal() {
  try {
    const resultado = await db
      .select({
        cedula: usuariosApp.cedula,               // <-- Asegúrate de pedir la cédula aquí
        id_sucursal: sucursales.idSucursal,
        descripcion_sucursal: sucursales.descripcionSucursal,
      })
      .from(usuariosApp)
      .innerJoin(sucursales, eq(usuariosApp.idSucursal, sucursales.idSucursal))
      .limit(1);

    return resultado[0] || null; 
  } catch (error) {
    console.error(error);
    throw error;
  }
}