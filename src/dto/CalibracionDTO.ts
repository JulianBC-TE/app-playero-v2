// dto/CalibracionDTO.ts
export type CalibracionDetalleDTO = {
  val_medicion: string;
  foto_med_balde: string;
  taxilitro_carga: string;
};

export type CalibracionDTO = {
  fecha_hora: string;
  hora: string;
  bodega: number;
  obs_gral: string;
  ci_encargado: number;
  nombre_encargado: string;
  pico: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  nro_precinto_retirado: string;
  nro_precinto_colocado: string;
  foto_precinto_retirado: string;
  foto_precinto_colocado: string;
  firma_calibrador: string;
  tipo_operacion: "VERIFICACION" | "CALIBRACION";
  detalles: CalibracionDetalleDTO[];
};