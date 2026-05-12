// src/backend/api/vehiculoAPI.ts
//
// Todas las llamadas HTTP relacionadas a la entidad Vehículo.
// Las pantallas y contextos importan de aquí — nunca usan axios directamente.
//
// ENDPOINTS:
//   POST   /api/vehiculos              → crear vehículo
//   GET    /api/vehiculos              → listar todos
//   GET    /api/vehiculos/:id          → buscar por id
//   GET    /api/vehiculos/search?q=    → buscar por texto
//   GET    /api/vehiculos/cliente/:ruc → listar por cliente
//   PUT    /api/vehiculos/:id          → actualizar
//   DELETE /api/vehiculos/:id          → eliminar

import { httpClient } from "./httpClient";
import { VehiculoDTO } from "@/dto/VehiculoDTO";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servidor
// ---------------------------------------------------------------------------

export type VehiculoResponse = {
  id_vehiculo: string;
  descripcion_vehiculo: string;
  ruc: string;
};

// ---------------------------------------------------------------------------
// crearVehiculo
// POST /api/vehiculos
// Crea un vehículo en el servidor. Lanza error si ya existe (409).
// ---------------------------------------------------------------------------

export async function crearVehiculo(data: VehiculoDTO): Promise<VehiculoResponse> {
  const { data: res } = await httpClient.post<VehiculoResponse>("/api/vehiculos", {
    id_vehiculo: data.id_vehiculo.toUpperCase().replace(/\s+/g, ""),
    descripcion_vehiculo: data.descripcion_vehiculo.toUpperCase(),
    ruc: data.ruc,
  });
  return res;
}

// ---------------------------------------------------------------------------
// getVehiculos
// GET /api/vehiculos
// Devuelve todos los vehículos del servidor.
// ---------------------------------------------------------------------------

export async function getVehiculos(): Promise<VehiculoDTO[]> {
  const { data } = await httpClient.get<VehiculoDTO[]>("/api/vehiculos");
  return data;
}

// ---------------------------------------------------------------------------
// getVehiculoById
// GET /api/vehiculos/:id
// Devuelve un vehículo por su id. Devuelve null si no existe (404).
// ---------------------------------------------------------------------------

export async function getVehiculoById(idVehiculo: string): Promise<VehiculoDTO | null> {
  try {
    const { data } = await httpClient.get<VehiculoDTO>(`/api/vehiculos/${idVehiculo}`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.message?.includes("404")) {
      return null;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// buscarVehiculos
// GET /api/vehiculos/search?q=<texto>
// Búsqueda de vehículos por id o descripción. Usado en BuscarVehiculo.tsx.
// ---------------------------------------------------------------------------

export async function buscarVehiculos(query: string): Promise<VehiculoDTO[]> {
  const { data } = await httpClient.get<VehiculoDTO[]>("/api/vehiculos/search", {
    params: { q: query },
  });
  return data;
}

// ---------------------------------------------------------------------------
// getVehiculosByCliente
// GET /api/vehiculos/cliente/:ruc
// Devuelve los vehículos que pertenecen a un cliente.
// Usado en pantallas que filtran vehículos por cliente activo.
// ---------------------------------------------------------------------------

export async function getVehiculosByCliente(ruc: string): Promise<VehiculoDTO[]> {
  const { data } = await httpClient.get<VehiculoDTO[]>(
    `/api/vehiculos/cliente/${ruc}`
  );
  return data;
}

// ---------------------------------------------------------------------------
// actualizarVehiculo
// PUT /api/vehiculos/:id
// Actualiza los datos de un vehículo existente.
// ---------------------------------------------------------------------------

export async function actualizarVehiculo(
  idVehiculo: string,
  data: Partial<VehiculoDTO>
): Promise<VehiculoResponse> {
  const { data: res } = await httpClient.put<VehiculoResponse>(
    `/api/vehiculos/${idVehiculo}`,
    data
  );
  return res;
}

// ---------------------------------------------------------------------------
// eliminarVehiculo
// DELETE /api/vehiculos/:id
// ---------------------------------------------------------------------------

export async function eliminarVehiculo(idVehiculo: string): Promise<void> {
  await httpClient.delete(`/api/vehiculos/${idVehiculo}`);
}