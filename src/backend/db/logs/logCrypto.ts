import CryptoJS from "crypto-js";

// Generador de números aleatorios simple (sin dependencia nativa)
function generateRandomBytes(size: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < size; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytes;
}

function getRandomWordArray(size: number): CryptoJS.lib.WordArray {
  const bytes = generateRandomBytes(size);
  return CryptoJS.lib.WordArray.create(bytes);
}

export function cifrarPayload(data: Record<string, any>, password: string): string {
  const salt = getRandomWordArray(128 / 8);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });
  const iv = getRandomWordArray(128 / 8);
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });
  return salt.toString() + ":" + iv.toString() + ":" + encrypted.toString();
}

export function descifrarPayload<T = Record<string, any>>(cifrado: string, password: string): T {
  const parts = cifrado.split(":");
  if (parts.length === 1) {
    // Fallback: cifrado simple (formato legacy)
    const bytes = CryptoJS.AES.decrypt(cifrado, password);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as T;
  }
  
  const salt = CryptoJS.enc.Hex.parse(parts[0]);
  const iv = CryptoJS.enc.Hex.parse(parts[1]);
  const encrypted = parts[2];
  
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 1000,
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });
  
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)) as T;
}
