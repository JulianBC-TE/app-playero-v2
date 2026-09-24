/**
 * @module Playero/Backend/DB/Modules/Ticket
 * @category Database Modules
 */
import { eq, or, desc } from "drizzle-orm";
import { db } from "../client";
import { tickets } from "../schema";
import { TicketDTO } from "@/dto/TicketDTO";
import { crearLog } from "../logs/logModule";
import { compararCamposClave } from "./duplicadosHelper";

/**
 * Verifica si un ticket es duplicado comparándolo con el último ticket de la misma bodega.
 * Compara: fecha, hora (sin seg), id_pico, id_operador, litros, taxilitro_inicial, taxilitro_final
 */
export async function esTicketDuplicadoLocal(dto: TicketDTO): Promise<boolean> {
  const ultimo = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id_bod, dto.id_bod))
    .orderBy(desc(tickets.idTicket))
    .limit(1);

  if (ultimo.length === 0) return false;

  const row = ultimo[0];
  return compararCamposClave(
    {
      fecha: dto.fecha,
      id_pico: dto.id_pico,
      id_operador: dto.id_operador,
      litros: dto.litros,
      taxilitro_inicial: dto.taxilitro_inicial,
      taxilitro_final: dto.taxilitro_final,
    },
    {
      fecha: row.fecha,
      id_pico: row.id_pico,
      id_operador: row.id_operador,
      litros: row.litros,
      taxilitro_inicial: row.taxilitro_inicial,
      taxilitro_final: row.taxilitro_final,
    },
    ["fecha", "id_pico", "id_operador", "litros", "taxilitro_inicial", "taxilitro_final"]
  );
}

/**
 * Crear ticket local plano y fuertemente tipado
 * Retorna -1 si el ticket es duplicado (no se insertó).
 */
export async function crearTicketLocal(
  dto: TicketDTO,
  fechaRegistro?: number,
  horaRegistro?: number,
): Promise<number> {
  const esDuplicado = await esTicketDuplicadoLocal(dto);
  if (esDuplicado) {
    console.log("⚠️ TICKET DUPLICADO detectado, no se inserta:", dto.fecha, dto.hora, dto.id_pico);
    await crearLog({
      tipo: "salida",
      accion: "duplicado_detectado",
      registroId: 0,
      detalle: `${dto.litros}L, Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
      payload: dto as any,
    });
    return -1;
  }

  console.log(dto.observaciones_ticket)
  const result = await db.insert(tickets).values({
    ...dto, // Asignación directa gracias al tipado unificado (incluyendo los nuevos arreglos de fotos)
    sync: 0,
    estado: 1,
    fecha_registro: fechaRegistro ?? Date.now(),
    hora_registro: horaRegistro ?? Date.now(),
  });
  const id = (result as any).lastInsertRowId ?? 0;
  await crearLog({
    tipo: "salida",
    accion: "creacion",
    registroId: id,
    detalle: `${dto.litros}L, Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
    payload: dto as any,
  });
  return id;
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
export async function getTicketsPendientes(incluirErrores: boolean = false): Promise<{
  idTicket: number;
  tipo: string;
  sync: number;
  fecha: number | null;
  hora: number | null;
  estado: number;
  dto: TicketDTO;
}[]> {
  const filtro = incluirErrores
    ? or(eq(tickets.sync, 0), eq(tickets.sync, -1))
    : eq(tickets.sync, 0);
  const result = await db.select().from(tickets).where(filtro);
  if (result.length === 0) {
    //console.log("⚪ TICKET -> Nada pendiente para subir");
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
    .set({ sync: -1 })
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