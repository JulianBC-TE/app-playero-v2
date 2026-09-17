/**
 * Constantes y utilidades relacionadas con el estado de los turnos.
 *
 * @module Playero/Backend/DB/Constants/syncConfig
 * @category Constants
 */
import { httpClient } from "@/backend/api/httpClient";
import { bodegas } from "../db/schema";

export const SYNC_CONFIG = {
  // Usamos el mismo httpClient que ya tienes (maneja token, IP, refresh, etc.)
  get http() {
    return httpClient;
  },

  // Endpoints de sincronización (los que vienen del daemon NestJS)
  endpoints: {
    // Maestros bidireccionales
    clientesGet: "/api/app/syncClientesGet",
    clientesPost: "/api/app/syncClientesPost",

    personasGet: "/api/app/syncPersonasGet",
    personasPost: "/api/app/syncPersonasPost",

    vehiculosGet: "/api/app/syncVehiclesGet",
    vehiculosPost: "/api/app/syncVehiclesPost",

    usuariosAdminGet: "/api/auth/getUsuariosAdminSync",

    tickets: "/api/app/syncTicketsPost",
    traspasos: "/api/app/syncTraspasosPost",
    calibraciones: "/api/app/syncCalibracionesPost",
    abastecimientos: "/api/app/syncAbastecimientosPost",
    turnosInicio: "/api/app/syncInicioTurnoPost",
    turnosFin: "/api/app/syncFinTurnoPost",

     // Sincronización de la app (POST/GET según corresponda)
    syncBodegasCompleto: "api/app/sync/sucursal-bodega-traspaso/bodegas/:id_sucursal/:cedula",
    syncBodegasCompletoV2: "api/app/sync/usuario-bodega-traspaso/bodegas/:cedula",
    syncSucursalesDestino: "api/app/sync/sucursal-bodega-traspaso/sucursales/:id_sucursal",
    syncSucursalesDestinoV2: "api/app/sync/usuario-bodega-traspaso/sucursales/:cedula",
    syncPicos: "api/app/sync/pico",
    ultimosTurnos: "/api/app/ultimosTurnosActivos",
    syncTanques: "api/app/sync/tanque",
    modulos: "api/app/privilegios/:cedula"
  },
};
