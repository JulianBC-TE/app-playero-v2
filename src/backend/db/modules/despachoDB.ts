// srcDBmodules/despachoDB.ts
//
// Módulo de lectura de despachos del surtidor desde la BD local.
// Reemplaza las llamadas a:
//   - api.post("/api/autorizar", { pico: ... })       → ya no necesaria
//   - api.get(`/api/salida-control/${idPicoSurtidor}`) → getUltimoDespachoByPico()
//
// MAPEO DE COLUMNAS:
//   totalIni  → taxilitro_inicial (centésimas de litro o unidad del surtidor)
//   totalFin  → taxilitro_final
//   volumenMl → volumen despachado en ml → dividir por 1000 para obtener litros
//   pico      → id del pico surtidor (id_pico_surtidor)
//
// REGLAS DE NEGOCIO:
//   - El surtidor escribe los despachos en la BD local directamente.
//   - La app lee el despacho más reciente para el pico dado.
//   - La app hace polling hasta que aparezca un despacho nuevo (fechaHora > referencia).

import { db } from "@/backend/db/client";
import { despachos } from "@/backend/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";

// ---------------------------------------------------------------------------
// DespachoDTO — datos que le interesan a las pantallas de operación
// ---------------------------------------------------------------------------

export type DespachoDTO = {
  id: number;
  pico: number; // id_pico_surtidor
  taxilitroInicial: number; // totalIni
  taxilitroFinal: number; // totalFin
  litros: number; // volumenMl / 1000
  fechaHora: number; // timestamp UNIX ms
};

// ---------------------------------------------------------------------------
// getUltimoDespachoByPico
// Devuelve el despacho más reciente para un pico surtidor.
// Retorna null si no hay ninguno.
// ---------------------------------------------------------------------------

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
