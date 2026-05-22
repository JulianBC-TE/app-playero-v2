/**
 * @module Playero/Backend/API/httpClient
 * @category HTTP Clients
 */
// Cliente HTTP centralizado. Es el único lugar del proyecto que conoce axios.
// Maneja: baseURL dinámica, token JWT, refresh automático de token, y signOut.
//
// USO:
//   import { httpClient } from "@/backend/api/httpClient"
//   httpClient.registerSignOut(signOut)   ← llamar una vez en AuthContext
//   httpClient.get("/api/recursos")
//   httpClient.post("/api/auth/login", body)

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_STORAGE, SERVER_URL } from "@storage/storageConfig";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type TokenStorage = { token: string; refresh_token: string };
type QueueItem = { onSuccess: (token: string) => void; onFailure: (err: AxiosError) => void };

// ---------------------------------------------------------------------------
// Helpers de AsyncStorage (internos, no exportar)
// ---------------------------------------------------------------------------

async function readTokens(): Promise<TokenStorage> {
  const raw = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE);
  return raw ? JSON.parse(raw) : { token: "", refresh_token: "" };
}

async function writeTokens(tokens: TokenStorage): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_STORAGE, JSON.stringify(tokens));
}

async function readServerUrl(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(SERVER_URL);
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Construcción del cliente
// ---------------------------------------------------------------------------

const axiosInstance: AxiosInstance = axios.create({ timeout: 22000 });

let failedQueue: QueueItem[] = [];
let isRefreshing = false;
let registeredSignOut: (() => Promise<void>) | null = null;

function resolveQueue(token: string) {
  failedQueue.forEach((item) => item.onSuccess(token));
  failedQueue = [];
}

function rejectQueue(err: AxiosError) {
  failedQueue.forEach((item) => item.onFailure(err));
  failedQueue = [];
}

// ── Interceptor de REQUEST: inyecta baseURL y token ─────────────────────────
axiosInstance.interceptors.request.use(async (config) => {
  const serverIP = await readServerUrl();
  if (serverIP) {
    config.baseURL = serverIP.startsWith("http://") ? serverIP : `http://${serverIP}`;
  }

  const { token } = await readTokens();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Interceptor de RESPONSE: maneja 401 y refresh token ─────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) {
      return Promise.reject(new Error("No se pudo conectar al servidor."));
    }

    const { response } = error;
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (response?.status === 401) {
      const message = (response.data as any)?.message;

      if (message === "token.expired" || message === "token.invalid") {
        if (originalRequest._retry) {
          registeredSignOut?.();
          return Promise.reject(new Error("Sesión expirada. Iniciá sesión nuevamente."));
        }

        originalRequest._retry = true;
        const { refresh_token } = await readTokens();

        if (!refresh_token) {
          registeredSignOut?.();
          return Promise.reject(new Error("Sin token de autenticación."));
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              onSuccess: (token) => {
                if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(axiosInstance(originalRequest));
              },
              onFailure: reject,
            });
          });
        }

        isRefreshing = true;

        return new Promise(async (resolve, reject) => {
          try {
            const baseURL = axiosInstance.defaults.baseURL;
            const { data } = await axios.post(`${baseURL}/api/auth/refresh-token`, { refresh_token });

            await writeTokens({ token: data.token, refresh_token: data.refresh_token });
            axiosInstance.defaults.headers.common.Authorization = `Bearer ${data.token}`;
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${data.token}`;

            resolveQueue(data.token);
            resolve(axiosInstance(originalRequest));
          } catch (refreshError) {
            rejectQueue(refreshError as AxiosError);
            registeredSignOut?.();
            reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        });
      }

      registeredSignOut?.();
      return Promise.reject(new Error((response.data as any)?.message || "Acceso no autorizado."));
    }

    const msg = (response?.data as any)?.message || `Error ${response?.status}`;
    return Promise.reject(new Error(msg));
  }
);

// ---------------------------------------------------------------------------
// API pública del httpClient
// ---------------------------------------------------------------------------

export const httpClient = {
  /** Registrar la función signOut del AuthContext para que el interceptor pueda llamarla */
  registerSignOut(fn: () => Promise<void>) {
    registeredSignOut = fn;
    return () => { registeredSignOut = null; };
  },

  /** Actualizar el token en los headers globales (llamar tras login) */
  setToken(token: string) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  },

  /** Limpiar el token de los headers (llamar tras logout) */
  clearToken() {
    delete axiosInstance.defaults.headers.common.Authorization;
  },

  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return axiosInstance.get<T>(url, config);
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return axiosInstance.post<T>(url, data, config);
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return axiosInstance.put<T>(url, data, config);
  },

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return axiosInstance.patch<T>(url, data, config);
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return axiosInstance.delete<T>(url, config);
  },

  /** Verificar conectividad al servidor (usado para detectar modo offline) */
  async isOnline(): Promise<boolean> {
    try {
      await axiosInstance.get("/api/health", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },
};