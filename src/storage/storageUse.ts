import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserDTO } from "@dto/userDTO";
import { USER_STORAGE } from "./storageConfig";

export async function saveUser(user: UserDTO) {
    try {
        await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
    } catch (error) {
        throw error;
    }
}

export async function removeUser() {
    try {
        await AsyncStorage.removeItem(USER_STORAGE);
    } catch (error) {
        throw error;
    }
}

export async function getStorageUser() {
    try {
        const storage = await AsyncStorage.getItem(USER_STORAGE);
        const  user: UserDTO = storage ? JSON.parse(storage) : {} as UserDTO;
        return user;
    } catch (error) {
        console.log(error);
        throw error;
    }
}