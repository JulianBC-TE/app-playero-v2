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
import { updateLocalUserBlockStatus } from "../modules/authDB";

// ── Helper genérico de envío por lotes ───────────────────────────────────────

async function syncLote<T>(
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
    } catch (err) {
      await marcarError(id);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${nombre.toUpperCase()} -> falló (#${id}):`, msg);
    }
  }
}

// ── SUBIDA: syncPendingData ──────────────────────────────────────────────────

export async function syncPendingData(onStatus?: (msg: string) => void) {
  try {
    onStatus?.("Subiendo personas...");
    await syncPersonasToCentral();
    
    onStatus?.("Subiendo vehículos...");
    await syncVehiculosToCentral();

    onStatus?.("Subiendo tickets...");
    await syncLote(await getTicketsPendientes(), (t) => t.idTicket, enviarTicket, marcarTicketSync, marcarTicketErrorSync, "Ticket");
    
    onStatus?.("Subiendo traspasos...");
    await syncLote(await getTraspasosPendientes(), (t) => t.idTrapaso, enviarTraspaso, marcarTraspasoSync, marcarTraspasoErrorSync, "Traspaso");
    
    onStatus?.("Subiendo calibraciones...");
    await syncLote(await getCalibracionesPendientes(), (t) => t.idCalibracion, enviarCalibracion, marcarCalibracionSync, marcarCalibracionErrorSync, "Calibración");
    
    onStatus?.("Subiendo abastecimientos...");
    await syncLote(await getAbastecimientosPendientes(), (dto) => Number(dto.id_abastecimiento), enviarAbastecimiento, marcarAbastecimientoSync, marcarAbastecimientoErrorSync, "Abastecimiento");
    
    onStatus?.("Subiendo turnos...");
    await syncLote(await getTurnosPendientes(), (t) => t.idTurno, enviarTurno, marcarTurnoSync, marcarTurnoErrorSync, "Turno");
    
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
    onStatus?.("Verificando estado de usuario...");
    try {
      const remoto = await checkUserStatusServer(idUser);
      await updateLocalUserBlockStatus(idUser, remoto.bloqueado);
      
      estaBloqueado = remoto.bloqueado;
      if(remoto.bloqueado)console.log(`📤 BAJADA -> Estado de bloqueo guardado localmente: ${remoto.bloqueado}`);
    } catch (errorBlock) {
      console.warn("📤 BAJADA -> ⚠️ No se pudo validar el estado de bloqueo con el servidor:", errorBlock);
    }

    onStatus?.("Descargando turnos...");
    await sincronizarUltimosTurnosDesdeBackend(idUser);
    
    onStatus?.("Descargando sucursales...");
    await syncSucursalesFromCentral();
    
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

export async function syncTodo(idUser: number, onStatus?: (msg: string) => void): Promise<boolean> {
  console.log("🔄 ORQUESTADOR -> Iniciando ciclo completo");
  await syncPendingData(onStatus);
  const usuarioBloqueado = await syncCatalogosFromCentral(idUser, onStatus);
  console.log("🏁 ORQUESTADOR -> Ciclo completo terminado");
  
  return usuarioBloqueado;
}