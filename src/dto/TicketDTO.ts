// TicketDTO.ts
// src/dto/TicketDTO.ts
export type TicketDTO = {
  id_suc: number;
  id_bod: number;
  id_pico: number;
  clave?: string;
  fecha: string; // Formato string comercial (ej: "2026-06-18")
  hora: string;  // Formato string comercial (ej: "08:30:00")
  ci_playero: number;
  id_playero?: number;
  id_operador: number;
  litros: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  monto: number;
  tipo: string;
  ruc_cliente?: string;
  id_vehiculo?: string;
  obs?: string;
  appte?: string;
  kilometraje?: number;
  horometro?: number;
  foto_chapa?: string[];
  firma_conductor?: string[];
  foto_kilometraje?: string[];
  foto_horometro?: string[];
  foto_observaciones?: string[];
  foto_taxilitro?: string[];
  foto_taxilitro_fin?: string[];
  ubicacion_carga?: string;
  observaciones_ticket?: string;
};