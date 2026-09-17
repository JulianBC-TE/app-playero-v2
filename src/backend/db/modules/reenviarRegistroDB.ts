/**
 * Módulo para reenviar individualmente registros que fallaron al sincronizar (sync = -1).
 *
 * @module Playero/Backend/DB/Modules/ReenviarRegistro
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { tickets, trapasos, calibraciones, abastecimientos, turnos, medicionesTanque } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { enviarTicket, enviarTraspaso, enviarCalibracion, enviarAbastecimiento, enviarTurno } from "@/backend/api/operacionesAPI";
import { marcarTicketSync } from "./ticketDB";
import { marcarTraspasoSync, traspasoToDTO } from "./traspasoDB";
import { marcarCalibracionSync } from "./calibracionDB";
import { marcarAbastecimientoSync } from "./abastecimientoDB";
import { marcarTurnoSync } from "./turnoBD";
import { httpClient } from "@/backend/api/httpClient";
import { crearLog } from "../logs/logModule";
import type { TipoRegistro } from "./resumenBD";
import type { CalibracionDTO } from "@/dto/CalibracionDTO";

export type ReenvioResult = {
  success: boolean;
  error?: string;
};

/**
 * Reintenta el envío de un registro individual que falló (sync = -1).
 * Solo funciona con registros en estado sync = -1.
 *
 * @param tipo - Tipo de registro (salida, traspaso, calibracion, abastecimiento, turno)
 * @param id - ID del registro en la BD local
 * @returns Resultado del reintento con éxito/error
 */
