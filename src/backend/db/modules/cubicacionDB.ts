import { db } from "@/backend/db/client"; // Ajusta la ruta a la instancia de tu cliente Drizzle
import { cubicacionTanque, CubicacionTanqueInsert } from "../schema";
import { eq, asc } from "drizzle-orm";

/**
 * Módulo de base de datos para la gestión local de cubicaciones.
 */
export const cubicacionService = {
  /**
   * Reemplaza masivamente la tabla de cubicación de un tanque.
   * Elimina los registros anteriores del tanque e inserta los nuevos.
   */
  async guardarCubicacionMasiva(
    idTanque: number,
    registros: Array<{ altura: number; litros: number }>
  ): Promise<void> {
    const nuevosDatos: CubicacionTanqueInsert[] = registros.map((r) => ({
      idTanque,
      altura: r.altura,
      litros: r.litros,
      sync: 1,
    }));

    await db.transaction(async (tx) => {
      // 1. Limpiar la cubicación previa del tanque
      await tx
        .delete(cubicacionTanque)
        .where(eq(cubicacionTanque.idTanque, idTanque));

      // 2. Insertar en lote los nuevos registros
      if (nuevosDatos.length > 0) {
        await tx.insert(cubicacionTanque).values(nuevosDatos);
      }
    });
  },

  /**
   * Obtiene la lista completa de cubicación de un tanque ordenada por altura ascendente.
   */
  async obtenerCubicacionPorTanque(idTanque: number) {
    return await db
      .select()
      .from(cubicacionTanque)
      .where(eq(cubicacionTanque.idTanque, idTanque))
      .orderBy(asc(cubicacionTanque.altura));
  },

  /**
   * Calcula los litros exactos para una altura dada usando interpolación lineal.
   * Si la altura exacta no existe en la tabla, calcula la proporción entre los dos puntos más cercanos.
   */
  async calcularLitrosPorAltura(
    idTanque: number,
    alturaMedida: number
  ): Promise<number> {
    const puntos = await this.obtenerCubicacionPorTanque(idTanque);

    if (puntos.length === 0) return 0;

    // Caso 1: Altura menor o igual al mínimo registrado
    if (alturaMedida <= puntos[0].altura) return puntos[0].litros;

    // Caso 2: Altura mayor o igual al máximo registrado
    const ultimoPunto = puntos[puntos.length - 1];
    if (alturaMedida >= ultimoPunto.altura) return ultimoPunto.litros;

    // Caso 3: Coincidencia exacta o interpolación entre dos puntos
    for (let i = 0; i < puntos.length - 1; i++) {
      const p1 = puntos[i];
      const p2 = puntos[i + 1];

      if (alturaMedida === p1.altura) return p1.litros;

      if (alturaMedida > p1.altura && alturaMedida < p2.altura) {
        // Fórmula de Interpolación Lineal:
        // L = L1 + ((H - H1) / (H2 - H1)) * (L2 - L1)
        const pendiente = (p2.litros - p1.litros) / (p2.altura - p1.altura);
        const litrosCalculados = p1.litros + (alturaMedida - p1.altura) * pendiente;

        return Number(litrosCalculados.toFixed(2));
      }
    }

    return 0;
  },

  /**
   * Elimina las cubicaciones guardadas de un tanque específico.
   */
  async limpiarCubicacionesTanque(idTanque: number): Promise<void> {
    await db
      .delete(cubicacionTanque)
      .where(eq(cubicacionTanque.idTanque, idTanque));
  },
};