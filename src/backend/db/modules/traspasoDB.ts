/**
 * @module Playero/Mobile/DB/Modules/Traspaso
 * @category Database Modules
 *
 * Módulo de base de datos para traspasos de combustible.
 *
 * REGLAS DE NEGOCIO:
 *   - Los traspasos se crean localmente con sync=0.
 *   - Un proceso de sincronización posterior los envía al servidor.
 *   - Los campos normalizados evitan serialización JSON innecesaria.
 *   - Las fotos se almacenan como arrays JSON en campos de texto.
 */

import { db } from "@/backend/db/client";
import { trapasos, type Traspaso, type TraspasoInsert } from "@/backend/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import { crearLog } from "../logs/logModule";
import { compararCamposClave } from "./duplicadosHelper";

const SYNC_KEY = "__last_sync_traspasos__";

// ---------------------------------------------------------------------------
// CONVERSIÓN: TraspasoDTO → Traspaso (insert)
// ---------------------------------------------------------------------------

/**
 * Convierte un TraspasoDTO a un objeto Traspaso para insertar en la BD.
 * Serializa los arrays de fotos como JSON en campos de texto.
 */
export function dtoToTraspasoInsert(dto: TraspasoDTO, timestampMs?: number): TraspasoInsert {
  return {
    idTraspasoMongo: dto.id_trapaso,
    bodOrigen: dto.bod_origen,
    bodDestino: dto.bod_destino,
    idTanqueDestino: dto.id_tanque_destino,
    reglaAlturaInicial: dto.regla_altura_inicial,
    reglaAlturaFinal: dto.regla_altura_final,
    litrosTanqueInicial: dto.litros_tanque_inicial,
    litrosTanqueFinal: dto.litros_tanque_final,
    tempInicial: dto.temp_inicial,
    tempFinal: dto.temp_final,
    idPico: dto.id_pico,
    taxilitroInicial: dto.taxilitro_inicial,
    taxilitroFinal: dto.taxilitro_final,
    litrosPico: dto.litros_pico,
    obsTraspaso: dto.obs_traspaso,
    obsAdicional: dto.obs_adicional,
    fecha: dto.fecha,
    hora: dto.hora,
    idPlayero: dto.id_playero,
    idEncargadoReceptor: dto.id_encargado_receptor,
    idAutorizado: dto.id_autorizado,
    fotoMedicionInicial: dto.foto_medicion_inicial
      ? JSON.stringify(dto.foto_medicion_inicial)
      : null,
    fotoMedicionFinal: dto.foto_medicion_final
      ? JSON.stringify(dto.foto_medicion_final)
      : null,
    firmaReceptor: dto.firma_receptor ? JSON.stringify(dto.firma_receptor) : null,
    fotoObsTraspaso: dto.foto_obs_traspaso
      ? JSON.stringify(dto.foto_obs_traspaso)
      : null,
    fotoTaxilitro: dto.foto_taxilitro ? JSON.stringify(dto.foto_taxilitro) : null,
    fotoTaxilitroFin: dto.foto_taxilitro_fin ? JSON.stringify(dto.foto_taxilitro_fin) : null,
    corteId: dto.corte_id,
    lastIdSalida: dto.last_id_salida,
    estado: 1,
    sync: 0,
    fechaCreacion: timestampMs ?? Date.now(),
  };
}

// ---------------------------------------------------------------------------
// CONVERSIÓN: Traspaso → TraspasoDTO (output)
// ---------------------------------------------------------------------------

/**
 * Convierte un registro Traspaso a un TraspasoDTO para enviar al servidor.
 * Deserializa los arrays de fotos desde JSON.
 */
