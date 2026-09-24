import { getTraspasoQueue } from "@/storage/storageQueueTraspaso";
import { getSalidaQueue } from "@/storage/storageQueueSalida";
import { getAbastecimientoQueue } from "@/storage/storageQueueAbastecimiento";
import { getBodegaById } from "@DBmodules/bodegaDB";

export type ListaPendienteTipo = "traspaso" | "salida" | "abastecimiento";

export type BodegaPendienteResumen = {
  idBodega: number;
  descripcion: string;
  total: number;
};

export type ResumenLista = {
  lista: ListaPendienteTipo;
  total: number;
  bodegas: BodegaPendienteResumen[];
};

const LISTA_LABELS: Record<ListaPendienteTipo, string> = {
  traspaso: "Traspaso",
  salida: "Salida",
  abastecimiento: "Abastecimiento",
};

export function getListaLabel(lista: ListaPendienteTipo): string {
  return LISTA_LABELS[lista];
}

function normalizarIdBodega(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const id = Number(raw);
  if (Number.isNaN(id)) return null;
  return id;
}

async function resolverNombreBodega(id: number): Promise<string> {
  if (id === 0) return "Sin bodega";
  try {
    const bodega = await getBodegaById(id);
    return bodega?.descripcion_bodega ?? `Bodega #${id}`;
  } catch {
    return `Bodega #${id}`;
  }
}

/**
 * Construye el resumen de una lista.
 * `idsPorEntrada`: por cada entrada, las bodegas involucradas (0 = sin bodega).
 * `total` = cantidad de entradas; `bodegas` = agrupación por bodega.
 */
async function buildResumen(
  lista: ListaPendienteTipo,
  idsPorEntrada: (number | null)[][],
): Promise<ResumenLista | null> {
  if (idsPorEntrada.length === 0) return null;

  const counts = new Map<number, number>();

  for (const ids of idsPorEntrada) {
    const idsUnicos = new Set<number>();
    for (const raw of ids) {
      idsUnicos.add(raw ?? 0);
    }
    for (const id of idsUnicos) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const ids = [...counts.keys()];
  const nombres = await Promise.all(ids.map(resolverNombreBodega));

  const bodegas: BodegaPendienteResumen[] = ids
    .map((id, i) => ({
      idBodega: id,
      descripcion: nombres[i],
      total: counts.get(id) ?? 0,
    }))
    .sort((a, b) => a.idBodega - b.idBodega);

  return { lista, total: idsPorEntrada.length, bodegas };
}

/**
 * Lee las colas de Traspaso, Salida y Abastecimiento y devuelve un resumen
 * de las entradas pendientes agrupadas por bodega.
 * Solo incluye listas que tengan al menos una entrada.
 */
export async function getListasPendientes(): Promise<ResumenLista[]> {
  try {
    const [traspasos, salidas, abastecimientos] = await Promise.all([
      getTraspasoQueue(),
      getSalidaQueue(),
      getAbastecimientoQueue(),
    ]);

    const resumenes = await Promise.all([
      buildResumen(
        "traspaso",
        traspasos.map((e) => [
          normalizarIdBodega(e.data?.bod_origen),
          normalizarIdBodega(e.data?.bod_destino),
        ]),
      ),
      buildResumen(
        "salida",
        salidas.map((e) => [normalizarIdBodega(e.data?.selectedBodega)]),
      ),
      buildResumen(
        "abastecimiento",
        abastecimientos.map((e) => [
          normalizarIdBodega(e.data?.selectedBodega),
        ]),
      ),
    ]);

    return resumenes.filter((r): r is ResumenLista => r !== null);
  } catch (error) {
    console.log("[listasPendientesService] Error al leer listas:", error);
    return [];
  }
}

/** true si al menos una de las 3 listas tiene entradas pendientes. */
export async function hayListasPendientes(): Promise<boolean> {
  try {
    const [traspasos, salidas, abastecimientos] = await Promise.all([
      getTraspasoQueue(),
      getSalidaQueue(),
      getAbastecimientoQueue(),
    ]);
    return (
      traspasos.length > 0 || salidas.length > 0 || abastecimientos.length > 0
    );
  } catch (error) {
    console.log("[listasPendientesService] Error al verificar:", error);
    return false;
  }
}
