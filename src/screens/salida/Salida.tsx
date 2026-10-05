// src/screens/Salida.tsx

import * as Location from "expo-location";
import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  FlatList,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { Pencil, SaveAll, Plus } from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Photo } from "@/components/Photo";
import { SavingModal } from "@/components/SavingModal";
import { useSavingModal } from "@/hooks/useSavingModal";
import {
  getStorageSalida,
  removeSalida,
  SalidaStorageDTO,
} from "@/storage/storageSalida";
import {
  getSalidaQueue,
  addToSalidaQueue,
  updateSalidaQueueEntry,
  removeFromSalidaQueue,
  SalidaQueueEntry,
} from "@/storage/storageQueueSalida";
import { crearTicketLocal } from "@DBmodules/ticketDB";
import { normalizarFecha } from "@/backend/db/services/turnoStatusService";
import { getPicos, getPicosByBodega } from "@DBmodules/picoDB";
import { getBodegasDelUsuario } from "@DBmodules/bodegaDB";
import {
  anularUltimoFinTurnoPorBodega,
  getTipoByBodega,
  getTurnoStatusLocal,
} from "@DBmodules/turnoBD";
import { TicketDTO } from "@/dto/TicketDTO";
import { getTimestamp } from "@/services/timeService";
import { EntryListItem, getSalidaLabel } from "@/components/EntryListItem";
import { EmptyList } from "@/components/EmptyList";

// ─── Form & Schema ────────────────────────────────────────────────────────────

type FormData = {
  horometro?: string | null;
  kilometraje?: string | null;
  taxilitro_inicial: string;
  taxilitro_final: string;
  litros: string;
  observaciones?: string;
};

const registrarSalidaSchema = yup.object({
  horometro: yup
    .string()
    .transform((_, val) => (val === "" ? null : val))
    .nullable()
    .notRequired()
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato invalido (ej: 123,45)"),
  kilometraje: yup
    .string()
    .transform((_, val) => (val === "" ? null : val))
    .nullable()
    .notRequired()
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato invalido (ej: 123,45)"),
  taxilitro_inicial: yup
    .string()
    .required("El taxilitro inicial es requerido")
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato invalido (ej: 123,45)"),
  taxilitro_final: yup
    .string()
    .required("El taxilitro final es requerido")
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato invalido (ej: 123,45)"),
  litros: yup
    .string()
    .required("Los litros cargados son requeridos")
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato invalido (ej: 123,45)"),
  observaciones: yup
    .string()
    .optional()
    .max(500, "Maximo 500 caracteres permitidos"),
});

// ─── Datos vacios para nueva entrada ──────────────────────────────────────────

