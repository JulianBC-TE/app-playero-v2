import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { turnos } from "../schema";
import { calcularEstadoTurno } from "../services/turnoStatusService";
import { getBodegasByIdSucursal } from "./bodegaDB";
import { BodegaDTO } from "@/dto/BodegaDTO";


export enum TurnoEstado {
  ACTIVO = 1,
  ANULADO = 0,
  CERRADO = 2,
  ANULADO_ADMIN = 3, // ← nombrar el estado 3
}
/**
 * Crear turno local (offline)
 */
export async function crearTurnoLocal({
  idBodega,
  json,
  tipo,
  fecha,
  hora,
}: {
  idBodega: number;
  json: unknown; // idealmente TurnoDTO
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
 * Obtener turno por id
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
 * Obtener turnos pendientes de sincronización
 */
export async function getTurnosPendientes() {
  const result = await db
    .select()
    .from(turnos)
    .where(eq(turnos.sync, 0));

  return result.map((t) => ({
    ...t,
    json: JSON.parse(t.json),
  }));
}

/**
 * Marcar turno como sincronizado
 */
export async function marcarTurnoSync(idTurno: number) {
  await db
    .update(turnos)
    .set({ sync: 1 })
    .where(eq(turnos.idTurno, idTurno));
}

/**
 * Marcar turno con error de sync
 */
export async function marcarTurnoErrorSync(idTurno: number) {
  await db
    .update(turnos)
    .set({ sync: -1 })
    .where(eq(turnos.idTurno, idTurno));
}

/**
 * Cerrar turno localmente
 */
export async function cerrarTurnoLocal(idTurno: number) {
  await db
    .update(turnos)
    .set({ estado: 2, sync: 0 })
    .where(eq(turnos.idTurno, idTurno));
}

/**
 * Anular turno
 */
export async function anularTurnoLocal(
  idTurno: number,
  observacion: string
) {
  await db
    .update(turnos)
    .set({
      estado: 3,
      observacionAnulacion: observacion,
      sync: 0,
    })
    .where(eq(turnos.idTurno, idTurno));
}

// Wrapper que usa Turno.tsx
export async function getTurnoStatusLocal(idSucursal: number) {
  const bodegas = await getBodegasByIdSucursal(idSucursal);
  const ids = bodegas.map((b: BodegaDTO) => Number(b.id_bodega));
  return calcularEstadoTurno(ids);
}