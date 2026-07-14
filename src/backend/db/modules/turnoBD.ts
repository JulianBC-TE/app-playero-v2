/**
 * @module Playero/Backend/DB/Modules/Turno
 * @category Database Modules
 */
import { eq, desc, inArray, and } from "drizzle-orm";
import { db } from "../client";
import { turnos } from "../schema";
import {
  calcularEstadoTurno,
  normalizarFecha,
  StatusResult,
  TurnoStatus,
} from "../services/turnoStatusService";
import { getBodegasByIdSucursal, getBodegasDelUsuario } from "./bodegaDB";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";
import { TurnoEstado } from "../constants/turnoEstado";
import { obtenerEstadoTurnosPorBodega } from "@/backend/api/operacionesAPI";
import { useAppContext } from "@/hooks/useAppContext";

function normalizarADate(fecha: string | number): Date {
  const fechaStr = fecha.toString();

  // Caso 1: Si viene con guiones del backend (ej: "2026-07-03")
  if (fechaStr.includes("-")) {
    return new Date(fechaStr);
  }

  // Caso 2: Si es el formato entero compacto (ej: 20260703 o "20260703")
  if (fechaStr.length === 8) {
    const anio = parseInt(fechaStr.slice(0, 4), 10);
    const mes = parseInt(fechaStr.slice(4, 6), 10) - 1; // Los meses en JS van de 0 a 11
    const dia = parseInt(fechaStr.slice(6, 8), 10);

    return new Date(anio, mes, dia);
  }

  // Caso base de respaldo por si viene un timestamp Unix
  return new Date(Number(fecha));
}

/**
 * Inserta un turno (apertura o cierre) en la BD local.
 */
export async function crearTurnoLocal({
  idBodega,
  dto,
  tipo,
  estado = 1,
  fecha,
  hora,
}: {
  idBodega: number;
  dto: TurnoDTO;
  tipo: 1 | 2;
  estado?: number;
  fecha?: number;
  hora?: number;
}) {
  // CORRECCIÓN: Convertir a string de forma segura ("1" o "2")
  const tipoNumber = String(tipo);

  return db.insert(turnos).values({
    idBodega,
    json: JSON.stringify(dto),
    tipo: tipoNumber,
    fecha,
    hora,
    sync: 0,
    estado,
  });
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
  return { ...result[0], dto: JSON.parse(result[0].json) as TurnoDTO };
}

/**
 * Obtiene el tipo de turno asociado a un idBodega.
 * @param idBodega - El ID de la bodega a buscar.
 * @returns El tipo de turno (string) o null si no se encuentra.
 */
export async function getTipoByBodega(
  idBodega: number,
): Promise<string | null> {
  try {
    const resultado = await db
      .select({
        tipo: turnos.tipo,
        idTurno: turnos.idTurno
      })
      .from(turnos)
      .where(eq(turnos.idBodega, idBodega))
      .orderBy(desc(turnos.idTurno))
      .limit(1); // Usamos limit(1) por eficiencia si solo esperas un registro
    
    console.log(resultado[0]);
    // Si encontró el turno, devolvemos el tipo, si no, null
    return resultado.length > 0 ? resultado[0].tipo : null;
  } catch (error) {
    console.error("Error al obtener el tipo de turno:", error);
    throw error;
  }
}

/**
 * Devuelve todos los turnos pendientes de sincronización (`sync = 0`)
 * con el campo `json` ya deserializado.
 *
 * @returns Lista de turnos pendientes listos para enviar al servidor
 */
