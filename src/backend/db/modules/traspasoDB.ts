/**
 * @module Playero/Backend/DB/Modules/Traspaso
 * @category Database Modules
 */
// Módulo de base de datos para traspasos.
// Reemplaza las llamadas a:
//   - api.get("api/registros/turno/status/...")  → usar getTurnoStatusLocal()
//   - api.get("/api/picos/")                     → usar getPicosByBodega()
//   - api.get(`api/bodegas/...`)                 → usar getBodegasByIdSucursal() / getBodegasTraspaso()
//   - api.post("/api/traspasos")                 → saveTraspasoLocal()
//
// Schema: trapasos(idTrapaso PK, json, tipo, sync, fecha, hora, estado)
//
// REGLAS DE NEGOCIO:
//   - Los traspasos se crean localmente con sync=0.
//   - Un proceso de sincronización posterior los envía al servidor.

import { db } from "@/backend/db/client";
import { trapasos, syncs } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { TraspasoDTO } from "@/dto/TraspasoDTO";

const SYNC_KEY = "__last_sync_traspasos__";

// ---------------------------------------------------------------------------
// Tipo: payload que se envía al servidor (sin campos internos)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// saveTraspasoLoca
// Inserta un traspaso pendiente de sincronización.
// Devuelve el ID generado por SQLite.
// ---------------------------------------------------------------------------

export async function saveTraspasoLocal(dto: TraspasoDTO["json"]): Promise<number> {
  const result = await db.insert(trapasos).values({
    json: JSON.stringify(dto),
    tipo: "TRASPASO",
    sync: 0,
    fecha: Date.now(),
    hora: Date.now(),
    estado: 1,
  });
  return (result as any).lastInsertRowId ?? 0;
}

// ---------------------------------------------------------------------------
// getTraspasosPendientes
// Devuelve los registros aún no sincronizados (sync = 0).
// ---------------------------------------------------------------------------

export async function getTraspasosPendientes() {
  const rows = await db.select().from(trapasos).where(eq(trapasos.sync, 0)).orderBy(desc(trapasos.fecha));
  return rows.map((r) => ({
    ...r,
    dto: JSON.parse(r.json) as TraspasoDTO["json"],  // json → dto
  }));
}

// ---------------------------------------------------------------------------
// marcarTraspasoSync
// ---------------------------------------------------------------------------

export async function marcarTraspasoSync(id: number): Promise<void> {
  await db.update(trapasos).set({ sync: 1 }).where(eq(trapasos.idTrapaso, id));
}

// ---------------------------------------------------------------------------
// marcarTraspasoErrorSync
// ---------------------------------------------------------------------------

export async function marcarTraspasoErrorSync(id: number): Promise<void> {
  await db.update(trapasos).set({ sync: -1 }).where(eq(trapasos.idTrapaso, id));
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
