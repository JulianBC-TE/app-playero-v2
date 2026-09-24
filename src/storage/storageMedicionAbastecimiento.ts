import AsyncStorage from "@react-native-async-storage/async-storage";
import { MedicionDTO } from "@/dto/MedicionDTO";

const LEGACY_STORAGE_MEDICION_ABASTECIMIENTO = "@app:medicion_abastecimiento";

const medicionKey = (entryId: string) =>
  `@app:medicion_abastecimiento:${entryId || "0"}`;

export type MedicionAbastecimientoDTO = {
  medicionInicial: MedicionDTO[];
  medicionFinal: MedicionDTO[];
  base64ImageInicial: string;
  base64ImageFinal: string;
  selectedTanques: string;
  idBodega: string;
  alturaInicial: string;
  litrosInicial: string;
  tempInicial: string;
  alturaFinal: string;
  litrosFinal: string;
  tempFinal: string;
};

export async function saveMedicionAbastecimiento(
  data: MedicionAbastecimientoDTO,
  entryId: string,
) {
  await AsyncStorage.setItem(medicionKey(entryId), JSON.stringify(data));
}

export async function getStorageMedicionAbastecimiento(entryId: string) {
  const storage = await AsyncStorage.getItem(medicionKey(entryId));
  if (!storage) return null;
  return JSON.parse(storage) as MedicionAbastecimientoDTO;
}

export async function removeMedicionAbastecimiento(entryId: string) {
  await AsyncStorage.removeItem(medicionKey(entryId));
}

/** Migra el borrador legacy (sin entryId) a la entrada indicada. */
export async function migrarMedicionAbastecimientoLegacy(
  entryId: string,
): Promise<void> {
  const raw = await AsyncStorage.getItem(LEGACY_STORAGE_MEDICION_ABASTECIMIENTO);
  if (raw) {
    await AsyncStorage.setItem(medicionKey(entryId), raw);
    await AsyncStorage.removeItem(LEGACY_STORAGE_MEDICION_ABASTECIMIENTO);
  }
}

/** Elimina el borrador legacy huérfano (sin entrada asociada). */
export async function limpiarMedicionAbastecimientoLegacy(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_STORAGE_MEDICION_ABASTECIMIENTO);
}
