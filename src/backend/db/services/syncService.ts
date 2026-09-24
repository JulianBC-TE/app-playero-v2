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
import { useAppContext } from "@/hooks/useAppContext";
import { checkUserStatusServer } from "@/backend/api/authAPI";
import { updateLocalUserBlockStatus, updateLocalUserSucursal } from "../modules/authDB";
import { saveSucursales } from "../modules/sucursalDB";
import { httpClient } from "@/backend/api/httpClient";
import { toastError, toastInfo } from "@/utils/toastMessage";
import { sync as syncSecureTime } from "@/services/timeService";
import type { SyncStatus, SyncErrorCount } from "@/contexts/AuthContext";
import { db } from "@/backend/db/client";
import { tickets, abastecimientos, trapasos, calibraciones, turnos } from "@/backend/db/schema";
import { count, eq } from "drizzle-orm";
import { crearLog, limpiarLogsAntiguos } from "../logs/logModule";

// Contador de registros con error de sincronización (sync = -1)
async function contarRegistrosSyncError(): Promise<number> {
  try {
    const [ticketsCount, abastecimientosCount, trapasosCount, calibracionesCount, turnosCount] = await Promise.all([
      db.select({ count: count() }).from(tickets).where(eq(tickets.sync, -1)),
      db.select({ count: count() }).from(abastecimientos).where(eq(abastecimientos.sync, -1)),
      db.select({ count: count() }).from(trapasos).where(eq(trapasos.sync, -1)),
      db.select({ count: count() }).from(calibraciones).where(eq(calibraciones.sync, -1)),
      db.select({ count: count() }).from(turnos).where(eq(turnos.sync, -1)),
    ]);

    const total = (ticketsCount[0]?.count ?? 0) +
                  (abastecimientosCount[0]?.count ?? 0) +
                  (trapasosCount[0]?.count ?? 0) +
                  (calibracionesCount[0]?.count ?? 0) +
                  (turnosCount[0]?.count ?? 0);

    return total;
  } catch (error) {
    console.error("Error contando registros con sync = -1:", error);
    return 0;
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

export async function syncCatalogosFromCentral(idUser: number, onStatus?: (msg: string) => void): Promise<boolean> {
  let estaBloqueado = false;
  try {
    const usuarioLocal = await getDatosUsuarioLogueadoLocal();
    const cedula = usuarioLocal?.cedula ?? 0;

    onStatus?.("Verificando estado de usuario...");
    try {
      const remoto = await checkUserStatusServer(idUser);
      await updateLocalUserBlockStatus(idUser, remoto.bloqueado);
      
      estaBloqueado = remoto.bloqueado;
      if(remoto.bloqueado)console.log(`📤 BAJADA -> Estado de bloqueo guardado localmente: ${remoto.bloqueado}`);

      if (remoto.idSucursal && usuarioLocal && usuarioLocal.idSucursal !== remoto.idSucursal) {
        await updateLocalUserSucursal(usuarioLocal.cedula, remoto.idSucursal);
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

    onStatus?.("Descargando turnos...");
    await sincronizarUltimosTurnosDesdeBackend(idUser);
    
    onStatus?.("Descargando sucursales...");
    await syncSucursalesFromCentral();

    onStatus?.("Descargando bodegas...");
    await syncCatalogoYTraspasosBodega();

    onStatus?.("Descargando picos...");
    await syncPicosDelOperario(cedula);

    onStatus?.("Descargando tanques...");
    await syncTanquesDelOperario(cedula);
    
    onStatus?.("Descargando personas...");
    await syncPersonasFromCentral();
    
    onStatus?.("Descargando clientes...");
    await syncClientesFromCentral();
    
    onStatus?.("Descargando vehículos...");
    await syncVehiculosFromCentral();
    
    onStatus?.("Descargando cubicaciones...");
    await sincronizarCubicacionesMasivas();
    
    console.log("📤 BAJADA -> Finalizada");
    return estaBloqueado;
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
  isManual: boolean = false
): Promise<boolean> {
  // Verificar conectividad ANTES de intentar sincronizar
  const online = await httpClient.isOnline();
  if (!online) {
    console.log("📴 SYNC -> Sin conexión al servidor. Omitiendo sincronización.");
    if (isManual) {
      toastError("Intentá de nuevo más tarde", "No se pudo conectar con el servidor");
    }
    return false;
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
    const usuarioBloqueado = await syncCatalogosFromCentral(idUser, onStatus);

    // Actualizar contador de registros con error de sincronización
    const errorCount = await contarRegistrosSyncError();
    onSyncErrorCount?.(errorCount);

    console.log("🏁 ORQUESTADOR -> Ciclo completo terminado");
    return usuarioBloqueado;
  } finally {
    onSyncStatus?.("idle");
  }
}