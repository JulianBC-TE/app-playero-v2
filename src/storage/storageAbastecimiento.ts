import AsyncStorage from "@react-native-async-storage/async-storage";
import { ABASTECIMIENTO_STORAGE } from "./storageConfig";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";

export type AbastecimientoStorageDTO = {
	ordenCompra: string;
	remision: string;
	litros: string;
	selectedBodega: string;
	tipoOperacionSeleccionado: string;
	base64Images: string[];
	base64FotoObs: string[];
	obs: string;
	obsAdicional: string;
	cargaZeta: CargaZetaDTO | null;
	medicionInicial: MedicionDTO[];
	medicionFinal: MedicionDTO[];
	turnoCerrado: boolean;
};

/*export async function saveAbastecimiento(
	data: AbastecimientoStorageDTO
): Promise<void> {
	try {
		await AsyncStorage.setItem(ABASTECIMIENTO_STORAGE, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
}*/

/*export async function removeAbastecimiento(): Promise<void> {
	try {
		await AsyncStorage.removeItem(ABASTECIMIENTO_STORAGE);
	} catch (error) {
		throw error;
	}
}*/

/*export async function getStorageAbastecimiento(): Promise<AbastecimientoStorageDTO | null> {
	try {
		const storage = await AsyncStorage.getItem(ABASTECIMIENTO_STORAGE);
		if (!storage) return null;
		const parsed: AbastecimientoStorageDTO = JSON.parse(storage);
		// Solo restaurar si hay algo significativo guardado
		const tieneEstado =
			parsed.ordenCompra !== "" ||
			parsed.remision !== "" ||
			parsed.litros !== "" ||
			parsed.base64Images.length > 0 ||
			parsed.cargaZeta !== null ||
			parsed.medicionInicial.length > 0;
		return tieneEstado ? parsed : null;
	} catch (error) {
		console.log("[storageAbastecimiento] error al leer:", error);
		return null;
	}
}*/

// En storageAbastecimiento.ts — guardá las fotos en keys separados
// storageAbastecimiento.ts

export async function saveAbastecimiento(estado: AbastecimientoStorageDTO) {
  try {
    const { base64Images, base64FotoObs, medicionInicial, medicionFinal, ...resto } = estado;

    // 1. Datos sin fotos — pequeño, sin problema
    await AsyncStorage.setItem("@abastecimiento", JSON.stringify(resto));

    // 2. Fotos de precintos — una por key
    await AsyncStorage.setItem("@abastecimiento_fotos_count", String(base64Images.length));
    await Promise.all(
      base64Images.map((img, i) =>
        AsyncStorage.setItem(`@abastecimiento_foto_${i}`, img)
      )
    );

    // 3. Fotos de observaciones — una por key
    await AsyncStorage.setItem("@abastecimiento_fotoobs_count", String(base64FotoObs.length));
    await Promise.all(
      base64FotoObs.map((img, i) =>
        AsyncStorage.setItem(`@abastecimiento_fotoobs_${i}`, img)
      )
    );

    // 4. Mediciones — pueden tener fotos adentro, también separadas
    await AsyncStorage.setItem(
      "@abastecimiento_mediciones",
      JSON.stringify({ medicionInicial, medicionFinal })
    );

  } catch (error) {
    console.log("[storageAbastecimiento] error al guardar:", error);
  }
}

export async function getStorageAbastecimiento(): Promise<AbastecimientoStorageDTO | null> {
  try {
    const resto = await AsyncStorage.getItem("@abastecimiento");
    if (!resto) return null;

    // Reconstruir fotos de precintos
    const fotosCount = Number(await AsyncStorage.getItem("@abastecimiento_fotos_count") ?? "0");
    const base64Images = await Promise.all(
      Array.from({ length: fotosCount }, (_, i) =>
        AsyncStorage.getItem(`@abastecimiento_foto_${i}`).then(v => v ?? "")
      )
    );

    // Reconstruir fotos de observaciones
    const fotosObsCount = Number(await AsyncStorage.getItem("@abastecimiento_fotoobs_count") ?? "0");
    const base64FotoObs = await Promise.all(
      Array.from({ length: fotosObsCount }, (_, i) =>
        AsyncStorage.getItem(`@abastecimiento_fotoobs_${i}`).then(v => v ?? "")
      )
    );

    const mediciones = await AsyncStorage.getItem("@abastecimiento_mediciones");

    return {
      ...JSON.parse(resto),
      base64Images,
      base64FotoObs,
      ...(mediciones ? JSON.parse(mediciones) : { medicionInicial: [], medicionFinal: [] }),
    };
  } catch (error) {
    console.log("[storageAbastecimiento] error al leer:", error);
    return null;
  }
}

export async function removeAbastecimiento() {
  try {
    // Leer cuántas fotos hay antes de borrar
    const fotosCount = Number(await AsyncStorage.getItem("@abastecimiento_fotos_count") ?? "0");
    const fotosObsCount = Number(await AsyncStorage.getItem("@abastecimiento_fotoobs_count") ?? "0");

    const keysToRemove = [
      "@abastecimiento",
      "@abastecimiento_fotos_count",
      "@abastecimiento_fotoobs_count",
      "@abastecimiento_mediciones",
      ...Array.from({ length: fotosCount }, (_, i) => `@abastecimiento_foto_${i}`),
      ...Array.from({ length: fotosObsCount }, (_, i) => `@abastecimiento_fotoobs_${i}`),
    ];

    await AsyncStorage.multiRemove(keysToRemove);
  } catch (error) {
    console.log("[storageAbastecimiento] error al remover:", error);
  }
}