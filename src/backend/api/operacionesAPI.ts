// api/operacionesAPI.ts
import { httpClient } from "./httpClient";
import { SYNC_CONFIG } from "../db/constants/syncConfig";
import { TicketDTO } from "@/dto/TicketDTO";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import { CalibracionDTO } from "@/dto/CalibracionDTO";
import { AbastecimientoDTO } from "@/dto/AbastecimientoDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";

// ── Helpers de conversión ────────────────────────────────────────────────────

/** Convierte un timestamp Unix en ms a string ISO-8601 */
function msToISO(ms: number | null | undefined): string {
  return new Date(ms ?? Date.now()).toISOString();
}

/** Convierte un timestamp Unix en ms a BigInt (si el servidor lo exige) */
function msToBigInt(ms: number | null | undefined): string {
  return String(ms ?? Date.now());
}

// ── Tipos de fila que vienen del DB (con dto ya hidratado) ──────────────────

type FilaTicket = {
  idTicket: number;
  fecha: number | null;
  hora: number | null;
  dto: TicketDTO;
};

type FilaTraspaso = {
  idTrapaso: number;
  dto: TraspasoDTO["json"];
};

type FilaCalibracion = {
  idCalibracion: number;
  dto: CalibracionDTO;
};

type FilaAbastecimiento = {
  idAbastecimiento: number;
  dto: AbastecimientoDTO;
};

type FilaTurno = {
  idTurno: number;
  fecha: number | null;
  hora: number | null;
  dto: TurnoDTO;
};


// ── Envíos (Data Mapper: fila DB → payload HTTP) ────────────────────────────

export async function enviarTicket(fila: FilaTicket): Promise<void> {
  const payload: TicketDTO = {
    ...fila.dto,
    fecha: fila.dto.fecha ?? msToISO(fila.fecha),  // usa el campo del DTO si ya es ISO
    hora:  fila.dto.hora  ?? msToISO(fila.hora),
  };
  await httpClient.post(SYNC_CONFIG.endpoints.tickets, payload);
}

export async function enviarTraspaso(fila: FilaTraspaso): Promise<void> {
  // TraspasoDTO.json ya tiene fecha/hora como string ISO → sin transformación
  await httpClient.post(SYNC_CONFIG.endpoints.traspasos, fila.dto);
}

export async function enviarCalibracion(fila: FilaCalibracion): Promise<void> {
  // CalibracionDTO.fecha_hora ya es string → sin transformación
  await httpClient.post(SYNC_CONFIG.endpoints.calibraciones, fila.dto);
}

export async function enviarAbastecimiento(fila: FilaAbastecimiento): Promise<void> {
  // AbastecimientoDTO.fecha/hora ya son strings → sin transformación
  await httpClient.post(SYNC_CONFIG.endpoints.abastecimientos, fila.dto);
}

export async function enviarTurno(fila: FilaTurno): Promise<void> {
  const payload: TurnoDTO = {
    ...fila.dto,
    fecha: fila.dto.fecha ?? msToISO(fila.fecha),
    hora:  fila.dto.hora  ?? msToISO(fila.hora),
  };
  await httpClient.post(SYNC_CONFIG.endpoints.turnos, payload);
}