import AsyncStorage from "@react-native-async-storage/async-storage";
import { SALIDA_STORAGE } from "./storageConfig";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";

export type SalidaStorageDTO = {
	persona: PersonaDTO | null;
	vehiculo: VehiculoDTO | null;
	firma: string | null;
	selectedBodega: string;
	selectedPico: string;
	idPico_surtidor: number;
	salida: number; // 0: inicial, 1: cargando, 2: finalizado
	cargaCombustible: string;
	totalizadorPicoInicial: number;
	totalizadorPicoFinal: number;
	base64Vehiculo: string;
	base64Horometro: string;
	base64Kilometraje: string;
	base64Obs: string;
	horometro: string;
	kilometraje: string;
	observaciones: string;
	obsAdicional: string;
	turnoCerrado: boolean;
};

export async function saveSalida(data: SalidaStorageDTO): Promise<void> {
	try {
		await AsyncStorage.setItem(SALIDA_STORAGE, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
}

export async function removeSalida(): Promise<void> {
	try {
		await AsyncStorage.removeItem(SALIDA_STORAGE);
	} catch (error) {
		throw error;
	}
}

export async function getStorageSalida(): Promise<SalidaStorageDTO | null> {
	try {
		const storage = await AsyncStorage.getItem(SALIDA_STORAGE);
		if (!storage) return null;
		const parsed: SalidaStorageDTO = JSON.parse(storage);
		// Solo restaurar si hay algo significativo guardado
		const tieneEstado =
			parsed.persona !== null ||
			parsed.vehiculo !== null ||
			parsed.salida > 0 ||
			parsed.selectedPico !== "";
		return tieneEstado ? parsed : null;
	} catch (error) {
		console.log("[storageSalida] error al leer:", error);
		return null;
	}
}