import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_UUID_STORAGE = "@playero:device_uuid";

export async function getStorageDeviceUuid(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(DEVICE_UUID_STORAGE);
    return value || null;
  } catch (error) {
    console.log("[storageDevice] Error al leer deviceUuid:", error);
    return null;
  }
}

export async function setStorageDeviceUuid(deviceUuid: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DEVICE_UUID_STORAGE, deviceUuid);
  } catch (error) {
    console.log("[storageDevice] Error al guardar deviceUuid:", error);
  }
}
