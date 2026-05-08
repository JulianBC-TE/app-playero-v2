/*import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_CALIBRACION = "@app:calibracion";

export type calibracionDTO = {
  fecha: string;
  hora: string;
  idBodega: number;
  obs: string;
  obsAdicional: string;
  cedula: number;
  nombre: string;
  id_pico: number;
  selectedPico: string;
  numeroPrecintoAtual: string;
  numeroPrecintoColocado: string;
  photoPrecintoAtual: string;
  photoPrecintoColocado: string;
  firma: string | null;
  tipoOperacionSeleccionado: string;
  taxilitroInicial: number;
  taxilitroFinal: number;
  totalMediciones: number;
  sequencias: {
    valor_medicion: string;
    foto_medicion: string;
    taxilitro: number;
  }[];
  turnoCerrado: boolean;
};

export async function saveCalibracion(data: calibracionDTO) {
  await AsyncStorage.setItem(STORAGE_CALIBRACION, JSON.stringify(data));
}

export async function getStorageCalibracion() {
  const storage = await AsyncStorage.getItem(STORAGE_CALIBRACION);

  if (!storage) {
    return null;
  }

  return JSON.parse(storage) as calibracionDTO;
}

export async function removeCalibracion() {
  await AsyncStorage.removeItem(STORAGE_CALIBRACION);
}

export async function hasCalibracionGuardada(): Promise<boolean> {
  const storage = await AsyncStorage.getItem(STORAGE_CALIBRACION);
  return storage !== null;
}*/

import AsyncStorage from "@react-native-async-storage/async-storage";

const K = {
  base: "@calibracion",
  precintoAtual: "@calibracion_photo_precinto_atual",
  precintoColocado: "@calibracion_photo_precinto_colocado",
  firma: "@calibracion_firma",
  seqCount: "@calibracion_seq_count",
  seqMeta: (i: number) => `@calibracion_seq_meta_${i}`,   // valor_medicion + taxilitro
  seqFoto: (i: number) => `@calibracion_seq_foto_${i}`,   // foto_medicion (base64)
};

export type calibracionDTO = {
  fecha: string;
  hora: string;
  idBodega: number;
  obs: string;
  obsAdicional: string;
  cedula: number;
  nombre: string;
  id_pico: number;
  selectedPico: string;
  numeroPrecintoAtual: string;
  numeroPrecintoColocado: string;
  photoPrecintoAtual: string;
  photoPrecintoColocado: string;
  firma: string | null;
  tipoOperacionSeleccionado: string;
  taxilitroInicial: number;
  taxilitroFinal: number;
  totalMediciones: number;
  sequencias: {
    valor_medicion: string;
    foto_medicion: string;
    taxilitro: number;
  }[];
  turnoCerrado: boolean;
};

// ─── Guardar ─────────────────────────────────────────────────────────────────
export async function saveCalibracion(data: calibracionDTO): Promise<void> {
  const { photoPrecintoAtual, photoPrecintoColocado, firma, sequencias, ...resto } = data;

  // 1. Datos escalares — sin fotos, siempre pequeños
  await AsyncStorage.setItem(K.base, JSON.stringify(resto));

  // 2. Fotos de precintos — cada una en su propia key
  await AsyncStorage.setItem(K.precintoAtual, photoPrecintoAtual ?? "");
  await AsyncStorage.setItem(K.precintoColocado, photoPrecintoColocado ?? "");

  // 3. Firma
  await AsyncStorage.setItem(K.firma, firma ?? "");

  // 4. Secuencias: metadata sin foto en una key, foto en otra
  await AsyncStorage.setItem(K.seqCount, String(sequencias.length));
  await Promise.all(
    sequencias.flatMap((seq, i) => [
      AsyncStorage.setItem(
        K.seqMeta(i),
        JSON.stringify({ valor_medicion: seq.valor_medicion, taxilitro: seq.taxilitro })
      ),
      AsyncStorage.setItem(K.seqFoto(i), seq.foto_medicion ?? ""),
    ])
  );
}

// ─── Leer ─────────────────────────────────────────────────────────────────────
export async function getStorageCalibracion(): Promise<calibracionDTO | null> {
  const base = await AsyncStorage.getItem(K.base);
  if (!base) return null;

  const photoPrecintoAtual   = (await AsyncStorage.getItem(K.precintoAtual))   ?? "";
  const photoPrecintoColocado = (await AsyncStorage.getItem(K.precintoColocado)) ?? "";
  const firma                = (await AsyncStorage.getItem(K.firma)) || null;

  const seqCount = Number((await AsyncStorage.getItem(K.seqCount)) ?? "0");
  const sequencias = await Promise.all(
    Array.from({ length: seqCount }, async (_, i) => {
      const meta = await AsyncStorage.getItem(K.seqMeta(i));
      const foto = (await AsyncStorage.getItem(K.seqFoto(i))) ?? "";
      const { valor_medicion, taxilitro } = meta ? JSON.parse(meta) : { valor_medicion: "", taxilitro: 0 };
      return { valor_medicion, foto_medicion: foto, taxilitro };
    })
  );

  return {
    ...JSON.parse(base),
    photoPrecintoAtual,
    photoPrecintoColocado,
    firma,
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
    K.seqCount,
    ...Array.from({ length: seqCount }, (_, i) => K.seqMeta(i)),
    ...Array.from({ length: seqCount }, (_, i) => K.seqFoto(i)),
  ];

  await AsyncStorage.multiRemove(keys);
}

// ─── ¿Hay datos guardados? ────────────────────────────────────────────────────
export async function hasCalibracionGuardada(): Promise<boolean> {
  const base = await AsyncStorage.getItem(K.base);
  return base !== null;
}