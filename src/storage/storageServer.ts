import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVER_URL } from "./storageConfig";

export async function saveServerUrl(ip: string) {
	try {
		await AsyncStorage.setItem(SERVER_URL, JSON.stringify(ip));
	} catch (error) {
		throw error;
	}
}

export async function removeServerUrl() {
	try {
		await AsyncStorage.removeItem(SERVER_URL);
	} catch (error) {
		throw error;
	}
}

export async function getStorageServerUrl() {
	try {
		const storage = await AsyncStorage.getItem(SERVER_URL);
		const serverUrl = storage ? JSON.parse(storage) : null;
		console.log("Server URL from storage:", serverUrl);
		return serverUrl;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
