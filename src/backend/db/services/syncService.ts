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

export async function syncPendingData() {
  try {
    //console.log("📤 SUBIDA -> Iniciando subida de datos pendientes...");
    
    await syncPersonasToCentral();
    await syncVehiculosToCentral();

    await syncLote(await getTicketsPendientes(), (t) => t.idTicket, enviarTicket, marcarTicketSync, marcarTicketErrorSync, "Ticket");
    await syncLote(await getTraspasosPendientes(), (t) => t.idTrapaso, enviarTraspaso, marcarTraspasoSync, marcarTraspasoErrorSync, "Traspaso");
    await syncLote(await getCalibracionesPendientes(), (t) => t.idCalibracion, enviarCalibracion, marcarCalibracionSync, marcarCalibracionErrorSync, "Calibración");
    await syncLote(await getAbastecimientosPendientes(), (dto) => Number(dto.id_abastecimiento), enviarAbastecimiento, marcarAbastecimientoSync, marcarAbastecimientoErrorSync, "Abastecimiento");
    await syncLote(await getTurnosPendientes(), (t) => t.idTurno, enviarTurno, marcarTurnoSync, marcarTurnoErrorSync, "Turno");
    
    console.log("📤 SUBIDA -> Finalizada");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ SUBIDA -> Error crítico:", msg);
  }
}

// ── BAJADA: syncCatalogosFromCentral ──────────────────────────────────────────

export async function syncCatalogosFromCentral(idUser: number): Promise<boolean> {
  let estaBloqueado = false; // Por defecto asumimos false 
  try {
    //console.log("📥 BAJADA -> Descargando catálogos...");
    
    try {
      //console.log(`🔒 SINCRO -> Verificando estado de cuenta para id: ${idUser}`);
      const remoto = await checkUserStatusServer(idUser);
      await updateLocalUserBlockStatus(idUser, remoto.bloqueado);
      
      estaBloqueado = remoto.bloqueado; // ◄ Guardamos el valor real del servidor
      if(remoto.bloqueado)console.log(`📤 BAJADA -> Estado de bloqueo guardado localmente: ${remoto.bloqueado}`);
    } catch (errorBlock) {
      console.warn("📤 BAJADA -> ⚠️ No se pudo validar el estado de bloqueo con el servidor:", errorBlock);
    }

    await sincronizarUltimosTurnosDesdeBackend(idUser);
    await syncSucursalesFromCentral();
    await syncPersonasFromCentral();
    await syncClientesFromCentral();
    await syncVehiculosFromCentral();
    await sincronizarCubicacionesMasivas();
    console.log("📤 BAJADA -> Finalizada");
    return estaBloqueado; // ◄ Retornamos el estado
  } catch (error) {
    throw error;
  }
}

// ── SINCRO COMPLETA (ORQUESTADOR) ─────────────────────────────────────────────

export async function syncTodo(idUser: number): Promise<boolean> {
  console.log("🔄 ORQUESTADOR -> Iniciando ciclo completo");
  await syncPendingData();
  const usuarioBloqueado = await syncCatalogosFromCentral(idUser); // ◄ Capturamos el valor
  console.log("🏁 ORQUESTADOR -> Ciclo completo terminado");
  
  return usuarioBloqueado; // ◄ Lo exponemos al orquestador externo
}