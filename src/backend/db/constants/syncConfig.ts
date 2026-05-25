/**
 * Constantes y utilidades relacionadas con el estado de los turnos.
 *
 * @module Playero/Backend/DB/Constants/syncConfig
 * @category Constants
 */
import { httpClient } from "@/backend/api/httpClient";

export const SYNC_CONFIG = {
  // Usamos el mismo httpClient que ya tienes (maneja token, IP, refresh, etc.)
  get http() {
    return httpClient;
  },

  // Endpoints de sincronización (los que vienen del daemon NestJS)
  endpoints: {
    // Maestros bidireccionales
    clientesGet: "/api/sync/syncClientesGet",
    clientesPost: "/api/sync/syncClientesPost",

    personasGet: "/api/sync/syncPersonasGet",
    personasPost: "/api/sync/syncPersonasPost",

    vehiculosGet: "/api/sync/syncVehiclesGet",
    vehiculosPost: "/api/sync/syncVehiclesPost",

    usuariosAdminGet: "/api/auth/getUsuariosAdminSync",

    // Catálogos (solo bajada)
    sucursales: "/api/sucursales",
    bodegas: "/api/bodegas",
    picos: "/api/picos",
    tanques: "/api/tanques",
    tickets: "/api/tickets",
    traspasos: "/api/traspasos",
    calibraciones: "/api/calibraciones",
    abastecimientos: "/api/Abastecimientos-V2",
    turnos: "/api/turnos",
  },
};
