import { db } from "@/backend/db/client";
import { tickets, trapasos, calibraciones, abastecimientos, turnos } from "@/backend/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Resetea todos los registros con sync = -1 (fallidos) a sync = 0
 * para que el motor de sincronización los reintente.
 * Se ejecuta al iniciar sesión con el mismo usuario.
 */
export async function reintentarSyncFallidas(cedula: number): Promise<void> {
  await db.update(tickets).set({ sync: 0 })
    .where(and(eq(tickets.sync, -1), eq(tickets.ci_playero, cedula)));

  await db.update(trapasos).set({ sync: 0 })
    .where(and(eq(trapasos.sync, -1), eq(trapasos.idPlayero, cedula)));

  await db.update(calibraciones).set({ sync: 0 })
    .where(and(eq(calibraciones.sync, -1), eq(calibraciones.ciEncargado, cedula)));

  await db.update(abastecimientos).set({ sync: 0 })
    .where(and(eq(abastecimientos.sync, -1), eq(abastecimientos.playero, cedula)));

  await db.update(turnos).set({ sync: 0 })
    .where(eq(turnos.sync, -1));
}
