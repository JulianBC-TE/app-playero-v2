// src/hooks/useInitialSync.ts
import { syncClientesFromCentral } from "@/backend/db/modules/clienteDB";
import { syncPersonasFromCentral } from "@/backend/db/modules/personaDB";
import { syncVehiculosFromCentral } from "@/backend/db/modules/vehiculoDB";
import { syncSucursalesFromCentral } from "@/backend/db/modules/sucursalDB";
import { syncBodegasFromCentral } from "@/backend/db/modules/bodegaDB";
import { syncPicosFromCentral } from "@/backend/db/modules/picoDB";
import { syncTanquesFromCentral } from "@/backend/db/modules/tanqueDB";

export function useInitialSync(cedula: string, password:string) {
  async function syncInitialData(): Promise<void> {
    console.log("🚀 Iniciando sincronización inicial completa...");

    try {
      // Orden recomendado
      await syncSucursalesFromCentral();
      await syncBodegasFromCentral(0); //aca puse cero temporalmente pero tiene que ser la id de la sucursal de usuario
      await syncPicosFromCentral();
      await syncTanquesFromCentral();

      await syncClientesFromCentral(0);   // 0 = primera vez
      await syncPersonasFromCentral(0);
      await syncVehiculosFromCentral(0);

      console.log("✅ Sincronización inicial completada con éxito");
    } catch (error) {
      console.error("❌ Falló alguna parte de la sincronización inicial:", error);
      // No lanzamos error para no romper el login, solo logueamos
    }
  }

  return { syncInitialData };
}