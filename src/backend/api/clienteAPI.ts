/**
 * @module Playero/Backend/API/clientApi
 * @category HTTP Clients
 */
// Todas las llamadas HTTP relacionadas a la entidad Cliente.
// Las pantallas y contextos importan de aquí — nunca usan axios directamente.
//
// ENDPOINTS:
//   POST   /api/clientes           → crear cliente
//   GET    /api/clientes           → listar todos
//   GET    /api/clientes/:ruc      → buscar por RUC
//   GET    /api/clientes/search?q= → buscar por texto
//   PUT    /api/clientes/:ruc      → actualizar
//   DELETE /api/clientes/:ruc      → eliminar

import { httpClient } from "./httpClient";
import { ClienteDTO } from "@/dto/ClienteDTO";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export type ClienteResponse = {
  ruc: string;
  descripcion_cliente: string;
};

// ---------------------------------------------------------------------------
// crearCliente
// POST /api/clientes
// Crea un cliente en el servidor. Lanza error si ya existe (409).
// ---------------------------------------------------------------------------

export async function crearCliente(data: ClienteDTO): Promise<ClienteResponse> {
  const { data: res } = await httpClient.post<ClienteResponse>("/api/clientes", {
    ruc: data.ruc,
    descripcion_cliente: data.descripcion_cliente,
  });
  return res;
}

// ---------------------------------------------------------------------------
// getClientes
// GET /api/clientes
// Devuelve todos los clientes del servidor.
// ---------------------------------------------------------------------------

export async function getClientes(): Promise<ClienteDTO[]> {
  const { data } = await httpClient.get<ClienteDTO[]>("/api/clientes");
  return data;
}

// ---------------------------------------------------------------------------
// getClienteByRuc
// GET /api/clientes/:ruc
// Devuelve un cliente por su RUC. Devuelve null si no existe (404).
// ---------------------------------------------------------------------------

export async function getClienteByRuc(ruc: string): Promise<ClienteDTO | null> {
  try {
    const { data } = await httpClient.get<ClienteDTO>(`/api/clientes/${ruc}`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message?.includes("404")) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// buscarClientes
// GET /api/clientes/search?q=<texto>
// Búsqueda de clientes por nombre o RUC. Usado en BuscarCliente.tsx.
// ---------------------------------------------------------------------------

export async function buscarClientes(query: string): Promise<ClienteDTO[]> {
  const { data } = await httpClient.get<ClienteDTO[]>("/api/clientes/search", {
    params: { q: query },
  });
  return data;
}

// ---------------------------------------------------------------------------
// actualizarCliente
// PUT /api/clientes/:ruc
// Actualiza la descripción de un cliente existente.
// ---------------------------------------------------------------------------

export async function actualizarCliente(
  ruc: string,
  data: Partial<ClienteDTO>
): Promise<ClienteResponse> {
  const { data: res } = await httpClient.put<ClienteResponse>(
    `/api/clientes/${ruc}`,
    data
  );
  return res;
}

// ---------------------------------------------------------------------------
// eliminarCliente
// DELETE /api/clientes/:ruc
// ---------------------------------------------------------------------------

export async function eliminarCliente(ruc: string): Promise<void> {
  await httpClient.delete(`/api/clientes/${ruc}`);
}