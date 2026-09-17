import { eq, lt, count, asc, sql } from "drizzle-orm";
import { logsDb, initLogsDb } from "./logClient";
import { logs, type Log } from "./logSchema";
import { cifrarPayload, descifrarPayload } from "./logCrypto";
import { getAdminPassword } from "./logPassword";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initLogsDb();
    initialized = true;
  }
}

export type TipoLog = "salida" | "traspaso" | "calibracion" | "abastecimiento" | "turno" | "vehiculo" | "persona" | "cliente";
export type AccionLog = "creacion" | "sync_ok" | "sync_error";

export interface CrearLogParams {
  tipo: TipoLog;
  accion: AccionLog;
  registroId: number;
  detalle?: string;
  payload: Record<string, any>;
}

export async function crearLog(params: CrearLogParams): Promise<void> {
  try {
    await ensureInit();
    const password = await getAdminPassword();
    const now = new Date();
    const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const payloadCifrado = cifrarPayload(params.payload, password);

    await logsDb.insert(logs).values({
      fecha,
      tipo: params.tipo,
      accion: params.accion,
      registroId: params.registroId,
      detalle: params.detalle ?? null,
      payloadCifrado,
    });
  } catch (error) {
    console.error("[LogModule] Error creando log:", error);
  }
}

export interface LogResumen {
  id: number;
  fecha: string;
  tipo: TipoLog;
  accion: AccionLog;
  registroId: number;
  detalle: string | null;
  payload: Record<string, any> | null;
}

export async function getLogsPorFecha(fechaFiltro: string): Promise<LogResumen[]> {
  await ensureInit();
  const password = await getAdminPassword();

  const rows = await logsDb
    .select()
    .from(logs)
    .where(eq(sql`date(${logs.fecha})`, fechaFiltro))
    .orderBy(asc(logs.id));

  return rows.map((row) => {
    let payload: Record<string, any> | null = null;
    try {
      payload = descifrarPayload(row.payloadCifrado, password);
    } catch {
      payload = null;
    }
    return {
      id: row.id,
      fecha: row.fecha,
      tipo: row.tipo as TipoLog,
      accion: row.accion as AccionLog,
      registroId: row.registroId,
      detalle: row.detalle,
      payload,
    };
  });
}

export async function limpiarLogsAntiguos(): Promise<void> {
  await ensureInit();

  const dosMesesAtras = new Date();
  dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);
  const fechaLimite = `${dosMesesAtras.getFullYear()}-${String(dosMesesAtras.getMonth() + 1).padStart(2, "0")}-${String(dosMesesAtras.getDate()).padStart(2, "0")} 00:00:00`;

  await logsDb.delete(logs).where(lt(logs.fecha, fechaLimite));

  const [{ total }] = await logsDb.select({ total: count() }).from(logs);
  if (total > 10000) {
    const eliminar = total - 10000;
    const antiguos = await logsDb
      .select({ id: logs.id })
      .from(logs)
      .orderBy(asc(logs.id))
      .limit(eliminar);

    if (antiguos.length > 0) {
      const ids = antiguos.map((r) => r.id);
      await logsDb.delete(logs).where(sql`${logs.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
    }
  }
}
