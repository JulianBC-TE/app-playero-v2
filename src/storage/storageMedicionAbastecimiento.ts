import AsyncStorage from "@react-native-async-storage/async-storage";
import { MedicionDTO } from "@/dto/MedicionDTO";
const STORAGE_MEDICION_ABASTECIMIENTO = "@app:medicion_abastecimiento";
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
) {
  await AsyncStorage.setItem(
    STORAGE_MEDICION_ABASTECIMIENTO,
    JSON.stringify(data),
  );
}
export async function getStorageMedicionAbastecimiento() {
  const storage = await AsyncStorage.getItem(STORAGE_MEDICION_ABASTECIMIENTO);
  if (!storage) return null;
  return JSON.parse(storage) as MedicionAbastecimientoDTO;
}
export async function removeMedicionAbastecimiento() {
  await AsyncStorage.removeItem(STORAGE_MEDICION_ABASTECIMIENTO);
}
