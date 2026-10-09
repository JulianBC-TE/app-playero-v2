/**
 * @module Playero/Backend/API/versionAPI
 * @category API
 *
 * Chequeo de versión de la app contra el servidor.
 * Se invoca en cada ciclo de sincronización: envía la versión instalada
 * y, cuando el servidor detecta que no es la última, devuelve la versión
 * disponible para que el Home muestre el botón "Actualizar". El enlace
 * temporal se pide recién cuando el usuario confirma la descarga.
 */
import { httpClient } from "./httpClient";
// Versión de respaldo (JS puro, se empaqueta en el bundle del build).
import appJson from "../../../app.json";

export type VersionCheckResponse = {
  updateAvailable: boolean;
  versionActual?: string;
  latestVersion?: string;
  tamano?: number;
};

export type VersionDownloadLinkResponse = {
  ok: boolean;
  data?: {
    url: string;
    vence_en?: string;
    latestVersion?: string;
    tamano?: number;
  };
};

/**
 * Resultado del chequeo de versión que la sincronización devuelve al
 * contexto: `disponible: false` significa que el servidor respondió y no
 * hay actualización (se limpia el aviso); `undefined` en el SyncResult
 * significa que el chequeo no se pudo ejecutar (se conserva el aviso previo).
 */
export type UpdateSyncInfo = {
  disponible: boolean;
  latestVersion?: string;
  tamano?: number;
};

/** Versión instalada en el dispositivo (app.json → expo.version). */
export function getVersionInstalada(): string {
  // expo-constants es un módulo NATIVO: se carga de forma perezosa para que
  // un build anterior no tumbe la app al arrancar. Si no está disponible,
  // se usa el app.json empaquetado en el bundle (mismo valor).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constantsModule = require("expo-constants");
    const constants = constantsModule?.default ?? constantsModule;
    const version = constants?.expoConfig?.version;
    if (typeof version === "string" && version.length > 0) return version;
  } catch {
    // Se usa el fallback de abajo.
  }

  const versionJson = (appJson as { expo?: { version?: string } }).expo?.version;
  return versionJson || "0.0.0";
}

/**
 * Compara dos versiones tipo "1.0.4".
 * Devuelve -1 si a < b, 0 si son iguales y 1 si a > b.
 */
export function compararVersiones(a: string, b: string): number {
  const partesA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partesB = b.split(".").map((n) => parseInt(n, 10) || 0);
  const largo = Math.max(partesA.length, partesB.length);

  for (let i = 0; i < largo; i += 1) {
    const va = partesA[i] ?? 0;
    const vb = partesB[i] ?? 0;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  return 0;
}

/**
 * Envía la versión instalada y devuelve si hay actualización disponible.
 * Nunca lanza: si el chequeo falla (offline, error del servidor) simplemente
 * informa que no hay actualización para no cortar la sincronización.
 */
export async function checkAppVersion(): Promise<VersionCheckResponse> {
  try {
    const { data } = await httpClient.post<VersionCheckResponse>(
      "/api/app/version/check",
      { version: getVersionInstalada() },
    );
    return data ?? { updateAvailable: false };
  } catch (error) {
    console.warn("[versionAPI] No se pudo verificar la versión:", error);
    return { updateAvailable: false };
  }
}

export async function createUpdateDownloadLink(): Promise<string> {
  const { data } = await httpClient.post<VersionDownloadLinkResponse>(
    "/api/app/version/link-descarga",
    { version: getVersionInstalada() },
  );

  if (!data?.data?.url) {
    throw new Error("El servidor no devolvió el link de descarga.");
  }

  return data.data.url;
}
