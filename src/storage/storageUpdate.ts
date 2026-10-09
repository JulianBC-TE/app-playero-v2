/**
 * @module Playero/Storage/storageUpdate
 * @category Storage
 *
 * Persiste el aviso de actualización pendiente (enlace devuelto por el
 * servidor en la última sincronización) para que la card verde
 * "Actualizar" del Home sobreviva a los reinicios de la app.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { compararVersiones, getVersionInstalada } from "@/backend/api/versionAPI";

const STORAGE_KEY = "@playero:update";

export type UpdatePendiente = {
  /** Enlace temporal de descarga del APK. Solo se guarda para builds viejos. */
  url?: string;
  /** Última versión publicada en el servidor. */
  latestVersion: string;
  /** Tamaño aprox. del APK en bytes. */
  tamano?: number;
  /** Versión instalada cuando se ofreció esta actualización. */
  versionInstalada?: string;
  /**
   * Cuántas veces se lanzó el instalador para esta misma actualización.
   * Si al reiniciar la app sigue en `versionInstalada`, el botón se vuelve
   * a mostrar: es la señal de que el APK instalado no cambió de versión
   * (número registrado en el Sistema Playero distinto al interno del APK).
   */
  intentos?: number;
};

/**
 * Guarda (o limpia con `null`) el aviso de actualización pendiente.
 *
 * Conserva el contador de intentos si sigue siendo exactamente la misma
   * actualización (misma versión publicada); si llega una
 * versión nueva, el contador vuelve a 1.
 */
export async function saveUpdatePendiente(
  update: UpdatePendiente | null,
): Promise<void> {
  try {
    if (!update) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    let intentos = update.intentos ?? 1;
    let versionInstalada = update.versionInstalada ?? getVersionInstalada();

    try {
      const rawPrevia = await AsyncStorage.getItem(STORAGE_KEY);
      if (rawPrevia) {
        const previa = JSON.parse(rawPrevia) as UpdatePendiente;
        if (
          previa &&
          previa.latestVersion === update.latestVersion
        ) {
          intentos = previa.intentos ?? 1;
          versionInstalada = previa.versionInstalada ?? versionInstalada;
        }
      }
    } catch {
      // Sin aviso previo: se arranca en 1.
    }

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...update, versionInstalada, intentos }),
    );
  } catch (error) {
    console.log("[storageUpdate] Error al guardar:", error);
  }
}

/**
 * Registra que se lanzó el instalador de Android para la actualización
 * pendiente. Se llama cuando la descarga y el intent terminan sin error.
 */
export async function registrarIntentoActualizacion(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const update = JSON.parse(raw) as UpdatePendiente;
    update.intentos = (update.intentos ?? 0) + 1;
    if (!update.versionInstalada) {
      update.versionInstalada = getVersionInstalada();
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(update));
  } catch (error) {
    console.log("[storageUpdate] Error al registrar intento:", error);
  }
}

/**
 * Lee el aviso de actualización pendiente.
 * Si la versión guardada ya no es mayor que la instalada (por ejemplo,
 * después de instalar la actualización), limpia el aviso y devuelve null.
 */
export async function getUpdatePendiente(): Promise<UpdatePendiente | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const update = JSON.parse(raw) as UpdatePendiente;
    if (!update?.latestVersion) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (compararVersiones(update.latestVersion, getVersionInstalada()) <= 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return update;
  } catch (error) {
    console.log("[storageUpdate] Error al leer:", error);
    return null;
  }
}
