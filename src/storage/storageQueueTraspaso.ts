import AsyncStorage from "@react-native-async-storage/async-storage";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import { PersonaDTO } from "@/dto/PersonaDTO";

const STORAGE_KEY = "@playero:queue_traspaso";

export type TraspasoQueueEntry = {
  id: string;
  data: TraspasoDTO;
  persona: PersonaDTO | null;
  firma: string | null;
  fechaCreacion: number;
};

export async function getTraspasoQueue(): Promise<TraspasoQueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log("[storageQueueTraspaso] Error al leer cola:", error);
    return [];
  }
}

export async function addToTraspasoQueue(
  entry: TraspasoQueueEntry
): Promise<void> {
  try {
    const queue = await getTraspasoQueue();
    queue.push(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.log("[storageQueueTraspaso] Error al agregar:", error);
    throw error;
  }
}

export async function updateTraspasoQueueEntry(
  id: string,
  data: TraspasoDTO,
  persona?: PersonaDTO | null,
  firma?: string | null
): Promise<void> {
  try {
    const queue = await getTraspasoQueue();
    const idx = queue.findIndex((e) => e.id === id);
    if (idx !== -1) {
      queue[idx].data = data;
      if (persona !== undefined) queue[idx].persona = persona;
      if (firma !== undefined) queue[idx].firma = firma;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.log("[storageQueueTraspaso] Error al actualizar:", error);
    throw error;
  }
}

export async function removeFromTraspasoQueue(id: string): Promise<void> {
  try {
    const queue = await getTraspasoQueue();
    const filtered = queue.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.log("[storageQueueTraspaso] Error al eliminar:", error);
    throw error;
  }
}

export async function clearTraspasoQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log("[storageQueueTraspaso] Error al limpiar:", error);
    throw error;
  }
}