export function traspasoToDTO(row: Traspaso): TraspasoDTO {
  return {
    id_trapaso: row.idTraspasoMongo,
    bod_origen: row.bodOrigen,
    bod_destino: row.bodDestino,
    id_tanque_destino: row.idTanqueDestino,
    regla_altura_inicial: row.reglaAlturaInicial,
    regla_altura_final: row.reglaAlturaFinal,
    litros_tanque_inicial: row.litrosTanqueInicial,
    litros_tanque_final: row.litrosTanqueFinal,
    temp_inicial: row.tempInicial,
    temp_final: row.tempFinal,
    id_pico: row.idPico,
    taxilitro_inicial: row.taxilitroInicial,
    taxilitro_final: row.taxilitroFinal,
    litros_pico: row.litrosPico,
    obs_traspaso: row.obsTraspaso,
    obs_adicional: row.obsAdicional,
    fecha: row.fecha,
    hora: row.hora,
    id_playero: row.idPlayero,
    id_encargado_receptor: row.idEncargadoReceptor,
    id_autorizado: row.idAutorizado,
    foto_medicion_inicial: row.fotoMedicionInicial
      ? JSON.parse(row.fotoMedicionInicial)
      : [],
    foto_medicion_final: row.fotoMedicionFinal
      ? JSON.parse(row.fotoMedicionFinal)
      : [],
    firma_receptor: row.firmaReceptor ? JSON.parse(row.firmaReceptor) : [],
    foto_obs_traspaso: row.fotoObsTraspaso ? JSON.parse(row.fotoObsTraspaso) : [],
    foto_taxilitro: row.fotoTaxilitro ? JSON.parse(row.fotoTaxilitro) : [],
    foto_taxilitro_fin: row.fotoTaxilitroFin ? JSON.parse(row.fotoTaxilitroFin) : [],
    corte_id: row.corteId,
    last_id_salida: row.lastIdSalida,
  };
}

// ---------------------------------------------------------------------------
// esTraspasoDuplicadoLocal
// Verifica si un traspaso es duplicado comparándolo con el último de la misma bodega origen.
// ---------------------------------------------------------------------------

/**
 * Verifica si un traspaso es duplicado comparándolo con el último traspaso de la misma bodega origen.
 * Compara: fecha, hora (sin seg), id_pico, bod_destino, litros_pico, taxilitro_inicial, taxilitro_final
 */
export async function esTraspasoDuplicadoLocal(dto: TraspasoDTO): Promise<boolean> {
  const ultimo = await db
    .select()
    .from(trapasos)
    .where(eq(trapasos.bodOrigen, dto.bod_origen))
    .orderBy(desc(trapasos.idTrapaso))
    .limit(1);

  if (ultimo.length === 0) return false;

  const row = ultimo[0];
  return compararCamposClave(
    {
      fecha: dto.fecha,
      id_pico: dto.id_pico,
      bod_destino: dto.bod_destino,
      litros_pico: dto.litros_pico,
      taxilitro_inicial: dto.taxilitro_inicial,
      taxilitro_final: dto.taxilitro_final,
    },
    {
      fecha: row.fecha,
      id_pico: row.idPico,
      bod_destino: row.bodDestino,
      litros_pico: row.litrosPico,
      taxilitro_inicial: row.taxilitroInicial,
      taxilitro_final: row.taxilitroFinal,
    },
    ["fecha", "id_pico", "bod_destino", "litros_pico", "taxilitro_inicial", "taxilitro_final"]
  );
}

// ---------------------------------------------------------------------------
// saveTraspasoLocal
// Inserta un traspaso pendiente de sincronización.
// Retorna -1 si el traspaso es duplicado (no se insertó).
// ---------------------------------------------------------------------------

/**
 * Guarda un nuevo traspaso localmente con estado pendiente de sincronización.
 * @param dto El DTO del traspaso a guardar
 * @returns El ID generado en SQLite, o -1 si es duplicado
 */
