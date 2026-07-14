import { eq } from "drizzle-orm";
import { db } from "@/backend/db/client"; // ← Ajustá la ruta a tu archivo de configuración del cliente
import { syncs } from "@/backend/db/schema"; // Ajustá la ruta a tu archivo de schema

// Estructura interna para la caché en memoria
type SyncMemoryData = { idSync: number; fecha: number };

class SyncsController {
  private cache: Map<string, SyncMemoryData>;
  private isLoaded: boolean;

  constructor() {
    this.cache = new Map<string, SyncMemoryData>();
    this.isLoaded = false;
  }

  /**
   * Carga inicial de SQLite al Map en memoria (Lazy Loading).
   */
  private async checkAndLoadCache(): Promise<void> {
    if (this.isLoaded) return;

    const rows = await db.select().from(syncs);
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(row.tipo, { idSync: row.idSync, fecha: row.fecha });
    }
    this.isLoaded = true;
  }

  /**
   * Obtiene el timestamp de un tipo de forma inmediata desde memoria O(1).
   * Si el tipo no existe, lo inserta en la DB y en la caché con timestamp 0 y lo devuelve.
   */
  async getTimestamp(tipo: string): Promise<number> {
    await this.checkAndLoadCache();
    
    const data = this.cache.get(tipo);
    if (data) {
      return data.fecha;
    }

    // Si no se encuentra, lo creamos con timestamp 0
    const defaultTimestamp = 0;

    const [inserted] = await db
      .insert(syncs)
      .values({ tipo, fecha: defaultTimestamp })
      .returning({ idSync: syncs.idSync });

    // Guardamos en el Map para futuras lecturas O(1)
    this.cache.set(tipo, { idSync: inserted.idSync, fecha: defaultTimestamp });

    return defaultTimestamp;
  }

  /**
   * Devuelve una copia de toda la caché actual
   */
  async getAllSyncs(): Promise<Map<string, SyncMemoryData>> {
    await this.checkAndLoadCache();
    return new Map(this.cache);
  }

  /**
   * Forma 1: Guarda o actualiza un único par de Tipo y Timestamp
   */
  async saveOrUpdate(tipo: string, timestamp: number): Promise<void> {
    await this.checkAndLoadCache();
    
    const existente = this.cache.get(tipo);

    if (existente) {
      // Actualización directa usando la Clave Primaria (idSync)
      await db
        .update(syncs)
        .set({ fecha: timestamp })
        .where(eq(syncs.idSync, existente.idSync));
      
      this.cache.set(tipo, { idSync: existente.idSync, fecha: timestamp });
    } else {
      // Inserción de un nuevo tipo
      const [inserted] = await db
        .insert(syncs)
        .values({ tipo, fecha: timestamp })
        .returning({ idSync: syncs.idSync });

      this.cache.set(tipo, { idSync: inserted.idSync, fecha: timestamp });
    }
  }

  /**
   * Forma 2: Recibe un Map completo, actualiza los tipos existentes 
   * e inserta los nuevos dentro de una única transacción nativa de Expo-SQLite.
   */
  async saveOrUpdateFromMap(inputMap: Map<string, number>): Promise<void> {
    await this.checkAndLoadCache();

    const inserts: { tipo: string; fecha: number }[] = [];
    const updates: { idSync: number; tipo: string; fecha: number }[] = [];

    // Clasificar entradas entre inserciones y actualizaciones analizando la memoria
    for (const [tipo, fecha] of inputMap.entries()) {
      const existente = this.cache.get(tipo);
      if (existente) {
        updates.push({ idSync: existente.idSync, tipo, fecha });
      } else {
        inserts.push({ tipo, fecha });
      }
    }

    // Transacción atómica sobre tu instancia global `db`
    await db.transaction(async (tx) => {
      // 1. Inserciones masivas en lote (Bulk Insert)
      if (inserts.length > 0) {
        const insertedRows = await tx
          .insert(syncs)
          .values(inserts)
          .returning({ idSync: syncs.idSync, tipo: syncs.tipo, fecha: syncs.fecha });

        for (const row of insertedRows) {
          this.cache.set(row.tipo, { idSync: row.idSync, fecha: row.fecha });
        }
      }

      // 2. Actualizaciones individuales procesadas eficientemente en la misma transacción
      for (const upd of updates) {
        await tx
          .update(syncs)
          .set({ fecha: upd.fecha })
          .where(eq(syncs.idSync, upd.idSync));
        
          this.cache.set(upd.tipo, { idSync: upd.idSync, fecha: upd.fecha });
      }
    });
  }

  /**
   * Elimina un registro por su tipo de sincronización de la DB y de la caché
   */
  async deleteSync(tipo: string): Promise<boolean> {
    await this.checkAndLoadCache();
    const existente = this.cache.get(tipo);
    if (!existente) return false;

    await db.delete(syncs).where(eq(syncs.idSync, existente.idSync));
    this.cache.delete(tipo);
    return true;
  }

  /**
   * Fuerza la recarga de datos desde SQLite en la próxima consulta
   */
  invalidateCache(): void {
    this.isLoaded = false;
  }
}

// Exportamos una única instancia lista para usar en toda la app
export const syncsController = new SyncsController();