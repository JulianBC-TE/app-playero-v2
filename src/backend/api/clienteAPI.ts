// clienteAPI.ts - SECCIÓN DE SINCRONIZACIÓN MODIFICADA
import { httpClient } from "./httpClient";
import { ClienteDTO } from "@/dto/ClienteDTO";
import { SYNC_CONFIG } from "@/backend/api/syncConfig"; // <-- Ajusta la ruta relativa según tu proyecto

// ... (Todo el resto de las funciones CRUD locales se mantienen igual)

// ====================== SINCRONIZACIÓN ======================

export async function syncGetClientes(lastTimestamp: number = 0): Promise<ClienteDTO[]> {
  const endpoint = SYNC_CONFIG.endpoints.clientesGet;
  const { data } = await httpClient.syncGet<ClienteDTO[]>(endpoint, {
    params: { createdAt: lastTimestamp },
  });
  return data;
}

export async function syncPostClientes(clientes: ClienteDTO[]): Promise<void> {
  const endpoint = SYNC_CONFIG.endpoints.clientesPost;
  await httpClient.syncPost(endpoint, { clientes });
}