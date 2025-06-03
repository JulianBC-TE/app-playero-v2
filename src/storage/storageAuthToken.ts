import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_STORAGE } from "@storage/storageConfig";

type StorageAuthTokenProps = {
	token: string;
	refresh_token: string;
};

export async function saveAuthToken({
	token,
	refresh_token,
}: StorageAuthTokenProps) {
	await AsyncStorage.setItem(
		AUTH_TOKEN_STORAGE,
		JSON.stringify({ token, refresh_token })
	);
}

export async function getAuthToken() {
	const response = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE);
	const { token, refresh_token }: StorageAuthTokenProps = response
		? JSON.parse(response)
		: {};
	return { token, refresh_token };
}

export async function removeAuthToken() {
	await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE);
}
