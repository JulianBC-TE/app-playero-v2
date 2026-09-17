/**
 * Módulo para duplicar registros existentes con sync = -1 (para pruebas de reenvío).
 *
 * @module Playero/Backend/DB/Modules/DuplicarConError
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { tickets, trapasos, calibraciones, abastecimientos, turnos, medicionesTanque } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import type { TipoRegistro } from "./resumenBD";

export async function duplicarRegistroConError(
  tipo: TipoRegistro,
  id: string | number,
): Promise<boolean> {
  const idNum = Number(id);

  switch (tipo) {
    case "salida":
      return await duplicarTicket(idNum);
    case "traspaso":
      return await duplicarTraspaso(idNum);
    case "calibracion":
      return await duplicarCalibracion(idNum);
    case "abastecimiento":
      return await duplicarAbastecimiento(idNum);
    case "turno":
      return await duplicarTurno(idNum);
    default:
      return false;
  }
}

// ── Tickets ──────────────────────────────────────────────────────────────────

async function duplicarTicket(idTicket: number): Promise<boolean> {
  const result = await db.select().from(tickets).where(eq(tickets.idTicket, idTicket)).limit(1);
  if (!result[0]) return false;

  const row = result[0];
  const { idTicket: _, ...rest } = row;

  await db.insert(tickets).values({
    ...rest,
    sync: -1,
  });

  return true;
}

// ── Traspasos ────────────────────────────────────────────────────────────────

async function duplicarTraspaso(idTraspaso: number): Promise<boolean> {
  const result = await db.select().from(trapasos).where(eq(trapasos.idTrapaso, idTraspaso)).limit(1);
  if (!result[0]) return false;

  const row = result[0];
  const { idTrapaso: _, ...rest } = row;

  await db.insert(trapasos).values({
    ...rest,
    sync: -1,
  });

  return true;
}

// ── Calibraciones ────────────────────────────────────────────────────────────

async function duplicarCalibracion(idCalibracion: number): Promise<boolean> {
  const result = await db.select().from(calibraciones).where(eq(calibraciones.idCalibracion, idCalibracion)).limit(1);
  if (!result[0]) return false;

  const row = result[0];
  const { idCalibracion: _, ...rest } = row;

  await db.insert(calibraciones).values({
    ...rest,
    sync: -1,
  });

  return true;
}

// ── Abastecimientos ──────────────────────────────────────────────────────────

async function duplicarAbastecimiento(idAbastecimiento: number): Promise<boolean> {
  const result = await db.select().from(abastecimientos).where(eq(abastecimientos.idAbastecimiento, idAbastecimiento)).limit(1);
  if (!result[0]) return false;

  const row = result[0];
  const { idAbastecimiento: _, ...rest } = row;

  const nuevoId = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(abastecimientos).values({
      ...rest,
      sync: -1,
    }).returning({ id: abastecimientos.idAbastecimiento });

    const nuevasMediciones = await tx
      .select()
      .from(medicionesTanque)
      .where(eq(medicionesTanque.abastecimientoId, idAbastecimiento));

    if (nuevasMediciones.length > 0) {
      await tx.insert(medicionesTanque).values(
        nuevasMediciones.map((m) => {
          const { id: _, ...medRest } = m;
          return { ...medRest, abastecimientoId: inserted.id };
        })
      );
    }

    return inserted.id;
  });

  return nuevoId > 0;
}

// ── Turnos ───────────────────────────────────────────────────────────────────

async function duplicarTurno(idTurno: number): Promise<boolean> {
  const result = await db.select().from(turnos).where(eq(turnos.idTurno, idTurno)).limit(1);
  if (!result[0]) return false;

  const row = result[0];
  const { idTurno: _, ...rest } = row;

  await db.insert(turnos).values({
    ...rest,
    sync: -1,
  });

  return true;
}
