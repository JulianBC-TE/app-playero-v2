import { db } from "@/backend/db/client";
import { 
  tickets, 
  abastecimientos, 
  trapasos, 
  calibraciones, 
  turnos, 
  bodegas, 
  picos 
} from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { TurnoDTO } from "@/dto/TurnoDTO";
import * as FileSystem from "expo-file-system";
import { getLogsPorFecha, type LogResumen, type TipoLog, type AccionLog } from "../logs/logModule";

export type TipoRegistro = "salida" | "abastecimiento" | "traspaso" | "calibracion" | "turno" | "logs";

export interface ImagenDetalle {
  titulo: string;
  uri: string;
}

export interface CampoDetalle {
  label: string;
  value: string | number;
}

export interface RegistroResumen {
  id: string | number;
  datoPrincipal: string;
  datoSecundario: string;
  litros: string | number;
  hora: string;
  syncStatus: 1 | 0 | -1;
  camposDetalle?: CampoDetalle[];
  imagenes?: ImagenDetalle[];
}

// Convierte entradas de la BD (nombres de archivos, base64 o rutas) en URIs válidas para <Image />
function procesarImagenes(rawInput: any, titulo: string): ImagenDetalle[] {
  if (!rawInput) return [];

  // Desempaquetar arreglos o cadenas JSON anidadas
  const parsearInput = (input: any): string[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input.flatMap((item) => parsearInput(item));
    }
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          return parsearInput(parsed);
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    return [];
  };

  const imagenesArray = parsearInput(rawInput);

  return imagenesArray
    .map((str, index) => {
      // 1. Limpieza de saltos de línea y espacios invisibles
      const cleanStr = String(str).replace(/[\r\n\s]/g, "");
      if (!cleanStr) return null;

      let uriFinal = cleanStr;

      // 2. Si ya tiene esquema URI (http, https, file, content, data)
      if (
        cleanStr.startsWith("http://") || 
        cleanStr.startsWith("https://") || 
        cleanStr.startsWith("file://") || 
        cleanStr.startsWith("content://") ||
        cleanStr.startsWith("data:image/")
      ) {
        uriFinal = cleanStr;
      } 
      // 3. Si es una ruta REAL del sistema de archivos (Android/iOS)
      // Se excluyen explícitamente los Base64 de JPEG que empiezan con "/9j/" y cadenas largas
      else if (
        !cleanStr.startsWith("/9j/") && 
        cleanStr.length < 1000 &&
        (cleanStr.startsWith("/data/") || 
         cleanStr.startsWith("/storage/") || 
         cleanStr.startsWith("/var/") || 
         cleanStr.startsWith("/Users/") || 
         cleanStr.startsWith("/private/"))
      ) {
        uriFinal = `file://${cleanStr}`;
      } 
      // 4. Si es un nombre de archivo local corto (ej: foto.jpg)
      else if (cleanStr.includes(".") && cleanStr.length < 300 && !cleanStr.includes(";base64,")) {
        uriFinal = `${FileSystem.documentDirectory}${cleanStr}`;
      } 
      // 5. Cadena Base64 pura (incluyendo las fotos JPEG que empiezan con /9j/)
      else {
        const mimeType = cleanStr.startsWith("iVBORw") ? "image/png" : "image/jpeg";
        uriFinal = `data:${mimeType};base64,${cleanStr}`;
      }

      return {
        titulo: imagenesArray.length > 1 ? `${titulo} #${index + 1}` : titulo,
        uri: uriFinal,
      };
    })
    .filter((item): item is ImagenDetalle => item !== null);
}

function formatearFechaTurno(fechaRaw: number | null | undefined): string {
  if (!fechaRaw) return "";
  const fechaStr = String(fechaRaw);
  if (fechaStr.length >= 12) {
    const date = new Date(fechaRaw);
    if (!isNaN(date.getTime())) {
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      return `${date.getFullYear()}-${mes}-${dia}`;
    }
  }
  if (fechaStr.length === 8) {
    const anio = fechaStr.substring(0, 4);
    const mes = fechaStr.substring(4, 6);
    const dia = fechaStr.substring(6, 8);
    return `${anio}-${mes}-${dia}`;
  }
  return fechaStr;
}

