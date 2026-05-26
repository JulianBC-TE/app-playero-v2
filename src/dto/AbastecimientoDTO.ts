// dto/AbastecimientoDTO.ts
export type MedicionTanqueDTO = {
  id_tanque: number;
  inicio: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string;
  };
  fin: {
    regla: string;
    temperatura: number;
    litros: number;
    foto_medicion: string;
  };
};

export type AbastecimientoDTO = {
  id_suc: number;
  id_bod: number;
  fecha: string;
  hora: string;
  nro_oc: number;
  nro_remision: string;
  litros_remision: number;
  playero: number;
  foto_rev_docs: string[];
  zeta_no_llega: number;
  id_pico_para_zeta: number;
  taxilitro_inicial: number;
  taxilitro_final: number;
  litros_zeta: number;
  obs_repos: string;
  foto_obs_repos: string[];
  litros_total_repos: string;
  mediciones_tanque: MedicionTanqueDTO[];
};