function emptyStorageData(appte: string): SalidaStorageDTO {
  return {
    persona: null,
    vehiculo: null,
    firma: null,
    selectedBodega: "",
    selectedPico: "",
    idPico_surtidor: 0,
    salida: 0,
    cargaCombustible: "",
    totalizadorPicoInicial: 0,
    totalizadorPicoFinal: 0,
    base64Vehiculo: "",
    base64Horometro: "",
    base64Kilometraje: "",
    base64TaxInicio: "",
    base64TaxFin: "",
    base64Obs: "",
    horometro: "",
    kilometraje: "",
    taxilitro_inicial: "",
    taxilitro_final: "",
    observaciones: "",
    obsAdicional: "",
    appte,
    turnoCerrado: false,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Salida({ navigation, route }: StackRoutesProps<"salida">) {
  const { sucursal, user, syncCompleteCounter } = useAppContext();

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [queue, setQueue] = useState<SalidaQueueEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  const [valoresTemporales, setValoresTemporales] = useState<FormData | null>(
    null
  );
  const autosaveBloqueadoRef = useRef(false);
  const savingModal = useSavingModal();

  // ─── Datos ──────────────────────────────────────────────────────────────────
  const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [picosLista, setPicosLista] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const insets = useSafeAreaInsets();

  // ─── Selecciones ────────────────────────────────────────────────────────────
  const [selectedBodega, setSelectedBodega] = useState<string>("");
  const [selectedPico, setSelectedPico] = useState<string>("");
  const [obsAdicional, setObsAdicional] = useState<string>("");
  const [appte, setAppte] = useState<string>("");

  // ─── Fotos ──────────────────────────────────────────────────────────────────
  const [base64Vehiculo, setBase64Vehiculo] = useState<string>("");
  const [base64Horometro, setBase64Horometro] = useState<string>("");
  const [base64Kilometraje, setBase64Kilometraje] = useState<string>("");
  const [base64TaxInicio, setBase64TaxInicio] = useState<string>("");
  const [base64TaxFin, setBase64TaxFin] = useState<string>("");
  const [base64Obs, setBase64Obs] = useState<string>("");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(registrarSalidaSchema) as any,
    defaultValues: {
      horometro: "",
      kilometraje: "",
      taxilitro_inicial: "",
      taxilitro_final: "",
      litros: "",
      observaciones: "",
    },
  });

  const watchedValues = watch();

  // ─── Catálogo de bodegas (se refresca al ganar foco) ───────────────────────
  // Los picos siguen gestionándolos el efecto de "Picos según bodega";
  // picosLista guarda todos los picos para resolver nombres en la lista.
  const cargarCatalogos = useCallback(async () => {
    if (!user?.cedula) return;
    try {
      const bodegasLocales = await getBodegasDelUsuario(user.cedula);
      setBodegas(bodegasLocales);
      const picosAll = await getPicos();
      setPicosLista(picosAll);
    } catch (err) {
      console.error("[Salida] Error al cargar bodegas:", err);
    }
  }, [user?.cedula, syncCompleteCounter]);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();
    }, [cargarCatalogos]),
  );

  // Si la bodega seleccionada ya no está en la lista recargada, se limpia.
  useEffect(() => {
    if (!selectedBodega || bodegas.length === 0) return;
    const sigueAsignada = bodegas.some(
      (b) => Number(b.id_bodega) === Number(selectedBodega),
    );
    if (!sigueAsignada) setSelectedBodega("");
  }, [bodegas, selectedBodega]);

  // ─── Init: cola + draft pendiente ──────────────────────────────────────
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // 1. Cargar cola
        const q = await getSalidaQueue();
        setQueue(q);

        // 2. Verificar draft pendiente → mover a la cola
        const draft = await getStorageSalida();
        if (draft && tieneDatosRelevantes(draft)) {
          await addToSalidaQueue({
            id: Date.now().toString(),
            data: draft,
            fechaCreacion: Date.now(),
          });
          await removeSalida();
          const updatedQueue = await getSalidaQueue();
          setQueue(updatedQueue);
        }

        // 3. Init appte
        const secureTime = await getTimestamp();
        const now = new Date(secureTime.timestampMs);
        const appteStr = `appte ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setAppte(appteStr);
      } catch (err) {
        console.error("[Salida] Error al inicializar:", err);
        toastError("Error", "No se pudieron cargar los datos.");
      } finally {
        setIsLoading(false);
      }
    }

    init();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // ─── Picos segun bodega seleccionada ─────────────────────────────────────
  useEffect(() => {
    if (!selectedBodega) {
      setPicos([]);
      setSelectedPico("");
      return;
    }

    async function cargarPicos() {
      try {
        const picosLocales = await getPicosByBodega(Number(selectedBodega));
        setPicos(picosLocales);
        setSelectedPico((prev) =>
          prev && picosLocales.some((p) => p.id_pico === Number(prev))
            ? prev
            : ""
        );
      } catch (err) {
        console.error("[Salida] Error al obtener picos:", err);
        toastError("Error", "No se pudieron cargar los picos.");
      }
    }

    cargarPicos();
  }, [selectedBodega]);

  // ─── Params de navegacion (persona, vehiculo, firma) ─────────────────────
  useEffect(() => {
    if (route.params?.onPersona) setPersona(route.params.onPersona);
    if (route.params?.onVehiculo) setVehiculo(route.params.onVehiculo);
    if (route.params?.onFirma) setFirma(route.params.onFirma);
  }, [
    route.params?.onPersona,
    route.params?.onVehiculo,
    route.params?.onFirma,
  ]);

  // ─── Funciones auxiliares ────────────────────────────────────────────────

  function tieneDatosRelevantes(draft: SalidaStorageDTO): boolean {
    return (
      draft.persona !== null ||
      draft.vehiculo !== null ||
      draft.selectedBodega !== "" ||
      draft.selectedPico !== ""
    );
  }

  async function loadQueue() {
    const q = await getSalidaQueue();
    setQueue(q);
  }

  function clearForm() {
    setPersona(null);
    setVehiculo(null);
    setFirma(null);
    setSelectedBodega("");
    setSelectedPico("");
    setBase64Vehiculo("");
    setBase64Horometro("");
    setBase64Kilometraje("");
    setBase64TaxInicio("");
    setBase64TaxFin("");
    setBase64Obs("");
    setObsAdicional("");
    setMotivoConfirmado(false);
    reset();
  }

  function buildStorageData(): SalidaStorageDTO {
    return {
      persona,
      vehiculo,
      firma,
      selectedBodega,
      selectedPico,
      idPico_surtidor: 0,
      salida: 0,
      cargaCombustible: watchedValues.litros ?? "",
      totalizadorPicoInicial: 0,
      totalizadorPicoFinal: 0,
      base64Vehiculo,
      base64Horometro,
      base64Kilometraje,
      base64TaxInicio,
      base64TaxFin,
      base64Obs,
      horometro: watchedValues.horometro ?? "",
      kilometraje: watchedValues.kilometraje ?? "",
      taxilitro_inicial: watchedValues.taxilitro_inicial ?? "",
      taxilitro_final: watchedValues.taxilitro_final ?? "",
      observaciones: watchedValues.observaciones ?? "",
      obsAdicional,
      appte,
      turnoCerrado,
    };
  }

  // ─── Persistencia a la cola (auto-save) ──────────────────────────────────
  const guardarEstado = useCallback(async () => {
    if (!currentEntryId || viewMode !== "form" || autosaveBloqueadoRef.current)
      return;
    try {
      const data = buildStorageData();
      await updateSalidaQueueEntry(currentEntryId, data);
    } catch (error) {
      console.log("[Salida] Error al guardar en cola:", error);
    }
  }, [
    currentEntryId,
    viewMode,
    persona,
    vehiculo,
    firma,
    selectedBodega,
    selectedPico,
    base64Vehiculo,
    base64Horometro,
    base64Kilometraje,
    base64TaxInicio,
    base64TaxFin,
    base64Obs,
    obsAdicional,
    appte,
    turnoCerrado,
    watchedValues,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  // ─── Nueva entrada ───────────────────────────────────────────────────────
  async function handleNewEntry() {
    const id = Date.now().toString();
    const now = await getTimestamp();
    const d = new Date(now.timestampMs);
    const appteStr = `appte ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    setAppte(appteStr);

    const data = emptyStorageData(appteStr);
    await addToSalidaQueue({ id, data, fechaCreacion: Date.now() });
    autosaveBloqueadoRef.current = false;
    setCurrentEntryId(id);
    setIsCreating(true);
    setViewMode("form");
    await loadQueue();
  }

  // ─── Editar entrada ──────────────────────────────────────────────────────
  async function handleEditEntry(entry: SalidaQueueEntry) {
    autosaveBloqueadoRef.current = false;
    setCurrentEntryId(entry.id);
    setIsCreating(false);

    // Cargar datos en el form
    const d = entry.data;
    setPersona(d.persona);
    setVehiculo(d.vehiculo);
    setFirma(d.firma);
    setSelectedBodega(d.selectedBodega);
    setSelectedPico(d.selectedPico);
    setBase64Vehiculo(d.base64Vehiculo);
    setBase64Horometro(d.base64Horometro);
    setBase64Kilometraje(d.base64Kilometraje);
    setBase64TaxInicio(d.base64TaxInicio);
    setBase64TaxFin(d.base64TaxFin);
    setBase64Obs(d.base64Obs);
    setObsAdicional(d.obsAdicional);
    if (d.obsAdicional) setMotivoConfirmado(true);
    setAppte(d.appte);
    setTurnoCerrado(d.turnoCerrado);
    setValue("horometro", d.horometro);
    setValue("kilometraje", d.kilometraje);
    setValue("taxilitro_inicial", d.taxilitro_inicial);
    setValue("taxilitro_final", d.taxilitro_final);
    setValue("litros", d.cargaCombustible);
    setValue("observaciones", d.observaciones);

    setViewMode("form");
  }

  // ─── Salir sin guardar (elimina entrada de la cola) ──────────────────────
  async function handleSalirSinGuardar() {
    if (currentEntryId) {
      autosaveBloqueadoRef.current = true;
      await removeFromSalidaQueue(currentEntryId);
    }
    clearForm();
    setCurrentEntryId(null);
    setIsCreating(false);
    setViewMode("list");
    await loadQueue();
  }

  // ─── Guardar y salir (valida bodega, guarda en cola, vuelve a lista) ─────
  async function handleGuardarYSalir() {
    if (!selectedBodega) {
      Alert.alert("Bodega requerida", "Debe seleccionar una bodega.");
      return;
    }
    // La actualizacion ya se hizo via auto-save
    autosaveBloqueadoRef.current = true;
    clearForm();
    setCurrentEntryId(null);
    setIsCreating(false);
    setViewMode("list");
    await loadQueue();
  }

  // ─── Eliminar entrada ────────────────────────────────────────────────────
  async function handleEliminarEntrada(entry: SalidaQueueEntry) {
    Alert.alert("Eliminar", "Desea eliminar esta entrada de la lista?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await removeFromSalidaQueue(entry.id);
          await loadQueue();
        },
      },
    ]);
  }

  // ─── Guardar ticket (desde formulario, directo a SQLite) ─────────────────
  async function handleSaveAll(data: FormData) {
    setIsLoading(true);
    const {
      horometro,
      kilometraje,
      taxilitro_inicial,
      taxilitro_final,
      litros,
      observaciones,
    } = data;

    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un operador.");
      setIsLoading(false);
      return;
    }
    if (!vehiculo) {
      Alert.alert("Vehiculo requerido", "Debe seleccionar un vehiculo.");
      setIsLoading(false);
      return;
    }
    if (!base64Vehiculo) {
      Alert.alert("Foto requerida", "Debe capturar una foto...");
      setIsLoading(false);
      return;
    }
    if (!selectedBodega) {
      Alert.alert("Bodega requerida", "Debe seleccionar una bodega.");
      setIsLoading(false);
      return;
    }
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico.");
      setIsLoading(false);
      return;
    }
    if (!base64TaxInicio) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto de evidencia para el Taxilitro Inicial."
      );
      setIsLoading(false);
      return;
    }
    if (!base64TaxFin) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto de evidencia para el Taxilitro Final."
      );
      setIsLoading(false);
      return;
    }

    if (!kilometraje && !horometro) {
      Alert.alert(
        "Campos requeridos",
        "Debe completar al menos Horometro o Kilometraje."
      );
      setIsLoading(false);
      return;
    }

    if (horometro && !base64Horometro) {
      Alert.alert("Foto requerida", "Debe capturar una foto del horometro.");
      setIsLoading(false);
      return;
    }
    if (kilometraje && !base64Kilometraje) {
      Alert.alert("Foto requerida", "Debe capturar una foto del kilometraje.");
      setIsLoading(false);
      return;
    }

    const pico = picos.find((p) => p.id_pico === Number(selectedPico));
    if (!pico) {
      Alert.alert("Error", "No se encontro el pico seleccionado.");
      setIsLoading(false);
      return;
    }

    try {
      const tipoTurno = await getTipoByBodega(Number(selectedBodega));
      const turnoData = await getTurnoStatusLocal(user.cedula);
      const estaCerrado =
        turnoData.status === "cerrado" || turnoData.status === "falta_cerrar";

      if ((estaCerrado || tipoTurno === "2") && !motivoConfirmado) {
        setValoresTemporales(data);
        setTurnoCerrado(true);
        setIsLoading(false);
        return;
      }

      const secureTime = await getTimestamp();
      const now = new Date(secureTime.timestampMs);

      const ticket: TicketDTO = {
        id_suc: sucursal.id_sucursal,
        id_bod: Number(selectedBodega),
        id_pico: Number(selectedPico),
        id_vehiculo: vehiculo.id_vehiculo ?? "",
        ci_playero: Number(user.cedula),
        id_operador: Number(persona.cedula),
        litros: Number((litros ?? "0").replace(",", ".")),
        kilometraje: Number((kilometraje ?? "0").replace(",", ".")) || 0,
        horometro: Number((horometro ?? "").replace(",", ".")) || 0,
        taxilitro_inicial: Number((taxilitro_inicial ?? "0").replace(",", ".")),
        taxilitro_final: Number((taxilitro_final ?? "0").replace(",", ".")),
        monto: 0,
        ruc_cliente: "",
        fecha: now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 8),
        tipo: "salida",
        foto_chapa: base64Vehiculo ? [base64Vehiculo] : [],
        firma_conductor: firma ? [firma] : [],
        foto_kilometraje: base64Kilometraje ? [base64Kilometraje] : [],
        foto_horometro: base64Horometro ? [base64Horometro] : [],
        foto_taxilitro: base64TaxInicio ? [base64TaxInicio] : [],
        foto_taxilitro_fin: base64TaxFin ? [base64TaxFin] : [],
        ubicacion_carga: location
          ? `https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`
          : "",
        obs: [observaciones, appte].filter(Boolean).join(" | "),
        observaciones_ticket: motivoConfirmado
          ? `${[observaciones, appte].filter(Boolean).join(" | ")} >> MOTIVO EXCEPCIONAL: ${obsAdicional}`
          : [observaciones, appte].filter(Boolean).join(" | "),
        appte,
        foto_observaciones: base64Obs ? [base64Obs] : [],
      };

      await crearTicketLocal(
        ticket,
        normalizarFecha(now),
        secureTime.timestampMs
      );
      await anularUltimoFinTurnoPorBodega(ticket.id_bod, obsAdicional);

      // Si habia una entrada en la cola, eliminarla
      autosaveBloqueadoRef.current = true;
      if (currentEntryId) {
        await removeFromSalidaQueue(currentEntryId);
      }

      clearForm();
      setCurrentEntryId(null);
      setIsCreating(false);
      setViewMode("list");

      toastSuccess("Registro de Salida", "Salida registrada localmente.");
      await loadQueue();
    } catch (error) {
      console.error("[Salida] Error al guardar salida:", error);
      await loadQueue();
      toastError("Registro de Salida", "No se pudo guardar la salida.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Guardar/Salir (beforeRemove listener) ──────────────────────────────
  useEffect(() => {
    if (viewMode !== "form") return;

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading) return;
      e.preventDefault();
      Alert.alert("Salir de salida", "Que desea hacer?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir sin guardar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Estas seguro?",
              "Se eliminara esta entrada de la lista.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Si, salir sin guardar",
                  style: "destructive",
                  onPress: async () => {
                    await handleSalirSinGuardar();
                    navigation.dispatch(e.data.action);
                  },
                },
              ]
            );
          },
        },
        {
          text: "Guardar y salir",
          onPress: async () => {
            if (!selectedBodega) {
              Alert.alert(
                "Bodega requerida",
                "Debe seleccionar una bodega para guardar."
              );
              return;
            }
            await handleGuardarYSalir();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, viewMode, isLoading, selectedBodega]);

  // ─── Confirmar eliminacion de foto ───────────────────────────────────────
  const confirmarEliminacion = (
    onConfirm: () => void,
    titulo: string = "Eliminar imagen",
    mensaje: string = "Desea eliminar esta foto?"
  ) => {
    Alert.alert(titulo, mensaje, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: onConfirm },
    ], { cancelable: true });
  };

  // ─── Render: modo Lista ──────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <View className="flex-1">
        <SavingModal
          visible={savingModal.visible}
          message="Grabando salida..."
        />
        <ScreenHeader
          title="Salida"
          actions={
            <TouchableOpacity
              onPress={handleNewEntry}
              className="p-1"
            >
              <Plus color="#fff" size={30} />
            </TouchableOpacity>
          }
        />
        {queue.length === 0 ? (
          <EmptyList />
        ) : (
          <>
            <FlatList
              data={queue}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingVertical: 16,
                paddingBottom: insets.bottom + 80,
              }}
              renderItem={({ item }) => (
                <EntryListItem
                  id={item.id}
                  label={getSalidaLabel(item.data, bodegas, picosLista)}
                  fechaCreacion={item.fechaCreacion}
                  onEditar={() => handleEditEntry(item)}
                  onEliminar={() => handleEliminarEntrada(item)}
                />
              )}
            />
          </>
        )}
      </View>
    );
  }

  // ─── Render: turno cerrado ────────────────────────────────────────────────
  if (turnoCerrado && !motivoConfirmado) {
    return (
      <View className="flex-1">
        <SavingModal
          visible={savingModal.visible}
          message="Grabando salida..."
        />
        <ScreenHeader title="Salida Excepcional" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: insets.bottom + 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.overlay}>
              <View style={styles.modalContent}>
                <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
                  Importante!
                </Text>
                <Text className="font-medium text-justify text-xl mb-4">
                  El turno se encuentra cerrado. Indique el motivo de esta
                  salida excepcional.
                </Text>
                <InputCard
                  className="min-h-40"
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
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    if (!obsAdicional.trim()) {
                      Alert.alert(
                        "Motivo requerido",
                        "Por favor describa el motivo."
                      );
                      return;
                    }

                    setMotivoConfirmado(true);
                    setTurnoCerrado(false);

                    if (valoresTemporales) {
                      setTimeout(() => {
                        savingModal.run(() => handleSaveAll(valoresTemporales));
                      }, 100);
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    Confirmar y Grabar Salida
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Render: modo Formulario ─────────────────────────────────────────────
  return (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Grabando salida..."
      />
      <ScreenHeader title="Salida" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center p-4 gap-4">
            {/* Chofer/Operador */}
            <InputCard title="Chofer/Operador" required>
              <TextSearch
                textValue={persona?.nombre_apellido}
                placeholder="Buscar persona"
                onPress={() =>
                  navigation.navigate("buscarpersona", {
                    enabledSelect: true,
                    fromScreen: "salida",
                  })
                }
              />
            </InputCard>

            {/* Equipo/Vehiculo */}
            <InputCard title="Equipo/Vehiculo" required>
              <View className="flex-row items-center p-2 gap-2">
                <TextSearch
                  textValue={vehiculo?.descripcion_vehiculo}
                  placeholder="Buscar vehiculo"
                  onPress={() =>
                    navigation.navigate("buscarvehiculo", {
                      enabledSelect: true,
                      fromScreen: "salida",
                    })
                  }
                />
              </View>
            </InputCard>
            <InputCard title="Foto del Equipo/Vehiculo" required>
              <View className="flex-row items-center p-2 gap-2">
                {base64Vehiculo ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacion(() => setBase64Vehiculo(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64Vehiculo}`,
                      }}
                      className="w-56 h-36 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64Vehiculo ? "#05a722" : "#000"}
                  setImage={setBase64Vehiculo}
                />
              </View>
            </InputCard>

            {/* Horometro */}
            <InputCard title="Horometro">
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="horometro"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      keyboardType="decimal-pad"
                      align="center"
                      placeholder="Informe el horometro"
                      value={value ?? ""}
                      onChangeText={(text) => onChange(text.replace(".", ","))}
                      errorMessage={errors.horometro?.message}
                    />
                  )}
                />
              </View>
            </InputCard>
            <InputCard title="Foto Horometro">
              <View className="flex-row items-center p-2 gap-2">
                {base64Horometro ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacion(() => setBase64Horometro(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64Horometro}`,
                      }}
                      className="w-56 h-36 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64Horometro ? "#05a722" : "#000"}
                  setImage={setBase64Horometro}
                />
              </View>
            </InputCard>

            {/* Kilometraje */}
            <InputCard title="Kilometraje">
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="kilometraje"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      keyboardType="decimal-pad"
                      align="center"
                      placeholder="Informe el kilometraje"
                      value={value ?? ""}
                      onChangeText={(text) => onChange(text.replace(".", ","))}
                      errorMessage={errors.kilometraje?.message}
                    />
                  )}
                />
              </View>
            </InputCard>
            <InputCard title="Foto kilometraje">
              <View className="flex-row items-center p-2 gap-2">
                {base64Kilometraje ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacion(() => setBase64Kilometraje(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64Kilometraje}`,
                      }}
                      className="w-56 h-36 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64Kilometraje ? "#05a722" : "#000"}
                  setImage={setBase64Kilometraje}
                />
              </View>
            </InputCard>

            {/* Bodega */}
            <InputCard title="Bodega" required>
              <Select
                data={bodegas.filter((b) => {
                  const picosDeBodega = picos.filter(
                    (p) => p.id_bodega === Number(b.id_bodega)
                  );
                  if (picosDeBodega.length === 0) return true;
                  return picosDeBodega.some(
                    (p) =>
                      !queue.some(
                        (e) =>
                          Number(e.data.selectedPico) === p.id_pico &&
                          e.id !== currentEntryId
                      )
                  );
                })}
                isLoading={isLoading}
                selectedValue={selectedBodega}
                setSelectedValue={setSelectedBodega}
                labelField="descripcion_bodega"
                valueField="id_bodega"
              />
            </InputCard>

            {/* Pico expendedor */}
            <InputCard title="Pico expendedor" required>
              <Select
                data={picos.filter(
                  (p) =>
                    !queue.some(
                      (e) =>
                        Number(e.data.selectedPico) === p.id_pico &&
                        e.id !== currentEntryId
                    )
                )}
                isLoading={isLoading && !!selectedBodega}
                selectedValue={selectedPico}
                setSelectedValue={setSelectedPico}
                labelField="descripcion_pico"
                valueField="id_pico"
              />
            </InputCard>

            {/* Taxilitro Inicial */}
            <InputCard title="Taxilitro Inicial" required>
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="taxilitro_inicial"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      keyboardType="decimal-pad"
                      align="center"
                      placeholder="Ingrese taxilitro inicial"
                      value={value ?? ""}
                      onChangeText={(text) => onChange(text.replace(".", ","))}
                      errorMessage={errors.taxilitro_inicial?.message}
                    />
                  )}
                />
              </View>
            </InputCard>
            <InputCard title="Foto Taxilitro Inicial">
              <View className="flex-row items-center p-2 gap-2">
                {base64TaxInicio ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacion(() => setBase64TaxInicio(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64TaxInicio}`,
                      }}
                      className="w-56 h-36 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64TaxInicio ? "#05a722" : "#000"}
                  setImage={setBase64TaxInicio}
                />
              </View>
            </InputCard>

            {/* Litros cargados */}
            <InputCard title="Litros Cargados" required>
              <Controller
                control={control}
                name="litros"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="decimal-pad"
                    align="center"
                    placeholder="Ej: 123,45"
                    value={value ?? ""}
                    onChangeText={(text) => onChange(text.replace(".", ","))}
                    errorMessage={errors.litros?.message}
                  />
                )}
              />
            </InputCard>

            {/* Taxilitro Final */}
            <InputCard title="Taxilitro Final" required>
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="taxilitro_final"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      keyboardType="decimal-pad"
                      align="center"
                      placeholder="Ingrese taxilitro final"
                      value={value ?? ""}
                      onChangeText={(text) => onChange(text.replace(".", ","))}
                      errorMessage={errors.taxilitro_final?.message}
                    />
                  )}
                />
              </View>
            </InputCard>
            <InputCard title="Foto Taxilitro Final">
              <View className="flex-row items-center p-2 gap-2">
                {base64TaxFin ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacion(() => setBase64TaxFin(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64TaxFin}`,
                      }}
                      className="w-56 h-36 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64TaxFin ? "#05a722" : "#000"}
                  setImage={setBase64TaxFin}
                />
              </View>
            </InputCard>

            {/* Observaciones */}
            <InputCard title="Observaciones">
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="observaciones"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      multiline
                      numberOfLines={4}
                      placeholder="Observaciones"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={base64Obs ? "#05a722" : "#000"}
                  setImage={setBase64Obs}
                />
              </View>
            </InputCard>

            {/* Firma + Guardar Registro + Grabar */}
            <View className="flex-row gap-4">
              <Button
                title="Firmar"
                onPress={() =>
                  navigation.navigate("firma", {
                    fromScreen: "salida",
                    persona,
                  })
                }
                isLoading={isLoading}
                icon={Pencil}
                iconSize="md"
                iconColor="#000"
              />
              {firma && (
                <Button
                  title="Enviar"
                  onPress={handleSubmit((data) =>
                    savingModal.run(() => handleSaveAll(data))
                  )}
                  isLoading={isLoading}
                  icon={SaveAll}
                  iconSize="md"
                  iconColor="#000"
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
  },
  modalContent: {
    marginTop: 100,
    width: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
