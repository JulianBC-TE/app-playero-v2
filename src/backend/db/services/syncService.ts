/**
 * Servicio de sincronización maestro.
 * Coordina la ejecución secuencial de todos los módulos de sync
 * (personas, clientes, vehículos, bodegas, picos, tanques, etc.).
 *
 * @module Playero/Backend/DB/Services/syncService
 * @category Database Services
 */
import { SYNC_CONFIG } from "../constants/syncConfig";

import {
  syncClientesFromCentral,
  syncClientesToCentral,
} from "../modules/clienteDB";
import {
  syncPersonasFromCentral,
  syncPersonasToCentral,
} from "../modules/personaDB";
import {
  syncVehiculosFromCentral,
  syncVehiculosToCentral,
} from "../modules/vehiculoDB";

import { syncSucursalesFromCentral } from "../modules/sucursalDB";
import { syncBodegasDelOperario } from "../modules/bodegaDB";
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
} from "../modules/turnoBD";
import {
  enviarTicket,
  enviarTraspaso,
  enviarCalibracion,
  enviarAbastecimiento,
  enviarTurno,
} from "../../api/operacionesAPI";

/**
 * Sincronización Inicial después del Login Online
 */
export async function syncInitialData(
  idSucursal: number,
  cedula: string,
): Promise<void> {
  console.log("🚀 Iniciando sincronización inicial completa...");

  try {
    // 1. Sucursales
    await syncSucursalesFromCentral();

    await syncBodegasDelOperario(cedula); // solo las bodegas de este operario
    await syncPicosDelOperario(cedula); // solo los picos de esas bodegas
    await syncTanquesDelOperario(cedula); // solo los tanques de esas bodegas;

    // 4. Maestros bidireccionales
    await syncClientesFromCentral(0);
    await syncPersonasFromCentral(0);
    await syncVehiculosFromCentral(0);

    console.log("✅ Sincronización inicial COMPLETADA");
  } catch (error) {
    console.error("❌ Error durante syncInitialData:", error);
  }
}

/** Sincronización completa (manual o background) */
export async function fullSync(idSucursal: number, cedula: string) {
  await syncInitialData(idSucursal, cedula);
  await syncPendingData(cedula);
}

// ── Helper genérico de envío por lotes ───────────────────────────────────────

async function syncLote<T>(
  items: T[],
  getPk: (item: T) => number, // ← función en vez de keyof
  enviar: (item: T) => Promise<void>,
  marcarOk: (id: number) => Promise<void>,
  marcarError: (id: number) => Promise<void>,
  nombre: string,
) {
  for (const item of items) {
    const id = getPk(item);
    try {
      await enviar(item);
      await marcarOk(id);
      console.log(`✅ ${nombre} #${id} sincronizado`);
    } catch (err) {
      await marcarError(id);
      console.warn(`⚠️ ${nombre} #${id} error:`, err);
    }
  }
}

// ── syncPendingData actualizado ───────────────────────────────────────────────
/** Solo envía pendientes al servidor */
export async function syncPendingData(cedula: string) {
  try {
    // Maestros
    await syncClientesToCentral();
    await syncPersonasToCentral();
    await syncVehiculosToCentral();

    // Operaciones de pista
    await syncLote(
      await getTicketsPendientes(),
      (t) => t.idTicket, // ← así en todos
      enviarTicket,
      marcarTicketSync,
      marcarTicketErrorSync,
      "Ticket",
    );

    await syncLote(
      await getTraspasosPendientes(),
      (t) => t.idTrapaso,
      enviarTraspaso,
      marcarTraspasoSync,
      marcarTraspasoErrorSync,
      "Traspaso",
    );

    await syncLote(
      await getCalibracionesPendientes(),
      (t) => t.idCalibracion,
      enviarCalibracion,
      marcarCalibracionSync,
      marcarCalibracionErrorSync,
      "Calibracion",
    );

    await syncLote(
      await getAbastecimientosPendientes(),
      (t) => t.idAbastecimiento,
      enviarAbastecimiento,
      marcarAbastecimientoSync,
      marcarAbastecimientoErrorSync,
      "Abastecimiento",
    );

    await syncLote(
      await getTurnosPendientes(),
      (t) => t.idTurno,
      enviarTurno,
      marcarTurnoSync,
      marcarTurnoErrorSync,
      "Turno",
    );
  } catch (error) {
    console.error("Error en syncPendingData:", error);
  }
}
