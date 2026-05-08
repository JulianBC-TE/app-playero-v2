import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_CARGA_COMBUSTIBLE =
  "@app:carga_combustible";

export type CargaCombustibleStorageDTO = {
  selectedPico: string;
  idPico_surtidor: number;
  salida: number; // 0 = inicial, 1 = cargando, 2 = terminado
  cargaCombustible: number;
  totalizadorPicoInicial: number;
  totalizadorPicoFinal: number;
  idBodega: string;
};

export async function saveCargaCombustible(
  data: CargaCombustibleStorageDTO
) {
  await AsyncStorage.setItem(
    STORAGE_CARGA_COMBUSTIBLE,
    JSON.stringify(data)
  );
}

export async function getStorageCargaCombustible() {
  const storage = await AsyncStorage.getItem(
    STORAGE_CARGA_COMBUSTIBLE
  );

  if (!storage) {
    return null;
  }

  return JSON.parse(storage) as CargaCombustibleStorageDTO;
}

export async function removeCargaCombustible() {
  await AsyncStorage.removeItem(
    STORAGE_CARGA_COMBUSTIBLE
  );
}