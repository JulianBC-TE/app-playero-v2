// srcDBmodules/tanqueDB.ts
//
// Módulo de base de datos para tanques.
// Los tanques son catálogo de solo lectura sincronizado desde el servidor.
//
// REGLAS DE NEGOCIO:
//   - Los tanques no se crean localmente, solo se descargan del servidor.
//   - Cada tanque pertenece a una bodega (idBodega).
//   - getTanquesByBodega() es la función principal: usada en Medicion y MedicionAbastecimiento
//     para poblar el Select de tanques disponibles en la bodega activa.

import { db } from "@/backend/db/client";
import { tanques, syncs } from "@/backend/db/schema";
import { bodegas } from "../schema";   // ← Agregar esta línea
import { eq } from "drizzle-orm";
import { TanqueDTO } from "@/dto/TanqueDTO";
import { SYNC_CONFIG } from "../constants/syncConfig";

// Clave en tabla syncs para registrar la última sincronización de tanques.
const SYNC_KEY = "__last_sync_tanques__";

// ---------------------------------------------------------------------------
// Tipo extendido para el upsert
// El DTO público tiene id_tanque, descripcion_tanque, capacidad_litros.
// Internamente también necesitamos idBodega para poder filtrar.
// ---------------------------------------------------------------------------

type TanqueInput = TanqueDTO & { id_bodega: number };

// ---------------------------------------------------------------------------
// saveTanques
// Upsert masivo de tanques recibidos del servidor.
// ---------------------------------------------------------------------------

export async function saveTanques(items: TanqueInput[]): Promise<void> {
  if (items.length === 0) return;

  for (const item of items) {
    await db
      .insert(tanques)
      .values({
        idTanque: item.id_tanque,
        descripcionTanque: item.descripcion_tanque,
        idBodega: item.id_bodega,
        capacidadLitros: item.capacidad_litros ?? null,
      })
      .onConflictDoUpdate({
        target: tanques.idTanque,
        set: {
          descripcionTanque: item.descripcion_tanque,
          idBodega: item.id_bodega,
          capacidadLitros: item.capacidad_litros ?? null,
        },
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
// getTanques
// Devuelve todos los tanques del catálogo local.
// ---------------------------------------------------------------------------

export async function getTanques(): Promise<TanqueDTO[]> {
  const rows = await db
    .select({
      idTanque: tanques.idTanque,
      descripcionTanque: tanques.descripcionTanque,
      capacidadLitros: tanques.capacidadLitros,
    })
    .from(tanques);

  return rows.map((r) => ({
    id_tanque: r.idTanque,
    descripcion_tanque: r.descripcionTanque,
    capacidad_litros: r.capacidadLitros ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// getTanquesByBodega
// Devuelve los tanques de una bodega específica.
// Usado en los Select de las pantallas Medicion y MedicionAbastecimiento.
// ---------------------------------------------------------------------------

export async function getTanquesByBodega(
  idBodega: number,
): Promise<TanqueDTO[]> {
  const rows = await db
    .select({
      idTanque: tanques.idTanque,
      descripcionTanque: tanques.descripcionTanque,
      capacidadLitros: tanques.capacidadLitros,
    })
    .from(tanques)
    .where(eq(tanques.idBodega, idBodega));

  return rows.map((r) => ({
    id_tanque: r.idTanque,
    descripcion_tanque: r.descripcionTanque,
    capacidad_litros: r.capacidadLitros ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// getTanqueById
// Devuelve un tanque por su ID.
// Útil para mostrar detalles del tanque seleccionado en la pantalla de medición.
// ---------------------------------------------------------------------------

export async function getTanqueById(
  idTanque: number,
): Promise<TanqueDTO | null> {
  const rows = await db
    .select({
      idTanque: tanques.idTanque,
      descripcionTanque: tanques.descripcionTanque,
      capacidadLitros: tanques.capacidadLitros,
    })
    .from(tanques)
    .where(eq(tanques.idTanque, idTanque))
    .limit(1);

  if (!rows[0]) return null;

  return {
    id_tanque: rows[0].idTanque,
    descripcion_tanque: rows[0].descripcionTanque,
    capacidad_litros: rows[0].capacidadLitros ?? 0,
  };
}

// ---------------------------------------------------------------------------
// getLastSyncDate
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

// ====================== SINCRONIZACIÓN ======================

/**
 * Trae TODOS los tanques desde el servidor y filtra localmente
 * solo aquellos cuya bodega ya esté guardada en la BD local.
 */
export async function syncTanquesFromCentral(): Promise<number> {
  try {
    console.log("🔄 Sincronizando tanques desde central...");

    const { data: todosTanques } = await SYNC_CONFIG.http.get(SYNC_CONFIG.endpoints.tanques);

    if (!Array.isArray(todosTanques) || todosTanques.length === 0) {
      console.log("📭 No se recibieron tanques");
      return 0;
    }

    // Obtener IDs de bodegas locales
    const bodegasLocales = await db
      .select({ idBodega: bodegas.idBodega })
      .from(bodegas);

    const bodegasSet = new Set(bodegasLocales.map(b => b.idBodega));

    // Filtrar tanques
    const tanquesFiltrados = todosTanques.filter((t: any) => {
      return bodegasSet.has(Number(t.id_bodega));
    });

    await saveTanques(tanquesFiltrados);

    console.log(`✅ ${tanquesFiltrados.length} tanques guardados (de ${todosTanques.length} totales)`);
    return tanquesFiltrados.length;
  } catch (error) {
    console.error("❌ Error en syncTanquesFromCentral:", error);
    throw error;
  }
}