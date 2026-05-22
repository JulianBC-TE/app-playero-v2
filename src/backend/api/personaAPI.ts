/**
 * @module Playero/Backend/API/personaApi
 * @category HTTP Clients
 */// src/backend/api/personaAPI.ts
//
// Todas las llamadas HTTP relacionadas a la entidad Persona.
// Las pantallas y contextos importan de aquí — nunca usan axios directamente.
//
// ENDPOINTS:
//   POST   /api/personas           → crear persona
//   GET    /api/personas           → listar todas
//   GET    /api/personas/:cedula   → buscar por cédula
//   GET    /api/personas/search?q= → buscar por texto
//   PUT    /api/personas/:cedula   → actualizar
//   DELETE /api/personas/:cedula   → eliminar

import { httpClient } from "./httpClient";
import { PersonaDTO } from "@/dto/PersonaDTO";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export type PersonaResponse = {
  cedula: number;
  nombre_apellido: string;
};

// ---------------------------------------------------------------------------
// crearPersona
// POST /api/personas
// Crea una persona en el servidor. Lanza error si ya existe (409).
// ---------------------------------------------------------------------------

export async function crearPersona(data: PersonaDTO): Promise<PersonaResponse> {
  const { data: res } = await httpClient.post<PersonaResponse>("/api/personas", {
    cedula: data.cedula,
    nombre_apellido: data.nombre_apellido,
  });
  return res;
}

// ---------------------------------------------------------------------------
// getPersonas
// GET /api/personas
// Devuelve todas las personas del servidor.
// ---------------------------------------------------------------------------

export async function getPersonas(): Promise<PersonaDTO[]> {
  const { data } = await httpClient.get<PersonaDTO[]>("/api/personas");
  return data;
}

// ---------------------------------------------------------------------------
// getPersonaByCedula
// GET /api/personas/:cedula
// Devuelve una persona por su cédula. Devuelve null si no existe (404).
// ---------------------------------------------------------------------------

export async function getPersonaByCedula(cedula: number): Promise<PersonaDTO | null> {
  try {
    const { data } = await httpClient.get<PersonaDTO>(`/api/personas/${cedula}`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message?.includes("404")) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// buscarPersonas
// GET /api/personas/search?q=<texto>
// Búsqueda de personas por nombre o cédula. Usado en BuscarPersona.tsx.
// ---------------------------------------------------------------------------

export async function buscarPersonas(query: string): Promise<PersonaDTO[]> {
  const { data } = await httpClient.get<PersonaDTO[]>("/api/personas/search", {
    params: { q: query },
  });
  return data;
}

// ---------------------------------------------------------------------------
// actualizarPersona
// PUT /api/personas/:cedula
// Actualiza los datos de una persona existente.
// ---------------------------------------------------------------------------

export async function actualizarPersona(
  cedula: number,
  data: Partial<PersonaDTO>
): Promise<PersonaResponse> {
  const { data: res } = await httpClient.put<PersonaResponse>(
    `/api/personas/${cedula}`,
    data
  );
  return res;
}

// ---------------------------------------------------------------------------
// eliminarPersona
// DELETE /api/personas/:cedula
// ---------------------------------------------------------------------------

export async function eliminarPersona(cedula: number): Promise<void> {
  await httpClient.delete(`/api/personas/${cedula}`);
}