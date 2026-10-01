import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
  FlatList,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Edit,
  Fuel,
  Plus,
  RulerDimensionLine,
  SaveAll,
} from "lucide-react-native";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Select } from "@/components/Select";
import { useAppContext } from "@/hooks/useAppContext";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Input } from "@/components/Input";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { Photo } from "@/components/Photo";
import { Button } from "@/components/Button";
import { SavingModal } from "@/components/SavingModal";
import { useSavingModal } from "@/hooks/useSavingModal";
import { StackRoutesProps } from "@/route/app.routes";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import {
  getStorageAbastecimiento,
  removeAbastecimiento,
  AbastecimientoStorageDTO,
} from "@/storage/storageAbastecimiento";
import {
  getAbastecimientoQueue,
  getAbastecimientoQueueEntry,
  addToAbastecimientoQueue,
  updateAbastecimientoQueueEntry,
  removeFromAbastecimientoQueue,
  AbastecimientoQueueEntry,
} from "@/storage/storageQueueAbastecimiento";
import {
  removeMedicionAbastecimiento,
  migrarMedicionAbastecimientoLegacy,
  limpiarMedicionAbastecimientoLegacy,
} from "@/storage/storageMedicionAbastecimiento";
import {
  removeCargaCombustible,
  migrarCargaCombustibleLegacy,
  limpiarCargaCombustibleLegacy,
} from "@/storage/storageCargaCombustible";
import { getBodegasByIdSucursal } from "@DBmodules/bodegaDB";
import {
  anularUltimoFinTurnoPorBodega,
  getTipoByBodega,
  getTurnoStatusLocal,
} from "@DBmodules/turnoBD";
import { saveAbastecimientoLocal } from "@DBmodules/abastecimientoDB";
import { getTimestamp } from "@/services/timeService";
import { EntryListItem } from "@/components/EntryListItem";
import { EmptyList } from "@/components/EmptyList";

// ─── Datos vacios para nueva entrada ──────────────────────────────────────────

function emptyAbastecimientoData(appte: string): AbastecimientoStorageDTO {
  return {
    ordenCompra: "",
    remision: "",
    litros: "",
    selectedBodega: "",
    tipoOperacionSeleccionado: "",
    base64Images: [],
    base64FotoObs: [],
    obs: "",
    obsAdicional: "",
    appte,
    cargaZeta: null,
    medicionInicial: [],
    medicionFinal: [],
    turnoCerrado: false,
  };
}

function tieneDatosRelevantes(draft: AbastecimientoStorageDTO): boolean {
  return (
    draft.selectedBodega !== "" ||
    draft.ordenCompra !== "" ||
    draft.remision !== "" ||
    draft.litros !== "" ||
    draft.base64Images.length > 0 ||
    draft.cargaZeta !== null ||
    draft.medicionInicial.length > 0
  );
}

