/**
 * Módulo de acceso a datos para calibraciones y verificaciones de picos.
 *
 * @remarks
 * - Las calibraciones se crean offline con `sync = 0`.
 * - Mapeado directamente al nuevo esquema plano compatible con CalibracionDTO.
 *
 * @module Playero/Backend/DB/Modules/Calibracion
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { calibraciones, syncs } from "@/backend/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { CalibracionDTO } from "@/dto/CalibracionDTO";
import { FilaCalibracion } from "@/backend/api/operacionesAPI";
import { crearLog } from "../logs/logModule";
import { compararCamposClave } from "./duplicadosHelper";

const SYNC_KEY = "__last_sync_calibraciones__";

/**
 * Verifica si una calibración es duplicada comparándola con la última de la misma bodega.
 * Compara: fecha_hora (sin seg), pico, taxilitro_inicial, taxilitro_final
 */
export async function esCalibracionDuplicadaLocal(
  dto: Omit<CalibracionDTO, "id_calibracion">
): Promise<boolean> {
  const ultimo = await db
    .select()
    .from(calibraciones)
    .where(eq(calibraciones.bodega, dto.bodega))
    .orderBy(desc(calibraciones.idCalibracion))
    .limit(1);

  if (ultimo.length === 0) return false;

  const row = ultimo[0];

  return compararCamposClave(
    {
      pico: dto.pico,
      taxilitro_inicial: dto.taxilitro_inicial,
      taxilitro_final: dto.taxilitro_final,
    },
    {
      pico: row.pico,
      taxilitro_inicial: row.taxilitroInicial,
      taxilitro_final: row.taxilitroFinal,
    },
    ["pico", "taxilitro_inicial", "taxilitro_final"]
  );
}

/**
 * Inserta un registro de calibración plano omitiendo el ID para que SQLite lo autogenere.
 * Retorna -1 si la calibración es duplicada (no se insertó).
 *
 * @param dto - Datos del formulario (sin id_calibracion).
 * @returns ID generado automáticamente por SQLite, o -1 si es duplicado.
 */
export async function saveCalibracionLocal(
  dto: Omit<CalibracionDTO, "id_calibracion">
): Promise<number> {
  const esDuplicado = await esCalibracionDuplicadaLocal(dto);
  if (esDuplicado) {
    console.log("⚠️ CALIBRACIÓN DUPLICADA detectada, no se inserta:", dto.fecha_hora, dto.pico);
    await crearLog({
      tipo: "calibracion",
      accion: "duplicado_detectado",
      registroId: 0,
      detalle: `Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
      payload: dto as any,
    });
    return -1;
  }

  const result = await db.insert(calibraciones).values({
    fechaHora: dto.fecha_hora,
    hora: dto.hora,
    bodega: dto.bodega,
    ciEncargado: dto.ci_encargado,
    nombreEncargado: dto.nombre_encargado,
    pico: dto.pico,
    taxilitroInicial: dto.taxilitro_inicial,
    taxilitroFinal: dto.taxilitro_final,
    fotoPrecintoRetirado: dto.foto_precinto_retirado,
    fotoPrecintoColocado: dto.foto_precinto_colocado,
    firmaCalibrador: dto.firma_calibrador,
    
    // ◄ NUEVOS: Guardamos localmente lo que viene del formulario
    fotoInicialTaxilitro: dto.foto_inicial_taxilitro,
    fotoFinalTaxilitro: dto.foto_final_taxilitro,

    obsGral: dto.obs_gral ?? null,
    nroPrecintoRetirado: dto.nro_precinto_retirado ?? null,
    nroPrecintoColocado: dto.nro_precinto_colocado ?? null,
    tipoOperacion: dto.tipo_operacion ?? "CALIBRACION",
    detalles: dto.detalles, // TypeScript ya validará que cada detalle incluya su foto_taxilitro_carga
    sync: 0,
  });
  
  const id = (result as any).lastInsertRowId ?? 0;
  await crearLog({
    tipo: "calibracion",
    accion: "creacion",
    registroId: id,
    detalle: `Tax: ${dto.taxilitro_inicial}-${dto.taxilitro_final}`,
    payload: dto as any,
  });
  return id;
}

/**
 * Devuelve las calibraciones pendientes inyectando el ID autogenerado y la clave en el DTO.
 */
export async function getCalibracionesPendientes(incluirErrores: boolean = false): Promise<FilaCalibracion[]> {
  const filtro = incluirErrores
    ? or(eq(calibraciones.sync, 0), eq(calibraciones.sync, -1))
    : eq(calibraciones.sync, 0);
  const rows = await db
    .select()
    .from(calibraciones)
    .where(filtro)
    .orderBy(desc(calibraciones.idCalibracion));
    
  if (rows.length === 0) {
    //console.log("⚪ CALIBRACIÓN -> Nada pendiente para subir");
    return [];
  }
  
  return rows.map((r) => {
    const fecha = new Date(r.fechaHora).toISOString().split('T')[0];
    console.log("hora calibracion", r.hora);
    const clave = `${r.idCalibracion}-${r.bodega}-${r.ciEncargado}-${fecha}-${r.hora}-${r.idCalibracion}`;

    return {
      idCalibracion: r.idCalibracion, 
      dto: {
        id_calibracion: String(r.idCalibracion),
        clave: clave, 
        fecha_hora: r.fechaHora,
        hora: r.hora,
        bodega: r.bodega,
        ci_encargado: r.ciEncargado,
        nombre_encargado: r.nombreEncargado,
        pico: r.pico,
        taxilitro_inicial: r.taxilitroInicial,
        taxilitro_final: r.taxilitroFinal,
        foto_precinto_retirado: r.fotoPrecintoRetirado,
        foto_precinto_colocado: r.fotoPrecintoColocado,
        firma_calibrador: r.firmaCalibrador,
        
        // ◄ NUEVOS: Mapeamos los campos para enviárselos limpios al Backend
        foto_inicial_taxilitro: r.fotoInicialTaxilitro,
        foto_final_taxilitro: r.fotoFinalTaxilitro,

        obs_gral: r.obsGral ?? undefined,
        nro_precinto_retirado: r.nroPrecintoRetirado ?? undefined,
        nro_precinto_colocado: r.nroPrecintoColocado ?? undefined,
        tipo_operacion: r.tipoOperacion,
        detalles: r.detalles, // Pasa directo ya que SQLite extrae el array de objetos JSON intacto
      } as CalibracionDTO,
    };
  });
}

/**
 * Marca una calibración como sincronizada (`sync = 1`).
 *
 * @param idLocal - ID de la fila en la tabla local SQLite.
 */
export async function marcarCalibracionSync(idLocal: number): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: 1 })
    .where(eq(calibraciones.idCalibracion, idLocal));
}

/**
 * Marca una calibración con error de sincronización (`sync = -1`).
 *
 * @param idLocal - ID de la fila en la tabla local SQLite.
 */
export async function marcarCalibracionErrorSync(idLocal: number): Promise<void> {
  await db
    .update(calibraciones)
    .set({ sync: -1 })
    .where(eq(calibraciones.idCalibracion, idLocal));
}

/**
 * Devuelve el timestamp de la última sincronización de calibraciones.
 *
 * @returns Timestamp Unix en ms, o `null` si nunca se sincronizó.
 */
export async function getLastSyncDate(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, SYNC_KEY))
      .limit(1);

    return result[0] ? result[0].fecha : null;
  } catch {
    return null;
  }
}