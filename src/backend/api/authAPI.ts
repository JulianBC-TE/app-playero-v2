/**
 * @module Playero/Backend/API/authApi
 * @category HTTP Clients
 */
// Todas las llamadas HTTP relacionadas a autenticación.
// Las pantallas y contextos importan de aquí — nunca usan axios directamente.

import { httpClient } from "./httpClient";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export interface LoginResponse {
  persona: {
    cedula: number;
    nombreApellido: string;
    timestamp: number;
    sync: number; // ✨ Cambiado de 0 a number para que sea flexible si cambia en el futuro
  };
  sucursal: {
    idSucursal: number;
    descripcionSucursal: string;
  };
  usuarioApp: {
    cedula: number;
    clave?: string;
    refreshToken?: string; // En tu JSON vino como string, está bien dejarlo opcional por si acaso
    salt?: string;
    bloqueado: boolean;
    idUser: number;
    idSucursal: number;
  };
  token: string;
  expirationTime: number;
}

export type RefreshTokenResponse = {
  token: string;
  refresh_token: string;
};


/**
 * Realiza login con cédula y contraseña.
 * Retorna los datos del usuario, sucursal y tokens de autenticación.
 *
 * @param cedula - Cédula del usuario
 * @param password - Contraseña del usuario
 * @returns Datos completos de login incluyendo token y refreshToken
 * @throws Error si las credenciales son inválidas o hay error de conexión
 */
export async function login(cedula: number, password: string): Promise<LoginResponse> {
  try {
    const { data } = await httpClient.post<LoginResponse>(
      "/api/app/auth/login",
      { cedula, clave: password }
    );
    
      console.log(data)
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || "Error al iniciar sesión");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// refreshToken
// POST /api/auth/refresh-token
// (el httpClient ya lo maneja automáticamente en el interceptor,
//  esta función queda disponible si alguna pantalla lo necesita llamar directo)
// ---------------------------------------------------------------------------

export async function refreshToken(
  refresh_token: string
): Promise<RefreshTokenResponse> {
  const { data } = await httpClient.post<RefreshTokenResponse>(
    "/api/auth/refresh-token",
    { refresh_token }
  );
  return data;
}

export type UserStatusResponse = {
  cedula: number;
  bloqueado: boolean;
};

/**
 * Consulta al servidor el estado actual de bloqueo del usuario.
 * @param cedula - Cédula del usuario a verificar
 * @returns Promesa con el objeto conteniendo la cédula y si está bloqueado o no.
 */
export async function checkUserStatusServer(id: number): Promise<UserStatusResponse> {
  try {
    // Apunta al endpoint que creamos en el backend protegido por token
    const { data } = await httpClient.get<UserStatusResponse>(
      `/api/app/auth/status/${id}`
    );
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message || "Error al verificar el estado del usuario en el servidor");
    }
    throw error;
  }
}