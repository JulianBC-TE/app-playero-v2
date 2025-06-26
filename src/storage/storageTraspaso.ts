import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRASPASO_STORAGE } from "./storageConfig";
import { TraspasoDTO } from "@/dto/TraspasoDTO";

export async function saveTraspaso(data: TraspasoDTO) {
	try {
		await AsyncStorage.setItem(TRASPASO_STORAGE, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
}

export async function removeTraspaso() {
	try {
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
		return traspaso;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
