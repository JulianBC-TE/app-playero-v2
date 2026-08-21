import { httpClient } from "@/backend/api/httpClient";
import { cubicacionService } from "../db/modules/cubicacionDB";

export interface PuntoCubicacionDTO {
  altura: number;
  id_tanque: number;
  litros: number;
}

export interface CubicacionTanqueResponse {
  data: PuntoCubicacionDTO[];
  success: boolean;
}

export const cubicacionApi = {
  /**
   * Consulta al backend la tabla de cubicación de un tanque específico.
   */
  async getCubicacionByTanque(idTanque: number): Promise<PuntoCubicacionDTO[]> {
    const response = await httpClient.get<CubicacionTanqueResponse>(
      `/api/app/cubicacion/${idTanque}`
    );
    //console.log(`Cubicación obtenida del backend para el tanque #${idTanque}:`, response.data);

    // Mapea a response.data.data
    return response.data?.data || [];
  },

  /**
   * Descarga la cubicación del backend y la guarda localmente en SQLite.
   */
  async sincronizarCubicacionTanque(idTanque: number): Promise<void> {
    const puntos = await this.getCubicacionByTanque(idTanque);

    if (puntos && puntos.length > 0) {
      await cubicacionService.guardarCubicacionMasiva(idTanque, puntos);
    } else {
      await cubicacionService.limpiarCubicacionesTanque(idTanque);
    }
  },
};