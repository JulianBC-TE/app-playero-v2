/**
 * @module Playero/Backend/DB/Modules/Ticket
 * @category Database Modules
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { tickets } from "../schema";
import { TicketDTO } from "@/dto/TicketDTO";


/**
 * Crear ticket local (salida offline)
 */
export async function crearTicketLocal(
  dto: TicketDTO,
  fecha?: number,
  hora?: number,
): Promise<number> {
  const result = await db.insert(tickets).values({
    json: JSON.stringify(dto),   // serialización: responsabilidad del DB
    tipo: dto.tipo,
    fecha: fecha ?? Date.now(),
    hora: hora ?? Date.now(),
    sync: 0,
    estado: 1,
  });
  return (result as any).lastInsertRowId ?? 0;
}

/**
 * Obtener ticket por id
 */
export async function getTicketById(idTicket: number) {
  const result = await db
    .select()
    .from(tickets)
    .where(eq(tickets.idTicket, idTicket));

  if (!result.length) return null;

  return {
    ...result[0],
    json: JSON.parse(result[0].json),
  };
}

/**
 * Obtener tickets pendientes de sincronización
 */
export async function getTicketsPendientes(): Promise<{
  idTicket: number;
  tipo: string;
  sync: number;
  fecha: number | null;
  hora: number | null;
  estado: number;
  dto: TicketDTO;           // campo renombrado de json → dto
}[]> {
  const result = await db.select().from(tickets).where(eq(tickets.sync, 0));
  return result.map((t) => ({
    ...t,
    dto: JSON.parse(t.json) as TicketDTO,
  }));
}

/**
 * Marcar ticket como sincronizado
 */
export async function marcarTicketSync(idTicket: number) {
  await db
    .update(tickets)
    .set({ sync: 1 })
    .where(eq(tickets.idTicket, idTicket));
}

/**
 * Marcar ticket con error de sincronización
 */
export async function marcarTicketErrorSync(idTicket: number) {
  await db
    .update(tickets)
    .set({ sync: -1 })
    .where(eq(tickets.idTicket, idTicket));
}

/**
 * Cambiar estado del ticket (ej: cerrado, anulado)
 */
export async function actualizarEstadoTicket(
  idTicket: number,
  nuevoEstado: number
) {
  await db
    .update(tickets)
    .set({
      estado: nuevoEstado,
      sync: 0, // necesita re-sync si cambia estado
    })
    .where(eq(tickets.idTicket, idTicket));
}