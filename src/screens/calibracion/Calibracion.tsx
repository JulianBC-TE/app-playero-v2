// src/screens/calibracion/Calibracion.tsx
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InputCard } from "@/components/InputCard";
import { Photo } from "@/components/Photo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Select } from "@/components/Select";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Input } from "@/components/Input";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { Fuel, Pencil, SaveAll } from "lucide-react-native";
import { Button } from "@/components/Button";
import {
  removeCalibracion,
  getStorageCalibracion,
  saveCalibracion,
  calibracionDTO,
  hasCalibracionGuardada,
} from "@/storage/storageCalibracion";

// ── BD ────────────────────────────────────────────────────────────────────────
import { getPicosByBodega, getPicos } from "@DBmodules/picoDB";
import { getBodegasByIdSucursal } from "@DBmodules/bodegaDB";
import {
  anularUltimoFinTurnoPorBodega,
  getTipoByBodega,
  getTurnoStatusLocal,
} from "@DBmodules/turnoBD";
import { saveCalibracionLocal } from "@/backend/db/modules/calibracionDB";
import { getTimestamp } from "@/services/timeService";

interface MedicionesCalibracionExtendida {
  taxilitroInicial: number;
  taxilitroFinal: number;
  fotoInicialTaxilitro: string;
  fotoFinalTaxilitro: string;
  totalMediciones: number;
  sequencias: {
    valor_medicion: string;
    foto_medicion: string; 
    taxilitro: number;
    litros_cargados: number;
    foto_taxilitro_carga: string;
  }[];
}

