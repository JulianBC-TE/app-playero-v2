// src/dto/SequenciaCalibracionDTO.tsx

export type SequenciaItem = {
  taxilitro: number; // taxilitro final de la carga
  litros_cargados?: number; // litros ingresados manualmente por el usuario
  valor_medicion: string; // valor en ml seleccionado (-200 a +200)
  foto_medicion: string; // base64 de la foto
};

export type SequenciaCalibracionDTO = {
  taxilitroInicial: number; // taxilitro del primer despacho
  taxilitroFinal: number; // taxilitro del último despacho
  totalMediciones: number;
  sequencias: SequenciaItem[];
};
