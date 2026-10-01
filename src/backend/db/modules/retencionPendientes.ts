/**
 * Módulo de retención de catálogos con registros pendientes.
 *
 * @remarks
 * Cuando baja la sincronización de asignación se purgan las bodegas/picos/tanques
 * que ya no pertenecen al usuario. Si existe algún registro con `sync = 0`
 * (pendiente de subir) o `sync = -1` (subida fallida) que referencie esas bodegas,
 * purgarlas dejaría esos registros sin catálogo asociado y rompería su visualización
 * en el Resumen.
 *
 * Este módulo expone el conjunto de bodegas que deben conservarse por ese motivo.
 *
 * @module Playero/Backend/DB/Modules/RetencionPendientes
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import {
  tickets,
  turnos,
  trapasos,
  calibraciones,
  abastecimientos,
} from "@/backend/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * Devuelve los IDs de bodegas referenciadas por registros que todavía no se
 * subieron (`sync = 0`) o que fallaron al subir (`sync = -1`).
 *
 * @returns Array único de `idBodega`, o `[]` si no hay registros pendientes.
 */
export async function getIdsBodegasConPendientes(): Promise<number[]> {
  try {
    const [pendTickets, pendTurnos, pendTraspasos, pendCalibraciones, pendAbastecimientos] =
      await Promise.all([
        db
          .select({ id: tickets.id_bod })
          .from(tickets)
          .where(or(eq(tickets.sync, 0), eq(tickets.sync, -1))),
        db
          .select({ id: turnos.idBodega })
          .from(turnos)
          .where(or(eq(turnos.sync, 0), eq(turnos.sync, -1))),
        db
          .select({ origen: trapasos.bodOrigen, destino: trapasos.bodDestino })
          .from(trapasos)
          .where(or(eq(trapasos.sync, 0), eq(trapasos.sync, -1))),
        db
          .select({ id: calibraciones.bodega })
          .from(calibraciones)
          .where(or(eq(calibraciones.sync, 0), eq(calibraciones.sync, -1))),
        db
          .select({ id: abastecimientos.idBod })
          .from(abastecimientos)
          .where(or(eq(abastecimientos.sync, 0), eq(abastecimientos.sync, -1))),
      ]);

    const ids = new Set<number>();

    for (const fila of pendTickets) ids.add(fila.id);
    for (const fila of pendTurnos) ids.add(fila.id);
    for (const fila of pendTraspasos) {
      ids.add(fila.origen);
      ids.add(fila.destino);
    }
    for (const fila of pendCalibraciones) ids.add(fila.id);
    for (const fila of pendAbastecimientos) ids.add(fila.id);

    return Array.from(ids);
  } catch (error) {
    console.error("Error al calcular bodegas con pendientes:", error);
    return [];
  }
}

/**
 * Devuelve el conjunto de bodegas que deben conservarse en la BD local:
 * las recibidas del servidor **más** las que tienen registros pendientes.
 *
 * @param idsRemotos - IDs de bodegas devueltas por el servidor para el usuario.
 * @returns Array único de `idBodega` a conservar.
 */
export async function getBodegasRetenidas(
  idsRemotos: number[],
): Promise<number[]> {
  const pendientes = await getIdsBodegasConPendientes();
  return Array.from(new Set([...idsRemotos, ...pendientes]));
}