export async function getTurnosPendientes() {
  // 1️⃣ Ordenamos por idTurno para asegurar que el conteo (1, 2, 3) sea cronológico
  let result = await db
    .select()
    .from(turnos)
    .where(eq(turnos.sync, 0))
    .orderBy(turnos.idTurno);

  if (result.length === 0) {
    const resultB = await db
      .select()
      .from(turnos)
      .where(eq(turnos.sync, -1))
      .orderBy(turnos.idTurno);
    if (resultB.length === 0) {
      console.log("⚪ TURNO -> Nada pendiente para subir");
      return [];
    } else {
      result = resultB;
    }
  }

  // 2️⃣ Diccionario para llevar la cuenta de "FIN-TURNO" por cada bodega en este lote
  const conteoBodegas: Record<number, number> = {};

  return result.map((t) => {
    const tipoMapeado = t.tipo as "1" | "2";
    const dtoParsed = JSON.parse(t.json) as TurnoDTO;

    // 3️⃣ Si es un turno de salida, incrementamos el contador de esa bodega específica
    if (tipoMapeado === "2") {
      console.log("salida enviada");
      conteoBodegas[t.idBodega] = (conteoBodegas[t.idBodega] || 0) + 1;
    }

    const nroCierre = conteoBodegas[t.idBodega] || 0;

    // 4️⃣ Definimos el sufijo.
    // Como pediste incluirlo en los turnos de salida, lo aplicamos solo si es FIN-TURNO.
    // (Si necesitás que el INICIO-TURNO también lleve el mismo número de secuencia, cambiá esto)
    const sufijoCierre = tipoMapeado === "2" ? nroCierre : "";
    // ✨ Construimos la clave incluyendo el nro de cierre al final
    const claveGenerada = `${dtoParsed.id_bod}-${dtoParsed.ci_playero}-${dtoParsed.fecha}-${dtoParsed.hora}-${tipoMapeado}`;
    //console.log(claveGenerada);
    dtoParsed.clave = claveGenerada;

    return {
      ...t,
      tipo: tipoMapeado,
      dto: dtoParsed,
    };
  });
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
 * Convierte un string de hora en formato "HH:MM:SS" o "HH:MM" a un entero numérico seguro HHMM.
 * Evita errores de substring si faltan ceros a la izquierda.
 */
function parsearHoraAEntero(horaStr: string | null): number | null {
  if (!horaStr) return null;
  const partes = horaStr.split(":"); // Ejemplo: ["17", "16", "49"] o ["08", "05"]
  if (partes.length >= 2) {
    const horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10);
    return horas * 100 + minutos; // Ejemplo: 1716 o 805
  }
  return null;
}

/**
 * Trae los últimos turnos del backend y los homologa a la estructura local.
 * No actualiza si los datos del backend son más antiguos en fecha u hora que los locales.
 */
// Variable de control fuera de la función para bloquear llamadas paralelas
let estaSincronizando = false;

