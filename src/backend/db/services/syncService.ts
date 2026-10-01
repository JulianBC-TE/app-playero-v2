import { 
  syncClientesFromCentral 
} from "../modules/clienteDB";
import { sincronizarCubicacionesMasivas } from "./sincronizarCubicaciones";
import {
  syncPersonasFromCentral,
  syncPersonasToCentral,
} from "../modules/personaDB";
import {
  syncVehiculosFromCentral,
  syncVehiculosToCentral,
} from "../modules/vehiculoDB";

import { syncSucursalesFromCentral } from "../modules/sucursalDB";
import { syncCatalogoYTraspasosBodega, getDatosUsuarioLogueadoLocal } from "../modules/bodegaDB";
import { syncPicosDelOperario } from "../modules/picoDB";
import { syncTanquesDelOperario } from "../modules/tanqueDB";
import {
  getTicketsPendientes,
  marcarTicketSync,
  marcarTicketErrorSync,
} from "../modules/ticketDB";
import {
  getTraspasosPendientes,
  marcarTraspasoSync,
  marcarTraspasoErrorSync,
} from "../modules/traspasoDB";
import {
  getCalibracionesPendientes,
  marcarCalibracionSync,
  marcarCalibracionErrorSync,
} from "../modules/calibracionDB";
import {
  getAbastecimientosPendientes,
  marcarAbastecimientoSync,
  marcarAbastecimientoErrorSync,
} from "../modules/abastecimientoDB";
import {
  getTurnosPendientes,
  marcarTurnoSync,
  marcarTurnoErrorSync,
  sincronizarUltimosTurnosDesdeBackend,
} from "../modules/turnoBD";
import { enviarAbastecimiento, enviarCalibracion, enviarTicket, enviarTraspaso, enviarTurno } from "@/backend/api/operacionesAPI";
import { checkUserStatusServer } from "@/backend/api/authAPI";
import { checkAppVersion } from "@/backend/api/versionAPI";
import type { UpdateSyncInfo } from "@/backend/api/versionAPI";
import { updateLocalUserBlockStatus, updateLocalUserSucursal } from "../modules/authDB";
import { saveSucursales } from "../modules/sucursalDB";
import { httpClient } from "@/backend/api/httpClient";
import { toastError, toastInfo } from "@/utils/toastMessage";
import { sync as syncSecureTime } from "@/services/timeService";
import type { SyncStatus, SyncErrorCount } from "@/contexts/AuthContext";
import type { SucursalDTO } from "@/dto/sucursalDTO";
import { db } from "@/backend/db/client";
import { tickets, abastecimientos, trapasos, calibraciones, turnos, personas, vehiculos } from "@/backend/db/schema";
import { count, eq } from "drizzle-orm";
import { crearLog, limpiarLogsAntiguos } from "../logs/logModule";

// Resultado de un ciclo de sincronización: estado del usuario + sucursal
// recién bajada + (opcional) aviso de actualización de la app.
export type SyncResult = {
  estaBloqueado: boolean;
  sucursalCambio: boolean;
  sucursal?: SucursalDTO;
  /** Presente cuando el servidor respondió el chequeo de versión. */
  update?: UpdateSyncInfo;
};

// Conteo de registros locales según su estado de sincronización:
//   - errores    → sync = -1 (la subida falló)
//   - pendientes → sync = 0  (todavía no se subió)
// Solo tablas que la app SUBE: cubicacion_tanque y despachos son de solo
// lectura (su sync = 0 no significa "falta subir") y clientes queda fuera
// del sistema de envío.
export type ConteoRegistrosSync = {
  errores: number;
  pendientes: number;
};

async function contarPorEstado(estado: number): Promise<number> {
  const [p, v, t, tk, tr, c, a] = await Promise.all([
    db.select({ n: count() }).from(personas).where(eq(personas.sync, estado)),
    db.select({ n: count() }).from(vehiculos).where(eq(vehiculos.sync, estado)),
    db.select({ n: count() }).from(turnos).where(eq(turnos.sync, estado)),
    db.select({ n: count() }).from(tickets).where(eq(tickets.sync, estado)),
    db.select({ n: count() }).from(trapasos).where(eq(trapasos.sync, estado)),
    db.select({ n: count() }).from(calibraciones).where(eq(calibraciones.sync, estado)),
    db.select({ n: count() }).from(abastecimientos).where(eq(abastecimientos.sync, estado)),
  ]);

  return (
    (p[0]?.n ?? 0) +
    (v[0]?.n ?? 0) +
    (t[0]?.n ?? 0) +
    (tk[0]?.n ?? 0) +
    (tr[0]?.n ?? 0) +
    (c[0]?.n ?? 0) +
    (a[0]?.n ?? 0)
  );
}

