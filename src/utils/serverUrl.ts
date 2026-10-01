/**
 * @module Utils/serverUrl
 * @category Utilities
 *
 * Normalización y validación de la URL del servidor.
 * Acepta dominios (https) e IPs (http), con o sin esquema.
 */

const ESQUEMA_REGEX = /^https?:\/\//i;

/**
 * URL del servidor, hardcodeada. Al ser un dominio, cambia de IP sin tocar la app.
 * Si algún día hay que apuntar a otro entorno, se cambia acá y se publica un build.
 */
export const SERVER_URL_FIJA = "https://playero.tecnoedilsa.com.py";

const URL_REGEX =
  /^(https?:\/\/)?((\d{1,3}\.){3}\d{1,3}|([\w-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/\S*)?$/;

const SOLO_IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/\S*)?$/;

/** Valida que el valor ingresado sea una URL o IP de servidor válida. */
export function esUrlServidor(valor: string): boolean {
  return URL_REGEX.test(valor.trim());
}

/**
 * Devuelve la URL con esquema y sin slash final.
 * - Si no trae esquema: IPs usan `http://`, dominios usan `https://`.
 */
export function normalizarServerUrl(valor: string): string {
  let url = valor.trim().replace(/\/+$/, "");
  if (!ESQUEMA_REGEX.test(url)) {
    url = SOLO_IP_REGEX.test(url) ? `http://${url}` : `https://${url}`;
  }
  return url;
}
