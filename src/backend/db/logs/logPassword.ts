import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_HASH_KEY = "@playero:admin_hash";
const ADMIN_PASS_KEY = "@playero:admin_pass";
const ADMIN_PASSWORD_ENV = process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? "";

let cachedHash: string | null = null;

async function getAdminHash(): Promise<string> {
  // Verificar si la contraseña cambió y regenerar hash si es necesario
  const storedPass = await AsyncStorage.getItem(ADMIN_PASS_KEY);
  if (storedPass !== ADMIN_PASSWORD_ENV && ADMIN_PASSWORD_ENV) {
    // La contraseña cambió, regenerar hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      ADMIN_PASSWORD_ENV
    );
    await AsyncStorage.setItem(ADMIN_HASH_KEY, hash);
    await AsyncStorage.setItem(ADMIN_PASS_KEY, ADMIN_PASSWORD_ENV);
    cachedHash = hash;
    return hash;
  }

  if (cachedHash) return cachedHash;

  const stored = await AsyncStorage.getItem(ADMIN_HASH_KEY);
  if (stored) {
    cachedHash = stored;
    return stored;
  }

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    ADMIN_PASSWORD_ENV
  );
  await AsyncStorage.setItem(ADMIN_HASH_KEY, hash);
  await AsyncStorage.setItem(ADMIN_PASS_KEY, ADMIN_PASSWORD_ENV);
  cachedHash = hash;
  return hash;
}

export async function verifyAdminPassword(input: string): Promise<boolean> {
  const hash = await getAdminHash();
  const inputHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
  return hash === inputHash;
}

export async function getAdminPassword(): Promise<string> {
  return ADMIN_PASSWORD_ENV;
}
