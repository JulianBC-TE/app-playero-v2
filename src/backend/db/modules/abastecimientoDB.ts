/**
 * Módulo de acceso a datos para abastecimientos (reposiciones de combustible).
 *
 * Los abastecimientos se crean offline con `sync = 0` y son enviados
 * al servidor por el proceso de sincronización.
 *
 * @module Playero/Backend/DB/Modules/Abastecimiento
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { abastecimientos, medicionesTanque, syncs } from "@/backend/db/schema";
import { eq, desc, inArray, or } from "drizzle-orm";
import { AbastecimientoDTO } from "@/dto/AbastecimientoDTO";
import { crearLog } from "../logs/logModule";

const SYNC_KEY = "__last_sync_abastecimientos__";

/**
 * Inserta un nuevo abastecimiento pendiente de sincronización y sus respectivas mediciones.
 * Utiliza una transacción para asegurar que todo se guarde correctamente o nada lo haga.
 *
 * @param dto - Datos del abastecimiento a guardar (aplanados, tal como definimos el DTO).
 * @returns ID generado por SQLite (`idAbastecimiento`).
 */
export async function saveAbastecimientoLocal(
  dto: AbastecimientoDTO,
): Promise<number> {
  const abastecimientoId = await db.transaction(async (tx) => {
    // 1. Insertar el registro principal en la tabla de abastecimientos
    //console.log(dto.foto_rev_docs);
    console.log(dto.foto_rev_docs[0].slice(0, 10));
    console.log("...", dto.foto_rev_docs[0].slice(-10));
    //console.log(dto.foto_obs_repos);
    //console.log(dto.foto_obs_repos.slice(0, 10));
    //console.log('...', dto.foto_obs_repos.slice(-10));
    const [result] = await tx
      .insert(abastecimientos)
      .values({
        tipo: "ABASTECIMIENTO",
        sync: 0,
        idSuc: dto.id_suc,
        idBod: dto.id_bod,
        fecha: dto.fecha,
        hora: dto.hora,
        nroOc: dto.nro_oc,
        nroRemision: dto.nro_remision,
        litrosRemision: dto.litros_remision,
        playero: dto.playero,
        fotoRevDocs: dto.foto_rev_docs,
        zetaNoLlega: dto.zeta_no_llega,
        idPicoParaZeta: dto.id_pico_para_zeta,
        taxilitroInicial: dto.taxilitro_inicial,
        taxilitroFinal: dto.taxilitro_final,
        litrosZeta: dto.litros_zeta,
        obsRepos: dto.obs_repos,
        fotoObsRepos: dto.foto_obs_repos,
        litrosTotalRepos: dto.litros_total_repos,
        fotoTaxilitro: dto.foto_taxilitro || "",
        fotoTaxilitroFin: dto.foto_taxilitro_fin || "",
      })
      .returning({ idInserted: abastecimientos.idAbastecimiento });

    const id = result?.idInserted;

    if (!id) {
      throw new Error("No se pudo obtener el ID del abastecimiento insertado");
    }

    // 2. Insertar las mediciones de tanque asociadas (si existen)
    if (
      Array.isArray(dto.mediciones_tanque) &&
      dto.mediciones_tanque.length > 0
    ) {
      const medicionesParaInsertar = dto.mediciones_tanque.map((med) => ({
        abastecimientoId: id,
        idTanque: med.id_tanque,
        inicioRegla: med.inicio.regla,
        inicioTemperatura: med.inicio.temperatura,
        inicioLitros: med.inicio.litros,
        inicioFotoMedicion: med.inicio.foto_medicion,
        finRegla: med.fin.regla,
        finTemperatura: med.fin.temperatura,
        finLitros: med.fin.litros,
        finFotoMedicion: med.fin.foto_medicion,
      }));

      await tx.insert(medicionesTanque).values(medicionesParaInsertar);
    }

    return id;
  });

  await crearLog({
    tipo: "abastecimiento",
    accion: "creacion",
    registroId: abastecimientoId,
    detalle: `${dto.litros_remision}L, OC: ${dto.nro_oc}`,
    payload: dto as any,
  });

  return abastecimientoId;
}

/**
 * Devuelve todos los abastecimientos que aún no han sido sincronizados (`sync = 0`),
 * mapeados uno a uno con la interfaz estricta de `AbastecimientoDTO`.
 * Incluye un campo `clave` alfanumérico para identificar de forma única cada abastecimiento.
 *
 * @returns Lista de abastecimientos con sus mediciones listas para el payload del backend.
 */
export async function getAbastecimientosPendientes(incluirErrores: boolean = false): Promise<
  AbastecimientoDTO[]
