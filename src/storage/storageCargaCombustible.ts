import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_STORAGE_CARGA_COMBUSTIBLE = "@app:carga_combustible";

const cargaKey = (entryId: string) =>
  `@app:carga_combustible:${entryId || "0"}`;

export type CargaCombustibleStorageDTO = {
  selectedPico: string;
  idPico_surtidor: number;
  salida: number; // 0 = inicial, 1 = cargando, 2 = terminado
  cargaCombustible?: number;
  totalizadorPicoInicial?: number;
  totalizadorPicoFinal?: number;
  idBodega: string;

  // ── NUEVOS CAMPOS ADICIONADOS PARA EL PERSISTIDO DE INPUTS Y FOTOS ──
  taxilitroInicial?: string;
  taxilitroFinal?: string;
  litrosCargados?: string;
  base64FotoTaxilitro?: string;
  base64FotoTaxilitroFin?: string;
};

export async function saveCargaCombustible(
  data: CargaCombustibleStorageDTO,
  entryId: string
) {
  await AsyncStorage.setItem(cargaKey(entryId), JSON.stringify(data));
}

export async function getStorageCargaCombustible(entryId: string) {
  const storage = await AsyncStorage.getItem(cargaKey(entryId));

  if (!storage) {
    return null;
  }

  return JSON.parse(storage) as CargaCombustibleStorageDTO;
}

export async function removeCargaCombustible(entryId: string) {
  await AsyncStorage.removeItem(cargaKey(entryId));
}

/** Migra el borrador legacy (sin entryId) a la entrada indicada. */
export async function migrarCargaCombustibleLegacy(
  entryId: string
): Promise<void> {
  const raw = await AsyncStorage.getItem(LEGACY_STORAGE_CARGA_COMBUSTIBLE);
  if (raw) {
    await AsyncStorage.setItem(cargaKey(entryId), raw);
    await AsyncStorage.removeItem(LEGACY_STORAGE_CARGA_COMBUSTIBLE);
  }
}

/** Elimina el borrador legacy huérfano (sin entrada asociada). */
export async function limpiarCargaCombustibleLegacy(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_STORAGE_CARGA_COMBUSTIBLE);
}
