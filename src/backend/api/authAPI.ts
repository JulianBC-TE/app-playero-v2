// src/backend/api/authAPI.ts
//
// Todas las llamadas HTTP relacionadas a autenticación.
// Las pantallas y contextos importan de aquí — nunca usan axios directamente.

import { httpClient } from "./httpClient";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export type LoginResponse = {
  name: string;
  token: string;
  refresh_token?: string;
};

export type RefreshTokenResponse = {
  token: string;
  refresh_token: string;
};

// ---------------------------------------------------------------------------
// login
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function login(
  cedula: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>("/api/auth/login", {
    cedula: Number(cedula),
    clave: password,
  });

  if (!data.name || !data.token) {
    throw new Error("Respuesta del servidor inválida.");
  }

  return data;
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