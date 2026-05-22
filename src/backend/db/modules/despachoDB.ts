/**
 * Módulo de lectura de despachos escritos por el surtidor en la BD local.
 *
 * @remarks
 * El surtidor escribe los despachos directamente en SQLite.
 * La app hace polling leyendo el despacho más reciente para un pico dado.
 * Unidades de volumen: mililitros internamente; dividir por 1000 para litros.
 *
 * @module Playero/Backend/DB/Modules/Despacho
 * @category Database Modules
 */
import { db } from "@/backend/db/client";
import { despachos } from "@/backend/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";

/**
 * DTO de despacho expuesto a las pantallas de operación.
 * - `litros` = `volumenMl / 1000`
 * - `taxilitroInicial` / `taxilitroFinal` = lecturas del taxilitro del surtidor
 */
export type DespachoDTO = {
  id: number;
  pico: number; // id_pico_surtidor
  taxilitroInicial: number; // totalIni
  taxilitroFinal: number; // totalFin
  litros: number; // volumenMl / 1000
  fechaHora: number; // timestamp UNIX ms
};

/**
 * Devuelve el despacho más reciente para un pico surtidor.
 *
 * @param idPicoSurtidor - ID del pico surtidor (campo `pico` en la tabla).
 * @returns {@link DespachoDTO} más reciente, o `null` si no hay ninguno.
 */
export async function getUltimoDespachoByPico(
  idPicoSurtidor: number,
): Promise<DespachoDTO | null> {
  const rows = await db
    .select({
      id: despachos.id,
      pico: despachos.pico,
      totalIni: despachos.totalIni,
      totalFin: despachos.totalFin,
      volumenMl: despachos.volumenMl,
      fechaHora: despachos.fechaHora,
    })
    .from(despachos)
    .where(eq(despachos.pico, idPicoSurtidor))
    .orderBy(desc(despachos.fechaHora))
    .limit(1);

  if (!rows[0]) return null;

  const r = rows[0];
  return {
    id: r.id,
    pico: r.pico,
    taxilitroInicial: r.totalIni ?? 0,
    taxilitroFinal: r.totalFin ?? 0,
    litros: (r.volumenMl ?? 0) / 1000,
    fechaHora: r.fechaHora,
  };
}

// ---------------------------------------------------------------------------
// getNuevoDespachoByPico
// Devuelve el despacho más reciente para un pico surtidor
// SOLO si su fechaHora es mayor que `despuesDeTimestamp`.
// Usado en el polling: la app guarda la fecha del último despacho conocido
// y espera a que aparezca uno más nuevo, lo que indica que terminó la carga.
// Retorna null mientras no haya un despacho nuevo.
// ---------------------------------------------------------------------------

export async function getNuevoDespachoByPico(
  idPicoSurtidor: number,
  despuesDeTimestamp: number,
): Promise<DespachoDTO | null> {
  const rows = await db
    .select({
      id: despachos.id,
      pico: despachos.pico,
      totalIni: despachos.totalIni,
      totalFin: despachos.totalFin,
      volumenMl: despachos.volumenMl,
      fechaHora: despachos.fechaHora,
    })
    .from(despachos)
    .where(
      and(
        eq(despachos.pico, idPicoSurtidor),
        gt(despachos.fechaHora, despuesDeTimestamp),
      ),
    )
    .orderBy(desc(despachos.fechaHora))
    .limit(1);

  if (!rows[0]) return null;

  const r = rows[0];
  return {
    id: r.id,
    pico: r.pico,
    taxilitroInicial: r.totalIni ?? 0,
    taxilitroFinal: r.totalFin ?? 0,
    litros: (r.volumenMl ?? 0) / 1000,
    fechaHora: r.fechaHora,
  };
}
