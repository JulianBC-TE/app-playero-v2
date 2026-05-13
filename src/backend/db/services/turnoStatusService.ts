import { db } from "@/backend/db/client";
import { turnos } from "@/backend/db/schema";
import { TurnoEstado } from "../modules/turnoBD";
import { eq, and, lt, inArray, desc } from "drizzle-orm";

/**
 * Estados posibles
 */
export type TurnoStatus =
  | "falta_anterior"
  | "normal"
  | "iniciado"
  | "cerrado"
  | "falta_cerrar";

interface StatusResult {
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

  const hoy = new Date();
  const fecha = fechaParam
    ? normalizarFecha(new Date(fechaParam))
    : normalizarFecha(hoy);

  // -----------------------------
  // 1️⃣ Turnos del día actual
  // -----------------------------
  const turnosHoy = await db
    .select({
      idBodega: turnos.idBodega,
      tipo: turnos.tipo,
      estado: turnos.estado,
    })
    .from(turnos)
    .where(and(inArray(turnos.idBodega, idsBodegas), eq(turnos.fecha, fecha)));

  const inicioHoy = new Set(
    turnosHoy
      .filter((t) => t.tipo === "inicio" && t.estado === TurnoEstado.ACTIVO)
      .map((t) => t.idBodega),
  );

  // Reemplazar "FIN-TURNO" por "fin" para ser consistente con lo que inserta crearTurnoLocal
  const cierreHoyOK = new Set(
    turnosHoy
      .filter((t) => t.tipo === "fin" && t.estado === TurnoEstado.ACTIVO)
      .map((t) => t.idBodega),
  );

  const cierreHoyAnulados = new Set(
    turnosHoy
      .filter((t) => t.tipo === "fin" && t.estado === TurnoEstado.ANULADO)
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

  // -----------------------------
  // 2️⃣ Buscar última fecha anterior
  // -----------------------------
  const ultimaFecha = await db
    .select({ fecha: turnos.fecha })
    .from(turnos)
    .where(and(inArray(turnos.idBodega, idsBodegas), lt(turnos.fecha, fecha)))
    .orderBy(desc(turnos.fecha))
    .limit(1);

  let finTurnoAnteriorFaltantes: number[] = [];

  if (ultimaFecha.length > 0) {
    const fechaAnterior = ultimaFecha[0].fecha;

    if (fechaAnterior == null) {
      return {
        status: "normal",
        Inicio_turno: { ok: inicioTurnoOK, falta: faltanInicio },
        Fin_turno: { ok: finTurnoHoyOK, falta: [...sinCierre, ...finAnulados] },
        Fin_turno_anterior: { ok: true, falta: [] },
      };
    }

    const turnosPrevios = await db
      .select({
        idBodega: turnos.idBodega,
        estado: turnos.estado,
      })
      .from(turnos)
      .where(
        and(
          inArray(turnos.idBodega, idsBodegas),
          eq(turnos.fecha, fechaAnterior),
          eq(turnos.tipo, "FIN-TURNO"),
        ),
      );

    const cierrePrevioOK = new Set(
      turnosPrevios.filter((t) => t.estado === 1).map((t) => t.idBodega),
    );

    finTurnoAnteriorFaltantes = idsBodegas.filter(
      (id) => !cierrePrevioOK.has(id),
    );
  }

  // -----------------------------
  // 3️⃣ Determinar status
  // -----------------------------
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

  return {
    status,
    Inicio_turno: { ok: inicioTurnoOK, falta: faltanInicio },
    Fin_turno: { ok: finTurnoHoyOK, falta: [...sinCierre, ...finAnulados] },
    Fin_turno_anterior: {
      ok: finTurnoAnteriorFaltantes.length === 0,
      falta: finTurnoAnteriorFaltantes,
    },
  };
}