function getAbastecimientoLabel(
  data: AbastecimientoStorageDTO,
  bodegas: BodegaDTO[]
): string {
  const bodega = bodegas.find(
    (b) => Number(b.id_bodega) === Number(data.selectedBodega)
  );
  const bodegaName =
    bodega?.descripcion_bodega ||
    (data.selectedBodega ? `Bodega #${data.selectedBodega}` : "Sin bodega");
  const oc = data.ordenCompra ? `OC ${data.ordenCompra}` : "Sin OC";
  return `${bodegaName} - ${oc}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Abastecimiento({
  navigation,
  route,
}: StackRoutesProps<"abastecimiento">) {
  const [tipoOperacion] = useState([
    { label: "Llega en la ZETA", value: "0" },
    { label: "NO Llega en la ZETA", value: "1" },
  ]);
  const [tipoOperacionSeleccionado, setTipoOperacionSeleccionado] =
    useState("");
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const { sucursal, user, syncCompleteCounter } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const savingModal = useSavingModal();
  const insets = useSafeAreaInsets();

  // ─── Cola de pendientes (lista / formulario) ───────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [queue, setQueue] = useState<AbastecimientoQueueEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const [obs, setObs] = useState<string>("");
  const [base64FotoObs, setBase64FotoObs] = useState<string[]>([]);
  const [obsAdicional, setObsAdicional] = useState("");
  const [appte, setAppte] = useState("");
  const [ordenCompra, setOrdenCompra] = useState("");
  const [remision, setRemision] = useState("");
  const [litros, setLitros] = useState("");
  const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
  const [selectedBodega, setSelectedBodega] = useState<string>("");
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [formReady, setFormReady] = useState(false);
  const [cargaZeta, setCargaZeta] = useState<CargaZetaDTO | null>(null);
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  const autosaveBloqueadoRef = useRef(false);

  // ─── Persistencia: autosave a la entrada de la cola ────────────────────────
  function buildStorageData(): AbastecimientoStorageDTO {
    return {
      ordenCompra,
      remision,
      litros,
      selectedBodega,
      tipoOperacionSeleccionado,
      base64Images,
      base64FotoObs,
      obs,
      obsAdicional,
      appte,
      cargaZeta,
      medicionInicial,
      medicionFinal,
      turnoCerrado,
    };
  }

  const guardarEstado = useCallback(async () => {
    if (!currentEntryId || viewMode !== "form" || autosaveBloqueadoRef.current)
      return;
    try {
      await updateAbastecimientoQueueEntry(currentEntryId, buildStorageData());
    } catch (error) {
      console.log("[Abastecimiento] Error al guardar en cola:", error);
    }
  }, [
    currentEntryId,
    viewMode,
    ordenCompra,
    remision,
    litros,
    selectedBodega,
    tipoOperacionSeleccionado,
    base64Images,
    base64FotoObs,
    obs,
    obsAdicional,
    appte,
    cargaZeta,
    medicionInicial,
    medicionFinal,
    turnoCerrado,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  async function fetchBodegas() {
    try {
      setIsLoading(true);
      if (user?.cedula) {
        const turnoStatus = await getTurnoStatusLocal(user.cedula);
        setTurnoCerrado(
          turnoStatus.status === "cerrado" ||
            turnoStatus.status === "falta_cerrar",
        );
      }
      const bodegasDB = await getBodegasByIdSucursal(sucursal.id_sucursal);
      setBodegas(bodegasDB);
    } catch (error) {
      toastError("Bodegas", "Error al cargar las bodegas");
    } finally {
      setIsLoading(false);
    }
  }

  // Se re-ejecuta al ganar foco, cuando cambia la sucursal de la sesión y cuando
  // termina un sync de catálogos, para no quedar con las bodegas anteriores.
  useFocusEffect(
    useCallback(() => {
      fetchBodegas();
    }, [sucursal?.id_sucursal, syncCompleteCounter]),
  );

  // Si la bodega seleccionada ya no está en la lista recargada, se limpia.
  useEffect(() => {
    if (!selectedBodega || bodegas.length === 0) return;
    const sigueAsignada = bodegas.some(
      (b) => Number(b.id_bodega) === Number(selectedBodega),
    );
    if (!sigueAsignada) setSelectedBodega("");
  }, [bodegas, selectedBodega]);

  // ─── Init: cola + migración de borrador legacy + appte ─────────────────────
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const draft = await getStorageAbastecimiento();
        if (draft && tieneDatosRelevantes(draft)) {
          const id = Date.now().toString();
          await addToAbastecimientoQueue({
            id,
            data: draft,
            fechaCreacion: Date.now(),
          });
          await migrarCargaCombustibleLegacy(id);
          await migrarMedicionAbastecimientoLegacy(id);
          await removeAbastecimiento();
        } else {
          if (draft) await removeAbastecimiento();
          await limpiarCargaCombustibleLegacy();
          await limpiarMedicionAbastecimientoLegacy();
        }

        const q = await getAbastecimientoQueue();
        setQueue(q);

        const secureTime = await getTimestamp();
        const now = new Date(secureTime.timestampMs);
        const appteStr = `appte ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setAppte(appteStr);
      } catch (error) {
        console.log("[Abastecimiento] Error al inicializar:", error);
        toastError("Error", "No se pudieron cargar los datos.");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (
      ordenCompra === "" ||
      remision === "" ||
      litros === "" ||
      base64Images.length === 0
    ) {
      setFormReady(false);
    } else {
      setFormReady(true);
    }
  }, [ordenCompra, remision, litros, base64Images]);

  useEffect(() => {
    if (viewMode !== "form" || !currentEntryId) return;

    if (route.params?.onCargaZeta) {
      setCargaZeta(route.params.onCargaZeta);
    }

    const newMedicionInicial = route.params?.onMedicionInicial;
    const newMedicionFinal = route.params?.onMedicionFinal;

    if (newMedicionInicial && newMedicionFinal) {
      setMedicionInicial(newMedicionInicial);
      setMedicionFinal(newMedicionFinal);
    }
  }, [
    route.params?.onCargaZeta,
    route.params?.onMedicionInicial,
    route.params?.onMedicionFinal,
  ]);

  function handleFotoObs(image: string) {
    setBase64FotoObs((prev) => [...prev, image]);
  }

  async function handlePhotoCapture(image: string) {
    setBase64Images((prev) => [...prev, image]);
  }

  const removerFoto = (indexParaRemover: number) => {
    Alert.alert("Borrar Foto", "Está seguro de que desea eliminar esta foto?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
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

  // ─── Funciones auxiliares ──────────────────────────────────────────────────

  async function loadQueue() {
    const q = await getAbastecimientoQueue();
    setQueue(q);
  }

  function clearForm() {
    setOrdenCompra("");
    setRemision("");
    setLitros("");
    setSelectedBodega("");
    setTipoOperacionSeleccionado("");
    setBase64Images([]);
    setBase64FotoObs([]);
    setObs("");
    setObsAdicional("");
    setCargaZeta(null);
    setMedicionInicial([]);
    setMedicionFinal([]);
    setTurnoCerrado(false);
    setMotivoConfirmado(false);
  }

  async function limpiarBorradoresDeEntrada(entryId: string) {
    await removeCargaCombustible(entryId);
    await removeMedicionAbastecimiento(entryId);
  }

  // ─── Nueva entrada ─────────────────────────────────────────────────────────
  async function handleNewEntry() {
    autosaveBloqueadoRef.current = false;
    clearForm();

    const id = Date.now().toString();
    const now = await getTimestamp();
    const d = new Date(now.timestampMs);
    const appteStr = `appte ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    setAppte(appteStr);

    const data = emptyAbastecimientoData(appteStr);
    await addToAbastecimientoQueue({ id, data, fechaCreacion: Date.now() });
    setCurrentEntryId(id);
    setViewMode("form");
    await loadQueue();
  }

  // ─── Editar entrada ────────────────────────────────────────────────────────
  async function handleEditEntry(entry: AbastecimientoQueueEntry) {
    const full = await getAbastecimientoQueueEntry(entry.id);
    if (!full) {
      toastError("Abastecimiento", "No se pudo cargar la entrada.");
      await loadQueue();
      return;
    }

    autosaveBloqueadoRef.current = false;
    setCurrentEntryId(entry.id);

    const d = full.data;
    setOrdenCompra(d.ordenCompra);
    setRemision(d.remision);
    setLitros(d.litros);
    setSelectedBodega(d.selectedBodega);
    setTipoOperacionSeleccionado(d.tipoOperacionSeleccionado);
    setBase64Images(d.base64Images);
    setBase64FotoObs(d.base64FotoObs);
    setObs(d.obs);
    setObsAdicional(d.obsAdicional);
    setMotivoConfirmado(Boolean(d.obsAdicional));
    setAppte(d.appte);
    setCargaZeta(d.cargaZeta);
    setMedicionInicial(d.medicionInicial);
    setMedicionFinal(d.medicionFinal);
    setTurnoCerrado(d.turnoCerrado);

    setViewMode("form");
  }

  // ─── Salir sin guardar (elimina entrada de la cola) ────────────────────────
  async function handleSalirSinGuardar() {
    autosaveBloqueadoRef.current = true;
    if (currentEntryId) {
      await removeFromAbastecimientoQueue(currentEntryId);
      await limpiarBorradoresDeEntrada(currentEntryId);
    }
    clearForm();
    setCurrentEntryId(null);
    setViewMode("list");
    await loadQueue();
  }

  // ─── Guardar y salir (conserva la entrada en la cola) ──────────────────────
  async function handleGuardarYSalir() {
    if (!selectedBodega) {
      Alert.alert("Bodega requerida", "Debe seleccionar una bodega.");
      return;
    }
    autosaveBloqueadoRef.current = true;
    clearForm();
    setCurrentEntryId(null);
    setViewMode("list");
    await loadQueue();
  }

  // ─── Eliminar entrada ──────────────────────────────────────────────────────
  async function handleEliminarEntrada(entry: AbastecimientoQueueEntry) {
    Alert.alert("Eliminar", "Desea eliminar esta entrada de la lista?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await removeFromAbastecimientoQueue(entry.id);
          await limpiarBorradoresDeEntrada(entry.id);
          await loadQueue();
        },
      },
    ]);
  }

  // ─── Guardar/Salir (beforeRemove listener) ─────────────────────────────────
  useEffect(() => {
    if (viewMode !== "form") return;

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading) return;
      e.preventDefault();
      Alert.alert("Salir de abastecimiento", "Qué desea hacer?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir sin guardar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Estás seguro?",
              "Se eliminará esta entrada de la lista.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Sí, salir sin guardar",
                  style: "destructive",
                  onPress: async () => {
                    await handleSalirSinGuardar();
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
            if (!selectedBodega) {
              Alert.alert(
                "Bodega requerida",
                "Debe seleccionar una bodega para guardar.",
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

  async function saveAll() {
    setIsLoading(true);
    const secureTime = await getTimestamp();
    const now = new Date(secureTime.timestampMs);
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    if (!selectedBodega) {
      Alert.alert("Bodega requerida", "Debe seleccionar una bodega.");
      setIsLoading(false);
      return;
    }

    const litrosTotalMedicionInicial =
      medicionInicial?.reduce((acc, med) => acc + med.litros, 0) || 0;
    const litrosTotalMedicionFinal =
      medicionFinal?.reduce((acc, med) => acc + med.litros, 0) || 0;
    const tipoTurno = await getTipoByBodega(Number(selectedBodega));
    if (tipoTurno === "2" && !motivoConfirmado) {
      setTurnoCerrado(true);
      setIsLoading(false);
      return;
    }
    const payload = {
      id_suc: sucursal.id_sucursal,
      id_bod: Number(selectedBodega),
      fecha,
      hora,
      nro_oc: Number(ordenCompra),
      nro_remision: remision,
      litros_remision: Number(litros),
      playero: Number(user.cedula),
      foto_rev_docs: base64Images,
      zeta_no_llega: Number(tipoOperacionSeleccionado),
      id_pico_para_zeta: cargaZeta?.id_pico_para_zeta
        ? Number(cargaZeta.id_pico_para_zeta)
        : null,
      taxilitro_inicial: Number(cargaZeta?.taxilitro_inicial) || 0,
      taxilitro_final: Number(cargaZeta?.taxilitro_final) || 0,
      litros_zeta: Number(cargaZeta?.litros_zeta) || 0,
      obs_repos: [obs, obsAdicional, appte].filter(Boolean).join("|"),
      appte: appte,
      foto_obs_repos: base64FotoObs,
      litros_total_repos: String(
        litrosTotalMedicionFinal -
          litrosTotalMedicionInicial -
          (Number(cargaZeta?.litros_zeta) || 0),
      ),
      foto_taxilitro: cargaZeta?.foto_taxilitro || "",
      foto_taxilitro_fin: cargaZeta?.foto_taxilitro_fin || "",
      mediciones_tanque: medicionInicial?.map((med, index) => ({
        id_tanque: Number(med.id_tanque),
        inicio: {
          regla: String(med.regla),
          temperatura: med.temperatura,
          litros: med.litros,
          foto_medicion: med.foto_tanque,
        },
        fin: {
          regla: String(medicionFinal[index]?.regla ?? 0),
          temperatura: medicionFinal[index]?.temperatura,
          litros: medicionFinal[index]?.litros,
          foto_medicion: medicionFinal[index]?.foto_tanque,
        },
      })),
    };

    try {
      await saveAbastecimientoLocal(payload);
      await anularUltimoFinTurnoPorBodega(payload.id_bod, obsAdicional);
      autosaveBloqueadoRef.current = true;
      if (currentEntryId) {
        await removeFromAbastecimientoQueue(currentEntryId);
        await limpiarBorradoresDeEntrada(currentEntryId);
      }
      clearForm();
      setCurrentEntryId(null);
      setViewMode("list");
      toastSuccess("Abastecimiento", "Abastecimiento registrado con éxito");
      await loadQueue();
    } catch (error) {
      console.error("Error al registrar el abastecimiento:", error);
      toastError("Abastecimiento", "Error al registrar el abastecimiento");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Render: modo Lista ────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <View className="flex-1">
        <SavingModal
          visible={savingModal.visible}
          message="Grabando abastecimiento..."
        />
        <ScreenHeader
          title="Abastecimiento"
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
                label={getAbastecimientoLabel(item.data, bodegas)}
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

  return turnoCerrado && !motivoConfirmado ? (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Grabando abastecimiento..."
      />
      <ScreenHeader title="Turno Cerrado" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
                Importente!!!
              </Text>
              <Text className="font-medium text-justify text-xl mb-4">
                Está intentando registrar un abastecimiento y el turno se
                encuentra cerrado. Una vez finalizado se debe realizar el cierre
                correspondiente las bodegas correspondientes.
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  ) : (
    <View className="flex-1">
      <SavingModal
        visible={savingModal.visible}
        message="Grabando abastecimiento..."
      />
      <ScreenHeader title="Abastecimiento" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center p-4 gap-4">
            <InputCard
              title="Orden de Compra"
              required={true}
              verified={ordenCompra !== ""}
            >
              <Input
                keyboardType="number-pad"
                align="center"
                placeholder="informe el número de orden de compra"
                value={ordenCompra}
                onChangeText={setOrdenCompra}
              />
            </InputCard>
            <InputCard
              title="Número de Remisión"
              required={true}
              verified={remision !== ""}
            >
              <Input
                keyboardType="number-pad"
                align="center"
                placeholder="Informe el número de remisión"
                value={remision}
                onChangeText={setRemision}
              />
            </InputCard>
            <InputCard
              title="Litros según remisión"
              required={true}
              verified={litros !== ""}
            >
              <Input
                keyboardType="number-pad"
                align="center"
                placeholder="Informe los litros según remisión"
                value={litros}
                onChangeText={setLitros}
              />
            </InputCard>
            <InputCard
              title="Fotos de precintos y documentación"
              className="min-h-64"
              required={true}
              verified={base64Images.length > 0}
            >
              <View className="w-full items-center p-4 gap-2">
                <ScrollView horizontal={true}>
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
                  isLoading={isLoading}
                  iconSize="lg"
                  iconColor="#fff"
                  setImage={handlePhotoCapture}
                />
              </View>
            </InputCard>
            <InputCard
              title="Selecione la bodega"
              required={true}
              verified={selectedBodega !== ""}
            >
              <Select
                data={bodegas.filter(
                  (b) =>
                    !queue.some(
                      (e) =>
                        e.id !== currentEntryId &&
                        e.data.selectedBodega !== "" &&
                        Number(e.data.selectedBodega) === Number(b.id_bodega),
                    ),
                )}
                isLoading={isLoading}
                selectedValue={selectedBodega}
                setSelectedValue={setSelectedBodega}
                labelField="descripcion_bodega"
                valueField="id_bodega"
              />
            </InputCard>
            <InputCard
              title={"Tipo de operación"}
              required={true}
              verified={tipoOperacionSeleccionado !== ""}
            >
              <Select
                data={tipoOperacion}
                isLoading={isLoading}
                selectedValue={tipoOperacionSeleccionado}
                setSelectedValue={setTipoOperacionSeleccionado}
                labelField={"label"}
                valueField="value"
              />
            </InputCard>
            {formReady && (
              <>
                {tipoOperacionSeleccionado === "1" && (
                  <InputCard title={"Abastecimiento Zeta"} required={true}>
                    {cargaZeta?.litros_zeta && cargaZeta.litros_zeta > 0 && (
                      <Text className="text-red-500 text-center mb-2">
                        {`Fue cargado ${cargaZeta?.litros_zeta} litros de combustible.`}
                      </Text>
                    )}
                    {!cargaZeta && (
                      <Button
                        title="Iniciar"
                        onPress={() => {
                          if (!currentEntryId) return;
                          navigation.navigate("cargaCombustible", {
                            idBodega: selectedBodega,
                            entryId: currentEntryId,
                          });
                        }}
                        icon={Fuel}
                        iconSize="lg"
                        iconColor="#000"
                        isLoading={isLoading}
                      />
                    )}
                  </InputCard>
                )}
                {((tipoOperacionSeleccionado === "1" &&
                  (cargaZeta?.litros_zeta ?? 0) > 0) ||
                  tipoOperacionSeleccionado === "0") && (
                  <InputCard
                    title={"Medición de tanques"}
                    required={true}
                    verified={medicionInicial?.length > 0}
                  >
                        <View className="flex-row justify-center mt-2"></View>
                    {medicionInicial?.length === 0 ? (
                      <Button
                        title="Medir"
                        icon={RulerDimensionLine}
                        iconColor={"#000"}
                        iconSize="md"
                        onPress={() => {
                          if (!currentEntryId) return;
                          navigation.navigate("medicionAbastecimiento", {
                            fromScreen: "abastecimiento",
                            idBodega: selectedBodega,
                            cargaZeta: cargaZeta?.litros_zeta || 0,
                            litrosRemision: Number(litros),
                            entryId: currentEntryId,
                          });
                        }}
                      />
                    ) : (
                      <View className="w-full gap-3">
                        {medicionInicial.map((medIni, index) => {
                          const medFin = medicionFinal[index];
                          return (
                            <View
                              key={index}
                              className="p-3 bg-gray-100 rounded-lg border border-gray-200 gap-1"
                            >
                              <View className="flex-row justify-between border-b border-gray-200 pb-1">
                                <Text className="font-bold text-gray-800 text-base text-lg">
                                  Inicial:
                                </Text>
                                <Text className="font-bold text-gray-800 text-base text-lg">
                                  {medIni.litros} L  -  {" "}
                                  {medIni.temperatura} °C
                                </Text>
                              </View>
                              {medFin && (
                                <View className="flex-row justify-between pt-1">
                                  <Text className="font-bold text-gray-800 text-base text-lg">
                                    Final:
                                  </Text>
                                  <Text className="font-bold text-gray-800 text-base text-lg">
                                    {medFin.litros} L  - {" "}
                                    {medFin.temperatura} °C
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                        <View className="flex-row justify-center mt-2">
                          <View className="flex-row justify-center mt-2"></View>
                          <Button
                            title="Editar"
                            icon={Edit}
                            iconColor={"#000"}
                            iconSize="md"
                            onPress={() => {
                              if (!currentEntryId) return;
                              navigation.navigate("medicionAbastecimiento", {
                                fromScreen: "abastecimiento",
                                idBodega: selectedBodega,
                                cargaZeta: cargaZeta?.litros_zeta || 0,
                                litrosRemision: Number(litros),
                                entryId: currentEntryId,
                              });
                            }}
                          />
                        </View>
                        <View className="flex-row justify-center mt-2"></View>
                      </View>
                    )}
                  </InputCard>
                )}
                {medicionInicial?.length !== 0 && (
                  <>
                    <InputCard title="Observaciones">
                      <View className="flex-row items-center p-2 gap-2">
                        <Input
                          multiline
                          numberOfLines={4}
                          placeholder="observaciones"
                          value={obs}
                          onChangeText={setObs}
                        />
                        <View className="flex-col gap-6">
                          <Photo
                            form="icon"
                            iconSize="lg"
                            iconColor={
                              base64FotoObs.length > 0 ? "#05a722" : "#000"
                            }
                            setImage={handleFotoObs}
                            disabled={isLoading}
                          />
                        </View>
                      </View>
                    </InputCard>
                    <Button
                      disabled={isLoading}
                      title="Grabar"
                      onPress={() => savingModal.run(saveAll)}
                      isLoading={isLoading}
                      icon={SaveAll}
                      iconSize="md"
                      iconColor="#000"
                    />
                  </>
                )}
              </>
            )}
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
