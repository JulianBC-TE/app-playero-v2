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
import { imprimirTurnosPorBodegaYFecha } from "./turnoBD";

export type TipoRegistro = "salida" | "abastecimiento" | "traspaso" | "calibracion" | "turno";

export interface RegistroResumen {
  id: string | number;
  datoPrincipal: string;   // Nombre de vehículo, bodega destino, pico, etc.
  datoSecundario: string;  // Detalles descriptivos adicionales
  litros: string | number; // Litros cargados/operados
  hora: string;            // HH:MM
  syncStatus: 1 | 0 | -1;
}

// Helper para unificar formatos de fecha de los turnos
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

      return res.map(({ ticket: t, picoDesc }) => ({
        id: t.idTicket,
        datoPrincipal: t.id_vehiculo ? `${t.id_vehiculo}` : "Vehículo No Identificado",
        datoSecundario: `${picoDesc || "S/D"} • ID: ${t.id_pico}`,
        litros: t.litros,
        hora: t.hora.substring(0, 5),
        syncStatus: t.sync as 1 | 0 | -1,
      }));
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

      return res.map(({ abastecimiento: a, bodegaDesc }) => ({
        id: a.idAbastecimiento,
        datoPrincipal: `${bodegaDesc || "S/D"}`,
        datoSecundario: `Orden de Compra: ${a.nroOc} • Remisión: ${a.nroRemision}`,
        litros: a.litrosRemision,
        hora: a.hora.substring(0, 5),
        syncStatus: a.sync as 1 | 0 | -1,
      }));
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

        return {
          id: tr.idTrapaso,
          datoPrincipal: `${descDestino}`,
          datoSecundario: `${descOrigen}`,
          litros: tr.litrosPico,
          hora: tr.hora.substring(0, 5),
          syncStatus: tr.sync as 1 | 0 | -1,
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
          return {
            id: c.idCalibracion,
            datoPrincipal: `${descPico}`,
            datoSecundario: `${c.nombreEncargado} • ${descBod}`,
            litros: c.taxilitroFinal - c.taxilitroInicial || "N/A",
            hora: c.hora.substring(0, 5),
            syncStatus: c.sync as 1 | 0 | -1,
          };
        });
    }

    case "turno": {
      const res = await db.select().from(turnos);
      const bodegasCatalogo = await db.select().from(bodegas);
      const encontrarBodega = (id: number) => bodegasCatalogo.find(b => b.idBodega === id)?.descripcionBodega || "S/D";
      console.log(fechaFiltro);
      imprimirTurnosPorBodegaYFecha(15, fechaFiltro);
      imprimirTurnosPorBodegaYFecha(16, fechaFiltro);

      return res
        .filter((tu) => formatearFechaTurno(tu.fecha) === fechaFiltro)
        .map((tu) => {
          // Corrección matemática limpia de la hora guardada como entero HHMM (ej: 915 -> 09:15)
          let horaStr = "00:00";
          if (tu.hora !== null && tu.hora !== undefined) {
            const rawHora = Number(tu.hora);
            const horas = Math.floor(rawHora / 100);
            const minutos = rawHora % 100;
            horaStr = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
          }

          // Extracción opcional de los litros reales guardados en el JSON local
          let litrosTurno: string | number = "—";
          if (tu.json) {
            try {
              const dtoParsed = JSON.parse(tu.json) as TurnoDTO;
              if (dtoParsed && dtoParsed.litros !== undefined) {
                litrosTurno = `${dtoParsed.litros.toLocaleString()} L`;
              }
            } catch (e) {
              console.log("No se pudo parsear el JSON del turno para extraer litros resumen");
            }
          }

          const descBodega = encontrarBodega(tu.idBodega);
          const tipoTexto = tu.tipo === "1" ? "INICIO-TURNO" : tu.tipo === "2" ? "FIN-TURNO" : `${tu.tipo}`;
          const estadoTexto = `${tu.estado === 1 ? '' : '• Anulado'}`;

          return {
            id: tu.idTurno,
            datoPrincipal: descBodega, 
            datoSecundario: `${tipoTexto}${estadoTexto}`, 
            litros: litrosTurno,
            hora: horaStr,
            syncStatus: tu.sync as 1 | 0 | -1,
            rawHora: tu.hora 
          };
        })
        .sort((a, b) => (b.rawHora || 0) - (a.rawHora || 0));
    }
    default:
      return [];
  }
}