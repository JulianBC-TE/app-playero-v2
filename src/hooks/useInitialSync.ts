import { syncClientesFromCentral } from "@/backend/db/modules/clienteDB";
import { syncPersonasFromCentralInit } from "@/backend/db/modules/personaDB";
import { syncVehiculosFromCentral } from "@/backend/db/modules/vehiculoDB";
import { syncSucursalesFromCentral } from "@/backend/db/modules/sucursalDB";
import { syncCatalogoYTraspasosBodega } from "@/backend/db/modules/bodegaDB";
import { syncPicosDelOperario } from "@/backend/db/modules/picoDB";
import { syncTanquesDelOperario} from "@/backend/db/modules/tanqueDB";
import { getSesionUsuarioActivoLocal } from "@/backend/db/modules/usuarioDB";
import { sincronizarUltimosTurnosDesdeBackend } from "@/backend/db/modules/turnoBD";

export function useInitialSync(cedula: number, id: number) {
  const user = getSesionUsuarioActivoLocal();
  async function syncInitialData(): Promise<void> {
    console.log(`🔄 SYNC -> Iniciando sincronización (Usuario: ${cedula})`);

    try {
      await syncSucursalesFromCentral();
      await syncCatalogoYTraspasosBodega(); 
      await syncPicosDelOperario(cedula);
      await syncTanquesDelOperario(cedula);
      await sincronizarUltimosTurnosDesdeBackend((await user).idUser);
      await syncClientesFromCentral();   
      await syncPersonasFromCentralInit();
      await syncVehiculosFromCentral();

      console.log("✅ SYNC -> Completada con éxito");
    } catch (error) {
      console.error("❌ SYNC -> Falló la sincronización inicial:", error);
    }
  }

  return { syncInitialData };
}