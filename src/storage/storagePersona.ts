import AsyncStorage from "@react-native-async-storage/async-storage";
import { PERSONA_STORAGE } from "./storageConfig";
import { PersonaDTO } from "@/dto/PersonaDTO";

export async function savePersona(data: PersonaDTO | null): Promise<void> {
	try {
		await AsyncStorage.setItem(PERSONA_STORAGE, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
}

export async function removePersona() {
	try {
		await AsyncStorage.removeItem(PERSONA_STORAGE);
	} catch (error) {
		throw error;
	}
}

export async function getStoragePersona() {
	try {
		const storage = await AsyncStorage.getItem(PERSONA_STORAGE);
		const Persona: PersonaDTO = storage
			? JSON.parse(storage)
			: ({} as PersonaDTO);
		return Persona;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
