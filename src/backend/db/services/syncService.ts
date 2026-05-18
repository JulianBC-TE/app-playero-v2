// src/backend/db/services/syncService.ts
import { SYNC_CONFIG } from "../constants/syncConfig";

import { syncClientesFromCentral, syncClientesToCentral } from "../modules/clienteDB";
import { syncPersonasFromCentral, syncPersonasToCentral } from "../modules/personaDB";
import { syncVehiculosFromCentral, syncVehiculosToCentral } from "../modules/vehiculoDB";

import { syncSucursalesFromCentral } from "../modules/sucursalDB";
import { syncBodegasFromCentral } from "../modules/bodegaDB";
import { syncPicosFromCentral } from "../modules/picoDB";
import { syncTanquesFromCentral } from "../modules/tanqueDB";

/**
 * Sincronización Inicial después del Login Online
 */
export async function syncInitialData(idSucursal: number): Promise<void> {
  console.log("🚀 Iniciando sincronización inicial completa...");

  try {
    // 1. Sucursales
    await syncSucursalesFromCentral();

    // 2. Bodegas (con lógica de sucursal + habilitados traspaso)
    await syncBodegasFromCentral(idSucursal);

    // 3. Dependientes de Bodega → Traer TODO y filtrar localmente
    await syncPicosFromCentral();
    await syncTanquesFromCentral();

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
export async function fullSync(idSucursal: number) {
  await syncInitialData(idSucursal);
  await syncPendingData();
}

/** Solo envía pendientes al servidor */
export async function syncPendingData() {
  try {
    await syncClientesToCentral();
    await syncPersonasToCentral();
    await syncVehiculosToCentral();
  } catch (error) {
    console.error("Error enviando pendientes:", error);
  }
}