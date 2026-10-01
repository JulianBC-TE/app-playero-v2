/**
 * @module Playero/Services/updateService
 * @category Services
 *
 * Descarga el APK desde el enlace que entregó el servidor y lanza el
 * instalador de Android.
 *
 * Requiere:
 *  - expo-file-system (descarga + conversión file:// → content://)
 *  - expo-intent-launcher (ACTION_VIEW con el instalador de paquetes)
 *  - permiso android.permission.REQUEST_INSTALL_PACKAGES
 */
import * as FileSystem from "expo-file-system";

const APK_DESTINO = `${FileSystem.cacheDirectory ?? ""}playero-update.apk`;

type IntentLauncherModule = {
  startActivityAsync: (
    action: string,
    params?: { data?: string; type?: string; flags?: number },
  ) => Promise<unknown>;
};

/**
 * Carga expo-intent-launcher de forma perezosa.
 *
 * Este módulo es NATIVO: si el APK instalado fue compilado antes de
 * agregar el paquete, `requireNativeModule` lanza al evaluarlo. Al
 * requerirlo recién al momento de actualizar (y no al arrancar la app),
 * un build viejo no se rompe: muestra el mensaje y sigue funcionando.
 */
function cargarIntentLauncher(): IntentLauncherModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-intent-launcher") as IntentLauncherModule;
  } catch {
    throw new Error(
      "Este build de la app no incluye el módulo de instalación. " +
        "Genere un build nuevo (expo run:android / EAS build) para poder actualizar desde la app.",
    );
  }
}

export type ProgresoDescarga = {
  /** Porcentaje de descarga (0-100). */
  porcentaje: number;
};

/**
 * Construye la URL absoluta de descarga a partir del enlace devuelto
 * por el servidor (que ya es absoluto; se normaliza por si acaso).
 */
function resolverUrl(url: string, serverUrl: string | null): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = serverUrl
    ? serverUrl.startsWith("http://") || serverUrl.startsWith("https://")
      ? serverUrl
      : `http://${serverUrl}`
    : "";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Descarga el APK y abre el instalador de Android.
 * Devuelve recién cuando el usuario vuelve de la pantalla de instalación
 * (o cuando falla). Lanza Error si la descarga o el intent fallan.
 */
export async function descargarEInstalar(
  url: string,
  serverUrl: string | null,
  onProgress?: (porcentaje: number) => void,
): Promise<void> {
  // Limpia una descarga anterior interrumpida.
  try {
    await FileSystem.deleteAsync(APK_DESTINO, { idempotent: true });
  } catch {
    // No bloquea si el archivo no existía.
  }

  const urlAbsoluta = resolverUrl(url, serverUrl);

  const descarga = FileSystem.createDownloadResumable(
    urlAbsoluta,
    APK_DESTINO,
    {},
    (progress) => {
      const esperado = progress.totalBytesExpectedToWrite;
      if (esperado > 0) {
        onProgress?.(
          Math.min(
            100,
            Math.round((progress.totalBytesWritten * 100) / esperado),
          ),
        );
      }
    },
  );

  const resultado = await descarga.downloadAsync();

  if (!resultado?.uri) {
    throw new Error("La descarga de la actualización falló. Verifique la conexión.");
  }

  onProgress?.(100);

  // file:// → content:// para poder pasárselo a otro proceso (Android N+)
  const contentUri = await FileSystem.getContentUriAsync(resultado.uri);

  const IntentLauncher = cargarIntentLauncher();

  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    type: "application/vnd.android.package-archive",
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}
