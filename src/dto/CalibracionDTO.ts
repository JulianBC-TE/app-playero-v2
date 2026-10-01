// dto/CalibracionDTO.ts

export type CalibracionDetalleDTO = {
  val_medicion: string;
  taxilitro_carga: string;
  foto_med_balde?: string;      // Base64 (Opcional)
  foto_taxilitro_carga: string; // ◄ NUEVO: Base64 de la foto tomada en este detalle
};

export type CalibracionDTO = {
  id_calibracion?: string | null; 
  fecha_hora: string;
  clave?: string;
  hora: string;
  bodega: number;
  ci_encargado: number;
  nombre_encargado: string;
  pico: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  foto_precinto_retirado: string; // Base64
  foto_precinto_colocado: string; // Base64
  firma_calibrador: string;       // Base64
  
  // ◄ NUEVOS: Base64 de las fotos del taxilitro inicial y final tomadas desde la App
  foto_inicial_taxilitro: string; 
  foto_final_taxilitro: string;   

  detalles: CalibracionDetalleDTO[];

  // Campos que el backend tolera como vacíos o tienen default:
  obs_gral?: string; 
  appte?: string;
  nro_precinto_retirado?: string;
  nro_precinto_colocado?: string;
  tipo_operacion?: "VERIFICACION" | "CALIBRACION"; 
};