export async function sincronizarUltimosTurnosDesdeBackend(
  userId: number,
): Promise<void> {
  // Si ya hay una instancia corriendo, rebotamos las peticiones paralelas
  if (estaSincronizando) {
    console.log(
      "[Sincronización] Bloqueada llamada duplicada por concurrencia.",
    );
    return;
  }

  try {
    estaSincronizando = true; // Cerramos el candado
    const turnosBackend = await obtenerEstadoTurnosPorBodega(userId);

    for (const item of turnosBackend) {
      const dto: TurnoDTO = item.turnoCompleto;

      const fechaNum = dto.fecha
        ? parseInt(dto.fecha.replace(/-/g, ""), 10)
        : null;
      if (fechaNum === null) {
        console.warn(
          `[Sincronización] Saltando bodega ${item.idbodega} porque el turno no viene con una fecha válida.`,
        );
        continue;
      }
      const horaNum = parsearHoraAEntero(dto.hora);
      const tipoBack = item.tipo === "2" ? "2" : "1";
      const estadoLocal = Number(item.estado);

      const existeTurnoLocal = await db
        .select()
        .from(turnos)
        .where(
          and(
            eq(turnos.idBodega, item.idbodega),
            eq(turnos.tipo, tipoBack),
            eq(turnos.fecha, fechaNum), // ◄ DESCOMENTAR ESTO ES CRUCIAL
          ),
        )
        .limit(1);

      if (existeTurnoLocal.length > 0) {
        //console.log("existe truno local --> analisis comparativo");
        const turnoLocalActual = existeTurnoLocal[0];
        const fechaLocal = turnoLocalActual.fecha ?? 0;
        const horaLocal = turnoLocalActual.hora ?? 0;

        const backendFecha = fechaNum ?? 0;
        const backendHora = horaNum ?? 0;
        /*console.log(
          "Back -> bod:",
          item.idbodega,
          "tipo",
          item.turnoCompleto.tipo,
          "fecha",
          backendFecha,
          "hora ",
          horaNum,
        );
        console.log(
          "App -> bod:",
          existeTurnoLocal[0].idBodega,
          "tipo",
          existeTurnoLocal[0].tipo,
          "fecha",
          fechaLocal,
          "hora ",
          horaLocal,
        );
        console.log(
          "diferencia de fecha: ",
          backendFecha - fechaLocal,
          "diferencia de hora: ",
          backendHora - horaLocal,
        );*/
        if (
          backendFecha < fechaLocal ||
          (backendFecha <= fechaLocal && backendHora <= horaLocal)
        ) {
          if (existeTurnoLocal[0].estado <= 1 && backendFecha === fechaLocal) {
            //console.log(turnoLocalActual.idTurno,backendFecha === fechaLocal, backendFecha == fechaLocal)
            await db
              .update(turnos)
              .set({
                json: JSON.stringify(dto),
                sync: 1,
              })
              .where(eq(turnos.idTurno, turnoLocalActual.idTurno));
          }
          console.log(`[Sincronización] Saltando bodega ${item.idbodega}...`);
          continue;
        }

        await db
          .update(turnos)
          .set({
            json: JSON.stringify(dto),
            sync: 1,
            fecha: fechaNum,
            hora: horaNum,
          })
          .where(eq(turnos.idTurno, turnoLocalActual.idTurno));
      } else {
        await db.insert(turnos).values({
          idBodega: item.idbodega,
          json: JSON.stringify(dto),
          tipo: tipoBack,
          sync: 1,
          fecha: fechaNum,
          hora: horaNum,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error en sincronizarUltimosTurnosDesdeBackend:", error);
    throw error;
  } finally {
    estaSincronizando = false; // Abrimos el candado al terminar con éxito o fallo
  }
}

/**
 * Anula el último fin-turno cambiando su estado a 2 (anulado).
 */
export async function anularUltimoFinTurnoPorBodega(
  idBodega: number,
  observacion: string,
) {
  const ultimoTurno = await db
    .select({ idTurno: turnos.idTurno, tipo: turnos.tipo })
    .from(turnos)
    .where(eq(turnos.idBodega, idBodega))
    .orderBy(desc(turnos.idTurno))
    .limit(1);

  if (ultimoTurno.length === 0) return null;
  const turno = ultimoTurno[0];

  // Si el tipo es cerrado ("2")
  if (turno.tipo === "2" || turno.tipo === "FIN-TURNO") {
    console.log(
    "turno anulado",
    ultimoTurno[0].idTurno,
    "observacion: ",
    observacion,
  );
    return await db
      .update(turnos)
      .set({
        estado: 2, // ◄ CAMBIO: 2 significa ANULADO bajo tu nueva regla
        observacionAnulacion: observacion,
      })
      .where(eq(turnos.idTurno, turno.idTurno));
  }
  return null;
}

/**
 * Punto de entrada modificado: Consulta el estado del turno basándose
 * ÚNICAMENTE en las bodegas bajo control del usuario.
 *
 * @param cedula - Cédula del operario logueado
 * @returns Resultado del cálculo de turno enfocado en sus bodegas
 */
/**
 * Calcula el semáforo de estados locales basándose en las nuevas reglas.
 */
export async function getTurnoStatusLocal(
  cedula: number,
): Promise<StatusResult> {
  try {
    const bodegasDelUsuario = await getBodegasDelUsuario(cedula);
    if (!bodegasDelUsuario || bodegasDelUsuario.length === 0) {
      return {
        status: "normal",
        Inicio_turno: { ok: true, falta: [] },
        Fin_turno: { ok: true, falta: [] },
        Fin_turno_anterior: { ok: true, falta: [] },
      };
    }

    const idsBodegas = bodegasDelUsuario.map((b: BodegaDTO) =>
      Number(b.id_bodega),
    );
    const hoy = new Date();
    const hoyFormatoEntero = parseInt(
      `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`,
      10,
    );

    const inicioFalta: number[] = [];
    const finFalta: number[] = [];
    const anteriorFalta: number[] = [];
    let tieneMovimientoHoy = false;

    for (const idBodega of idsBodegas) {
      const ultimoTurnoBodega = await db
        .select({
          tipo: turnos.tipo,
          fecha: turnos.fecha,
          estado: turnos.estado,
        })
        .from(turnos)
        .where(eq(turnos.idBodega, idBodega))
        .orderBy(desc(turnos.idTurno))
        .limit(1);

      if (ultimoTurnoBodega.length === 0) {
        inicioFalta.push(idBodega);
        continue;
      }

      const turno = ultimoTurnoBodega[0];
      // Si el turno está anulado (estado === 2), lo ignoramos para el cálculo del flujo y asumimos que falta cerrar/abrir

      const turnoFecha = turno.fecha ?? 0;
      const esDeHoy =
        normalizarADate(turnoFecha) >= normalizarADate(hoyFormatoEntero);
      if (esDeHoy) tieneMovimientoHoy = true;
      if (turno.estado === 2 && esDeHoy) {
        finFalta.push(idBodega);
        continue;
      } else if (turno.estado === 2 && !esDeHoy) {
        anteriorFalta.push(idBodega);
        continue;
      }
      // ◄ CAMBIO: Validación basada en tipos "1" (Abierto) y "2" (Cerrado)
      if (turno.tipo === "1" || turno.tipo === "INICIO-TURNO") {
        if (esDeHoy) {
          finFalta.push(idBodega);
        } else {
          anteriorFalta.push(idBodega);
        }
      } else if (turno.tipo === "2" || turno.tipo === "FIN-TURNO") {
        if (!esDeHoy) {
          inicioFalta.push(idBodega);
        }
      }
    }

    // ==================== CÁLCULO DEL SEMÁFORO GLOBAL ====================
    let statusFinal: TurnoStatus = "normal";
    // Condición Roja: Turno de ayer colgado O Cierre Parcial hoy
    const esCierreParcial =
      finFalta.length > 0 &&
      finFalta.length < idsBodegas.length &&
      tieneMovimientoHoy;
    const faltaInicio = inicioFalta.length > 0;

    if (anteriorFalta.length > 0) {
      statusFinal = "falta_anterior";
    } else if (esCierreParcial && !faltaInicio) {
      statusFinal = "falta_cerrar"; // ❤️ Rojo
    } else if (esCierreParcial && faltaInicio) {
      statusFinal = "falta_inicio";
    }
    // Condición Verde: TODAS las bodegas asignadas están abiertas hoy
    else if (
      finFalta.length === idsBodegas.length &&
      anteriorFalta.length === 0
    ) {
      statusFinal = "iniciado"; // 💚 Verde
    }
    // Condición Azul: TODAS se abrieron y TODAS se cerraron hoy
    else if (
      tieneMovimientoHoy &&
      finFalta.length === 0 &&
      inicioFalta.length === 0
    ) {
      statusFinal = "cerrado"; // 💙 Azul
    }
    // Condición Celeste: Todo limpio del día anterior, esperando aperturas de hoy
    else {
      statusFinal = "normal"; // 🩵 Celeste
    }

    return {
      status: statusFinal,
      Inicio_turno: { ok: inicioFalta.length === 0, falta: inicioFalta },
      Fin_turno: { ok: finFalta.length === 0, falta: finFalta },
      Fin_turno_anterior: {
        ok: anteriorFalta.length === 0,
        falta: anteriorFalta,
      },
    };
  } catch (error) {
    console.error("❌ ERROR en getTurnoStatusLocal Multibodega:", error);
    throw error;
  }
}

/**
 * Genera automáticamente el FIN-TURNO de un inicio de turno que quedó abierto en días anteriores,
 * utilizando la fecha del registro colgado original pero fijando la hora a las 11:59 PM (23:59).
 */
export async function cerrarTurnoAnteriorAutomatico({
  idBodega,
  dtoAperturaActual,
  observacionMotivo,
}: {
  idBodega: number;
  dtoAperturaActual: TurnoDTO;
  observacionMotivo: string;
}) {
  // 1. Buscar el último registro (el INICIO-TURNO colgado de días anteriores)
  const ultimoTurnoColgado = await db
    .select()
    .from(turnos)
    .where(eq(turnos.idBodega, idBodega))
    .orderBy(desc(turnos.idTurno))
    .limit(1);

  let fechaOriginal = ultimoTurnoColgado[0]?.fecha;

  // Forzamos la hora en formato numérico entero (2359) para la columna de SQLite
  const horaFijadaNum = 2359;

  // Intentamos rescatar la fecha en formato String del JSON viejo
  let fechaStrOriginal = dtoAperturaActual.fecha;

  if (ultimoTurnoColgado.length > 0 && ultimoTurnoColgado[0].json) {
    try {
      const dtoViejo = JSON.parse(ultimoTurnoColgado[0].json) as TurnoDTO;
      fechaStrOriginal = dtoViejo.fecha;
    } catch (e) {
      console.log("No se pudo parsear el JSON del turno colgado anterior");
    }
  }

  // 2. Clonamos los datos actuales de la medición pero forzamos fecha vieja y hora a las 11:59 PM
  const dtoCierreAut: TurnoDTO = {
    ...dtoAperturaActual,
    fecha: fechaStrOriginal,
    hora: "23:59:00", // ✨ Forzado a las 11:59 PM en formato string para el DTO JSON
    observacion: `[CIERRE AUTOMÁTICO FALTA ANTERIOR] Motivo: ${observacionMotivo} | Obs Actual: ${dtoAperturaActual.observacion}`,
  };

  // 3. Insertamos el FIN-TURNO forzando el estado a cerrado (2) y sync listo para subir (0)

  return db.insert(turnos).values({
    idBodega,
    json: JSON.stringify(dtoCierreAut),
    tipo: "2",
    fecha: fechaOriginal ?? undefined, // Mantiene la fecha numérica del día colgado original (ej: 20260628)
    hora: horaFijadaNum, // ✨ Forzado a 2359 en la columna numérica local
    sync: 0,
    estado: 1,
  });
}

/**
 * Busca e imprime todos los turnos de una bodega específica en una fecha dada.
 * @param idBodega ID numérico de la bodega.
 * @param fecha Puede ser un número (ej: 20260708) o un string (ej: "2026-07-08").
 */
export async function imprimirTurnosPorBodegaYFecha(
  idBodega: number,
  fecha: string | number,
) {
  try {
    let fechaNum: number;

    if (typeof fecha === "string") {
      fechaNum = parseInt(fecha.replace(/-/g, ""), 10);
    } else {
      fechaNum = fecha;
    }

    if (isNaN(fechaNum) || String(fechaNum).length !== 8) {
      console.error(
        `❌ Formato de fecha inválido provisto: "${fecha}". Debe ser YYYY-MM-DD o YYYYMMDD.`,
      );
      return;
    }

    const resultado = await db
      .select()
      .from(turnos)
      .where(and(eq(turnos.idBodega, idBodega), eq(turnos.fecha, fechaNum)));

    if (resultado.length === 0) {
      console.log(
        `⚠️ No se encontraron turnos para la bodega ID: ${idBodega} en la fecha: ${fechaNum}`,
      );
      return;
    }

    // --- CONSTRUCCIÓN DEL LOG MANUAL COMPATIBLE CON METRO/EXPO ---
    console.log(
      `\n📊 ========== TURNOS ENCONTRADOS (${resultado.length}) ==========`,
    );
    console.log(
      `Filtros aplicados -> Bodega ID: ${idBodega} | Fecha: ${fechaNum}`,
    );
    console.log(
      `----------------------------------------------------------------------`,
    );

    resultado.forEach((t, index) => {
      // Formateador de hora seguro
      let horaFormateada = String(t.hora);
      if (t.hora !== null && t.hora !== undefined) {
        const horas = Math.floor(t.hora / 100);
        const minutos = t.hora % 100;
        horaFormateada = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
      }

      const tipoTexto =
        t.tipo === "1"
          ? "Apertura (Inicio)"
          : t.tipo === "2"
            ? "Cierre (Fin)"
            : t.tipo;
      const syncIcono = t.sync === 1 ? "✅ Sincronizado" : "⏳ Pendiente";
      const estadoTexto = t.estado === 1 ? "Activo" : "❌ Anulado";

      // Imprimimos cada registro en una línea limpia y fácil de leer
      console.log(
        ` [${index + 1}] ID Turno: ${t.idTurno}\n` +
          `     • Bodega ID : ${t.idBodega}\n` +
          `     • Tipo      : ${tipoTexto} (Código: "${t.tipo}")\n` +
          `     • Hora      : ${horaFormateada} hs\n` +
          `     • Sync      : ${syncIcono}\n` +
          `     • Estado    : ${estadoTexto}`,
      );
      console.log(
        `----------------------------------------------------------------------`,
      );
    });
  } catch (error) {
    console.error(
      "❌ Error al consultar los turnos en la base de datos:",
      error,
    );
  }
}
