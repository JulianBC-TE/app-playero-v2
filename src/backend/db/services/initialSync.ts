/**
 * Sincronización inicial que se ejecuta al iniciar sesión (online).
 *
 * @remarks
 * Orden crítico: **primero se suben los registros pendientes/fallidos** y
 * recién después se descarga y purga la asignación del usuario (sucursal,
 * bodegas de control, bodegas de traspaso, picos y tanques). De ese modo
 * nunca se pierden datos locales por quitar una bodega que todavía tenía
 * registros sin subir.
 *
 * @module Playero/Backend/DB/Services/InitialSync
 * @category Services
 */

import { syncClientesFromCentral } from "@/backend/db/modules/clienteDB";
import { syncPersonasFromCentralInit } from "@/backend/db/modules/personaDB";
import { syncVehiculosFromCentral } from "@/backend/db/modules/vehiculoDB";
import { syncSucursalesFromCentral } from "@/backend/db/modules/sucursalDB";
import { syncCatalogoYTraspasosBodega } from "@/backend/db/modules/bodegaDB";
import { syncPicosDelOperario } from "@/backend/db/modules/picoDB";
import { syncTanquesDelOperario } from "@/backend/db/modules/tanqueDB";
import { sincronizarUltimosTurnosDesdeBackend } from "@/backend/db/modules/turnoBD";
import { sincronizarCubicacionesMasivas } from "@/backend/db/services/sincronizarCubicaciones";
import { syncPendingData } from "@/backend/db/services/syncService";

/**
 * Descarga el paquete completo del usuario y sube todo lo pendiente.
 *
 * @param cedula - Cédula del operario que inició sesión.
 * @param idUser - ID de usuario (`users.id`) del operario.
 * @param onStatus - Callback opcional con el mensaje de progreso (mismo
 *                   vocabulario que `syncCatalogosFromCentral`), para que la
 *                   pantalla de inicio de sesión muestre qué se está bajando
 *                   o subiendo.
 */
export async function runInitialSync(
  cedula: number,
  idUser: number,
  onStatus?: (msg: string) => void,
): Promise<void> {
  console.log(`🔄 SYNC -> Iniciando sincronización (Usuario: ${cedula})`);

  try {
    // 1. Subir primero: incluye registros con sync = -1 (isManual = true).
    //    syncPendingData ya emite "Subiendo personas...", "Subiendo tickets"...
    onStatus?.("Subiendo registros pendientes...");
    await syncPendingData(onStatus, true);

    // 2. Bajada completa, incluyendo la asignación del usuario.
    onStatus?.("Descargando sucursales...");
    await syncSucursalesFromCentral();

    onStatus?.("Descargando bodegas...");
    await syncCatalogoYTraspasosBodega();

    onStatus?.("Descargando picos...");
    await syncPicosDelOperario(cedula);

    onStatus?.("Descargando tanques...");
    await syncTanquesDelOperario(cedula);

    onStatus?.("Descargando turnos...");
    await sincronizarUltimosTurnosDesdeBackend(idUser);

    onStatus?.("Descargando clientes...");
    await syncClientesFromCentral();

    onStatus?.("Descargando personas...");
    await syncPersonasFromCentralInit();

    onStatus?.("Descargando vehículos...");
    await syncVehiculosFromCentral();

    onStatus?.("Descargando cubicaciones...");
    await sincronizarCubicacionesMasivas();

    console.log("✅ SYNC -> Completada con éxito");
  } catch (error) {
    console.error("❌ SYNC -> Falló la sincronización inicial:", error);
  }
}
