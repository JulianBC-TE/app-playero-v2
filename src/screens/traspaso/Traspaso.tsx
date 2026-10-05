import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
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
import {
  CheckCheck,
  Pencil,
  Plus,
  RulerDimensionLine,
  SaveAll,
} from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import {
  getStorageTraspaso,
  removeTraspaso,
} from "@/storage/storageTraspaso";
import {
  getStoragePersona,
  removePersona,
} from "@/storage/storagePersona";
import {
  getTraspasoQueue,
  addToTraspasoQueue,
  updateTraspasoQueueEntry,
  removeFromTraspasoQueue,
  TraspasoQueueEntry,
} from "@/storage/storageQueueTraspaso";
import { Photo } from "@/components/Photo";
import { SavingModal } from "@/components/SavingModal";
import { useSavingModal } from "@/hooks/useSavingModal";
// BD — reemplaza api
import { getBodegasDelUsuario, getBodegasTraspaso } from "@DBmodules/bodegaDB";
import { getPicos, getPicosByBodega } from "@DBmodules/picoDB";
import {
  anularUltimoFinTurnoPorBodega,
  getTipoByBodega,
  getTurnoStatusLocal,
} from "@DBmodules/turnoBD";
import { saveTraspasoLocal } from "@DBmodules/traspasoDB";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { getTimestamp } from "@/services/timeService";
import { EntryListItem } from "@/components/EntryListItem";
import { EmptyList } from "@/components/EmptyList";

