// dto/AbastecimientoDTO.ts

export type MedicionTanqueDTO = {
  id_tanque: number;
  inicio: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string; // Base64
  };
  fin: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string; // Base64
  };
};

export type AbastecimientoDTO = {
  // 1. FALTA CRUCIAL: El backend lo extrae del primer nivel (item.id_abastecimiento)
  id_abastecimiento?: string | number; 
  clave?: string;
  // Datos generales (lo que el backend lee desde item.json)
  id_suc: number;
  id_bod: number;
  fecha: string; // Formato fecha interpretable por Date()
  hora: string;  // Formato 'HH:MM:SS'
  nro_oc: number;
  nro_remision: string;
  litros_remision: number;
  playero: number;
  foto_rev_docs: string[]; // Array de Base64
  zeta_no_llega: number;   // Actúa como booleano (0 o 1)
  id_pico_para_zeta: number | null; // CORRECCIÓN: El backend acepta null implícitamente
  taxilitro_inicial: number;
  taxilitro_final: number;
  litros_zeta: number;
  obs_repos: string;
  foto_obs_repos: string[]; // Array de Base64
  litros_total_repos: string;
  appte?: string; // CORRECCIÓN: El backend acepta undefined implícitamente
  
  // Sub-colección de mediciones
  mediciones_tanque: MedicionTanqueDTO[];
  foto_taxilitro: string;     // Base64 string
  foto_taxilitro_fin: string;
};

/**
 * Tipo para el cuerpo de la petición (req.body) tal cual lo espera Axios/Fetch.
 * Recuerda que al enviar la petición, el backend espera { abastecimientos: [...] }
 */
export type SyncAbastecimientosPayload = {
  abastecimientos: AbastecimientoDTO[];
};