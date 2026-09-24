// src/storage/storageCalibracion.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const K = {
  base: "@calibracion",
  precintoAtual: "@calibracion_photo_precinto_atual",
  precintoColocado: "@calibracion_photo_precinto_colocado",
  firma: "@calibracion_firma",
  
  // ◄ NUEVOS: Claves de fotos de taxilitros globales
  fotoInicialTaxilitro: "@calibracion_photo_inicial_taxilitro",
  fotoFinalTaxilitro: "@calibracion_photo_final_taxilitro",
  
  seqCount: "@calibracion_seq_count",
  seqMeta: (i: number) => `@calibracion_seq_meta_${i}`,   // metadatos de la secuencia
  seqFotoMed: (i: number) => `@calibracion_seq_foto_med_${i}`, // foto balde
  seqFotoTax: (i: number) => `@calibracion_seq_foto_tax_${i}`, // ◄ NUEVO: foto taxilitro por secuencia
};

export type calibracionDTO = {
  fecha: string;
  hora: string;
  idBodega: number;
  obs: string;
  obsAdicional: string;
  appte: string;
  cedula: number;
  nombre: string;
  id_pico: number;
  selectedPico: string;
  numeroPrecintoAtual: string;
  numeroPrecintoColocado: string;
  photoPrecintoAtual: string;
  photoPrecintoColocado: string;
  firma: string | null;
  tipoOperationSeleccionado: string;
  turnoCerrado: boolean;

  // Taxilitros globales
  taxilitroInicial: number;
  taxilitroFinal: number;
  fotoInicialTaxilitro: string; // ◄ NUEVO
  fotoFinalTaxilitro: string;   // ◄ NUEVO
  totalMediciones: number;
  
  sequencias: {
    valor_medicion: string;
    foto_medicion: string;
    taxilitro: number;
    litros_cargados: number;
    foto_taxilitro_carga: string; // ◄ NUEVO
  }[];
};

// ─── Guardar ─────────────────────────────────────────────────────────────────
export async function saveCalibracion(data: calibracionDTO): Promise<void> {
  const { 
    photoPrecintoAtual, 
    photoPrecintoColocado, 
    firma, 
    fotoInicialTaxilitro, 
    fotoFinalTaxilitro, 
    sequencias, 
    ...resto 
  } = data;

  // 1. Datos planos escalares
  await AsyncStorage.setItem(K.base, JSON.stringify(resto));

  // 2. Fotos globales
  await AsyncStorage.setItem(K.precintoAtual, photoPrecintoAtual ?? "");
  await AsyncStorage.setItem(K.precintoColocado, photoPrecintoColocado ?? "");
  await AsyncStorage.setItem(K.firma, firma ?? "");
  await AsyncStorage.setItem(K.fotoInicialTaxilitro, fotoInicialTaxilitro ?? "");
  await AsyncStorage.setItem(K.fotoFinalTaxilitro, fotoFinalTaxilitro ?? "");

  // 3. Iteración sobre las secuencias de verificación
  await AsyncStorage.setItem(K.seqCount, String(sequencias.length));
  await Promise.all(
    sequencias.flatMap((seq, i) => [
      AsyncStorage.setItem(
        K.seqMeta(i),
        JSON.stringify({ 
          valor_medicion: seq.valor_medicion, 
          taxilitro: seq.taxilitro, 
          litros_cargados: seq.litros_cargados 
        })
      ),
      AsyncStorage.setItem(K.seqFotoMed(i), seq.foto_medicion ?? ""),
      AsyncStorage.setItem(K.seqFotoTax(i), seq.foto_taxilitro_carga ?? ""), // ◄ NUEVO
    ])
  );
}

// ─── Leer ─────────────────────────────────────────────────────────────────────
export async function getStorageCalibracion(): Promise<calibracionDTO | null> {
  const base = await AsyncStorage.getItem(K.base);
  if (!base) return null;

  const photoPrecintoAtual    = (await AsyncStorage.getItem(K.precintoAtual))    ?? "";
  const photoPrecintoColocado = (await AsyncStorage.getItem(K.precintoColocado)) ?? "";
  const firma                 = (await AsyncStorage.getItem(K.firma)) || null;
  const fotoInicialTaxilitro  = (await AsyncStorage.getItem(K.fotoInicialTaxilitro)) ?? "";
  const fotoFinalTaxilitro    = (await AsyncStorage.getItem(K.fotoFinalTaxilitro))   ?? "";

  const seqCount = Number((await AsyncStorage.getItem(K.seqCount)) ?? "0");
  const sequencias = await Promise.all(
    Array.from({ length: seqCount }, async (_, i) => {
      const meta = await AsyncStorage.getItem(K.seqMeta(i));
      const fotoMed = (await AsyncStorage.getItem(K.seqFotoMed(i))) ?? "";
      const fotoTax = (await AsyncStorage.getItem(K.seqFotoTax(i))) ?? ""; // ◄ NUEVO
      
      const parsedMeta = meta ? JSON.parse(meta) : { valor_medicion: "", taxilitro: 0, litros_cargados: 0 };
      return { 
        valor_medicion: parsedMeta.valor_medicion, 
        foto_medicion: fotoMed, 
        taxilitro: parsedMeta.taxilitro,
        litros_cargados: parsedMeta.litros_cargados,
        foto_taxilitro_carga: fotoTax,
      };
    })
  );

  return {
    ...JSON.parse(base),
    photoPrecintoAtual,
    photoPrecintoColocado,
    firma,
    fotoInicialTaxilitro,
    fotoFinalTaxilitro,
    sequencias,
  } as calibracionDTO;
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────
export async function removeCalibracion(): Promise<void> {
  const seqCount = Number((await AsyncStorage.getItem(K.seqCount)) ?? "0");

  const keys = [
    K.base,
    K.precintoAtual,
    K.precintoColocado,
    K.firma,
    K.fotoInicialTaxilitro,
    K.fotoFinalTaxilitro,
    K.seqCount,
    ...Array.from({ length: seqCount }, (_, i) => K.seqMeta(i)),
    ...Array.from({ length: seqCount }, (_, i) => K.seqFotoMed(i)),
    ...Array.from({ length: seqCount }, (_, i) => K.seqFotoTax(i)),
  ];

  await AsyncStorage.multiRemove(keys);
}

// ─── ¿Hay datos guardados? ────────────────────────────────────────────────────
export async function hasCalibracionGuardada(): Promise<boolean> {
  const base = await AsyncStorage.getItem(K.base);
  return base !== null;
}