export function Traspaso({ navigation, route }: StackRoutesProps<"traspaso">) {
  // ─── UI State ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [queue, setQueue] = useState<TraspasoQueueEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBodegaOrigem, setSelectedBodegaOrigem] = useState<string>("");
  const [selectedBodegaDestino, setSelectedBodegaDestino] =
    useState<string>("");
  const [bodegaOrigem, setBodegaOrigem] = useState<BodegaDTO[]>([]);
  const [bodygaDestino, setBodegaDestino] = useState<BodegaDTO[]>([]);
  const { sucursal, user, syncCompleteCounter } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingModal = useSavingModal();
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [picosLista, setPicosLista] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);

  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  const [cargaCombustible, setCargaCombustible] = useState<string>("");
  const [selectedPico, setSelectedPico] = useState<string>("");

  const [base64Obs, setBase64Obs] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [obsAdicional, setObsAdicional] = useState<string>("");
  const [appte, setAppte] = useState<string>("");

  const [taxilitroInicial, setTaxilitroInicial] = useState<string>("");
  const [base64TaxilitroInicial, setBase64TaxilitroInicial] =
    useState<string>("");
  const [taxilitroFinal, setTaxilitroFinal] = useState<string>("");
  const [base64TaxilitroFinal, setBase64TaxilitroFinal] = useState<string>("");

  const autosaveBloqueadoRef = useRef(false);
  const insets = useSafeAreaInsets();

  const toNumber = (v: unknown) => {
    if (typeof v === "number") return v;
    const s = String(v ?? "").trim();
    if (!s) return 0;
    return Number(s.replace(",", "."));
  };

  async function fetchPicos() {
    setIsLoading(true);
    try {
      if (user?.cedula) {
        const turnoStatus = await getTurnoStatusLocal(user.cedula);
        setTurnoCerrado(
          turnoStatus.status === "cerrado" ||
            turnoStatus.status === "falta_cerrar",
        );
      }
      const picosDB = await getPicosByBodega(Number(selectedBodegaOrigem));
      setPicos(picosDB);
      setSelectedPico((prev) => {
        if (prev && prev.trim() && picosDB.some((p) => p.id_pico === Number(prev))) {
          return prev;
        }
        const libres = picosDB.filter(
          (p) =>
            !queue.some(
              (e) =>
                Number(e.data.id_pico) === p.id_pico &&
                e.id !== currentEntryId
            )
        );
        const elegido = libres[0] ?? picosDB[0];
        return elegido?.id_pico.toString() || "";
      });
    } catch (error) {
      toastError("Error al buscar picos", "Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  const confirmarEliminacion = (
    onConfirm: () => void,
    titulo: string = "Eliminar imagen",
    mensaje: string = "¿Estás seguro de que deseas eliminar esta foto?",
  ) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: onConfirm,
        },
      ],
      { cancelable: true },
    );
  };

  async function fetchBodegas() {
    try {
      setIsLoading(true);
      const bodegasOrigen = await getBodegasDelUsuario(user.cedula);
      setBodegaOrigem(bodegasOrigen);
      const bodegasDestino = await getBodegasTraspaso(user.cedula);
      setBodegaDestino(bodegasDestino);
    } catch (error) {
      toastError("Error al buscar bodega", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  // Refresca las listas de bodegas al ganar foco y cuando el sync de catálogos
  // termina (para no quedar con las bodegas anteriores si cambió la asignación).
  useFocusEffect(
    useCallback(() => {
      fetchBodegas();
    }, [user?.cedula, syncCompleteCounter]),
  );

  // Si la bodega origen/destino seleccionada ya no está en la lista
  // recargada, se limpia (o se toma la primera disponible).
  useEffect(() => {
    if (bodegaOrigem.length === 0) {
      setSelectedBodegaOrigem("");
      return;
    }
    const sigueAsignada = bodegaOrigem.some(
      (b) => Number(b.id_bodega) === Number(selectedBodegaOrigem),
    );
    if (!sigueAsignada) {
      setSelectedBodegaOrigem(String(bodegaOrigem[0].id_bodega));
    }
  }, [bodegaOrigem]);

  useEffect(() => {
    if (bodygaDestino.length === 0) {
      setSelectedBodegaDestino("");
      return;
    }
    const sigueAsignada = bodygaDestino.some(
      (b) => Number(b.id_bodega) === Number(selectedBodegaDestino),
    );
    if (!sigueAsignada) {
      setSelectedBodegaDestino(String(bodygaDestino[0].id_bodega));
    }
  }, [bodygaDestino]);

  function buildTraspasoData(): TraspasoDTO {
    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    return {
      bod_origen: Number(selectedBodegaOrigem),
      bod_destino: Number(selectedBodegaDestino),
      id_tanque_destino: Number(medicionInicial[0]?.id_tanque ?? 0),
      regla_altura_inicial: medicionInicial[0]?.regla.toString() ?? "",
      litros_tanque_inicial: medicionInicial[0]?.litros ?? 0,
      temp_inicial: medicionInicial[0]?.temperatura ?? 0,
      regla_altura_final: medicionFinal[0]?.regla?.toString() ?? "",
      litros_tanque_final: medicionFinal[0]?.litros ?? 0,
      temp_final: medicionFinal[0]?.temperatura ?? 0,
      foto_medicion_final: medicionFinal[0]?.foto_tanque
        ? [medicionFinal[0].foto_tanque]
        : [],
      id_pico: Number(selectedPico),
      taxilitro_inicial: toNumber(taxilitroInicial),
      taxilitro_final: toNumber(taxilitroFinal),
      litros_pico: toNumber(cargaCombustible),
      last_id_salida: 0,
      obs_traspaso: obs,
      obs_adicional: obsAdicional,
      appte: appte,
      foto_obs_traspaso: base64Obs ? [base64Obs] : [],
      foto_medicion_inicial: medicionInicial[0]?.foto_tanque
        ? [medicionInicial[0].foto_tanque]
        : [],
      foto_taxilitro: base64TaxilitroInicial
        ? [base64TaxilitroInicial]
        : [],
      foto_taxilitro_fin: base64TaxilitroFinal
        ? [base64TaxilitroFinal]
        : [],
      fecha: fecha,
      hora: hora,
      firma_receptor: firma ? [firma] : [],
      id_playero: Number(user.cedula),
      id_encargado_receptor: Number(persona?.cedula) || 0,
    };
  }

  async function loadQueue() {
    const q = await getTraspasoQueue();
    setQueue(q);
  }

  function clearForm() {
    setPersona(null);
    setFirma(null);
    setSelectedBodegaOrigem("");
    setSelectedBodegaDestino("");
    setSelectedPico("");
    setCargaCombustible("");
    setTaxilitroInicial("");
    setTaxilitroFinal("");
    setBase64TaxilitroInicial("");
    setBase64TaxilitroFinal("");
    setBase64Obs("");
    setObs("");
    setObsAdicional("");
    setMedicionInicial([]);
    setMedicionFinal([]);
    setMotivoConfirmado(false);
  }

  function tieneDatosRelevantes(d: TraspasoDTO): boolean {
    return !!(
      d.bod_origen ||
      d.bod_destino ||
      d.id_pico ||
      d.id_tanque_destino ||
      d.litros_pico ||
      d.taxilitro_inicial ||
      d.taxilitro_final ||
      d.obs_traspaso ||
      d.obs_adicional ||
      d.foto_medicion_inicial?.length ||
      d.foto_taxilitro?.length
    );
  }

  function getTraspasoLabel(
    data: TraspasoDTO,
    origenes: BodegaDTO[],
    destinos: BodegaDTO[],
    listaPicos: PicoDTO[]
  ): string {
    const pico = listaPicos.find((p) => p.id_pico === Number(data.id_pico));
    const origen = origenes.find(
      (b) => b.id_bodega === String(data.bod_origen)
    );
    const destino = destinos.find(
      (b) => b.id_bodega === String(data.bod_destino)
    );
    const picoName =
      pico?.descripcion_pico || `Pico #${data.id_pico || "?"}`;
    const origenName =
      origen?.descripcion_bodega || `Bodega #${data.bod_origen || "?"}`;
    const destinoName =
      destino?.descripcion_bodega || `Bodega #${data.bod_destino || "?"}`;
    return `${picoName} - ${origenName} → ${destinoName}`;
  }

  // ─── Persistencia a la cola (auto-save) ──────────────────────────────────
  const guardarEstado = useCallback(async () => {
    if (!currentEntryId || viewMode !== "form" || autosaveBloqueadoRef.current)
      return;
    try {
      const data = buildTraspasoData();
      await updateTraspasoQueueEntry(currentEntryId, data, persona, firma);
    } catch (error) {
      console.log("[Traspaso] Error al guardar en cola:", error);
    }
  }, [
    currentEntryId,
    viewMode,
    persona,
    firma,
    selectedBodegaOrigem,
    selectedBodegaDestino,
    selectedPico,
    cargaCombustible,
    obs,
    obsAdicional,
    appte,
    base64Obs,
    taxilitroInicial,
    base64TaxilitroInicial,
    taxilitroFinal,
    base64TaxilitroFinal,
    medicionInicial,
    medicionFinal,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  // ─── Nueva entrada ───────────────────────────────────────────────────────
  async function handleNewEntry() {
    autosaveBloqueadoRef.current = false;
    clearForm();

    const id = Date.now().toString();
    const secureTime = await getTimestamp();
    const now = new Date(secureTime.timestampMs);
    const appteStr = `appte ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setAppte(appteStr);

    const primeraOrigen = bodegaOrigem[0];
    const primerDestino = bodygaDestino[0];
    if (primeraOrigen) setSelectedBodegaOrigem(primeraOrigen.id_bodega);
    if (primerDestino) setSelectedBodegaDestino(primerDestino.id_bodega);

    const data: TraspasoDTO = {
      bod_origen: Number(primeraOrigen?.id_bodega ?? 0),
      bod_destino: Number(primerDestino?.id_bodega ?? 0),
      id_tanque_destino: 0,
      regla_altura_inicial: "",
      litros_tanque_inicial: 0,
      temp_inicial: 0,
      regla_altura_final: "",
      litros_tanque_final: 0,
      temp_final: 0,
      foto_medicion_final: [],
      id_pico: 0,
      taxilitro_inicial: 0,
      taxilitro_final: 0,
      litros_pico: 0,
      last_id_salida: 0,
      obs_traspaso: "",
      obs_adicional: "",
      appte: appteStr,
      foto_obs_traspaso: [],
      foto_medicion_inicial: [],
      foto_taxilitro: [],
      foto_taxilitro_fin: [],
      fecha: now.toISOString().slice(0, 10),
      hora: now.toTimeString().slice(0, 8),
      firma_receptor: [],
      id_playero: Number(user.cedula),
      id_encargado_receptor: 0,
    };

    await addToTraspasoQueue({
      id,
      data,
      persona: null,
      firma: null,
      fechaCreacion: Date.now(),
    });
    setCurrentEntryId(id);
    setIsCreating(true);
    setViewMode("form");
    await loadQueue();
  }

  // ─── Editar entrada ──────────────────────────────────────────────────────
  async function handleEditEntry(entry: TraspasoQueueEntry) {
    autosaveBloqueadoRef.current = false;
    setCurrentEntryId(entry.id);
    setIsCreating(false);

    const d = entry.data;
    setPersona(entry.persona);
    setFirma(entry.firma);
    setSelectedBodegaOrigem(d.bod_origen.toString());
    setSelectedBodegaDestino(d.bod_destino.toString());
    setSelectedPico(d.id_pico.toString());
    setCargaCombustible(
      d.litros_pico ? d.litros_pico.toString() : ""
    );
    setBase64Obs(d.foto_obs_traspaso?.[0] ?? "");
    setObs(d.obs_traspaso ?? "");
    setObsAdicional(d.obs_adicional ?? "");
    setMotivoConfirmado(!!d.obs_adicional?.trim());
    setAppte(d.appte ?? "");
    setTaxilitroInicial(
      d.taxilitro_inicial ? d.taxilitro_inicial.toString() : ""
    );
    setBase64TaxilitroInicial(d.foto_taxilitro?.[0] ?? "");
    setTaxilitroFinal(
      d.taxilitro_final ? d.taxilitro_final.toString() : ""
    );
    setBase64TaxilitroFinal(d.foto_taxilitro_fin?.[0] ?? "");

    if (d.id_tanque_destino) {
      setMedicionInicial([
        {
          id_tanque: d.id_tanque_destino.toString(),
          regla: Number(d.regla_altura_inicial),
          litros: d.litros_tanque_inicial,
          temperatura: d.temp_inicial,
          foto_tanque: d.foto_medicion_inicial?.[0] || "",
        },
      ]);
    } else {
      setMedicionInicial([]);
    }

    if (d.regla_altura_final && d.litros_tanque_final > 0) {
      setMedicionFinal([
        {
          id_tanque: d.id_tanque_destino.toString(),
          regla: Number(d.regla_altura_final),
          litros: d.litros_tanque_final,
          temperatura: d.temp_final,
          foto_tanque: d.foto_medicion_final?.[0] || "",
        },
      ]);
    } else {
      setMedicionFinal([]);
    }

    setViewMode("form");
  }

  // ─── Salir sin guardar (elimina entrada de la cola) ──────────────────────
  async function handleSalirSinGuardar() {
    if (currentEntryId) {
      autosaveBloqueadoRef.current = true;
      await removeFromTraspasoQueue(currentEntryId);
    }
    clearForm();
    setCurrentEntryId(null);
    setIsCreating(false);
    setViewMode("list");
    await loadQueue();
  }

  // ─── Guardar y salir (deja el borrador en la cola) ───────────────────────
  async function handleGuardarYSalir() {
    if (!selectedBodegaOrigem || selectedBodegaOrigem.trim() === "") {
      Alert.alert(
        "Bodega requerida",
        "Debe seleccionar una bodega origen para guardar.",
      );
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
  async function handleEliminarEntrada(entry: TraspasoQueueEntry) {
    Alert.alert("Eliminar", "¿Desea eliminar esta entrada de la lista?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await removeFromTraspasoQueue(entry.id);
          await loadQueue();
        },
      },
    ]);
  }

  // ─── Guardar/Salir (beforeRemove listener) ──────────────────────────────
  const handleGuardarYSalirRef = useRef(handleGuardarYSalir);
  const handleSalirSinGuardarRef = useRef(handleSalirSinGuardar);
  handleGuardarYSalirRef.current = handleGuardarYSalir;
  handleSalirSinGuardarRef.current = handleSalirSinGuardar;

  useEffect(() => {
    if (viewMode !== "form") return;

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading) return;
      e.preventDefault();
      Alert.alert("Salir de traspaso", "¿Qué desea hacer?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir sin guardar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "¿Estás seguro?",
              "Se eliminará esta entrada de la lista.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sí, salir sin guardar",
                  style: "destructive",
                  onPress: async () => {
                    await handleSalirSinGuardarRef.current();
                    navigation.dispatch(e.data.action);
                  },
                },
              ],
            );
          },
        },
        {
          text: "Guardar y salir",
          onPress: async () => {
            await handleGuardarYSalirRef.current();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, viewMode, isLoading]);

  async function handleSaveAll() {
    if (isSaving) return;
    setIsLoading(true);

    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un chofer/operador.");
      setIsLoading(false);
      return;
    }
    if (!selectedBodegaOrigem) {
      Alert.alert(
        "Bodega de origen requerida",
        "Debe seleccionar una bodega origen.",
      );
      setIsLoading(false);
      return;
    }
    if (!selectedBodegaDestino) {
      Alert.alert(
        "Bodega de destino requerida",
        "Debe seleccionar una bodega destino.",
      );
      setIsLoading(false);
      return;
    }
    if (!taxilitroInicial || toNumber(taxilitroInicial) <= 0) {
      Alert.alert(
        "Taxilitro inicial requerido",
        "Debe ingresar el valor numérico del taxilitro inicial.",
      );
      setIsLoading(false);
      return;
    }
    if (!base64TaxilitroInicial) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto del taxilitro inicial.",
      );
      setIsLoading(false);
      return;
    }
    if (medicionInicial.length === 0) {
      Alert.alert(
        "Medición Inicial requerida",
        "Debe registrar la medición inicial.",
      );
      setIsLoading(false);
      return;
    }
    if (!cargaCombustible || toNumber(cargaCombustible) <= 0) {
      Alert.alert(
        "Litros requeridos",
        "Debe ingresar una cantidad válida de litros cargados.",
      );
      setIsLoading(false);
      return;
    }
    if (!taxilitroFinal || toNumber(taxilitroFinal) <= 0) {
      Alert.alert(
        "Taxilitro final requerido",
        "Debe ingresar el valor numérico del taxilitro final.",
      );
      setIsLoading(false);
      return;
    }
    if (!base64TaxilitroFinal) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto del taxilitro final.",
      );
      setIsLoading(false);
      return;
    }
    if (medicionFinal.length === 0) {
      Alert.alert(
        "Medición final es requerida",
        "Debe registrar la medición final del tanque receptor.",
      );
      setIsLoading(false);
      return;
    }
    if (!firma) {
      Alert.alert("Firma requerida", "Debe registrar la firma del receptor.");
      setIsLoading(false);
      return;
    }
    const tipoTurno = await getTipoByBodega(Number(selectedBodegaOrigem));
    if (tipoTurno === "2" && !motivoConfirmado) {
      setTurnoCerrado(true);
      setIsLoading(false);
      return;
    }

    try {
      const data = buildTraspasoData();

      data.firma_receptor = firma ? [firma] : [];
      data.regla_altura_final = medicionFinal[0].regla.toString();
      data.litros_tanque_final = medicionFinal[0].litros;
      data.temp_final = medicionFinal[0].temperatura;
      data.foto_medicion_final = medicionFinal[0].foto_tanque
        ? [medicionFinal[0].foto_tanque]
        : [];
      data.obs_traspaso = [obs, obsAdicional, appte]
        .filter((s) => s?.trim())
        .join(" >> ");
      data.litros_pico = toNumber(cargaCombustible);
      data.taxilitro_inicial = toNumber(taxilitroInicial);
      data.taxilitro_final = toNumber(taxilitroFinal);
      data.foto_taxilitro = base64TaxilitroInicial
        ? [base64TaxilitroInicial]
        : [];
      data.foto_taxilitro_fin = base64TaxilitroFinal
        ? [base64TaxilitroFinal]
        : [];

      const payload = { ...data };
      delete (payload as any).last_id_salida;
      delete (payload as any).obs_adicional;

      setIsSaving(true);

      const secureTime = await getTimestamp();
      await saveTraspasoLocal(payload, secureTime.timestampMs);
      await anularUltimoFinTurnoPorBodega(payload.bod_origen, obsAdicional);

      toastSuccess("Traspaso", "Traspaso guardado exitosamente.");
      autosaveBloqueadoRef.current = true;
      if (currentEntryId) {
        await removeFromTraspasoQueue(currentEntryId);
      }
      clearForm();
      setCurrentEntryId(null);
      setIsCreating(false);
      setViewMode("list");
      await loadQueue();
    } catch (error) {
      console.log(error);
      toastError("Traspaso", "Ocurrió un error al guardar el traspaso.");
    } finally {
      setIsSaving(false);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // 1. Cargar cola
        const q = await getTraspasoQueue();
        setQueue(q);

        // 2. Verificar draft legado → mover a la cola
        const draft = await getStorageTraspaso();
        if (draft && tieneDatosRelevantes(draft)) {
          const legacyPersona = await getStoragePersona();
          const personaLegacy =
            legacyPersona && legacyPersona.cedula ? legacyPersona : null;
          await addToTraspasoQueue({
            id: Date.now().toString(),
            data: draft,
            persona: personaLegacy,
            firma: draft.firma_receptor?.[0] ?? null,
            fechaCreacion: Date.now(),
          });
          await removeTraspaso();
          await removePersona();
          setQueue(await getTraspasoQueue());
        }

        // 3. Cargar bodegas y picos (para labels de la lista)
        await fetchBodegas();
        const picosAll = await getPicos();
        setPicosLista(picosAll);

        // 4. Init appte
        const secureTime = await getTimestamp();
        const now = new Date(secureTime.timestampMs);
        const appteStr = `appte ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setAppte(appteStr);
      } catch (err) {
        console.error("[Traspaso] Error al inicializar:", err);
        toastError("Error", "No se pudieron cargar los datos.");
      } finally {
        setIsLoading(false);
      }
    }

    if (sucursal) {
      init();
    }
  }, []);

  useEffect(() => {
    if (route.params?.onPersona) {
      setPersona(route.params.onPersona);
    }
    if (route.params?.onFirma) {
      setFirma(route.params.onFirma);
    }
    if (route?.params?.onMedicion) {
      if (medicionInicial.length === 0) {
        setMedicionInicial(route.params.onMedicion);
      } else {
        setMedicionFinal(route.params.onMedicion);
      }
    }
  }, [
    route.params?.onPersona,
    route.params?.onMedicion,
    route.params?.onFirma,
  ]);

  useEffect(() => {
    if (viewMode === "form" && selectedBodegaOrigem) {
      fetchPicos();
    }
  }, [selectedBodegaOrigem, viewMode]);

  // ─── Render: modo Lista ──────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <View className="flex-1">
        <SavingModal
          visible={savingModal.visible}
          message="Grabando traspaso..."
        />
        <ScreenHeader
          title="Traspaso"
          actions={
            <TouchableOpacity onPress={handleNewEntry} className="p-1">
              <Plus color="#fff" size={30} />
            </TouchableOpacity>
          }
        />
        {queue.length === 0 ? (
          <EmptyList />
        ) : (
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
                label={getTraspasoLabel(
                  item.data,
                  bodegaOrigem,
                  bodygaDestino,
                  picosLista
                )}
                fechaCreacion={item.fechaCreacion}
                onEditar={() => handleEditEntry(item)}
                onEliminar={() => handleEliminarEntrada(item)}
              />
            )}
          />
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
          message="Grabando traspaso..."
        />
        <ScreenHeader title="Traspaso Excepcional" />

        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
              Importante!!!
            </Text>
            <Text className="font-medium text-justify text-xl mb-4">
              Está intentando registrar un traspaso y el turno se encuentra
              cerrado. Una vez finalizada se deberá realizar el cierre
              correspondiente en el apartado “Cierre Extra”, para las bodegas
              que hayan sufrido movimientos.
            </Text>
            <InputCard className="min-h-40" title="Indique el motivo" required>
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
              onPress={async () => {
                if (obsAdicional.trim() === "") {
                  Alert.alert(
                    "Motivo requerido",
                    "Por favor describa el motivo.",
                  );
                  return;
                }
                await guardarEstado();
                setMotivoConfirmado(true);
                setTurnoCerrado(false);
              }}
            >
              <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Grabando traspaso..."
      />
      <ScreenHeader title="Traspaso" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <InputCard title="Chofer/Operador" required={true}>
              <TextSearch
                enabled={true}
                textValue={persona?.nombre_apellido}
                placeholder="Buscar persona"
                onPress={() =>
                  navigation.navigate("buscarpersona", {
                    enabledSelect: true,
                    fromScreen: "traspaso",
                  })
                }
              />
            </InputCard>

            {bodegaOrigem && bodegaOrigem.length > 1 && (
              <InputCard title="Bodega de Origen" required={true}>
                <View className="flex-row items-center p-2 gap-2">
                  <Select
                    enabled={true}
                    data={bodegaOrigem.filter((b) => {
                      if (!isCreating && b.id_bodega === selectedBodegaOrigem)
                        return true;
                      const picosDeBodega = picos.filter(
                        (p) => p.id_bodega === Number(b.id_bodega)
                      );
                      if (picosDeBodega.length === 0) return true;
                      return picosDeBodega.some(
                        (p) =>
                          !queue.some(
                            (e) =>
                              Number(e.data.id_pico) === p.id_pico &&
                              e.id !== currentEntryId
                          )
                      );
                    })}
                    isLoading={isLoading}
                    selectedValue={selectedBodegaOrigem}
                    setSelectedValue={setSelectedBodegaOrigem}
                    labelField="descripcion_bodega"
                    valueField="id_bodega"
                  />
                </View>
              </InputCard>
            )}

            <InputCard title="Bodega receptora" required={true}>
              <View className="flex-row items-center p-2 gap-2">
                <Select
                  enabled={true}
                  data={bodygaDestino}
                  isLoading={isLoading}
                  selectedValue={selectedBodegaDestino}
                  setSelectedValue={setSelectedBodegaDestino}
                  labelField="descripcion_bodega"
                  valueField="id_bodega"
                />
              </View>
            </InputCard>

            <InputCard title="Pico expendedor:" required={true}>
              <Select
                enabled={true}
                data={picos.filter((p) => {
                  if (!isCreating && p.id_pico === Number(selectedPico))
                    return true;
                  return !queue.some(
                    (e) =>
                      Number(e.data.id_pico) === p.id_pico &&
                      e.id !== currentEntryId
                  );
                })}
                isLoading={isLoading}
                selectedValue={selectedPico}
                setSelectedValue={setSelectedPico}
                labelField="descripcion_pico"
                valueField="id_pico"
              />
            </InputCard>

            <InputCard title="Taxilitro Inicial" required>
              <View className="flex-row items-center p-2 gap-2">
                <Input
                  value={taxilitroInicial}
                  placeholder="Ej: 45201,20"
                  keyboardType="decimal-pad"
                  onChangeText={setTaxilitroInicial}
                />
              </View>
            </InputCard>
            <InputCard title="Foto Taxilitro Inicial" required>
                <View className="flex-row items-center p-2 gap-2">
                  {base64TaxilitroInicial && base64TaxilitroInicial.length > 0 ? (
                    <Pressable
                      onPress={() =>
                        confirmarEliminacion(() => setBase64TaxilitroInicial(""))
                      }
                    >
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${base64TaxilitroInicial}`,
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
                  iconColor={
                    base64TaxilitroInicial && base64TaxilitroInicial.length > 0
                      ? "#05a722"
                      : "#000"
                  }
                  setImage={(base64) => setBase64TaxilitroInicial(base64)}
                  disabled={isLoading}
                />
              </View>
            </InputCard>

            {/* Medición Inicial: Muestra botón y desglose de Altura/Litros */}
            <InputCard title="Medición Inicial del Tanque Receptor" required>
              {medicionInicial && medicionInicial.length > 0 && (
                <View className="w-full items-center p-2 mt-2 bg-surfaceElevated dark:bg-surfaceElevatedDark rounded-md border border-border dark:border-borderDark">
                  <Text className="text-md font-bold text-text dark:text-textDark">
                    Altura: {medicionInicial[0].regla} cm  —  {medicionInicial[0].litros.toLocaleString()} L
                  </Text>
                  {Boolean(medicionInicial[0].temperatura) && (
                    <Text className="text-xs text-textMuted dark:text-textMutedDark mt-1">
                      Temperatura: {medicionInicial[0].temperatura} °C
                    </Text>
                  )}
                </View>
              )}
              <View><Text className="text-xs text-textMuted dark:text-textMutedDark">
              </Text></View>
              <Button
                disabled={selectedBodegaDestino === ""}
                title="Medir"
                icon={
                  medicionInicial && medicionInicial?.length > 0
                    ? CheckCheck
                    : RulerDimensionLine
                }
                iconColor={
                  medicionInicial && medicionInicial?.length > 0
                    ? "#0af706"
                    : "#000"
                }
                iconSize="md"
                onPress={() => {
                  if (medicionInicial && medicionInicial?.length > 0) {
                    Alert.alert(
                      "Medición existente",
                      "Ya existe una medición para esta bodega. ¿Desea continuar?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Continuar",
                          onPress: () => {
                            navigation.navigate("medicion", {
                              fromScreen: "traspaso",
                              idBodega: selectedBodegaDestino,
                            });
                          },
                        },
                      ],
                    );
                  } else {
                    navigation.navigate("medicion", {
                      fromScreen: "traspaso",
                      idBodega: selectedBodegaDestino,
                    });
                  }
                }}
              />
              <View><Text className="text-xs text-textMuted dark:text-textMutedDark">
              </Text></View>
            </InputCard>

            <InputCard title="Litros Cargados" required>
              <View className="flex-row items-center p-2 gap-2 w-full">
                <View className="flex-1">
                  <Input
                    value={cargaCombustible}
                    placeholder="Ingrese los litros manualmente (Ej: 150,00)"
                    keyboardType="decimal-pad"
                    onChangeText={setCargaCombustible}
                  />
                </View>
              </View>
            </InputCard>

            {/* Medición Final: Muestra botón y desglose de Altura/Litros */}
            <InputCard title="Medición Final del Tanque Receptor" required>
              {medicionFinal && medicionFinal.length > 0 && (
                <View className="w-full items-center p-2 mt-2 bg-surfaceElevated dark:bg-surfaceElevatedDark rounded-md border border-border dark:border-borderDark">
                  <Text className="text-md font-bold text-text dark:text-textDark">
                    Altura: {medicionFinal[0].regla} cm  —  {medicionFinal[0].litros.toLocaleString()} L
                  </Text>
                  {Boolean(medicionFinal[0].temperatura) && (
                    <Text className="text-xs text-textMuted dark:text-textMutedDark mt-1">
                      Temperatura: {medicionFinal[0].temperatura} °C
                    </Text>
                  )}
                </View>
              )}
              <View><Text className="text-xs text-textMuted dark:text-textMutedDark">
              </Text></View>
              <Button
                disabled={selectedBodegaDestino === ""}
                title="Medir"
                icon={
                  medicionFinal && medicionFinal!.length > 0
                    ? CheckCheck
                    : RulerDimensionLine
                }
                iconColor={
                  medicionFinal && medicionFinal?.length > 0
                    ? "#0af706"
                    : "#000"
                }
                iconSize="md"
                onPress={() => {
                  if (medicionFinal && medicionFinal?.length > 0) {
                    Alert.alert(
                      "Medición existente",
                      "Ya existe una medición para esta bodega. ¿Desea continuar?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Continuar",
                          onPress: () => {
                            navigation.navigate("medicion", {
                              fromScreen: "traspaso",
                              idBodega: selectedBodegaDestino,
                            });
                          },
                        },
                      ],
                    );
                  } else {
                    navigation.navigate("medicion", {
                      fromScreen: "traspaso",
                      idBodega: selectedBodegaDestino,
                    });
                  }
                }}
              />
              <View><Text className="text-xs text-textMuted dark:text-textMutedDark">
              </Text></View>
            </InputCard>

            <InputCard title="Taxilitro Final" required>
              <View className="flex-row items-center p-2 gap-2">
                <Input
                  value={taxilitroFinal}
                  placeholder="Ej: 45351,20"
                  keyboardType="decimal-pad"
                  onChangeText={setTaxilitroFinal}
                />
              </View>
            </InputCard>

            <InputCard title="Foto Taxilitro Final" required>
                <View className="flex-row items-center p-2 gap-2">
                  {base64TaxilitroFinal && base64TaxilitroFinal.length > 0 ? (
                    <Pressable
                      onPress={() =>
                        confirmarEliminacion(() => setBase64TaxilitroFinal(""))
                      }
                    >
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${base64TaxilitroFinal}`,
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
                  iconColor={
                    base64TaxilitroFinal && base64TaxilitroFinal.length > 0
                      ? "#05a722"
                      : "#000"
                  }
                  setImage={(base64) => setBase64TaxilitroFinal(base64)}
                  disabled={isLoading}
                />
              </View>
            </InputCard>

            <InputCard title="Observaciones">
              <View className="flex-row items-center p-2 gap-2">
                <View className="flex-1">
                  <Input
                    multiline
                    numberOfLines={4}
                    placeholder="observaciones"
                    value={obs}
                    onChangeText={setObs}
                  />
                </View>
              </View>
              <View className="flex-row items-center p-2 gap-2">
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={
                    base64Obs && base64Obs.length > 0 ? "#05a722" : "#000"
                  }
                  setImage={(base64) => setBase64Obs(base64)}
                  disabled={isLoading}
                />
              </View>
            </InputCard>

            <View className="flex-row gap-4">
              <Button
                title="Firmar"
                onPress={() =>
                  navigation.navigate("firma", {
                    fromScreen: "traspaso",
                    persona: persona,
                  })
                }
                isLoading={isLoading}
                icon={Pencil}
                iconSize="md"
                iconColor="#000"
              />
              {firma && (
                <Button
                  title="Grabar"
                  onPress={() => savingModal.run(() => handleSaveAll())}
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
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