export function Calibracion({
  navigation,
  route,
}: StackRoutesProps<"calibracion">) {
  const [tipoOperacion] = useState([
    { label: "Verificación", value: "1" },
    { label: "Calibración", value: "2" },
  ]);
  const [tipoOperacionSeleccionado, setTipoOperacionSeleccionado] =
    useState("");
  const insets = useSafeAreaInsets();
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const { sucursal } = useAppContext();
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [selectedPico, setSelectedPico] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [obs, setObs] = useState("");
  const [appte, setAppte] = useState("");
  const [photoObs, setPhotoObs] = useState<string | null>(null);
  const [obsAdicional, setObsAdicional] = useState("");
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [photoPrecintoAtual, setPhotoPrecintoAtual] = useState<string>("");
  const [photoPrecintoColocado, setPhotoPrecintoColocado] =
    useState<string>("");
  const [numeroPrecintoColocado, setNumeroPrecintoColocado] = useState("");
  const [numeroPrecintoAtual, setNumeroPrecintoAtual] = useState("");
  const [salida] = useState(0);
  const [motivoConfirmado, setMotivoConfirmado] = useState(false);

  const [mediciones, setMediciones] = useState<MedicionesCalibracionExtendida>({
    taxilitroInicial: 0,
    taxilitroFinal: 0,
    fotoInicialTaxilitro: "",
    fotoFinalTaxilitro: "",
    totalMediciones: 0,
    sequencias: [],
  });

  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  const autosaveBloqueadoRef = useRef(false);
  const ultimoGuardadoPromiseRef = useRef<Promise<void> | null>(null);

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

  // ─── Guardar estado en storage ────────────────────────────────────────────
  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado || autosaveBloqueadoRef.current) return;
    try {
      const now = new Date();
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8);

      let idBodega = 0;
      let id_pico = 0;

      picos.forEach((pico) => {
        if (pico.id_pico_surtidor === Number(selectedPico)) {
          idBodega = pico.id_bodega;
          id_pico = pico.id_pico;
        }
      });

      const estado: calibracionDTO = {
        fecha,
        hora,
        idBodega,
        id_pico,
        obs,
        obsAdicional,
        appte,
        cedula: persona?.cedula ?? 0,
        nombre: persona?.nombre_apellido ?? "",
        selectedPico,
        numeroPrecintoAtual,
        numeroPrecintoColocado,
        photoPrecintoAtual,
        photoPrecintoColocado,
        firma,
        tipoOperationSeleccionado: tipoOperacionSeleccionado,
        taxilitroInicial: mediciones.taxilitroInicial,
        taxilitroFinal: mediciones.taxilitroFinal,
        fotoInicialTaxilitro: mediciones.fotoInicialTaxilitro,
        fotoFinalTaxilitro: mediciones.fotoFinalTaxilitro,
        totalMediciones: mediciones.totalMediciones,
        sequencias: mediciones.sequencias,
        turnoCerrado,
      };

      const promesa = saveCalibracion(estado);
      ultimoGuardadoPromiseRef.current = promesa;
      await promesa;
    } catch (error) {
      console.log("[Calibracion] Error al guardar estado:", error);
    }
  }, [
    estadoRestaurado,
    persona,
    selectedPico,
    obs,
    obsAdicional,
    appte,
    numeroPrecintoAtual,
    numeroPrecintoColocado,
    photoPrecintoAtual,
    photoPrecintoColocado,
    firma,
    tipoOperacionSeleccionado,
    mediciones,
    turnoCerrado,
    picos,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || (!estadoRestaurado && !hasCalibracionGuardada())) return;
      e.preventDefault();
      Alert.alert(
        "Salir de calibración",
        "Hay cambios sin confirmar. ¿Qué desea hacer?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "¿Estás seguro?",
                "Se perderán todos los datos de esta Calibración. Esta acción no se puede deshacer.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sí, salir sin guardar",
                    style: "destructive",
                    onPress: async () => {
                      autosaveBloqueadoRef.current = true;
                      await removeCalibracion();
                      navigation.navigate("home"); // ◄ Redirige directamente a Home
                    },
                  },
                ],
              );
            },
          },
          {
            text: "Guardar y salir",
            onPress: async () => {
              autosaveBloqueadoRef.current = true;
              await guardarEstado();
              navigation.navigate("home"); // ◄ Redirige directamente a Home
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, guardarEstado, isLoading, estadoRestaurado]);

  // ─── Restaurar estado desde storage al montar ─────────────────────────────
  useEffect(() => {
    async function restaurarEstado() {
      const secureTime = await getTimestamp();
      const now = new Date(secureTime.timestampMs);
      const appteDefault = `appte ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setAppte(appteDefault);

      try {
        const estadoGuardado = await getStorageCalibracion();
        if (estadoGuardado) {
          setTipoOperacionSeleccionado(
            estadoGuardado.tipoOperationSeleccionado ?? "",
          );
          setSelectedPico(estadoGuardado.selectedPico);
          setObs(estadoGuardado.obs);
          setObsAdicional(estadoGuardado.obsAdicional);
          if (estadoGuardado.obsAdicional) setMotivoConfirmado(true);
          if (estadoGuardado.appte) {
            setAppte(estadoGuardado.appte);
          }
          setNumeroPrecintoAtual(estadoGuardado.numeroPrecintoAtual);
          setNumeroPrecintoColocado(estadoGuardado.numeroPrecintoColocado);
          setPhotoPrecintoAtual(estadoGuardado.photoPrecintoAtual);
          setPhotoPrecintoColocado(estadoGuardado.photoPrecintoColocado);
          setFirma(estadoGuardado.firma);
          setTurnoCerrado(estadoGuardado.turnoCerrado);
          if (estadoGuardado.cedula) {
            setPersona({
              cedula: estadoGuardado.cedula,
              nombre_apellido: estadoGuardado.nombre,
            } as PersonaDTO);
          }
          if (estadoGuardado.totalMediciones > 0) {
            setMediciones({
              taxilitroInicial: estadoGuardado.taxilitroInicial,
              taxilitroFinal: estadoGuardado.taxilitroFinal,
              fotoInicialTaxilitro: estadoGuardado.fotoInicialTaxilitro ?? "",
              fotoFinalTaxilitro: estadoGuardado.fotoFinalTaxilitro ?? "",
              totalMediciones: estadoGuardado.totalMediciones,
              sequencias: estadoGuardado.sequencias,
            });
          }
        }
      } catch (error) {
        console.log("[Calibracion] Error al restaurar estado:", error);
      } finally {
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, []);

  // ─── Parámetros de navegación ────────────────────────────────────────────
  useEffect(() => {
    if (route.params?.onSequencia) {
      const seqData = route.params.onSequencia as any;
      setMediciones({
        taxilitroInicial: seqData.taxilitroInicial,
        taxilitroFinal: seqData.taxilitroFinal,
        fotoInicialTaxilitro: seqData.fotoInicialTaxilitro || "",
        fotoFinalTaxilitro: seqData.fotoFinalTaxilitro || "",
        totalMediciones: seqData.totalMediciones,
        sequencias: seqData.sequencias || [],
      });
    }
    if (route.params?.onPersona) setPersona(route.params.onPersona);
    if (route.params?.onFirma) setFirma(route.params.onFirma);
  }, [
    route.params?.onPersona,
    route.params?.onFirma,
    route.params?.onSequencia,
  ]);

  // ─── Carga inicial de picos desde BD ──────────────────────────────────────
  useEffect(() => {
    fetchPicos();
  }, []);

  function handlePhotoObs(image: string) {
    setPhotoObs(image);
  }
  function handlePhotoPrecintoColocado(image: string) {
    setPhotoPrecintoColocado(image);
  }
  function handlePhotoPrecintoAtual(image: string) {
    setPhotoPrecintoAtual(image);
  }

  async function handleVerificacion() {
    if (tipoOperacionSeleccionado === "") {
      Alert.alert(
        "Tipo de operación requerido",
        "Debe seleccionar un tipo de operación.",
      );
      return;
    }
    if (tipoOperacionSeleccionado === "2") {
      if (!numeroPrecintoAtual) {
        Alert.alert(
          "Precinto",
          "Debe ingresar el número de precinto a retirar.",
        );
        return;
      }
      if (!photoPrecintoAtual) {
        Alert.alert(
          "Precinto",
          "Debe capturar una foto del precinto retirado.",
        );
        return;
      }
    }
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
      return;
    }
    const picoSurtidor = picos.find(
      (pico) => pico.id_pico_surtidor === Number(selectedPico),
    );
    if (!picoSurtidor) {
      Alert.alert(
        "ID Pico Surtidor",
        "El valor para el pico surtidor no fue encontrado.",
      );
      return;
    }
    navigation.navigate("sequencias", {
      pico_surtidor: Number(selectedPico),
      descripcion_pico: picoSurtidor?.descripcion_pico,
      medicionesExistentes: mediciones,
    } as any);
  }

  async function fetchPicos() {
    setIsLoading(true);
    try {
      const turnoStatus = await getTurnoStatusLocal(sucursal.id_sucursal);
      if (
        turnoStatus.status === "cerrado" ||
        turnoStatus.status === "falta_cerrar"
      ) {
        setTurnoCerrado(true);
      }

      const bodegas = await getBodegasByIdSucursal(sucursal.id_sucursal);
      if (bodegas.length > 0) {
        const todasLasBodegas = bodegas.map((b) => Number(b.id_bodega));
        let todosPicos: PicoDTO[] = [];
        for (const idBod of todasLasBodegas) {
          const picosBodega = await getPicosByBodega(idBod);
          todosPicos = [...todosPicos, ...picosBodega];
        }
        setPicos(todosPicos);
      } else {
        const todosPicos = await getPicos();
        setPicos(todosPicos);
      }
    } catch (error) {
      console.error("Error al buscar picos desde BD:", error);
      toastError("Error al buscar picos", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveAllData() {
    setIsLoading(true);
    if (!persona) {
      Alert.alert(
        "Persona requerida",
        "Debe seleccionar una persona encargada.",
      );
      setIsLoading(false);
      return;
    }
    if (!firma) {
      Alert.alert("Firma requerida", "Debe firmar para continuar.");
      setIsLoading(false);
      return;
    }

    try {
      const secureTime = await getTimestamp();
      const now = new Date(secureTime.timestampMs);
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8);
      let id_bodega = 0;
      let id_pico = 0;

      picos.forEach((pico) => {
        if (pico.id_pico_surtidor === Number(selectedPico)) {
          id_bodega = pico.id_bodega;
          id_pico = pico.id_pico;
        }
      });

      const tipoTurno = await getTipoByBodega(Number(id_bodega));

      if (tipoTurno === "2" && !motivoConfirmado) {
        setTurnoCerrado(true);
        setIsLoading(false);
        return;
      }

      autosaveBloqueadoRef.current = true;
      if (ultimoGuardadoPromiseRef.current) {
        await ultimoGuardadoPromiseRef.current;
      }

      const payload: any = {
        fecha_hora: fecha,
        hora,
        bodega: id_bodega,
        obs_gral: [obs, obsAdicional, appte].filter(Boolean).join(" | "),
        ci_encargado: persona?.cedula,
        nombre_encargado: persona?.nombre_apellido,
        pico: id_pico,
        taxilitro_inicial: mediciones.taxilitroInicial,
        taxilitro_final: mediciones.taxilitroFinal,
        foto_inicial_taxilitro: mediciones.fotoInicialTaxilitro,
        foto_final_taxilitro: mediciones.fotoFinalTaxilitro,

        nro_precinto_retirado:
          tipoOperacionSeleccionado === "2" ? numeroPrecintoAtual : "",
        nro_precinto_colocado:
          tipoOperacionSeleccionado === "2" ? numeroPrecintoColocado : "",
        foto_precinto_retirado:
          tipoOperacionSeleccionado === "2" ? photoPrecintoAtual : "",
        foto_precinto_colocado:
          tipoOperacionSeleccionado === "2" ? photoPrecintoColocado : "",
        firma_calibrador: firma,
        tipo_operacion:
          tipoOperacionSeleccionado === "1" ? "VERIFICACION" : "CALIBRACION",
        detalles: mediciones.sequencias.map((medicion) => ({
          val_medicion: medicion.valor_medicion,
          foto_med_balde: medicion.foto_medicion,
          taxilitro_carga: medicion.taxilitro.toString(),
          litros_cargados: medicion.litros_cargados ?? 0,
          foto_taxilitro_carga: medicion.foto_taxilitro_carga,
        })),
      };

      await saveCalibracionLocal(payload);
      await anularUltimoFinTurnoPorBodega(id_bodega, obsAdicional);
      await removeCalibracion();
      setTipoOperacionSeleccionado("");
      setSelectedPico("");
      setObs("");
      setObsAdicional("");
      setPhotoObs(null);
      setNumeroPrecintoAtual("");
      setNumeroPrecintoColocado("");
      setPhotoPrecintoAtual("");
      setPhotoPrecintoColocado("");
      setFirma(null);
      setPersona(null);
      setMediciones({
        taxilitroInicial: 0,
        taxilitroFinal: 0,
        fotoInicialTaxilitro: "",
        fotoFinalTaxilitro: "",
        totalMediciones: 0,
        sequencias: [],
      });

      toastSuccess(
        "Calibración guardada",
        "Los datos se han guardado correctamente.",
      );
      navigation.navigate("home");
    } catch (error) {
      console.error("Error al guardar calibración:", error);
      toastError("Error al guardar", "Intente nuevamente más tarde.");
      autosaveBloqueadoRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }

  return turnoCerrado && !motivoConfirmado ? (
    <View className="flex-1">
      <ScreenHeader title="Turno Cerrado" />
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
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
                Importente!!!
              </Text>
              <Text className="font-medium text-justify text-xl mb-4">
                Está intentando registrar una calibración y el turno se
                encuentra cerrado. Una vez finalizada se debe realizar el cierre
                correspondiente de las bodegas correspondientes.
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
                  if (obsAdicional.trim() === "") {
                    Alert.alert(
                      "Motivo requerido",
                      "Por favor describa el motivo.",
                    );
                    return;
                  }
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
      <ScreenHeader
        title="Calibración"
        disableBackButton={mediciones.totalMediciones > 0}
      />
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
            <InputCard
              title="Tipo de operación"
              required={true}
              locked={salida !== 0}
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
            <InputCard
              title="Selecione el pico:"
              required={true}
              locked={salida !== 0}
            >
              {salida === 0 && (
                <Select
                  data={picos}
                  isLoading={isLoading}
                  selectedValue={selectedPico}
                  setSelectedValue={setSelectedPico}
                  labelField="descripcion_pico"
                  valueField="id_pico_surtidor"
                />
              )}
              {salida !== 0 && (
                <Text className="text-lg text-black font-bold">
                  Pico seleccionado: {selectedPico}
                </Text>
              )}
            </InputCard>

            {tipoOperacionSeleccionado === "2" && (
              <InputCard
                title="Número de Precinto a retirar"
                locked={salida !== 0}
              >
                <View className="flex-row items-center p-2 gap-2">
                  <Input
                    editable={salida === 0}
                    keyboardType="number-pad"
                    align="center"
                    placeholder="Número de precinto"
                    value={numeroPrecintoAtual}
                    onChangeText={setNumeroPrecintoAtual}
                  />
                </View>
              </InputCard>
            )}
            {tipoOperacionSeleccionado === "2" && (
              <InputCard title="Foto Precinto a Retirar">
                <View className="flex-row items-center p-2 gap-2">
                  {photoPrecintoAtual ? (
                    <Pressable
                      onPress={() =>
                        confirmarEliminacion(() => handlePhotoPrecintoAtual(""))
                      }
                    >
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${photoPrecintoAtual}`,
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
                    disabled={isLoading}
                    iconSize="lg"
                    iconColor={photoPrecintoAtual ? "#05a722" : "#000"}
                    setImage={handlePhotoPrecintoAtual}
                  />
                </View>
              </InputCard>
            )}

            <InputCard
              title="Verificación del pico"
              required={true}
              locked={salida !== 0}
            >
              {mediciones.totalMediciones === 0 ? (
                <Button
                  title="Verificar"
                  onPress={() => {
                    handleVerificacion();
                  }}
                  isLoading={isLoading}
                  icon={Fuel}
                  iconSize="md"
                  iconColor="#000"
                />
              ) : (
                <View className="gap-3 w-full items-center">
                  <Text className="text-lg text-black font-bold">
                    Mediciones Realizadas: {mediciones.totalMediciones}
                  </Text>
                  {salida === 0 && (
                    <Button
                      title="Continuar"
                      onPress={() => {
                        handleVerificacion();
                      }}
                      isLoading={isLoading}
                    />
                  )}
                </View>
              )}
              <View className="gap-3 w-full items-center">
                <Text className="text-lg text-black font-bold"></Text>
              </View>
            </InputCard>

            {tipoOperacionSeleccionado === "2" && (
              <InputCard
                title="Número de Precinto colocado"
                locked={salida !== 0}
              >
                <View className="flex-row items-center p-2 gap-2">
                  <Input
                    editable={!isLoading}
                    keyboardType="number-pad"
                    align="center"
                    placeholder="Número de precinto"
                    value={numeroPrecintoColocado}
                    onChangeText={setNumeroPrecintoColocado}
                  />
                </View>
              </InputCard>
            )}
            
            {tipoOperacionSeleccionado === "2" && (
              <InputCard title="Foto Precinto a Retirar">
                <View className="flex-row items-center p-2 gap-2">
                  {photoPrecintoColocado ? (
                    <Pressable
                      onPress={() =>
                        confirmarEliminacion(() => handlePhotoPrecintoColocado(""))
                      }
                    >
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${photoPrecintoColocado}`,
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
                    disabled={salida !== 0}
                    iconSize="lg"
                    iconColor={photoPrecintoColocado ? "#05a722" : "#000"}
                    setImage={handlePhotoPrecintoColocado}
                  />
                </View>
              </InputCard>
            )}

            {mediciones.totalMediciones > 0 && (
              <InputCard title="Observaciones" locked={salida !== 0}>
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
                      disabled={salida !== 0}
                      iconSize="lg"
                      iconColor={salida !== 0 ? "#756868eb" : "#000"}
                      setImage={handlePhotoObs}
                    />
                  </View>
                </View>
              </InputCard>
            )}
            {mediciones.totalMediciones > 0 && (
              <InputCard
                title="Encargado de la calibración"
                required={true}
                locked={salida !== 0}
              >
                <TextSearch
                  enabled={salida === 0}
                  textValue={persona?.nombre_apellido}
                  placeholder="Buscar persona"
                  onPress={() =>
                    navigation.navigate("buscarpersona", {
                      enabledSelect: true,
                      fromScreen: "calibracion",
                    })
                  }
                />
              </InputCard>
            )}

            {mediciones.totalMediciones > 0 && persona && (
              <>
                <View className="flex-row gap-4">
                  <Button
                    disabled={mediciones.totalMediciones === 0}
                    title="Firmar"
                    onPress={() =>
                      navigation.navigate("firma", {
                        fromScreen: "calibracion",
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
                      onPress={() => saveAllData()}
                      isLoading={isLoading}
                      icon={SaveAll}
                      iconSize="md"
                      iconColor="#000"
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
