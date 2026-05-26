// src/hooks/useInitialSync.ts  →  renombrar a src/utils/initialSync.ts

import { syncClientesFromCentral } from "@/backend/db/modules/clienteDB";
import { syncPersonasFromCentral } from "@/backend/db/modules/personaDB";
import { syncVehiculosFromCentral } from "@/backend/db/modules/vehiculoDB";
import { syncSucursalesFromCentral } from "@/backend/db/modules/sucursalDB";
import { syncBodegasDelOperario } from "@/backend/db/modules/bodegaDB";
import { syncPicosDelOperario } from "@/backend/db/modules/picoDB";
import { syncTanquesDelOperario } from "@/backend/db/modules/tanqueDB";

export async function runInitialSync(cedula: string): Promise<boolean> {
  console.log("🚀 Iniciando sincronización inicial...");
  try {
    await syncSucursalesFromCentral();
    await syncBodegasDelOperario(cedula);   // solo las bodegas de este usuario
    await syncPicosDelOperario(cedula);     // solo los picos de esas bodegas
    await syncTanquesDelOperario(cedula);   // solo los tanques de esas bodegas
    await syncClientesFromCentral(0);
    await syncPersonasFromCentral(0);
    await syncVehiculosFromCentral(0);
    console.log("✅ Sincronización inicial completada");
    return true;
  } catch (error) {
    console.error("❌ Error en sincronización inicial:", error);
    return false;  // devuelve false en vez de tragar el error
  }
}