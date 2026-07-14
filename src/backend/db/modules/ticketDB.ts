/**
 * @module Playero/Backend/DB/Modules/Ticket
 * @category Database Modules
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { tickets } from "../schema";
import { TicketDTO } from "@/dto/TicketDTO";

/**
 * Crear ticket local plano y fuertemente tipado
 */
export async function crearTicketLocal(
  dto: TicketDTO,
  fechaRegistro?: number,
  horaRegistro?: number,
): Promise<number> {
  console.log(dto.observaciones_ticket)
  const result = await db.insert(tickets).values({
    ...dto, // Asignación directa gracias al tipado unificado (incluyendo los nuevos arreglos de fotos)
    sync: 0,
    estado: 1,
    fecha_registro: fechaRegistro ?? Date.now(),
    hora_registro: horaRegistro ?? Date.now(),
  });
  return (result as any).lastInsertRowId ?? 0;
}

/**
 * Obtener ticket por ID reconstruyendo el DTO desde las columnas de la BD
 */
export async function getTicketById(idTicket: number) {
  const result = await db
    .select()
    .from(tickets)
    .where(eq(tickets.idTicket, idTicket));

  if (!result.length) return null;

  const row = result[0];

  const dto: TicketDTO = {
    id_suc: row.id_suc,
    id_bod: row.id_bod,
    id_pico: row.id_pico,
    fecha: row.fecha,
    hora: row.hora,
    ci_playero: row.ci_playero,
    id_operador: row.id_operador,
    litros: row.litros,
    taxilitro_inicial: row.taxilitro_inicial,
    taxilitro_final: row.taxilitro_final,
    monto: row.monto,
    ruc_cliente: row.ruc_cliente ?? undefined,
    id_vehiculo: row.id_vehiculo ?? undefined,
    obs: row.obs ?? undefined,
    tipo: row.tipo,
    kilometraje: row.kilometraje ?? undefined,
    horometro: row.horometro ?? undefined,
    foto_chapa: row.foto_chapa ?? undefined,
    firma_conductor: row.firma_conductor ?? undefined,
    foto_kilometraje: row.foto_kilometraje ?? undefined,
    foto_horometro: row.foto_horometro ?? undefined,
    foto_observaciones: row.foto_observaciones ?? undefined,
    foto_taxilitro: row.foto_taxilitro ?? undefined, // 🆕 Mapeo añadido
    foto_taxilitro_fin: row.foto_taxilitro_fin ?? undefined, // 🆕 Mapeo añadido
    ubicacion_carga: row.ubicacion_carga ?? undefined,
    observaciones_ticket: row.observaciones_ticket ?? undefined,
  };

  return {
    ...row,
    dto,
  };
}

/**
 * Obtener tickets pendientes de sincronización mapeados al formato esperado
 */
export async function getTicketsPendientes(): Promise<{
  idTicket: number;
  tipo: string;
  sync: number;
  fecha: number | null;
  hora: number | null;
  estado: number;
  dto: TicketDTO;
}[]> {
  const result = await db.select().from(tickets).where(eq(tickets.sync, 0));
  if (result.length === 0) {
    console.log("⚪ TICKET -> Nada pendiente para subir");
    return [];
  }
  return result.map((row) => {
    const clave = `${row.id_bod}-${row.fecha}-${row.idTicket}`;

    return {
      idTicket: row.idTicket,
      tipo: row.tipo,
      sync: row.sync,
      fecha: row.fecha_registro,
      hora: row.hora_registro,
      estado: row.estado,
      dto: {
        id_suc: row.id_suc,
        id_bod: row.id_bod,
        id_pico: row.id_pico,
        clave: clave,
        fecha: row.fecha,
        hora: row.hora,
        ci_playero: row.ci_playero,
        id_playero: row.ci_playero,
        id_operador: row.id_operador,
        litros: row.litros,
        taxilitro_inicial: row.taxilitro_inicial,
        taxilitro_final: row.taxilitro_final,
        monto: row.monto,
        ruc_cliente: row.ruc_cliente ?? undefined,
        id_vehiculo: row.id_vehiculo ?? undefined,
        obs: row.obs ?? undefined,
        tipo: row.tipo,
        kilometraje: row.kilometraje ?? undefined,
        horometro: row.horometro ?? undefined,
        foto_chapa: row.foto_chapa ?? undefined,
        firma_conductor: row.firma_conductor ?? undefined,
        foto_kilometraje: row.foto_kilometraje ?? undefined,
        foto_horometro: row.foto_horometro ?? undefined,
        foto_observaciones: row.foto_observaciones ?? undefined,
        foto_taxilitro: row.foto_taxilitro ?? undefined, // 🆕 Mapeo añadido
        foto_taxilitro_fin: row.foto_taxilitro_fin ?? undefined, // 🆕 Mapeo añadido
        ubicacion_carga: row.ubicacion_carga ?? undefined,
        observaciones_ticket: row.observaciones_ticket ?? undefined,
      },
    };
  });
}

export async function marcarTicketSync(idTicket: number) {
  await db
    .update(tickets)
    .set({ sync: 1 })
    .where(eq(tickets.idTicket, idTicket));
}

export async function marcarTicketErrorSync(idTicket: number) {
  await db
    .update(tickets)
    .set({ sync: 0 })
    .where(eq(tickets.idTicket, idTicket));
}

export async function actualizarEstadoTicket(idTicket: number, nuevoEstado: number) {
  await db
    .update(tickets)
    .set({
      estado: nuevoEstado,
      sync: 0,
    })
    .where(eq(tickets.idTicket, idTicket));
}