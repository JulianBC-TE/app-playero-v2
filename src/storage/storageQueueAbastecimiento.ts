import AsyncStorage from "@react-native-async-storage/async-storage";
import { AbastecimientoStorageDTO } from "./storageAbastecimiento";

const STORAGE_KEY = "@playero:queue_abastecimiento";

export type AbastecimientoQueueEntry = {
  id: string;
  data: AbastecimientoStorageDTO;
  fechaCreacion: number;
};

type LightData = Omit<
  AbastecimientoStorageDTO,
  "base64Images" | "base64FotoObs" | "medicionInicial" | "medicionFinal"
>;

type StoredEntry = {
  id: string;
  data: LightData;
  fechaCreacion: number;
};

const heavyFotosKey = (id: string) => `@playero:abast_fotos_${id}`;
const heavyFotoobsKey = (id: string) => `@playero:abast_fotoobs_${id}`;
const heavyMedicionesKey = (id: string) => `@playero:abast_mediciones_${id}`;

function stripHeavy(data: AbastecimientoStorageDTO): LightData {
  const { base64Images, base64FotoObs, medicionInicial, medicionFinal, ...resto } =
    data;
  return resto;
}

async function saveHeavy(
  id: string,
  data: AbastecimientoStorageDTO
): Promise<void> {
  await AsyncStorage.setItem(heavyFotosKey(id), JSON.stringify(data.base64Images));
  await AsyncStorage.setItem(
    heavyFotoobsKey(id),
    JSON.stringify(data.base64FotoObs)
  );
  await AsyncStorage.setItem(
    heavyMedicionesKey(id),
    JSON.stringify({
      medicionInicial: data.medicionInicial,
      medicionFinal: data.medicionFinal,
    })
  );
}

async function loadHeavy(
  id: string,
  data: LightData
): Promise<AbastecimientoStorageDTO> {
  const [fotos, fotoobs, mediciones] = await Promise.all([
    AsyncStorage.getItem(heavyFotosKey(id)),
    AsyncStorage.getItem(heavyFotoobsKey(id)),
    AsyncStorage.getItem(heavyMedicionesKey(id)),
  ]);
  const medParsed = mediciones ? JSON.parse(mediciones) : null;
  return {
    ...data,
    base64Images: fotos ? JSON.parse(fotos) : [],
    base64FotoObs: fotoobs ? JSON.parse(fotoobs) : [],
    medicionInicial: medParsed?.medicionInicial ?? [],
    medicionFinal: medParsed?.medicionFinal ?? [],
  };
}

async function readStored(): Promise<StoredEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredEntry[]) : [];
}

function toLightEntry(entry: StoredEntry): AbastecimientoQueueEntry {
  return {
    id: entry.id,
    fechaCreacion: entry.fechaCreacion,
    data: {
      ...entry.data,
      base64Images: [],
      base64FotoObs: [],
      medicionInicial: [],
      medicionFinal: [],
    },
  };
}

/** Cola liviana: solo para lista/etiquetas/exclusividad (sin fotos ni mediciones). */
export async function getAbastecimientoQueue(): Promise<
  AbastecimientoQueueEntry[]
> {
  try {
    const entries = await readStored();
    return entries.map(toLightEntry);
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al leer cola:", error);
    return [];
  }
}

/** Entrada completa (rehidrata fotos y mediciones) para editar. */
export async function getAbastecimientoQueueEntry(
  id: string
): Promise<AbastecimientoQueueEntry | null> {
  try {
    const entries = await readStored();
    const found = entries.find((e) => e.id === id);
    if (!found) return null;
    const data = await loadHeavy(id, found.data);
    return { id: found.id, fechaCreacion: found.fechaCreacion, data };
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al leer entrada:", error);
    return null;
  }
}

export async function addToAbastecimientoQueue(
  entry: AbastecimientoQueueEntry
): Promise<void> {
  try {
    const queue = await readStored();
    queue.push({
      id: entry.id,
      data: stripHeavy(entry.data),
      fechaCreacion: entry.fechaCreacion,
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    await saveHeavy(entry.id, entry.data);
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al agregar:", error);
    throw error;
  }
}

export async function updateAbastecimientoQueueEntry(
  id: string,
  data: AbastecimientoStorageDTO
): Promise<void> {
  try {
    const queue = await readStored();
    const idx = queue.findIndex((e) => e.id === id);
    if (idx !== -1) {
      queue[idx].data = stripHeavy(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      await saveHeavy(id, data);
    }
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al actualizar:", error);
    throw error;
  }
}

export async function removeFromAbastecimientoQueue(
  id: string
): Promise<void> {
  try {
    const queue = await readStored();
    const filtered = queue.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    await AsyncStorage.multiRemove([
      heavyFotosKey(id),
      heavyFotoobsKey(id),
      heavyMedicionesKey(id),
    ]);
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al eliminar:", error);
    throw error;
  }
}

export async function clearAbastecimientoQueue(): Promise<void> {
  try {
    const queue = await readStored();
    const heavyKeys = queue.flatMap((e) => [
      heavyFotosKey(e.id),
      heavyFotoobsKey(e.id),
      heavyMedicionesKey(e.id),
    ]);
    await AsyncStorage.multiRemove([STORAGE_KEY, ...heavyKeys]);
  } catch (error) {
    console.log("[storageQueueAbastecimiento] Error al limpiar:", error);
  }
}