export async function saveTraspasoLocal(dto: TraspasoDTO, timestampMs?: number): Promise<number> {
  const esDuplicado = await esTraspasoDuplicadoLocal(dto);
  if (esDuplicado) {
    console.log("⚠️ TRASPASO DUPLICADO detectado, no se inserta:", dto.fecha, dto.hora, dto.id_pico);
    await crearLog({
      tipo: "traspaso",
      accion: "duplicado_detectado",
      registroId: 0,
      detalle: `${dto.litros_pico}L, Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
      payload: dto as any,
    });
    return -1;
  }

  const values = dtoToTraspasoInsert(dto, timestampMs);
  
  const result = await db.insert(trapasos).values(values);
  
  const id = (result as any).lastInsertRowId ?? 0;
  await crearLog({
    tipo: "traspaso",
    accion: "creacion",
    registroId: id,
    detalle: `${dto.litros_pico}L, Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
    payload: dto as any,
  });
  return id;
}

// ---------------------------------------------------------------------------
// getTraspasosPendientes
// Devuelve los registros aún no sincronizados (sync = 0).
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los traspasos pendientes de sincronización.
 * Incluye un campo `clave` alfanumérico para identificar de forma única cada traspaso.
 * @returns Array de traspasos con el DTO ya convertido
 */
export async function getTraspasosPendientes(incluirErrores: boolean = false): Promise<Array<Traspaso & { dto: TraspasoDTO }>> {
  const filtro = incluirErrores
    ? or(eq(trapasos.sync, 0), eq(trapasos.sync, -1))
    : eq(trapasos.sync, 0);
  const rows = await db
    .select()
    .from(trapasos)
    .where(filtro)
    .orderBy(desc(trapasos.fechaCreacion));
  if (rows.length === 0) {
    //console.log("⚪ TRASPASO -> Nada pendiente para subir");
    return [];
  }
  return rows.map((row) => {
    // Construimos la clave en formato: "id_bodega_origen-fecha-id_trapaso_local"
    const clave = `${row.bodDestino}-${row.fecha}-${row.idTrapaso}`;

    return {
      ...row,
      dto: {
        ...traspasoToDTO(row),
        clave: clave, // ✅ Campo clave añadido
      },
    };
  });
}

// ---------------------------------------------------------------------------
// getTraspasoById
// Obtiene un traspaso específico por ID.
// ---------------------------------------------------------------------------

/**
 * Obtiene un traspaso por su ID local.
 * @param id ID del traspaso
 * @returns El traspaso con su DTO convertido, o null si no existe
 */
export async function getTraspasoById(id: number): Promise<(Traspaso & { dto: TraspasoDTO }) | null> {
  const result = await db
    .select()
    .from(trapasos)
    .where(eq(trapasos.idTrapaso, id))
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0],
    dto: traspasoToDTO(result[0]),
  };
}

// ---------------------------------------------------------------------------
// getTraspasosByFecha
// Obtiene traspasos en un rango de fechas.
// ---------------------------------------------------------------------------

/**
 * Obtiene traspasos dentro de un rango de fechas.
 * @param fechaInicio Formato YYYY-MM-DD
 * @param fechaFin Formato YYYY-MM-DD
 * @returns Array de traspasos con DTO convertido
 */
/*export async function getTraspasosByFecha(
  fechaInicio: string,
  fechaFin: string
): Promise<Array<Traspaso & { dto: TraspasoDTO }>> {
  const rows = await db
    .select()
    .from(trapasos)
    .where(
      
    )
    .orderBy(desc(trapasos.fecha));

  return rows
    .filter((r) => r.fecha >= fechaInicio && r.fecha <= fechaFin)
    .map((row) => ({
      ...row,
      dto: traspasoToDTO(row),
    }));
}*/

// ---------------------------------------------------------------------------
// marcarTraspasoSync
// Marca un traspaso como sincronizado.
// ---------------------------------------------------------------------------

/**
 * Marca un traspaso como sincronizado y registra la fecha.
 * @param id ID del traspaso
 */
export async function marcarTraspasoSync(id: number): Promise<void> {
  await db
    .update(trapasos)
    .set({ sync: 1, fechaSincronizacion: Date.now() })
    .where(eq(trapasos.idTrapaso, id));
}

// ---------------------------------------------------------------------------
// marcarTraspasoErrorSync
// Marca un traspaso como error de sincronización.
// ---------------------------------------------------------------------------

/**
 * Marca un traspaso con error de sincronización.
 * @param id ID del traspaso
 */
export async function marcarTraspasoErrorSync(id: number): Promise<void> {
  await db
    .update(trapasos)
    .set({ sync: -1, fechaSincronizacion: Date.now() })
    .where(eq(trapasos.idTrapaso, id));
}

// ---------------------------------------------------------------------------
// updateTraspasoDTO
// Actualiza un traspaso existente con nuevos datos.
// ---------------------------------------------------------------------------

/**
 * Actualiza un traspaso con nuevos datos del DTO.
 * Útil para corregir traspasos locales antes de sincronizar.
 * @param id ID del traspaso
 * @param dto Nuevos datos
 */