export async function contarRegistrosSync(): Promise<ConteoRegistrosSync> {
  try {
    const [errores, pendientes] = await Promise.all([
      contarPorEstado(-1),
      contarPorEstado(0),
    ]);

    return { errores, pendientes };
  } catch (error) {
    console.error("Error contando registros de sincronización:", error);
    return { errores: 0, pendientes: 0 };
  }
}

// ── Helper genérico de envío por lotes ───────────────────────────────────────

function extraerDetalle(nombre: string, item: any): string {
  switch (nombre) {
    case "Ticket":
      return `${item.litros}L, Tax: ${item.taxilitro_inicial}-${item.taxilitro_final}`;
    case "Traspaso":
      return `${item.litros_pico}L, Tax: ${item.taxilitro_inicial}-${item.taxilitro_final}`;
    case "Calibración":
      return `Tax: ${item.taxilitro_inicial}-${item.taxilitro_final}`;
    case "Abastecimiento":
      return `${item.litros_remision}L, OC: ${item.nro_oc}`;
    case "Turno":
      return `${item.tipo === "1" ? "INICIO" : "FIN"} turno`;
    default:
      return "";
  }
}

function mapearNombreTipo(nombre: string): "salida" | "traspaso" | "calibracion" | "abastecimiento" | "turno" {
  switch (nombre) {
    case "Ticket": return "salida";
    case "Traspaso": return "traspaso";
    case "Calibración": return "calibracion";
    case "Abastecimiento": return "abastecimiento";
    case "Turno": return "turno";
    default: return "salida";
  }
}