> {
  // 1. Consultar todos los abastecimientos pendientes de forma tradicional
  const filtro = incluirErrores
    ? or(eq(abastecimientos.sync, 0), eq(abastecimientos.sync, -1))
    : eq(abastecimientos.sync, 0);
  const rows = await db
    .select()
    .from(abastecimientos)
    .where(filtro)
    .orderBy(desc(abastecimientos.idAbastecimiento));
  if (rows.length === 0) {
    //console.log("⚪ ABASTECIMIENTO -> Nada pendiente para subir");
    return [];
  }

  // 2. Traer de golpe todas las mediciones asociadas a esos abastecimientos
  const ids = rows.map((r) => r.idAbastecimiento);

  // Usamos una consulta normal que TypeScript puede inferir perfectamente sin db.query
  const todasLasMediciones = await db
    .select()
    .from(medicionesTanque)
    .where(inArray(medicionesTanque.abastecimientoId, ids)); // 💡 Nota: Asegúrate de importar `inArray` de "drizzle-orm" arriba

  // 3. Re-mapeamos y unimos las relaciones de forma manual y segura
  return rows.map((r) => {
    // Filtrar las mediciones que pertenecen a este abastecimiento específico
    const misMediciones = todasLasMediciones.filter(
      (med) => med.abastecimientoId === r.idAbastecimiento,
    );

    // Construimos la clave en formato: "id_bodega-fecha-id_abastecimiento_local"
    const clave = `${r.idBod}-${r.fecha}-${r.hora}-${r.idAbastecimiento}`;
    // Dentro del return rows.map((r) => { ... })

    // Función auxiliar para asegurar que el frente envíe un Array real
    const normalizarArrayFotos = (campo: any): string[] => {
      if (Array.isArray(campo)) return campo;

      if (typeof campo === "string" && campo.trim() !== "") {
        let limpio = campo.trim();

        // Si el texto está envuelto en corchetes mal formados (ej: [/9j/4...])
        if (limpio.startsWith("[") && limpio.endsWith("]")) {
          // Le quitamos el primer y último carácter ([ y ])
          limpio = limpio.slice(1, -1).trim();

          // Si después de quitar corchetes quedó vacío, mandamos array vacío
          if (!limpio) return [];

          // Si empieza con comilla, es que SÍ era un JSON real válido.
          // Si no empieza con comilla, es tu Base64 crudo.
          if (!limpio.startsWith('"') && !limpio.startsWith("'")) {
            return [limpio]; // Lo envolvemos directamente en el array y listo
          }
        }

        // Respaldo por si en algún momento sí viene un JSON bien hecho
        try {
          const parsed = JSON.parse(campo);
          return Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          // Si todo lo demás falla, devolvemos el string original en un array
          return [campo];
        }
      }

      return [];
    };

    return {
      id_abastecimiento: r.idAbastecimiento,
      clave: clave,
      id_suc: r.idSuc,
      id_bod: r.idBod,
      fecha: r.fecha,
      hora: r.hora,
      nro_oc: r.nroOc,
      nro_remision: r.nroRemision,
      litros_remision: r.litrosRemision,
      playero: r.playero,

      // CORRECCIÓN AQUÍ: Garantizar un array legítimo de strings
      foto_rev_docs: normalizarArrayFotos(r.fotoRevDocs),

      zeta_no_llega: r.zetaNoLlega,
      id_pico_para_zeta: r.idPicoParaZeta,
      taxilitro_inicial: r.taxilitroInicial,
      taxilitro_final: r.taxilitroFinal,
      litros_zeta: r.litrosZeta,
      obs_repos: r.obsRepos,

      // CORRECCIÓN AQUÍ: Garantizar un array legítimo de strings
      foto_obs_repos: normalizarArrayFotos(r.fotoObsRepos),

      litros_total_repos: r.litrosTotalRepos,
      foto_taxilitro: r.fotoTaxilitro,
      foto_taxilitro_fin: r.fotoTaxilitroFin,
      mediciones_tanque: misMediciones.map((med) => ({
        id_tanque: med.idTanque,
        inicio: {
          regla: med.inicioRegla,
          temperatura: med.inicioTemperatura,
          litros: med.inicioLitros,
          foto_medicion: med.inicioFotoMedicion,
        },
        fin: {
          regla: med.finRegla,
          temperatura: med.finTemperatura,
          litros: med.finLitros,
          foto_medicion: med.finFotoMedicion,
        },
      })),
    };
  });
}

/*mediciones_tanque: misMediciones.map((med) => ({
        id_tanque: med.idTanque,
        inicio: {
          regla: med.inicioRegla,
          temperatura: med.inicioTemperatura,
          litros: med.inicioLitros,
          foto_medicion: med.inicioFotoMedicion,
        },
        fin: {
          regla: med.finRegla,
          temperatura: med.finTemperatura,
          litros: med.finLitros,
          foto_medicion: med.finFotoMedicion,
        },
      })), */

/**
 * Marca un abastecimiento como sincronizado con el servidor (`sync = 1`).
 *
 * @param id - ID del abastecimiento en la tabla local.
 */
export async function marcarAbastecimientoSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: 1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}

/**
 * Marca un abastecimiento con error de sincronización o listo para reintento (`sync = 0`).
 *
 * @param id - ID del abastecimiento en la tabla local.
 */
export async function marcarAbastecimientoErrorSync(id: number): Promise<void> {
  await db
    .update(abastecimientos)
    .set({ sync: -1 })
    .where(eq(abastecimientos.idAbastecimiento, id));
}

/**
 * Devuelve el timestamp de la última sincronización exitosa de abastecimientos.
 *
 * @returns Timestamp Unix en ms, o `null` si nunca se sincronizó.
 */
export async function getLastSyncDate(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, SYNC_KEY))
      .limit(1);

    return result[0] ? result[0].fecha : null;
  } catch {
    return null;
  }
}
