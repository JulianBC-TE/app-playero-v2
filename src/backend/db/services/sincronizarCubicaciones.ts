import { db } from "@/backend/db/client"; // Ajusta a la ruta de tu instancia Drizzle
import { tanques } from "@/backend/db/schema"; // Ajusta a la ruta de tu esquema Drizzle
import { cubicacionApi } from "@/backend/api/cubicacionAPI";

export interface ResultadoSyncCubicaciones {
  exito: boolean;
  totalTanques: number;
  procesadosCorrectamente: number;
  errores: number;
}

/**
 * Recorre todos los tanques locales en SQLite, consulta sus tablas
 * de cubicación al servidor y las persiste localmente.
 */
export async function sincronizarCubicacionesMasivas(): Promise<ResultadoSyncCubicaciones> {
  const resultado: ResultadoSyncCubicaciones = {
    exito: true,
    totalTanques: 0,
    procesadosCorrectamente: 0,
    errores: 0,
  };

  try {
    // 1. Leer todos los tanques disponibles en la base de datos local
    const listaTanques = await db.select().from(tanques);
    resultado.totalTanques = listaTanques.length;

    if (listaTanques.length === 0) {
        console.warn("No hay tanques locales para sincronizar cubicaciones.");
      return resultado;
    }

    // 2. Iterar secuencialmente por cada tanque para descargar e insertar sus datos
    for (const tanque of listaTanques) {
      try {
        await cubicacionApi.sincronizarCubicacionTanque(tanque.idTanque);
        resultado.procesadosCorrectamente++;
      } catch (error) {
        resultado.errores++;
        resultado.exito = false;
        console.error(
          `Error al sincronizar la cubicación del tanque #${tanque.idTanque}:`,
          error
        );
      }
    }
  } catch (error) {
    resultado.exito = false;
    console.error("Error al obtener la lista local de tanques:", error);
  }

  return resultado;
}