export async function reenviarRegistroIndividual(
  tipo: TipoRegistro,
  id: string | number,
): Promise<ReenvioResult> {
  const idNum = Number(id);

  const online = await httpClient.isOnline();
  if (!online) {
    return { success: false, error: "Sin conexión al servidor. Conectate e intentá de nuevo." };
  }

  try {
    switch (tipo) {
      case "salida":
        return await reenviarTicket(idNum);
      case "traspaso":
        return await reenviarTraspaso(idNum);
      case "calibracion":
        return await reenviarCalibracion(idNum);
      case "abastecimiento":
        return await reenviarAbastecimiento(idNum);
      case "turno":
        return await reenviarTurno(idNum);
      default:
        return { success: false, error: `Tipo de registro "${tipo}" no soportado para reenvío.` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ── Tickets ──────────────────────────────────────────────────────────────────

async function reenviarTicket(idTicket: number): Promise<ReenvioResult> {
  const result = await db.select().from(tickets).where(eq(tickets.idTicket, idTicket)).limit(1);
  if (!result[0]) return { success: false, error: "Registro no encontrado." };

  const row = result[0];
  if (row.sync !== -1) return { success: false, error: "Este registro no está en estado de error (sync ≠ -1)." };

  const clave = `${row.id_bod}-${row.fecha}-${row.idTicket}`;

  const fila = {
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
      clave,
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
      foto_taxilitro: row.foto_taxilitro ?? undefined,
      foto_taxilitro_fin: row.foto_taxilitro_fin ?? undefined,
      ubicacion_carga: row.ubicacion_carga ?? undefined,
      observaciones_ticket: row.observaciones_ticket ?? undefined,
    },
  };

  await enviarTicket(fila);
  await marcarTicketSync(idTicket);
  await crearLog({
    tipo: "salida",
    accion: "sync_ok",
    registroId: idTicket,
    detalle: `Reenvío: ${row.litros}L, Tax: ${row.taxilitro_inicial}-${row.taxilitro_final}`,
    payload: fila as any,
  });

  return { success: true };
}

// ── Traspasos ────────────────────────────────────────────────────────────────

async function reenviarTraspaso(idTraspaso: number): Promise<ReenvioResult> {
  const result = await db.select().from(trapasos).where(eq(trapasos.idTrapaso, idTraspaso)).limit(1);
  if (!result[0]) return { success: false, error: "Registro no encontrado." };

  const row = result[0];
  if (row.sync !== -1) return { success: false, error: "Este registro no está en estado de error (sync ≠ -1)." };

  const dto = traspasoToDTO(row);
  const clave = `${row.bodDestino}-${row.fecha}-${row.idTrapaso}`;
  dto.clave = clave;

  const fila = { ...row, dto };

  await enviarTraspaso(fila);
  await marcarTraspasoSync(idTraspaso);
  await crearLog({
    tipo: "traspaso",
    accion: "sync_ok",
    registroId: idTraspaso,
    detalle: `Reenvío: ${row.litrosPico}L, Tax: ${row.taxilitroInicial}-${row.taxilitroFinal}`,
    payload: fila as any,
  });

  return { success: true };
}

// ── Calibraciones ────────────────────────────────────────────────────────────

async function reenviarCalibracion(idCalibracion: number): Promise<ReenvioResult> {
  const result = await db.select().from(calibraciones).where(eq(calibraciones.idCalibracion, idCalibracion)).limit(1);
  if (!result[0]) return { success: false, error: "Registro no encontrado." };

  const row = result[0];
  if (row.sync !== -1) return { success: false, error: "Este registro no está en estado de error (sync ≠ -1)." };

  const fecha = new Date(row.fechaHora).toISOString().split("T")[0];
  const clave = `${row.idCalibracion}-${row.bodega}-${row.ciEncargado}-${fecha}-${row.hora}-${row.idCalibracion}`;

  const fila = {
    idCalibracion: row.idCalibracion,
    dto: {
      id_calibracion: String(row.idCalibracion),
      clave,
      fecha_hora: row.fechaHora,
      hora: row.hora,
      bodega: row.bodega,
      ci_encargado: row.ciEncargado,
      nombre_encargado: row.nombreEncargado,
      pico: row.pico,
      taxilitro_inicial: row.taxilitroInicial,
      taxilitro_final: row.taxilitroFinal,
      foto_precinto_retirado: row.fotoPrecintoRetirado,
      foto_precinto_colocado: row.fotoPrecintoColocado,
      firma_calibrador: row.firmaCalibrador,
      foto_inicial_taxilitro: row.fotoInicialTaxilitro,
      foto_final_taxilitro: row.fotoFinalTaxilitro,
      obs_gral: row.obsGral ?? undefined,
      nro_precinto_retirado: row.nroPrecintoRetirado ?? undefined,
      nro_precinto_colocado: row.nroPrecintoColocado ?? undefined,
      tipo_operacion: row.tipoOperacion,
      detalles: (row.detalles ?? []) as CalibracionDTO["detalles"],
    } as CalibracionDTO,
  };

  await enviarCalibracion(fila);
  await marcarCalibracionSync(idCalibracion);
  await crearLog({
    tipo: "calibracion",
    accion: "sync_ok",
    registroId: idCalibracion,
    detalle: `Reenvío: Tax: ${row.taxilitroInicial}-${row.taxilitroFinal}`,
    payload: fila as any,
  });

  return { success: true };
}

// ── Abastecimientos ──────────────────────────────────────────────────────────

async function reenviarAbastecimiento(idAbastecimiento: number): Promise<ReenvioResult> {
  const rows = await db.select().from(abastecimientos).where(eq(abastecimientos.idAbastecimiento, idAbastecimiento)).limit(1);
  if (!rows[0]) return { success: false, error: "Registro no encontrado." };

  const row = rows[0];
  if (row.sync !== -1) return { success: false, error: "Este registro no está en estado de error (sync ≠ -1)." };

  const medicionesRows = await db
    .select()
    .from(medicionesTanque)
    .where(eq(medicionesTanque.abastecimientoId, idAbastecimiento));

  const normalizarArrayFotos = (campo: any): string[] => {
    if (Array.isArray(campo)) return campo;
    if (typeof campo === "string" && campo.trim() !== "") {
      let limpio = campo.trim();
      if (limpio.startsWith("[") && limpio.endsWith("]")) {
        limpio = limpio.slice(1, -1).trim();
        if (!limpio) return [];
        if (!limpio.startsWith('"') && !limpio.startsWith("'")) {
          return [limpio];
        }
      }
      try {
        const parsed = JSON.parse(campo);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        return [campo];
      }
    }
    return [];
  };

  const clave = `${row.idBod}-${row.fecha}-${row.hora}-${row.idAbastecimiento}`;

  const dto = {
    id_abastecimiento: row.idAbastecimiento,
    clave,
    id_suc: row.idSuc,
    id_bod: row.idBod,
    fecha: row.fecha,
    hora: row.hora,
    nro_oc: row.nroOc,
    nro_remision: row.nroRemision,
    litros_remision: row.litrosRemision,
    playero: row.playero,
    foto_rev_docs: normalizarArrayFotos(row.fotoRevDocs),
    zeta_no_llega: row.zetaNoLlega,
    id_pico_para_zeta: row.idPicoParaZeta,
    taxilitro_inicial: row.taxilitroInicial,
    taxilitro_final: row.taxilitroFinal,
    litros_zeta: row.litrosZeta,
    obs_repos: row.obsRepos,
    foto_obs_repos: normalizarArrayFotos(row.fotoObsRepos),
    litros_total_repos: row.litrosTotalRepos,
    foto_taxilitro: row.fotoTaxilitro,
    foto_taxilitro_fin: row.fotoTaxilitroFin,
    mediciones_tanque: medicionesRows.map((med) => ({
      id_tanque: med.idTanque,
      inicio: {
        regla: med.inicioRegla,
        temperatura: med.inicioTemperatura,
        litros: med.inicioLitros,
        foto_medicion: med.inicioFotoMedicion,
      },
      fin: {
        regla: med.finRegla,
        temperatura: med.finTemperatura,
        litros: med.finLitros,
        foto_medicion: med.finFotoMedicion,
      },
    })),
  };

  await enviarAbastecimiento(dto);
  await marcarAbastecimientoSync(idAbastecimiento);
  await crearLog({
    tipo: "abastecimiento",
    accion: "sync_ok",
    registroId: idAbastecimiento,
    detalle: `Reenvío: ${row.litrosRemision}L, OC: ${row.nroOc}`,
    payload: dto as any,
  });

  return { success: true };
}

// ── Turnos ───────────────────────────────────────────────────────────────────

async function reenviarTurno(idTurno: number): Promise<ReenvioResult> {
  const result = await db.select().from(turnos).where(eq(turnos.idTurno, idTurno)).limit(1);
  if (!result[0]) return { success: false, error: "Registro no encontrado." };

  const row = result[0];
  if (row.sync !== -1) return { success: false, error: "Este registro no está en estado de error (sync ≠ -1)." };

  const dtoParsed = JSON.parse(row.json);
  const tipoMapeado = row.tipo as "1" | "2";

  const claveGenerada = `${dtoParsed.id_bod}-${dtoParsed.ci_playero}-${dtoParsed.fecha}-${dtoParsed.hora}-${tipoMapeado}`;
  dtoParsed.clave = claveGenerada;

  const fila = {
    idTurno: row.idTurno,
    tipo: tipoMapeado,
    fecha: row.fecha,
    hora: row.hora,
    observacionAnulacion: row.observacionAnulacion,
    dto: dtoParsed,
  };

  await enviarTurno(fila);
  await marcarTurnoSync(idTurno);
  await crearLog({
    tipo: "turno",
    accion: "sync_ok",
    registroId: idTurno,
    detalle: `Reenvío: ${tipoMapeado === "1" ? "INICIO" : "FIN"} turno`,
    payload: fila as any,
  });

  return { success: true };
}
