// dto/TicketDTO.ts
export type TicketDTO = {
  id_suc: number;
  id_bod: number;
  id_pico: number;
  fecha: number;       // ISO string "YYYY-MM-DD"
  hora: number;        // "HH:MM:SS"
  ci_playero: number;
  litros: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  monto: number;
  ruc_cliente?: string;
  id_vehiculo?: string;
  obs?: string;
  tipo: string;
};