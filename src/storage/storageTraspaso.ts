import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRASPASO_STORAGE } from "./storageConfig";
import { TraspasoDTO } from "@/dto/TraspasoDTO";

// const TRASPASO_ALERT_KEY = "traspaso_alert_mostrado";

// const CONTINUAR_CARGA_KEY = "continuar_carga";

export async function saveTraspaso(data: TraspasoDTO) {
	try {
		// console.log("[STORAGE] saveTraspaso() - Datos a guardar:");
		// console.log("→ bod_origen:", data.json.bod_origen);
		// console.log("→ bod_destino:", data.json.bod_destino);
		// console.log("→ taxilitro_inicial:", data.json.taxilitro_inicial);
		// console.log("→ taxilitro_final:", data.json.taxilitro_final);
		// console.log("→ litros_pico:", data.json.litros_pico);
		// console.log("→ fecha:", data.json.fecha, "hora:", data.json.hora);
		// console.trace("[STORAGE] saveTraspaso() llamado desde:");
		await AsyncStorage.setItem(TRASPASO_STORAGE, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
}

export async function removeTraspaso() {
	try {
		console.log("[STORAGE] removeTraspaso() llamado");
		console.trace("[STORAGE] removeTraspaso() llamado desde:");
		await AsyncStorage.removeItem(TRASPASO_STORAGE);
	} catch (error) {
		throw error;
	}
}

export async function getStorageTraspaso() {
	try {
		const storage = await AsyncStorage.getItem(TRASPASO_STORAGE);
		const traspaso: TraspasoDTO = storage
			? JSON.parse(storage)
			: ({} as TraspasoDTO);

		
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage bod_destino:", traspaso.json.bod_destino);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage bod_origen:", traspaso.json.bod_origen);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage fecha:", traspaso.json.fecha);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage hora:", traspaso.json.hora);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage taxilitro_inicial:", traspaso.json.taxilitro_inicial);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage taxilitro_final:", traspaso.json.taxilitro_final);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage litros_pico:", traspaso.json.litros_pico);
		// console.log("[STORAGE] Traspaso cargado desde AsyncStorage id_playero:", traspaso.json.id_playero);

		return traspaso;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
