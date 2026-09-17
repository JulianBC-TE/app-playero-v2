/**
 * Servicio para consultar y actualizar el estado de los turnos activos.
 * Encapsula la lógica de negocio de estados (abierto, cerrado, anulado).
 *
 * @module Playero/Backend/DB/Services/turnoStatusService
 * @category Database Services
 */
import { db } from "@/backend/db/client";
import { turnos } from "@/backend/db/schema";
import { TurnoEstado } from "../constants/turnoEstado";
import { getTimestamp } from "@/services/timeService";
import { eq, and, lt, inArray, desc } from "drizzle-orm";

/**
 * Estados posibles
 */
export type TurnoStatus =
  | "falta_anterior"
  | "normal"
  | "iniciado"
  | "cerrado"
  | "falta_cerrar"
  | "falta_inicio";

export interface StatusResult {
  status: TurnoStatus;
  Inicio_turno: {
    ok: boolean;
    falta: number[];
  };
  Fin_turno: {
    ok: boolean;
    falta: number[];
  };
  Fin_turno_anterior: {
    ok: boolean;
    falta: number[];
  };
}

/**
 * Normaliza fecha a inicio del día
 */
export function normalizarFecha(fecha: Date): number {
  const f = new Date(fecha);
  f.setHours(0, 0, 0, 0);
  return f.getTime();
}

/**
 * Calcula estado de turnos por lista de bodegas
 */
/**
 * Calcula estado de turnos por lista de bodegas
 */
export async function calcularEstadoTurno(
  idsBodegas: number[],
  fechaParam?: string,
): Promise<StatusResult> {

  if (idsBodegas.length === 0) {
    return {
      status: "normal",
      Inicio_turno: { ok: true, falta: [] },
      Fin_turno: { ok: true, falta: [] },
      Fin_turno_anterior: { ok: true, falta: [] },
    };
  }

  const secureTime = await getTimestamp();
  const hoy = new Date(secureTime.timestampMs);
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const fechaTimestamp = Math.floor(fecha.getTime() / 1000); 

  // ================== FASE 1 ==================

  const turnosHoyRaw = await db
    .select({
      idBodega: turnos.idBodega,
      tipo: turnos.tipo,
      estado: turnos.estado,
      idTurno: turnos.idTurno, // ✅ Cambio: 'id' → 'idTurno'
    })
    .from(turnos)
    .where(
      and(
        inArray(turnos.idBodega, idsBodegas),
        eq(turnos.fecha, fechaTimestamp) // ✅ Cambio: comparar con timestamp
      )
    )
    .orderBy(desc(turnos.idTurno)); // ✅ Cambio: 'id' → 'idTurno'

  // 🔧 DEDUPLICAR: Mantener solo el más reciente de cada (bodega, tipo)
  const seen = new Set<string>();
  const turnosHoy = turnosHoyRaw.filter((t) => {
    const key = `${t.idBodega}-${t.tipo}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const inicioHoy = new Set(
    turnosHoy
      .filter((t) => t.tipo === "INICIO-TURNO" && t.estado === 1)
      .map((t) => t.idBodega),
  );


  const cierreHoyOK = new Set(
    turnosHoy
      .filter((t) => t.tipo === "FIN-TURNO" && t.estado === 1)
      .map((t) => t.idBodega),
  );


  const cierreHoyAnulados = new Set(
    turnosHoy
      .filter((t) => t.tipo === "FIN-TURNO" && t.estado === 0)
      .map((t) => t.idBodega),
  );


  const faltanInicio = idsBodegas.filter((id) => !inicioHoy.has(id));
  const sinCierre = idsBodegas.filter(
    (id) => !cierreHoyOK.has(id) && !cierreHoyAnulados.has(id),
  );
  const finAnulados = idsBodegas.filter(
    (id) => cierreHoyAnulados.has(id) && !cierreHoyOK.has(id),
  );

  const inicioTurnoOK = faltanInicio.length === 0;
  const finTurnoHoyOK = sinCierre.length === 0;
  // ================== FASE 2 ==================

  const ultimaFecha = await db
    .select({ fecha: turnos.fecha })
    .from(turnos)
    .where(
      and(
        inArray(turnos.idBodega, idsBodegas),
        lt(turnos.fecha, fechaTimestamp) // ✅ Cambio: comparar con timestamp
      )
    )
    .orderBy(desc(turnos.fecha))
    .limit(1);

  let finTurnoAnteriorFaltantes: number[] = [];

  if (ultimaFecha.length > 0 && ultimaFecha[0].fecha != null) {
    const fechaAnteriorTimestamp = ultimaFecha[0].fecha;

    const turnosPrevios = await db
      .select({
        idBodega: turnos.idBodega,
        estado: turnos.estado,
        idTurno: turnos.idTurno, // ✅ Cambio: 'id' → 'idTurno'
      })
      .from(turnos)
      .where(
        and(
          inArray(turnos.idBodega, idsBodegas),
          eq(turnos.fecha, fechaAnteriorTimestamp), // ✅ Ya es timestamp
          eq(turnos.tipo, "FIN-TURNO"),
        ),
      )
      .orderBy(desc(turnos.idTurno)); 

    // 🔧 DEDUPLICAR: Mantener solo el más reciente por bodega
    const seenPrevios = new Set<number>();
    const turnosPreviosUnicos = turnosPrevios.filter((t) => {
      if (seenPrevios.has(t.idBodega)) {
        return false;
      }
      seenPrevios.add(t.idBodega);
      return true;
    });

    const cierrePrevioOK = new Set(
      turnosPreviosUnicos
        .filter((t) => t.estado === 1)
        .map((t) => t.idBodega),
    );

    finTurnoAnteriorFaltantes = idsBodegas.filter(
      (id) => !cierrePrevioOK.has(id),
    );
  } else {
    console.log(`  ℹ️  No hay turnos anteriores registrados`);
  }

  // ================== FASE 3 ==================

  let status: TurnoStatus;

  if (finTurnoAnteriorFaltantes.length > 0 && !inicioTurnoOK) {
    status = "falta_anterior";
  } else if (inicioTurnoOK && finAnulados.length > 0) {
    status = "falta_cerrar";
  } else if (inicioTurnoOK && !finTurnoHoyOK) {
    status = "iniciado";
  } else if (inicioTurnoOK && finTurnoHoyOK) {
    status = "cerrado";
  } else {
    status = "normal";
  }

  const result: StatusResult = {
    status,
    Inicio_turno: { ok: inicioTurnoOK, falta: faltanInicio },
    Fin_turno: { ok: finTurnoHoyOK, falta: [...sinCierre, ...finAnulados] },
    Fin_turno_anterior: {
      ok: finTurnoAnteriorFaltantes.length === 0,
      falta: finTurnoAnteriorFaltantes,
    },
  };

  return result;
}
