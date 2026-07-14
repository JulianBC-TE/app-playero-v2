// src/backend/api/operacionesAPI.ts
import { httpClient } from "./httpClient";
import { SYNC_CONFIG } from "./syncConfig";
import { TicketDTO } from "@/dto/TicketDTO";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import { CalibracionDTO } from "@/dto/CalibracionDTO";
import { AbastecimientoDTO } from "@/dto/AbastecimientoDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";

// ── Helpers ───────────────────────────────────────────────────────────────────

function msToISO(ms: number | null | undefined): string {
  return new Date(ms ?? Date.now()).toISOString();
}

// ── Tipos de fila ─────────────────────────────────────────────────────────────

type FilaTicket = {
  idTicket: number;
  fecha: number | null;
  hora: number | null;
  dto: TicketDTO;
};

type FilaTraspaso = {
  idTrapaso: number;
  dto: TraspasoDTO;
};

export type FilaCalibracion = {
  idCalibracion: number; // ID de SQLite local
  dto: CalibracionDTO;   // Estructura plana
};

type FilaAbastecimiento = {
  idAbastecimiento: number;
  dto: AbastecimientoDTO;
};

export type FilaTurno = {
  idTurno: number;
  tipo: "1" | "2";
  fecha: number | null;
  hora: number | null;
  observacionAnulacion: string | null;
  dto: TurnoDTO;
};

// ── Tipo del payload batch que espera la API central ─────────────────────────

type TurnoSyncItem = {
  id_turno: string;
  tipo: "1" | "2";
  json: TurnoDTO;           // objeto ya parseado, med_tanques incluido
  fecha: number | null;     // número crudo de la BD
  hora: number | null;      // número crudo de la BD
  observacion_anulacion: string | null;
};

type TurnoBatchPayload = {
  turnos: TurnoSyncItem[];
};

export interface ResumenTurnoBodega {
  idbodega: number;
  tipo?: string;
  estado: string; 
  fecha: string;
  turnoCompleto: TurnoDTO; // Guardamos el objeto completo aquí
}
// ── Envíos ────────────────────────────────────────────────────────────────────

export async function enviarTicket(fila: FilaTicket): Promise<void> {
  const datosTicket = {
    ...fila.dto,
    id_suc: fila.dto.id_suc ?? 69,
    fecha: fila.dto.fecha ?? msToISO(fila.fecha),
    hora: fila.dto.hora ?? msToISO(fila.hora),
    inicio_taxilitro: fila.dto.taxilitro_inicial,
    fin_taxilitro: fila.dto.taxilitro_final
  };
  console.log(datosTicket.ci_playero);

  const payload = {
    tickets: [{ id_ticket: fila.dto.clave, json: datosTicket }]
  };

  await httpClient.syncPost(SYNC_CONFIG.endpoints.tickets, payload);
}

export async function enviarTraspaso(fila: FilaTraspaso): Promise<void> {
  const payload = {
    trapasos: [{ id_trapaso: fila.dto.clave, json: fila.dto }]
  };

  await httpClient.syncPost(SYNC_CONFIG.endpoints.traspasos, payload);
}

export async function enviarCalibracion(fila: FilaCalibracion): Promise<void> {
  const payload = {
    calibraciones: [{ id_calibracion: fila.dto.clave, json: fila.dto }]
  };

  await httpClient.syncPost(SYNC_CONFIG.endpoints.calibraciones, payload);
}

/*export async function enviarAbastecimiento(dto: AbastecimientoDTO): Promise<void> {
  const payloadBackend = {
    abastecimientos: [{ id_abastecimiento: dto.clave, json: dto }]
  };

  await httpClient.syncPost(SYNC_CONFIG.endpoints.abastecimientos, payloadBackend);
}*/

export async function enviarAbastecimiento(dto: AbastecimientoDTO): Promise<void> {
  
  const payloadBackend = {
    abastecimientos: [
      { 
        // Usamos el ID original del registro. Si no viene en el DTO, usamos la clave como respaldo.
        id_abastecimiento: String(dto.clave), 
        json: dto 
      }
    ]
  };
  console.log(payloadBackend.abastecimientos[0].id_abastecimiento)

  await httpClient.syncPost(SYNC_CONFIG.endpoints.abastecimientos, payloadBackend);
}

export async function enviarTurno(fila: FilaTurno): Promise<void> {
  const claveFinal = fila.dto.clave || `${fila.dto.id_bod} - ${fila.dto.ci_playero} - ${fila.tipo} - ${fila.dto.fecha}`;

  const item: TurnoSyncItem = {
    id_turno:              claveFinal,
    tipo:                  fila.tipo,
    json:                  fila.dto,
    fecha:                 fila.fecha,
    hora:                  fila.hora,
    observacion_anulacion: fila.observacionAnulacion,
  };

  const payload: TurnoBatchPayload = { turnos: [item] };

  const endpoint = fila.tipo === "1"
    ? SYNC_CONFIG.endpoints.turnosInicio
    : SYNC_CONFIG.endpoints.turnosFin;

  await httpClient.post(endpoint, payload); 
}

/**
 * Obtiene los últimos turnos activos e íntegros (Cabecera + Detalle) de un usuario por bodega.
 */
export async function obtenerEstadoTurnosPorBodega(userId: number): Promise<ResumenTurnoBodega[]> {
  try {
    const url = `/api/app/ultimosTurnosActivos/${userId}`;

    // Hacemos el GET al backend
    const response = await httpClient.syncGet<{ success: boolean; data: TurnoDTO[] }>(url);

    if (!response.data || !response.data.success) {
      return [];
    }
    /*const dataMap = response.data.data.map((turno: TurnoDTO) => ({
      idbodega: turno.id_bod,
      tipo: turno.tipo || "DESCONOCIDO", 
      fecha: `${turno.fecha} ${turno.hora}`,
      turnoCompleto: turno // Aquí ya tienes la cabecera, med_tanques y med_picos impecables
    }));*/

    // Mapeamos para mantener los tres elementos de control rápidos más el DTO completo
    return response.data.data.map((turno: TurnoDTO) => ({
      idbodega: turno.id_bod,
      estado: "",
      tipo: turno.tipo || "DESCONOCIDO", 
      fecha: `${turno.fecha} ${turno.hora}`,
      turnoCompleto: turno // Aquí ya tienes la cabecera, med_tanques y med_picos impecables
    }));

  } catch (error) {
    console.error("❌ Error al obtener el estado de los turnos en operacionesAPI:", error);
    throw error;
  }
}