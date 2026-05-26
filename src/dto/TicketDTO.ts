// dto/TicketDTO.ts
export type TicketDTO = {
  id_suc: number;
  id_bod: number;
  id_pico: number;
  fecha: string;       // ISO string "YYYY-MM-DD"
  hora: string;        // "HH:MM:SS"
  ci_playero: number;
  litros: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  monto: number;
  ruc_cliente?: string;
  id_vehiculo?: string;
  obs?: string;
  tipo: "CONTADO" | "CREDITO" | "INTERNO";
};