async function syncLote<T>(
  items: T[],
  getPk: (item: T) => number,
  enviar: (item: T) => Promise<{ duplicado?: boolean }>,
  marcarOk: (id: number) => Promise<void>,
  marcarError: (id: number) => Promise<void>,
  nombre: string,
) {
  if (items.length === 0) return;

  for (const item of items) {
    const id = getPk(item);
    try {
      const resultado = await enviar(item);
      await marcarOk(id);
      if (resultado.duplicado) {
        console.log(`⚠️ ${nombre.toUpperCase()} -> duplicado detectado por servidor (#${id}), marcado como sync`);
        await crearLog({
          tipo: mapearNombreTipo(nombre),
          accion: "sync_duplicado",
          registroId: id,
          detalle: extraerDetalle(nombre, item),
          payload: item as any,
        });
      } else {
        console.log(`➡️ ${nombre.toUpperCase()} -> ok (#${id})`);
        await crearLog({
          tipo: mapearNombreTipo(nombre),
          accion: "sync_ok",
          registroId: id,
          detalle: extraerDetalle(nombre, item),
          payload: item as any,
        });
      }
    } catch (err) {
      await marcarError(id);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${nombre.toUpperCase()} -> falló (#${id}):`, msg);
      await crearLog({
        tipo: mapearNombreTipo(nombre),
        accion: "sync_error",
        registroId: id,
        detalle: extraerDetalle(nombre, item),
        payload: item as any,
      });
    }
  }
}

async function syncLoteSimple<T>(
  items: T[],
  getPk: (item: T) => number,
  enviar: (item: T) => Promise<void>,
  marcarOk: (id: number) => Promise<void>,
  marcarError: (id: number) => Promise<void>,
  nombre: string,
) {
  if (items.length === 0) return;

  for (const item of items) {
    const id = getPk(item);
    try {
      await enviar(item);
      await marcarOk(id);
      console.log(`➡️ ${nombre.toUpperCase()} -> ok (#${id})`);
      await crearLog({
        tipo: mapearNombreTipo(nombre),
        accion: "sync_ok",
        registroId: id,
        detalle: extraerDetalle(nombre, item),
        payload: item as any,
      });
    } catch (err) {
      await marcarError(id);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${nombre.toUpperCase()} -> falló (#${id}):`, msg);
      await crearLog({
        tipo: mapearNombreTipo(nombre),
        accion: "sync_error",
        registroId: id,
        detalle: extraerDetalle(nombre, item),
        payload: item as any,
      });
    }
  }
}

// ── SUBIDA: syncPendingData ──────────────────────────────────────────────────

export async function syncPendingData(onStatus?: (msg: string) => void, isManual: boolean = false) {
  try {
    onStatus?.("Subiendo personas...");
    await syncPersonasToCentral(isManual);
    
    onStatus?.("Subiendo vehículos...");
    await syncVehiculosToCentral(isManual);

    onStatus?.("Subiendo tickets...");
    await syncLote(await getTicketsPendientes(isManual), (t) => t.idTicket, enviarTicket, marcarTicketSync, marcarTicketErrorSync, "Ticket");
    
    onStatus?.("Subiendo traspasos...");
    await syncLote(await getTraspasosPendientes(isManual), (t) => t.idTrapaso, enviarTraspaso, marcarTraspasoSync, marcarTraspasoErrorSync, "Traspaso");
    
    onStatus?.("Subiendo calibraciones...");
    await syncLote(await getCalibracionesPendientes(isManual), (t) => t.idCalibracion, enviarCalibracion, marcarCalibracionSync, marcarCalibracionErrorSync, "Calibración");
    
    onStatus?.("Subiendo abastecimientos...");
    await syncLote(await getAbastecimientosPendientes(isManual), (dto) => Number(dto.id_abastecimiento), enviarAbastecimiento, marcarAbastecimientoSync, marcarAbastecimientoErrorSync, "Abastecimiento");
    
    onStatus?.("Subiendo turnos...");
    await syncLoteSimple(await getTurnosPendientes(isManual), (t) => t.idTurno, enviarTurno, marcarTurnoSync, marcarTurnoErrorSync, "Turno");
    
    console.log("📤 SUBIDA -> Finalizada");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ SUBIDA -> Error crítico:", msg);
  }
}

// ── BAJADA: syncCatalogosFromCentral ──────────────────────────────────────────

/**
 * Descarga catálogos desde el servidor central.
 *
 * @param idUser - ID del usuario activo.
 * @param onStatus - Callback opcional con el mensaje de progreso.
 * @param incluyeAsignacion - Cuando es `false` (ciclo automático) **no** se
 * descarga la asignación del usuario (sucursal, bodegas, picos, tanques):
 * eso solo ocurre con la sincronización manual del Home o al iniciar sesión.
 */
export async function syncCatalogosFromCentral(
  idUser: number,
  onStatus?: (msg: string) => void,
  incluyeAsignacion: boolean = true,
): Promise<SyncResult> {
  let estaBloqueado = false;
  let sucursalCambio = false;
  let sucursal: SyncResult["sucursal"];
  try {
    const usuarioLocal = await getDatosUsuarioLogueadoLocal();
    const cedula = usuarioLocal?.cedula ?? 0;

    onStatus?.("Verificando estado de usuario...");
    try {
      const remoto = await checkUserStatusServer(idUser);
      await updateLocalUserBlockStatus(idUser, remoto.bloqueado);
      
      estaBloqueado = remoto.bloqueado;
      if(remoto.bloqueado)console.log(`📤 BAJADA -> Estado de bloqueo guardado localmente: ${remoto.bloqueado}`);

      if (remoto.idSucursal) {
        sucursal = {
          id_sucursal: remoto.idSucursal,
          descripcion_sucursal: remoto.descripcionSucursal ?? "",
        };
      }

      if (remoto.idSucursal && usuarioLocal && usuarioLocal.idSucursal !== remoto.idSucursal) {
        await updateLocalUserSucursal(usuarioLocal.cedula, remoto.idSucursal);
        sucursalCambio = true;
        console.log(`📤 BAJADA -> Sucursal actualizada: ${usuarioLocal.idSucursal} → ${remoto.idSucursal}`);
      }
      if (remoto.idSucursal && remoto.descripcionSucursal) {
        await saveSucursales([{
          id_sucursal: remoto.idSucursal,
          descripcion_sucursal: remoto.descripcionSucursal,
        }]);
      }
    } catch (errorBlock) {
      console.warn("📤 BAJADA -> ⚠️ No se pudo validar el estado de bloqueo con el servidor:", errorBlock);
    }

    // ── Chequeo de versión de la app ────────────────────────────────────────
    // Se envía la versión instalada en cada sincronización. Si el servidor
    // detecta que no es la última, devuelve el enlace de actualización junto
    // con la respuesta y el Home muestra la card verde "Actualizar".
    onStatus?.("Verificando versión de la app...");
    let update: UpdateSyncInfo | undefined;
    try {
      const chequeo = await checkAppVersion();
      update =
        chequeo.updateAvailable && chequeo.url && chequeo.latestVersion
          ? {
              disponible: true,
              url: chequeo.url,
              latestVersion: chequeo.latestVersion,
              tamano: chequeo.tamano,
            }
          : { disponible: false };

      if (update.disponible) {
        console.log(`📤 BAJADA -> Nueva versión disponible: ${update.latestVersion}`);
      }
    } catch (errorVersion) {
      // No corta la sincronización por esto; se conserva el aviso anterior.
      console.warn("📤 BAJADA -> ⚠️ No se pudo verificar la versión de la app:", errorVersion);
      update = undefined;
    }

    onStatus?.("Descargando turnos...");
    await sincronizarUltimosTurnosDesdeBackend(idUser);

    // La asignación del usuario (sucursal + bodegas de control/traspaso + picos
    // y tanques derivados) solo se descarga en la sincronización manual del Home
    // o al iniciar sesión. El ciclo automático no debe tocarla.
    if (incluyeAsignacion) {
      onStatus?.("Descargando sucursales...");
      await syncSucursalesFromCentral();

      onStatus?.("Descargando bodegas...");
      await syncCatalogoYTraspasosBodega();

      onStatus?.("Descargando picos...");
      await syncPicosDelOperario(cedula);

      onStatus?.("Descargando tanques...");
      await syncTanquesDelOperario(cedula);
    }
    
    onStatus?.("Descargando personas...");
    await syncPersonasFromCentral();
    
    onStatus?.("Descargando clientes...");
    await syncClientesFromCentral();
    
    onStatus?.("Descargando vehículos...");
    await syncVehiculosFromCentral();
    
    onStatus?.("Descargando cubicaciones...");
    await sincronizarCubicacionesMasivas();
    
    console.log("📤 BAJADA -> Finalizada");
    return { estaBloqueado, sucursalCambio, sucursal, update };
  } catch (error) {
    throw error;
  }
}

// ── SINCRO COMPLETA (ORQUESTADOR) ─────────────────────────────────────────────

export async function syncTodo(
  idUser: number,
  onStatus?: (msg: string) => void,
  onSyncStatus?: (status: SyncStatus) => void,
  onSyncErrorCount?: (count: number) => void,
  isManual: boolean = false,
  onSyncPendingCount?: (count: number) => void
): Promise<SyncResult> {
  // Verificar conectividad ANTES de intentar sincronizar
  const online = await httpClient.isOnline();
  if (!online) {
    console.log("📴 SYNC -> Sin conexión al servidor. Omitiendo sincronización.");
    if (isManual) {
      toastError("Intentá de nuevo más tarde", "No se pudo conectar con el servidor");
    }
    return { estaBloqueado: false, sucursalCambio: false };
  }

  onSyncStatus?.("syncing");
  try {
    // Establecer ancla de tiempo segura (una vez por ciclo de sync)
    try {
      await syncSecureTime();
    } catch (e) {
      // No bloquear el sync si falla
    }

    // Limpiar logs antiguos al inicio de cada ciclo
    try {
      await limpiarLogsAntiguos();
    } catch (e) {
      // No bloquear el sync si falla
    }

    if (isManual) {
      toastInfo("Sincronización", "Se sincronizó con el servidor correctamente.");
    }
    console.log("🔄 ORQUESTADOR -> Iniciando ciclo completo");
    await syncPendingData(onStatus, isManual);
    const resultado = await syncCatalogosFromCentral(idUser, onStatus, isManual);

    // Actualizar contadores del badge (errores = sync -1, pendientes = sync 0)
    const conteo = await contarRegistrosSync();
    onSyncErrorCount?.(conteo.errores);
    onSyncPendingCount?.(conteo.pendientes);

    console.log("🏁 ORQUESTADOR -> Ciclo completo terminado");
    return resultado;
  } finally {
    onSyncStatus?.("idle");
  }
}