export async function updateTraspasoDTO(id: number, dto: Partial<TraspasoDTO>): Promise<void> {
  const updates: Partial<TraspasoInsert> = {};

  // Convertir campos del DTO a campos de la tabla
  if (dto.bod_origen !== undefined) updates.bodOrigen = dto.bod_origen;
  if (dto.bod_destino !== undefined) updates.bodDestino = dto.bod_destino;
  if (dto.id_tanque_destino !== undefined) updates.idTanqueDestino = dto.id_tanque_destino;
  if (dto.regla_altura_inicial !== undefined)
    updates.reglaAlturaInicial = dto.regla_altura_inicial;
  if (dto.regla_altura_final !== undefined) updates.reglaAlturaFinal = dto.regla_altura_final;
  if (dto.litros_tanque_inicial !== undefined)
    updates.litrosTanqueInicial = dto.litros_tanque_inicial;
  if (dto.litros_tanque_final !== undefined)
    updates.litrosTanqueFinal = dto.litros_tanque_final;
  if (dto.temp_inicial !== undefined) updates.tempInicial = dto.temp_inicial;
  if (dto.temp_final !== undefined) updates.tempFinal = dto.temp_final;
  if (dto.id_pico !== undefined) updates.idPico = dto.id_pico;
  if (dto.taxilitro_inicial !== undefined) updates.taxilitroInicial = dto.taxilitro_inicial;
  if (dto.taxilitro_final !== undefined) updates.taxilitroFinal = dto.taxilitro_final;
  if (dto.litros_pico !== undefined) updates.litrosPico = dto.litros_pico;
  if (dto.obs_traspaso !== undefined) updates.obsTraspaso = dto.obs_traspaso;
  if (dto.obs_adicional !== undefined) updates.obsAdicional = dto.obs_adicional;
  if (dto.fecha !== undefined) updates.fecha = dto.fecha;
  if (dto.hora !== undefined) updates.hora = dto.hora;
  if (dto.id_playero !== undefined) updates.idPlayero = dto.id_playero;
  if (dto.id_encargado_receptor !== undefined)
    updates.idEncargadoReceptor = dto.id_encargado_receptor;
  if (dto.id_autorizado !== undefined) updates.idAutorizado = dto.id_autorizado;
  if (dto.foto_medicion_inicial !== undefined)
    updates.fotoMedicionInicial = JSON.stringify(dto.foto_medicion_inicial);
  if (dto.foto_medicion_final !== undefined)
    updates.fotoMedicionFinal = JSON.stringify(dto.foto_medicion_final);
  if (dto.firma_receptor !== undefined) updates.firmaReceptor = JSON.stringify(dto.firma_receptor);
  if (dto.foto_obs_traspaso !== undefined)
    updates.fotoObsTraspaso = JSON.stringify(dto.foto_obs_traspaso);
  if (dto.corte_id !== undefined) updates.corteId = dto.corte_id;
  if (dto.last_id_salida !== undefined) updates.lastIdSalida = dto.last_id_salida;
  if (dto.foto_taxilitro !== undefined) updates.fotoTaxilitro = JSON.stringify(dto.foto_taxilitro);
  if (dto.foto_taxilitro_fin !== undefined) updates.fotoTaxilitroFin = JSON.stringify(dto.foto_taxilitro_fin);

  if (Object.keys(updates).length > 0) {
    await db.update(trapasos).set(updates).where(eq(trapasos.idTrapaso, id));
  }
}

// ---------------------------------------------------------------------------
// deleteTraspasoLocal
// Elimina un traspaso local (solo si no está sincronizado).
// ---------------------------------------------------------------------------

/**
 * Elimina un traspaso local. Idealmente solo para traspasos no sincronizados.
 * @param id ID del traspaso
 */
export async function deleteTraspasoLocal(id: number): Promise<void> {
  await db.delete(trapasos).where(eq(trapasos.idTrapaso, id));
}

// ---------------------------------------------------------------------------
// getTraspasosSyncError
// Obtiene traspasos con error de sincronización.
// ---------------------------------------------------------------------------

/**
 * Obtiene todos los traspasos con error de sincronización (sync = -1).
 * @returns Array de traspasos con error
 */
export async function getTraspasosSyncError(): Promise<Array<Traspaso & { dto: TraspasoDTO }>> {
  const rows = await db
    .select()
    .from(trapasos)
    .where(eq(trapasos.sync, -1))
    .orderBy(desc(trapasos.fechaCreacion));

  return rows.map((row) => ({
    ...row,
    dto: traspasoToDTO(row),
  }));
}

// ---------------------------------------------------------------------------
// getLastSyncDate (Legacy support)
// ---------------------------------------------------------------------------

/**
 * Obtiene la fecha del último traspaso sincronizado.
 * @returns Timestamp o null
 */
export async function getLastSyncDate(): Promise<number | null> {
  const result = await db
    .select({ fecha: trapasos.fechaSincronizacion })
    .from(trapasos)
    .where(eq(trapasos.sync, 1))
    .orderBy(desc(trapasos.fechaSincronizacion))
    .limit(1);

  return result[0]?.fecha ?? null;
}