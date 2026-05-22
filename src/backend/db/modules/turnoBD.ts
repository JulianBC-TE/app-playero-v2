/**
 * @module Playero/Backend/DB/Modules/Turno
 * @category Database Modules
 */
import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { turnos } from "../schema";
import { calcularEstadoTurno } from "../services/turnoStatusService";
import { getBodegasByIdSucursal } from "./bodegaDB";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { TurnoEstado } from "../constants/turnoEstado";

/**
 * Inserta un turno (apertura o cierre) en la BD local con `sync = 0`.
 *
 * @param params - Datos del turno a registrar
 * @param params.idBodega - ID de la bodega asociada al turno
 * @param params.json - Payload completo del turno (idealmente `TurnoDTO`)
 * @param params.tipo - Tipo de turno: `"APERTURA"` o `"CIERRE"`
 * @param params.fecha - Fecha en formato numérico `YYYYMMDD` (opcional)
 * @param params.hora - Hora en formato numérico `HHMM` (opcional)
 * @returns Resultado del insert de Drizzle con el `insertedRowId`
 */
export async function crearTurnoLocal({
  idBodega,
  json,
  tipo,
  fecha,
  hora,
}: {
  idBodega: number;
  json: unknown;
  tipo: string;
  fecha?: number;
  hora?: number;
}) {
  const result = await db.insert(turnos).values({
    idBodega,
    json: JSON.stringify(json),
    tipo,
    fecha,
    hora,
    sync: 0,
    estado: 1,
  });

  return result;
}

/**
 * Devuelve un turno por su ID con el campo `json` ya deserializado.
 *
 * @param idTurno - ID del turno a buscar
 * @returns El turno con `json` parseado, o `null` si no existe
 */
export async function getTurnoById(idTurno: number) {
  const result = await db
    .select()
    .from(turnos)
    .where(eq(turnos.idTurno, idTurno));

  if (!result.length) return null;

  return {
    ...result[0],
    json: JSON.parse(result[0].json),
  };
}

/**
 * Devuelve todos los turnos pendientes de sincronización (`sync = 0`)
 * con el campo `json` ya deserializado.
 *
 * @returns Lista de turnos pendientes listos para enviar al servidor
 */
export async function getTurnosPendientes() {
  const result = await db.select().from(turnos).where(eq(turnos.sync, 0));

  return result.map((t) => ({
    ...t,
    json: JSON.parse(t.json),
  }));
}

/**
 * Marca un turno como sincronizado exitosamente (`sync = 1`).
 *
 * @param idTurno - ID del turno a marcar
 */
export async function marcarTurnoSync(idTurno: number) {
  await db.update(turnos).set({ sync: 1 }).where(eq(turnos.idTurno, idTurno));
}

/**
 * Marca un turno con error de sincronización (`sync = -1`).
 * Se usa cuando el intento de envío al servidor falla.
 *
 * @param idTurno - ID del turno a marcar
 */
export async function marcarTurnoErrorSync(idTurno: number) {
  await db.update(turnos).set({ sync: -1 }).where(eq(turnos.idTurno, idTurno));
}

/**
 * Cierra un turno localmente cambiando su estado a `2` y marcándolo
 * con `sync = 0` para que sea enviado al servidor en la próxima sincronización.
 *
 * @param idTurno - ID del turno a cerrar
 */
export async function cerrarTurnoLocal(idTurno: number) {
  await db
    .update(turnos)
    .set({ estado: 2, sync: 0 })
    .where(eq(turnos.idTurno, idTurno));
}

/**
 * Anula un turno localmente cambiando su estado a `3`, guardando
 * la observación de anulación y marcándolo con `sync = 0`.
 *
 * @param idTurno - ID del turno a anular
 * @param observacion - Motivo de la anulación
 */
export async function anularTurnoLocal(idTurno: number, observacion: string) {
  await db
    .update(turnos)
    .set({
      estado: 3,
      observacionAnulacion: observacion,
      sync: 0,
    })
    .where(eq(turnos.idTurno, idTurno));
}

/**
 * Punto de entrada principal para consultar el estado del turno de una sucursal.
 * Obtiene todas las bodegas asociadas y delega el cálculo a {@link calcularEstadoTurno}.
 *
 * Los posibles estados retornados son:
 * - `normal` — no hay turno abierto ni pendiente
 * - `iniciado` — hay un turno abierto activo
 * - `cerrado` — el turno fue cerrado correctamente
 * - `falta_cerrar` — hay bodegas sin cierre de turno
 * - `falta_anterior` — hay un turno del día anterior sin cerrar
 *
 * @param idSucursal - ID de la sucursal a consultar
 * @returns Resultado de {@link calcularEstadoTurno} con el estado y las bodegas involucradas
 */
export async function getTurnoStatusLocal(idSucursal: number) {
  const bodegas = await getBodegasByIdSucursal(idSucursal);
  const ids = bodegas.map((b: BodegaDTO) => Number(b.id_bodega));
  return calcularEstadoTurno(ids);
}