export async function getRegistrosPorTipo(
  tipo: TipoRegistro, 
  fechaFiltro: string 
): Promise<RegistroResumen[]> {
  
  switch (tipo) {
    case "salida": {
      const res = await db
        .select({
          ticket: tickets,
          picoDesc: picos.descripcionPico
        })
        .from(tickets)
        .leftJoin(picos, eq(tickets.id_pico, picos.idPico))
        .where(eq(tickets.fecha, fechaFiltro));

      return res.map(({ ticket: t, picoDesc }) => {
        const imagenes: ImagenDetalle[] = [
          ...procesarImagenes(t.foto_chapa, "Foto Chapa"),
          ...procesarImagenes(t.firma_conductor, "Firma Conductor"),
          ...procesarImagenes(t.foto_kilometraje, "Foto Kilometraje"),
          ...procesarImagenes(t.foto_horometro, "Foto Horómetro"),
          ...procesarImagenes(t.foto_observaciones, "Foto Observaciones"),
          ...procesarImagenes(t.foto_taxilitro, "Taxímetro Inicial"),
          ...procesarImagenes(t.foto_taxilitro_fin, "Taxímetro Final"),
        ];

        return {
          id: t.idTicket,
          datoPrincipal: t.id_vehiculo ? `${t.id_vehiculo}` : "Vehículo No Identificado",
          datoSecundario: `${picoDesc || "S/D"} • ID: ${t.id_pico}`,
          litros: t.litros,
          hora: t.hora.substring(0, 5),
          syncStatus: t.sync as 1 | 0 | -1,
          camposDetalle: [
            { label: "ID Ticket", value: t.idTicket },
            { label: "Fecha y Hora", value: `${t.fecha} ${t.hora}` },
            { label: "Vehículo", value: t.id_vehiculo || "N/I" },
            { label: "RUC Cliente", value: t.ruc_cliente || "N/I" },
            { label: "Pico Surtidor", value: `${picoDesc || "S/D"} (ID: ${t.id_pico})` },
            { label: "CI Playero", value: t.ci_playero },
            { label: "ID Operador", value: t.id_operador },
            { label: "Litros Cargados", value: `${t.litros} L` },
            { label: "Monto", value: t.monto },
            { label: "Taxímetro Inicial", value: t.taxilitro_inicial },
            { label: "Taxímetro Final", value: t.taxilitro_final },
            { label: "Tipo Carga", value: t.tipo },
            { label: "Kilometraje", value: t.kilometraje ?? "N/A" },
            { label: "Horómetro", value: t.horometro ?? "N/A" },
            { label: "Ubicación Carga", value: t.ubicacion_carga || "N/A" },
            { label: "Observaciones", value: t.obs || t.observaciones_ticket || "Sin observaciones" },
          ],
          imagenes,
        };
      });
    }

    case "abastecimiento": {
      const res = await db
        .select({
          abastecimiento: abastecimientos,
          bodegaDesc: bodegas.descripcionBodega
        })
        .from(abastecimientos)
        .leftJoin(bodegas, eq(abastecimientos.idBod, bodegas.idBodega))
        .where(eq(abastecimientos.fecha, fechaFiltro));

      return res.map(({ abastecimiento: a, bodegaDesc }) => {
        const imagenes: ImagenDetalle[] = [
          ...procesarImagenes(a.fotoRevDocs, "Revisión Documentos"),
          ...procesarImagenes(a.fotoObsRepos, "Observaciones Reposición"),
          ...procesarImagenes(a.fotoTaxilitro, "Taxímetro Inicial"),
          ...procesarImagenes(a.fotoTaxilitroFin, "Taxímetro Final"),
        ];

        return {
          id: a.idAbastecimiento,
          datoPrincipal: `${bodegaDesc || "S/D"}`,
          datoSecundario: `Orden de Compra: ${a.nroOc} • Remisión: ${a.nroRemision}`,
          litros: a.litrosRemision,
          hora: a.hora.substring(0, 5),
          syncStatus: a.sync as 1 | 0 | -1,
          camposDetalle: [
            { label: "ID Abastecimiento", value: a.idAbastecimiento },
            { label: "Bodega", value: `${bodegaDesc || "S/D"} (ID: ${a.idBod})` },
            { label: "Fecha y Hora", value: `${a.fecha} ${a.hora}` },
            { label: "Nro. Orden Compra", value: a.nroOc },
            { label: "Nro. Remisión", value: a.nroRemision },
            { label: "Litros Remisión", value: `${a.litrosRemision} L` },
            { label: "CI Playero", value: a.playero },
            { label: "Zeta No Llega", value: a.zetaNoLlega === 1 ? "Sí" : "No" },
            { label: "Taxímetro Inicial", value: a.taxilitroInicial },
            { label: "Taxímetro Final", value: a.taxilitroFinal },
            { label: "Litros Zeta", value: `${a.litrosZeta} L` },
            { label: "Total Reposición", value: `${a.litrosTotalRepos} L` },
            { label: "Obs. Reposición", value: a.obsRepos || "Sin observaciones" },
          ],
          imagenes,
        };
      });
    }

    case "traspaso": {
      const res = await db
        .select({
          traspaso: trapasos,
          bodOrigenDesc: bodegas.descripcionBodega,
        })
        .from(trapasos)
        .leftJoin(bodegas, eq(trapasos.bodOrigen, bodegas.idBodega))
        .where(eq(trapasos.fecha, fechaFiltro));

      const bodegasCatalogo = await db.select().from(bodegas);
      const encontrarBodega = (id: number) => bodegasCatalogo.find(b => b.idBodega === id)?.descripcionBodega || "S/D";

      return res.map(({ traspaso: tr }) => {
        const descOrigen = encontrarBodega(tr.bodOrigen);
        const descDestino = encontrarBodega(tr.bodDestino);

        const imagenes: ImagenDetalle[] = [
          ...procesarImagenes(tr.fotoMedicionInicial, "Medición Inicial"),
          ...procesarImagenes(tr.fotoMedicionFinal, "Medición Final"),
          ...procesarImagenes(tr.firmaReceptor, "Firma Receptor"),
          ...procesarImagenes(tr.fotoObsTraspaso, "Foto Observaciones"),
          ...procesarImagenes(tr.fotoTaxilitro, "Taxímetro Inicial"),
          ...procesarImagenes(tr.fotoTaxilitroFin, "Taxímetro Final"),
        ];

        return {
          id: tr.idTrapaso,
          datoPrincipal: `${descDestino}`,
          datoSecundario: `${descOrigen}`,
          litros: tr.litrosPico,
          hora: tr.hora.substring(0, 5),
          syncStatus: tr.sync as 1 | 0 | -1,
          camposDetalle: [
            { label: "ID Traspaso", value: tr.idTrapaso },
            { label: "Fecha y Hora", value: `${tr.fecha} ${tr.hora}` },
            { label: "Bodega Origen", value: `${descOrigen} (ID: ${tr.bodOrigen})` },
            { label: "Bodega Destino", value: `${descDestino} (ID: ${tr.bodDestino})` },
            { label: "Tanque Destino", value: tr.idTanqueDestino },
            { label: "Regla Altura (Ini / Fin)", value: `${tr.reglaAlturaInicial} / ${tr.reglaAlturaFinal}` },
            { label: "Litros Tanque (Ini / Fin)", value: `${tr.litrosTanqueInicial} L / ${tr.litrosTanqueFinal} L` },
            { label: "Temperatura (Ini / Fin)", value: `${tr.tempInicial} °C / ${tr.tempFinal} °C` },
            { label: "ID Pico", value: tr.idPico },
            { label: "Taxímetro (Ini / Fin)", value: `${tr.taxilitroInicial} / ${tr.taxilitroFinal}` },
            { label: "Litros Pico", value: `${tr.litrosPico} L` },
            { label: "CI Playero", value: tr.idPlayero },
            { label: "Receptor", value: tr.idEncargadoReceptor },
            { label: "Autorizado Por", value: tr.idAutorizado || "N/I" },
            { label: "Obs. Traspaso", value: tr.obsTraspaso || "N/A" },
            { label: "Obs. Adicional", value: tr.obsAdicional || "N/A" },
          ],
          imagenes,
        };
      });
    }

    case "calibracion": {
      const res = await db.select().from(calibraciones);
      const bodegasCatalogo = await db.select().from(bodegas);
      const picosCatalogo = await db.select().from(picos);
      const encontrarPico = (id: number) => picosCatalogo.find(p => p.idPico === id)?.descripcionPico || "S/D";
      const encontrarBodega = (id: number) => bodegasCatalogo.find(b => b.idBodega === id)?.descripcionBodega || "S/D"; 
      
      return res
        .filter((c) => c.fechaHora.startsWith(fechaFiltro))
        .map((c) => {
          const descPico = encontrarPico(c.pico);
          const descBod = encontrarBodega(c.bodega);

          const imagenes: ImagenDetalle[] = [
            ...procesarImagenes(c.fotoPrecintoRetirado, "Precinto Retirado"),
            ...procesarImagenes(c.fotoPrecintoColocado, "Precinto Colocado"),
            ...procesarImagenes(c.firmaCalibrador, "Firma Calibrador"),
            ...procesarImagenes(c.fotoInicialTaxilitro, "Taxímetro Inicial"),
            ...procesarImagenes(c.fotoFinalTaxilitro, "Taxímetro Final"),
          ];

          return {
            id: c.idCalibracion,
            datoPrincipal: `${descPico}`,
            datoSecundario: `${c.nombreEncargado} • ${descBod}`,
            litros: c.taxilitroFinal - c.taxilitroInicial || "N/A",
            hora: c.hora.substring(0, 5),
            syncStatus: c.sync as 1 | 0 | -1,
            camposDetalle: [
              { label: "ID Calibración", value: c.idCalibracion },
              { label: "Fecha y Hora", value: `${c.fechaHora} ${c.hora}` },
              { label: "Bodega", value: `${descBod} (ID: ${c.bodega})` },
              { label: "Pico Surtidor", value: `${descPico} (ID: ${c.pico})` },
              { label: "Tipo Operación", value: c.tipoOperacion },
              { label: "Encargado", value: `${c.nombreEncargado} (CI: ${c.ciEncargado})` },
              { label: "Taxímetro Inicial", value: c.taxilitroInicial },
              { label: "Taxímetro Final", value: c.taxilitroFinal },
              { label: "Nro. Precinto Retirado", value: c.nroPrecintoRetirado || "N/A" },
              { label: "Nro. Precinto Colocado", value: c.nroPrecintoColocado || "N/A" },
              { label: "Obs. General", value: c.obsGral || "Sin observaciones" },
            ],
            imagenes,
          };
        });
    }

    case "turno": {
      const res = await db.select().from(turnos);
      const bodegasCatalogo = await db.select().from(bodegas);
      const encontrarBodega = (id: number) => bodegasCatalogo.find(b => b.idBodega === id)?.descripcionBodega || "S/D";

      return res
        .filter((tu) => formatearFechaTurno(tu.fecha) === fechaFiltro)
        .map((tu) => {
          let horaStr = "00:00";
          if (tu.hora !== null && tu.hora !== undefined) {
            const rawHora = Number(tu.hora);
            const horas = Math.floor(rawHora / 100);
            const minutos = rawHora % 100;
            horaStr = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
          }

          let litrosTurno: string | number = "—";
          if (tu.json) {
            try {
              const dtoParsed = JSON.parse(tu.json) as TurnoDTO;
              if (dtoParsed && dtoParsed.litros !== undefined) {
                litrosTurno = `${dtoParsed.litros.toLocaleString()} L`;
              }
            } catch (e) {
              console.log("No se pudo parsear el JSON del turno");
            }
          }

          const descBodega = encontrarBodega(tu.idBodega);
          const tipoTexto = tu.tipo === "1" ? "INICIO-TURNO" : tu.tipo === "2" ? "FIN-TURNO" : `${tu.tipo}`;
          const estadoTexto = `${tu.estado === 1 ? 'Activo' : 'Anulado'}`;

          return {
            id: tu.idTurno,
            datoPrincipal: descBodega, 
            datoSecundario: `${tipoTexto} • ${estadoTexto}`, 
            litros: litrosTurno,
            hora: horaStr,
            syncStatus: tu.sync as 1 | 0 | -1,
            rawHora: tu.hora,
            camposDetalle: [
              { label: "ID Turno", value: tu.idTurno },
              { label: "Bodega", value: `${descBodega} (ID: ${tu.idBodega})` },
              { label: "Tipo Turno", value: tipoTexto },
              { label: "Estado", value: estadoTexto },
              { label: "Fecha y Hora", value: `${formatearFechaTurno(tu.fecha)} ${horaStr}` },
              { label: "Litros Registrados", value: litrosTurno },
              { label: "Obs. Anulación", value: tu.observacionAnulacion || "N/A" },
            ],
            imagenes: [],
          };
        })
        .sort((a, b) => (b.rawHora || 0) - (a.rawHora || 0));
    }

    case "logs": {
      const logsData = await getLogsPorFecha(fechaFiltro);
      const tipoLabels: Record<TipoLog, string> = {
        salida: "Salida",
        traspaso: "Traspaso",
        calibracion: "Calibración",
        abastecimiento: "Abastecimiento",
        turno: "Turno",
        vehiculo: "Vehículo",
        persona: "Persona",
        cliente: "Cliente",
      };
      const accionLabels: Record<AccionLog, string> = {
        creacion: "creación",
        sync_ok: "sync_ok",
        sync_error: "sync_error",
      };

      return logsData.map((log) => ({
        id: log.id,
        datoPrincipal: `${tipoLabels[log.tipo]} #${log.registroId}`,
        datoSecundario: log.detalle || "",
        litros: "",
        hora: log.fecha.substring(11, 16),
        syncStatus: (log.accion === "sync_ok" ? 1 : log.accion === "sync_error" ? -1 : 0) as 1 | 0 | -1,
        camposDetalle: [
          { label: "Fecha", value: log.fecha },
          { label: "Tipo", value: tipoLabels[log.tipo] },
          { label: "Acción", value: accionLabels[log.accion] },
          { label: "ID Registro", value: log.registroId },
          { label: "Detalle", value: log.detalle || "N/A" },
        ],
        imagenes: [],
      }));
    }

    default:
      return [];
  }
}

export async function eliminarRegistroPorTipo(
  tipo: TipoRegistro, 
  id: string | number
): Promise<boolean> {
  try {
    const idNum = Number(id);
    switch (tipo) {
      case "salida":
        await db.delete(tickets).where(eq(tickets.idTicket, idNum));
        break;
      case "abastecimiento":
        await db.delete(abastecimientos).where(eq(abastecimientos.idAbastecimiento, idNum));
        break;
      case "traspaso":
        await db.delete(trapasos).where(eq(trapasos.idTrapaso, idNum));
        break;
      case "calibracion":
        await db.delete(calibraciones).where(eq(calibraciones.idCalibracion, idNum));
        break;
      case "turno":
        await db.delete(turnos).where(eq(turnos.idTurno, idNum));
        break;
    }
    return true;
  } catch (error) {
    console.error(`[ResumenBD] Error eliminando ${tipo} con ID ${id}:`, error);
    return false;
  }
}