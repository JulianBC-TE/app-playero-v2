import AsyncStorage from "@react-native-async-storage/async-storage";
import { SalidaStorageDTO } from "./storageSalida";

const STORAGE_KEY = "@playero:queue_salida";

export type SalidaQueueEntry = {
  id: string;
  data: SalidaStorageDTO;
  fechaCreacion: number;
};

export async function getSalidaQueue(): Promise<SalidaQueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log("[storageQueueSalida] Error al leer cola:", error);
    return [];
  }
}

export async function addToSalidaQueue(entry: SalidaQueueEntry): Promise<void> {
  try {
    const queue = await getSalidaQueue();
    queue.push(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.log("[storageQueueSalida] Error al agregar:", error);
    throw error;
  }
}

export async function updateSalidaQueueEntry(
  id: string,
  data: SalidaStorageDTO
): Promise<void> {
  try {
    const queue = await getSalidaQueue();
    const idx = queue.findIndex((e) => e.id === id);
    if (idx !== -1) {
      queue[idx].data = data;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.log("[storageQueueSalida] Error al actualizar:", error);
    throw error;
  }
}

export async function removeFromSalidaQueue(id: string): Promise<void> {
  try {
    const queue = await getSalidaQueue();
    const filtered = queue.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.log("[storageQueueSalida] Error al eliminar:", error);
    throw error;
  }
}

export async function clearSalidaQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log("[storageQueueSalida] Error al limpiar:", error);
    throw error;
  }
}
