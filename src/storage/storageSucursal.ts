import AsyncStorage from "@react-native-async-storage/async-storage";
import { SURCURSAL_STORAGE } from "./storageConfig";
import { SucursalDTO } from "@/dto/sucursalDTO";

export async function saveSucursal(sucursal: SucursalDTO) {
	try {
		await AsyncStorage.setItem(SURCURSAL_STORAGE, JSON.stringify(sucursal));
	} catch (error) {
		throw error;
	}
}

export async function removeSucursal() {
	try {
		await AsyncStorage.removeItem(SURCURSAL_STORAGE);
	} catch (error) {
		throw error;
	}
}

export async function getStorageSucursal() {
	try {
		const storage = await AsyncStorage.getItem(SURCURSAL_STORAGE);
		const sucursal: SucursalDTO = storage
			? JSON.parse(storage)
			: ({} as SucursalDTO);
		return sucursal;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
