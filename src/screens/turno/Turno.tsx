import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StackRoutesProps } from "@/route/app.routes";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppContext } from "@/hooks/useAppContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { SavingModal } from "@/components/SavingModal";
import { useSavingModal } from "@/hooks/useSavingModal";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";
import { PicoDTO } from "@/dto/PicosDTO";

import { RulerDimensionLine, CheckCheck } from "lucide-react-native";
import { AppError } from "@/utils/AppError";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Photo } from "@/components/Photo";
import {
  crearTurnoLocal,
  getTurnoStatusLocal,
  cerrarTurnoAnteriorAutomatico,
} from "@DBmodules/turnoBD";
import { getBodegaById, getBodegasDelUsuario } from "@DBmodules/bodegaDB";
import { getPicosByBodega } from "@DBmodules/picoDB";
import {
  normalizarFecha,
  TurnoStatus,
} from "@/backend/db/services/turnoStatusService";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";
import { getTimestamp } from "@/services/timeService";
import {
  getListasPendientes,
  getListaLabel,
  hayListasPendientes,
  ResumenLista,
} from "@/services/listasPendientesService";

interface SesionLocalType {
  cedula: number;
  id_sucursal: number;
  descripcion_sucursal: string;
}

export function Turno({ navigation, route }: StackRoutesProps<"turno">) {
  const [isLoading, setIsLoading] = useState(false);
  const savingModal = useSavingModal();
  const [faltaAnterior, setFaltaAnterior] = useState(false);
  const [imagenPrevisualizada, setImagenPrevisualizada] = useState<{
    idPico: number;
    idx: number;
    uri: string;
  } | null>(null);
  const [listaBodegasFaltaAnterior, setListaBodegasFaltaAnterior] = useState<
    BodegaDTO[]
  >([]);
  // Guarda Caso A: overlay no descartable cuando hay cierre de hoy pendiente + entradas en listas
  const [bloqueoListas, setBloqueoListas] = useState<ResumenLista[] | null>(
    null,
  );
  // Caso B: resumen de listas a mostrar dentro del modal "Turno no Cerrado"
  const [resumenListasFaltaAnterior, setResumenListasFaltaAnterior] = useState<
    ResumenLista[]
  >([]);
  const [turnoStatusOriginal, setTurnoStatusOriginal] =
    useState<StatusTurnoDTO | null>(null);
  const [inicioTurno, setInicioTurno] = useState(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [obsAdicional, setObsAdicional] = useState("");
  const [selectedBodega, setSelectedBodega] = useState("");
  const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
  const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
  const [picosList, setPicosList] = useState<PicoDTO[]>([]);

  const [blockHeader, setBlockHeader] = useState(false);
  const [taxilitros, setTaxilitros] = useState<Record<number, string>>({});
  const insets = useSafeAreaInsets();
  const { syncCompleteCounter } = useAppContext();

  // ◄ NUEVO: Almacena un array de fotos Base64 indexado por el id_pico
  const [fotosPicos, setFotosPicos] = useState<Record<number, string[]>>({});

  const [sesionLocal, setSesionLocal] = useState<SesionLocalType | null>(null);

  // ---------------------------------------------------------------------------
  // handlePhotoCapture y removerFoto (Observación General)
  // ---------------------------------------------------------------------------
  async function handlePhotoCapture(base64: string) {
    setBase64Images((prev) => [...prev, base64]);
  }

  const removerFoto = (indexParaRemover: number) => {
    Alert.alert("Apagar Foto", "Está seguro de que desea eliminar esta foto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        onPress: () => {
          setBase64Images((prev) =>
            prev.filter((_, index) => index !== indexParaRemover),
          );
        },
      },
    ]);
  };

  // ---------------------------------------------------------------------------
  // ◄ NUEVO: Funciones para fotos por Pico individual
  // ---------------------------------------------------------------------------
  const handlePicoPhotoCapture = (idPico: number, base64: string) => {
    setFotosPicos((prev) => {
      const fotosActuales = prev[idPico] || [];
      return {
        ...prev,
        [idPico]: [...fotosActuales, base64],
      };
    });
  };

  const removerFotoPico = (idPico: number, indexParaRemover: number) => {
    Alert.alert(
      "Eliminar Foto",
      "Está seguro de que desea eliminar la foto de este taxilitro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          onPress: () => {
            setFotosPicos((prev) => {
              const fotosActuales = prev[idPico] || [];
              return {
                ...prev,
                [idPico]: fotosActuales.filter(
                  (_, index) => index !== indexParaRemover,
                ),
              };
            });
          },
        },
      ],
    );
  };

 const handleBodegaChange = useCallback(async (idBodega: string) => {
  setSelectedBodega(idBodega);
  setTaxilitros({});
  setFotosPicos({}); 
  
  if (idBodega) {
    const idNum = Number(idBodega);
    const picos = await getPicosByBodega(idNum);
    setPicosList(picos);

    // 💡 CAMBIO: Evaluar individualmente la bodega seleccionada en el momento
    if (turnoStatusOriginal?.Inicio_turno?.falta.includes(idNum)) {
      setInicioTurno(true);  // Requiere abrir
    } else if (turnoStatusOriginal?.Fin_turno?.falta.includes(idNum)) {
      setInicioTurno(false); // Requiere cerrar
    }
  } else {
    setPicosList([]);
  }
}, [turnoStatusOriginal]); // No olvides agregar turnoStatusOriginal a las dependencias

  // ---------------------------------------------------------------------------
  // procesarTurno
  // ---------------------------------------------------------------------------
  async function procesarTurno() {
    setIsLoading(true);
    if (!sesionLocal) {
      Alert.alert(
        "Error de sesión", 
        "No se encontró información del usuario activo localmente.", 
      );
      setIsLoading(false);
      return;
    }

    if (medicion.length === 0) {
      Alert.alert(
        "Medición requerida",
        "Debe realizar las mediciones de tanque antes de procesar el turno.",
      );
      setIsLoading(false);
      return;
    }
    console.log(medicion);

    // Guarda de refuerzo: no permitir CERRAR turno con cierre de hoy pendiente
    // y entradas en las listas (aunque el overlay ya lo bloquee al entrar).
    if (
      !inicioTurno &&
      !faltaAnterior &&
      (turnoStatusOriginal?.Fin_turno?.falta?.length ?? 0) > 0
    ) {
      const conListas = await hayListasPendientes();
      if (conListas) {
        Alert.alert(
          "Listas pendientes",
          "No se puede cerrar el turno mientras hay entradas pendientes en las listas. Guarde o procese las listas primero.",
        );
        setIsLoading(false);
        return;
      }
    }

    const taxilitrosFaltantes = picosList.filter(
      (p) => !taxilitros[p.id_pico] || taxilitros[p.id_pico].trim() === "",
    );
    if (taxilitrosFaltantes.length > 0) {
      Alert.alert(
        "Taxilitros requeridos",
        `Faltan taxilitros para: ${taxilitrosFaltantes.map((p) => p.descripcion_pico).join(", ")}`,
      );
      setIsLoading(false);
      return;
    }

    // ◄ NUEVO VALIDADOR OPCIONAL: Validar que cada pico tenga al menos una foto (si lo consideras obligatorio)
    const fotosFaltantes = picosList.filter(
      (p) => !fotosPicos[p.id_pico] || fotosPicos[p.id_pico].length === 0,
    );
    if (fotosFaltantes.length > 0) {
      Alert.alert(
        "Fotos requeridas",
        `Debe capturar al menos una foto del taxilitro para: ${fotosFaltantes.map((p) => p.descripcion_pico).join(", ")}`,
      );
      setIsLoading(false);
      return;
    }

    try {
      const resultadosTotalizadores = picosList.map((pico) => ({
        pico: pico.id_pico,
        totalizador: Number(taxilitros[pico.id_pico]),
        fotos: fotosPicos[pico.id_pico] || [], // ◄ NUEVO: Extrae el array de fotos del estado
      }));

      const secureTime = await getTimestamp();
      const now = new Date(secureTime.timestampMs);
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8);

      const totalizadorLitros = medicion.reduce(
        (acc, cur) => acc + (cur.litros ?? 0),
        0,
      );

      const nuevoTurno: TurnoDTO = {
        id_suc: Number(sesionLocal.id_sucursal),
        id_bod: Number(selectedBodega),
        fecha,
        hora,
        ci_playero: Number(sesionLocal.cedula),
        litros: totalizadorLitros,
        observacion: obs,
        fotos_observacion: base64Images,
        med_tanques: medicion,
        med_picos: resultadosTotalizadores.map((result) => ({
          id_pico: result.pico,
          taxilitro: result.totalizador,
          foto_taxilitro: result.fotos, // ◄ NUEVO: Se adjunta al payload mapeado
        })),
      };

      // ✨ NUEVO: Detección y Cierre Automático si aplica
      const esBodegaConFaltaAnterior =
        turnoStatusOriginal?.Fin_turno_anterior?.falta.includes(
          Number(selectedBodega),
        );

      if (esBodegaConFaltaAnterior) {
        console.log(
          `⚠️ Detectada falta anterior para bodega ${selectedBodega}. Insertando FIN-TURNO automático...`,
        );
        const anterior = await cerrarTurnoAnteriorAutomatico({
          idBodega: Number(selectedBodega),
          dtoAperturaActual: nuevoTurno,
          observacionMotivo: obsAdicional, // El motivo que escribió en el modal inicial
        });
        console.log("fecha cerrada automaticamente", anterior);
      }

      // Proceso normal de inserción del nuevo turno (el INICIO-TURNO de hoy)
      // Generamos el entero YYYYMMDD consistente con el backend y las consultas locales
      const fechaEnteroLocal = parseInt(fecha.replace(/-/g, ""), 10); // Ej: 20260703
      const horaEnteroLocal = now.getHours() * 100 + now.getMinutes();
      // Proceso normal de inserción del nuevo turno
      console.log("turno cargado",inicioTurno, "fecha", fechaEnteroLocal)
      await crearTurnoLocal({
        idBodega: Number(selectedBodega),
        dto: nuevoTurno,
        tipo: inicioTurno ? 1 : 2, // ◄ CAMBIO: 1 abierto, 2 cerrado
        estado: 1,
        fecha: fechaEnteroLocal, // 🚀 Ahora es idéntico al formato del backend
        hora: horaEnteroLocal, // Guardará HHMM como entero
      });

      toastSuccess(
        "Turno processed",
        `El turno ha sido ${inicioTurno ? "iniciado" : "cerrado"} con éxito.`,
      );

      const remainBodegas = bodegas.filter(
        (bodega) => Number(bodega.id_bodega) !== Number(selectedBodega),
      );
      setBodegas(remainBodegas);

      setBlockHeader(true);
      setSelectedBodega("");
      setPicosList([]);
      setTaxilitros({});
      setFotosPicos({}); // ◄ NUEVO: Limpieza post-proceso
      setObs("");
      setBase64Images([]);
      setMedicion([]);

      if (remainBodegas.length === 0) {
        toastSuccess(
          "Abertura de Turnos",
          "Todos los turnos han sido procesados.",
        );
        navigation.navigate("home");
      }
    } catch (error) {
      console.log("Error al procesar turno:", error);
      const isAppError = error instanceof AppError;
      const message = isAppError
        ? error.message
        : "No se pudo procesar el turno";
      toastError("Error al procesar turno", message);
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (route.params?.onMedicion) {
      setMedicion(route.params.onMedicion);
      navigation.setParams({ onMedicion: undefined });
    }
  }, [route.params?.onMedicion]);

  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;
    async function inicializarPantalla() {
      try {
        setIsLoading(true);
        const datosSesion = await getSucursalUsuarioActivoLocal();

        if (!datosSesion || !datosSesion.idSucursal) {
          toastError(
            "Error de sesión",
            "No se encontró el usuario o sucursal activa localmente.",
          );
          setIsLoading(false);
          return;
        }

        const sesionFormateada: SesionLocalType = {
          cedula: Number((datosSesion as any).cedula ?? 0),
          id_sucursal: Number(datosSesion.idSucursal),
          descripcion_sucursal: datosSesion.descripcionSucursal,
        };

        setSesionLocal(sesionFormateada);
        await cargarDatosTurno(
          sesionFormateada.id_sucursal,
          sesionFormateada.cedula,
        );
      } catch (error) {
        console.error("Error inicializando turno:", error);
        toastError("Error", "No se pudieron inicializar los datos locales.");
      } finally {
        setIsLoading(false);
      }
    }

    inicializarPantalla();
  }, []);

  // ─── Refresco al ganar foco: sesión (sucursal) + bodegas ───────────────────
  // La sesión siempre se relee de la BD local (ahí queda la sucursal que bajó
  // el sync). El listado de bodegas solo se recalcula si el formulario está en
  // reposo, para no pisar una selección en curso; salvo que un sync de catálogos
  // haya terminado, en cuyo caso se recarga siempre (la selección inválida la
  // limpia el useEffect de más abajo).
  const primerRefreshRef = useRef(true);
  const syncCounterAnteriorRef = useRef(syncCompleteCounter);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;

      async function refrescar() {
        try {
          const datosSesion = await getSucursalUsuarioActivoLocal();
          if (cancelado || !datosSesion || !datosSesion.idSucursal) return;

          const nuevaSesion: SesionLocalType = {
            cedula: Number((datosSesion as any).cedula ?? 0),
            id_sucursal: Number(datosSesion.idSucursal),
            descripcion_sucursal: datosSesion.descripcionSucursal,
          };

          setSesionLocal((prev) =>
            prev &&
            prev.id_sucursal === nuevaSesion.id_sucursal &&
            prev.cedula === nuevaSesion.cedula
              ? prev
              : nuevaSesion,
          );

          const esPrimerFoco = primerRefreshRef.current;
          primerRefreshRef.current = false;
          if (esPrimerFoco) return; // ya lo cargó el init

          const syncNuevo =
            syncCounterAnteriorRef.current !== syncCompleteCounter;
          syncCounterAnteriorRef.current = syncCompleteCounter;

          if (
            syncNuevo ||
            (!selectedBodega && !faltaAnterior && !bloqueoListas)
          ) {
            await cargarDatosTurno(
              nuevaSesion.id_sucursal,
              nuevaSesion.cedula,
            );
          }
        } catch (error) {
          console.error("[Turno] Error al refrescar sesión/bodegas:", error);
        }
      }

      refrescar();

      return () => {
        cancelado = true;
      };
    }, [selectedBodega, faltaAnterior, bloqueoListas, syncCompleteCounter]),
  );

  // Si la bodega seleccionada ya no está en la lista del turno, se limpia.
  useEffect(() => {
    if (!selectedBodega || bodegas.length === 0) return;
    const sigueAsignada = bodegas.some(
      (b) => Number(b.id_bodega) === Number(selectedBodega),
    );
    if (!sigueAsignada) setSelectedBodega("");
  }, [bodegas, selectedBodega]);

  async function cargarDatosTurno(idSucursal: number, cedula: number) {
    try {
      const data = await getTurnoStatusLocal(cedula);

      const turnoData: StatusTurnoDTO = {
        status: data.status as TurnoStatus,
        Inicio_turno: data.Inicio_turno,
        Fin_turno: data.Fin_turno,
        Fin_turno_anterior: data.Fin_turno_anterior,
      };
      setTurnoStatusOriginal(turnoData);

      // Resumen de entradas pendientes en listas (traspaso, salida, abastecimiento)
      const resumenListas = await getListasPendientes();

      // Obtener el universo total de bodegas que tiene asignadas el usuario
      const bodegasDelUsuario = await getBodegasDelUsuario(cedula);
      if (!bodegasDelUsuario) return;

      // 1. Manejo específico si hay turnos colgados del día anterior
      if (turnoData.status === "falta_anterior") {
        setListaBodegasFaltaAnterior([]);
        const bodegasFaltantes: BodegaDTO[] = [];

        for (const idBodega of turnoData.Fin_turno_anterior.falta) {
          const bodegaData = await getBodegaById(idBodega);
          if (bodegaData) {
            bodegasFaltantes.push(bodegaData);
          }
        }

        setListaBodegasFaltaAnterior(bodegasFaltantes);
        setResumenListasFaltaAnterior(resumenListas);
        setFaltaAnterior(true);

        // ✨ MODIFICACIÓN: Inyectamos las bodegas y pedimos la APERTURA (Inicio de turno)
        setBodegas(bodegasFaltantes);
        setInicioTurno(true);
        return;
      }

      // 1b. Guarda Caso A: cierre de HOY pendiente + entradas en alguna lista
      //     → overlay no descartable (el usuario debe guardar las listas primero)
      const cierreHoyPendiente = turnoData.Fin_turno?.falta?.length > 0;
      if (cierreHoyPendiente && resumenListas.length > 0) {
        setBloqueoListas(resumenListas);
        return;
      }

      // 2. Flujo normal (Día limpio o turnos del día corriente)
      const listaFaltaInicio = turnoData.Inicio_turno?.falta || [];
      let listaFaltaFin:number[] = [];
      if(turnoData.status != "falta_inicio"){listaFaltaFin = turnoData.Fin_turno?.falta || []}
      console.log(listaFaltaInicio)

      let bodegasFiltradas = bodegasDelUsuario.filter((bodega) => {
        const idNumerico = Number(bodega.id_bodega);
        return (
          listaFaltaInicio.includes(idNumerico) ||
          listaFaltaFin.includes(idNumerico)
        );
      });

      if (bodegasFiltradas.length === 0) {
        bodegasFiltradas = bodegasDelUsuario;
      }

      setBodegas(bodegasFiltradas);

      if (bodegasFiltradas.length === 1) {
        const unicaBodegaId = Number(bodegasFiltradas[0].id_bodega);

        if (listaFaltaInicio.includes(unicaBodegaId)) {
          setInicioTurno(true);
        } else if (listaFaltaFin.includes(unicaBodegaId)) {
          setInicioTurno(false);
        } else {
          const estadoCierre =
            turnoData.status === "iniciado" ||
            turnoData.status === "falta_cerrar";
          setInicioTurno(!estadoCierre);
        }
      }
    } catch (error) {
      console.error(`❌ ERROR CRÍTICO en cargarDatosTurno: ${error}`, error);
    }
  }

  // ─── Render: bloqueo por listas pendientes (Caso A — mismo día) ────────────
  if (!faltaAnterior && bloqueoListas) {
    return (
      <View className="flex-1">
        <SavingModal
          visible={savingModal.visible}
          message="Procesando turno..."
        />
        <ScreenHeader title="Listas Pendientes" />
        <View style={styles.overlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
              Importante!!!
            </Text>
            <Text className="font-medium text-justify text-xl mb-4">
              No se puede cerrar el turno mientras hayan bodegas con entradas
              pendientes en las listas y cierre del día sin realizar. Guarde o
              procese las siguientes listas:
            </Text>

            {bloqueoListas.map((resumen) => (
              <View key={resumen.lista} className="mb-3">
                <Text className="font-bold text-lg">
                  {getListaLabel(resumen.lista)} ({resumen.total}{" "}
                  {resumen.total === 1 ? "entrada" : "entradas"})
                </Text>
                {resumen.bodegas.map((b) => (
                  <Text
                    key={`${resumen.lista}-${b.idBodega}`}
                    className="font-medium text-base ml-3"
                  >
                    - {b.descripcion} ({b.total}{" "}
                    {b.total === 1 ? "entrada" : "entradas"})
                  </Text>
                ))}
              </View>
            ))}

            <Text className="font-medium text-justify text-xl mb-4">
              Obs: una vez guardadas las listas, regrese al apartado Turno para
              realizar el cierre.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("home")}
            >
              <Text style={styles.buttonText}>Volver al inicio</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  }

  return faltaAnterior ? (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Procesando turno..."
      />
      <ScreenHeader title="Turno no Cerrado" />
      <View style={styles.overlay}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
            Importante!!!
          </Text>
          <Text className="font-medium text-justify text-xl mb-4">
            En la fecha anterior no se registró el cierre de turno. Favor
            indique el motivo por el cual no se realizó el cierre de:
          </Text>

          {listaBodegasFaltaAnterior.map((bodega) => (
            <Text
              key={bodega.id_bodega}
              className="font-medium text-justify text-xl mb-2 ml-2"
            >
              - {bodega.descripcion_bodega}
            </Text>
          ))}

          {resumenListasFaltaAnterior.length > 0 && (
            <View className="mb-4 mt-2 border-t border-gray-300 pt-3">
              <Text className="font-bold text-red-600 text-lg mb-2">
                Listas con entradas pendientes:
              </Text>
              {resumenListasFaltaAnterior.map((resumen) => (
                <View key={resumen.lista} className="mb-2">
                  <Text className="font-bold text-base">
                    {getListaLabel(resumen.lista)} ({resumen.total}{" "}
                    {resumen.total === 1 ? "entrada" : "entradas"})
                  </Text>
                  {resumen.bodegas.map((b) => (
                    <Text
                      key={`${resumen.lista}-${b.idBodega}`}
                      className="font-medium text-base ml-3"
                    >
                      - {b.descripcion} ({b.total}{" "}
                      {b.total === 1 ? "entrada" : "entradas"})
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <InputCard
            className="min-h-40 mt-4"
            title="Indique el motivo"
            required
          >
            <Input
              value={obsAdicional}
              placeholder="Describa el motivo"
              multiline
              numberOfLines={4}
              onChangeText={setObsAdicional}
            />
          </InputCard>
          <Text></Text>
          <Text className="font-medium text-justify text-xl mb-4">
            Obs: los datos ingresados en este inicio de turno se tomaran como
            cierre de turno del día faltante.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (obsAdicional.trim() === "") {
                Alert.alert(
                  "Motivo requerido",
                  "Por favor describa el motivo.",
                );
                return;
              }
              setFaltaAnterior(false);
            }}
          >
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  ) : (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Procesando turno..."
      />
      <ScreenHeader
        title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
        disableBackButton={blockHeader}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center", paddingBottom: insets.bottom + 40  }}
        showsVerticalScrollIndicator={false}
      >
        {/* Selección de bodega */}
        <InputCard title="Bodega" required>
          <Select
            data={bodegas}
            isLoading={isLoading}
            selectedValue={selectedBodega}
            setSelectedValue={handleBodegaChange}
            labelField="descripcion_bodega"
            valueField="id_bodega"
          />
        </InputCard>

        {/* Medición de tanque */}
        <InputCard title="Medición de Tanque" required>
          <Button
            disabled={selectedBodega === ""}
            title="Medir"
            icon={medicion?.length > 0 ? CheckCheck : RulerDimensionLine}
            iconColor={medicion?.length > 0 ? "#0af706" : "#000"}
            iconSize="md"
            onPress={() => {
              if (medicion?.length > 0) {
                console.log(medicion);
                Alert.alert(
                  "Medición existente",
                  "Ya hay una medición inicial cargada. ¿Desea continuar?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Continuar",
                      onPress: () => {
                        navigation.navigate("medicion", {
                          fromScreen: "turno",
                          idBodega: selectedBodega,
                        });
                      },
                    },
                  ],
                );
              } else {
                navigation.navigate("medicion", {
                  idBodega: selectedBodega,
                  fromScreen: "turno",
                });
              }
            }}
          />
        </InputCard>

        {/* Taxilitros por pico — ingreso con estilo unificado de InputCard */}
        {picosList.length > 0 && (
          <View className="w-full gap-4">
            {picosList.map((pico) => {
              const fotosDelPico = fotosPicos[pico.id_pico] || [];
              const tieneFoto = fotosDelPico.length > 0;

              return (
                <InputCard
                  key={pico.id_pico}
                  title={pico.descripcion_pico}
                  required
                  className="pb-4"
                >
                  {/* Cuerpo del Formulario del Pico */}
                  <View className="w-full gap-2 mt-2">
                    <View className="flex-row items-center gap-3 w-full">
                      {/* Input Numérico */}
                      <View className="flex-1">
                        <Input
                          keyboardType="numeric"
                          placeholder="Ingrese taxilitro"
                          value={taxilitros[pico.id_pico] ?? ""}
                          onChangeText={(val) =>
                            setTaxilitros((prev) => ({
                              ...prev,
                              [pico.id_pico]: val,
                            }))
                          }
                          editable={!isLoading}
                        />
                      </View>

                      {/* Botón de captura de foto estilo Icono e indicador de Estado */}
                      <View className="flex-row items-center gap-1">
                        <Photo
                          form="button"
                          iconSize="xl"
                          iconColor={tieneFoto ? "#059669" : "#ffffff"}
                          setImage={(base64) =>
                            handlePicoPhotoCapture(pico.id_pico, base64)
                          }
                          disabled={isLoading}
                        />
                      </View>
                    </View>

                    {/* Carrusel Horizontal de Previsualización (Solo si tiene fotos) */}
                    {tieneFoto && (
                      <View className="mt-2 pt-2 border-t border-gray-200/50 w-full">
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {fotosDelPico.map((img, idx) => {
                            const imageUri = `data:image/jpeg;base64,${img}`;
                            return (
                              <Pressable
                                key={idx}
                                // ◄ MODIFICADO: Al presionar, abre la imagen en pantalla completa asignando el estado
                                onPress={() =>
                                  setImagenPrevisualizada({
                                    idPico: pico.id_pico,
                                    idx,
                                    uri: imageUri,
                                  })
                                }
                                style={{ marginRight: 8 }}
                              >
                                <Image
                                  source={{ uri: imageUri }}
                                  className="w-24 h-16 rounded-md border border-gray-300"
                                  resizeMode="cover"
                                />
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </InputCard>
              );
            })}

            {/* ◄ NUEVO: Modal de Previsualización a Pantalla Completa */}
            <Modal
              visible={imagenPrevisualizada !== null}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setImagenPrevisualizada(null)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.9)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {imagenPrevisualizada && (
                  <View className="w-full h-full justify-between p-6">
                    {/* Botón superior para simplemente cerrar la vista */}
                    <View className="flex-row justify-end mt-6">
                      <TouchableOpacity
                        className="bg-gray-800/80 px-4 py-2 rounded-full"
                        onPress={() => setImagenPrevisualizada(null)}
                      >
                        <Text className="text-white font-bold text-sm">
                          Cerrar
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Imagen en tamaño grande */}
                    <View className="flex-1 justify-center items-center">
                      <Image
                        source={{ uri: imagenPrevisualizada.uri }}
                        className="w-full h-3/4 rounded-lg"
                        resizeMode="contain"
                      />
                    </View>

                    {/* Acciones inferiores: Eliminar Foto */}
                    <View className="flex-row gap-4 mb-6">
                      <TouchableOpacity
                        className="flex-1 bg-red-600 py-3.5 rounded-xl items-center justify-center"
                        onPress={() => {
                          const { idPico, idx } = imagenPrevisualizada;
                          // Cerramos el modal primero
                          setImagenPrevisualizada(null);
                          // Ejecutamos tu función de eliminación existente
                          removerFotoPico(idPico, idx);
                        }}
                      >
                        <Text className="text-white font-bold text-base">
                          Eliminar Foto
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </Modal>
          </View>
        )}

        {/* Observaciones */}
        <InputCard title="Observaciones" className="min-h-40">
          <Input
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="ml-2"
            value={obs}
            onChangeText={setObs}
            placeholder="Observaciones de la medicion"
          />
        </InputCard>

        {/* Fotos de Observación General */}
        <InputCard title="Fotos de Observación General" className="min-h-64">
          <View className="w-full items-center p-4 gap-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {base64Images.map((img, index) => (
                <Pressable key={index} onPress={() => removerFoto(index)}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${img}` }}
                    className="mr-4 w-56 h-36 rounded-lg border border-gray-300"
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
            <Photo
              form="button"
              iconSize="lg"
              setImage={handlePhotoCapture}
              isLoading={isLoading}
            />
          </View>
        </InputCard>

        <Button
          isLoading={isLoading}
          onPress={() => savingModal.run(procesarTurno)}
          title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
  },
  modalScroll: {
    marginTop: 60,
    width: 350,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
  },
  modalScrollContent: {
    padding: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});
