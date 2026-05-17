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
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { Pencil, SaveAll } from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Photo } from "@/components/Photo";
import {
  getStorageSalida,
  removeSalida,
  saveSalida,
  SalidaStorageDTO,
} from "@/storage/storageSalida";
import { crearTicketLocal } from "@DBmodules/ticketDB";
import { normalizarFecha } from "@/backend/db/services/turnoStatusService";
import { getPicosByBodega } from "@DBmodules/picoDB";
import { getBodegasByIdSucursal } from "@DBmodules/bodegaDB";
import { getTurnoStatusLocal } from "@DBmodules/turnoBD";

// ─── Form & Schema ────────────────────────────────────────────────────────────

type FormData = {
  horometro?: string | null;
  kilometraje?: string | null;
  litros: string;
  observaciones?: string;
};

const registrarSalidaSchema = yup.object({
  horometro: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^[0-9,]*$/, "Solo números y coma permitidos"),
  kilometraje: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^[0-9]*$/, "Solo números permitidos"),
  litros: yup
    .string()
    .required("Los litros cargados son requeridos")
    .matches(/^[0-9]+([.,][0-9]{1,2})?$/, "Formato inválido (ej: 123,45)"),
  observaciones: yup
    .string()
    .optional()
    .max(500, "Máximo 500 caracteres permitidos"),
});

// ─── Componente ───────────────────────────────────────────────────────────────

export function Salida({ navigation, route }: StackRoutesProps<"salida">) {
  const { sucursal, user } = useAppContext();

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<SalidaStorageDTO | null>(
    null,
  );
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [motivoConfirmado, setMotivoConfirmado] = useState(false);

  // ─── Datos ──────────────────────────────────────────────────────────────────
  const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  // ─── Selecciones ────────────────────────────────────────────────────────────
  const [selectedBodega, setSelectedBodega] = useState<string>("");
  const [selectedPico, setSelectedPico] = useState<string>("");
  const [obsAdicional, setObsAdicional] = useState<string>("");

  // ─── Fotos ──────────────────────────────────────────────────────────────────
  const [base64Vehiculo, setBase64Vehiculo] = useState<string>("");
  const [base64Horometro, setBase64Horometro] = useState<string>("");
  const [base64Kilometraje, setBase64Kilometraje] = useState<string>("");
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
      litros: "",
      observaciones: "",
    },
  });

  // watch() en lugar de control._formValues (API pública de RHF)
  const watchedValues = watch();

  // ─── Init: turno + bodegas ────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setIsLoading(true);

      // Estado del turno — local
      try {
        const turnoData = await getTurnoStatusLocal(sucursal.id_sucursal);
        if (
          turnoData.status === "cerrado" ||
          turnoData.status === "falta_cerrar"
        ) {
          setTurnoCerrado(true);
        }
      } catch (err) {
        console.error("[Salida] Error al obtener estado del turno:", err);
      }

      // Bodegas de la sucursal — local
      try {
        const bodegasLocales = await getBodegasByIdSucursal(
          sucursal.id_sucursal,
        );
        setBodegas(bodegasLocales);
      } catch (err) {
        console.error("[Salida] Error al obtener bodegas:", err);
        toastError("Error", "No se pudieron cargar las bodegas.");
      } finally {
        setIsLoading(false);
      }
    }

    init();

    // Permisos de ubicación
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // ─── Picos según bodega seleccionada ─────────────────────────────────────

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
        setSelectedPico(""); // resetear pico al cambiar bodega
      } catch (err) {
        console.error("[Salida] Error al obtener picos:", err);
        toastError("Error", "No se pudieron cargar los picos.");
      }
    }

    cargarPicos();
  }, [selectedBodega]);

  // ─── Params de navegación (persona, vehículo, firma) ─────────────────────

  useEffect(() => {
    if (route.params?.onPersona) setPersona(route.params.onPersona);
    if (route.params?.onVehiculo) setVehiculo(route.params.onVehiculo);
    if (route.params?.onFirma) setFirma(route.params.onFirma);
  }, [
    route.params?.onPersona,
    route.params?.onVehiculo,
    route.params?.onFirma,
  ]);

  // ─── Guardar ticket ───────────────────────────────────────────────────────

  async function handleSaveAll({
    horometro,
    kilometraje,
    litros,
    observaciones,
  }: FormData) {
    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un operador.");
      return;
    }
    if (!vehiculo) {
      Alert.alert("Vehículo requerido", "Debe seleccionar un vehículo.");
      return;
    }
    if (!base64Vehiculo) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar una foto de la chapa o código del vehículo.",
      );
      return;
    }
    if (!selectedBodega) {
      Alert.alert("Bodega requerida", "Debe seleccionar una bodega.");
      return;
    }
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expendedor.");
      return;
    }
    if (!kilometraje && !horometro) {
      Alert.alert(
        "Campos requeridos",
        "Debe completar al menos Horómetro o Kilometraje.",
      );
      return;
    }
    if (horometro && !base64Horometro) {
      Alert.alert("Foto requerida", "Debe capturar una foto del horómetro.");
      return;
    }
    if (kilometraje && !base64Kilometraje) {
      Alert.alert("Foto requerida", "Debe capturar una foto del kilometraje.");
      return;
    }

    const pico = picos.find((p) => p.id_pico === Number(selectedPico));
    if (!pico) {
      Alert.alert("Error", "No se encontró el pico seleccionado.");
      return;
    }

    const now = new Date();

    const ticketJson = {
      id_suc: sucursal.id_sucursal,
      id_bod: Number(selectedBodega),
      id_pico: Number(selectedPico),
      id_vehiculo: vehiculo.id_vehiculo ?? "",
      id_playero: Number(user.cedula),
      id_operador: Number(persona.cedula),
      litros: Number((litros ?? "0").replace(",", ".")),
      kilometraje: Number(kilometraje) || 0,
      horometro: Number((horometro ?? "").replace(",", ".")) || 0,
      inicio_taxilitro: 0,
      fin_taxilitro: 0,
      ruc_cliente: "",
      fecha: now.toISOString().slice(0, 10),
      hora: now.toTimeString().slice(0, 8),
      precio: 0,
      foto_chapa: base64Vehiculo ? [base64Vehiculo] : [],
      firma_conductor: firma ? [firma] : [],
      foto_kilometraje: base64Kilometraje ? [base64Kilometraje] : [],
      foto_horometro: base64Horometro ? [base64Horometro] : [],
      ubicacion_carga: location
        ? `https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`
        : "",
      observaciones_ticket: `${observaciones ?? ""} >> ${obsAdicional}`,
      foto_observaciones: base64Obs ? [base64Obs] : [],
    };

    try {
      setIsLoading(true);
      await crearTicketLocal({
        json: ticketJson,
        tipo: "salida",
        fecha: normalizarFecha(now),
        hora: Date.now(),
      });

      await removeSalida();

      // Reset completo
      setPersona(null);
      setVehiculo(null);
      setFirma(null);
      setSelectedBodega("");
      setSelectedPico("");
      setBase64Vehiculo("");
      setBase64Horometro("");
      setBase64Kilometraje("");
      setBase64Obs("");
      setObsAdicional("");
      reset();

      toastSuccess("Registro de Salida", "Salida registrada localmente.");
      navigation.navigate("home");
    } catch (error) {
      console.error("[Salida] Error al guardar salida:", error);
      toastError("Registro de Salida", "No se pudo guardar la salida.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────

  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;
    try {
      const estado: SalidaStorageDTO = {
        persona,
        vehiculo,
        firma,
        selectedBodega,
        selectedPico,
        idPico_surtidor: 0, // obsoleto, se mantiene por compatibilidad del tipo
        salida: 0, // obsoleto, se mantiene por compatibilidad del tipo
        cargaCombustible: watchedValues.litros ?? "",
        totalizadorPicoInicial: 0,
        totalizadorPicoFinal: 0,
        base64Vehiculo,
        base64Horometro,
        base64Kilometraje,
        base64Obs,
        horometro: watchedValues.horometro ?? "",
        kilometraje: watchedValues.kilometraje ?? "",
        observaciones: watchedValues.observaciones ?? "",
        obsAdicional,
        turnoCerrado,
      };
      await saveSalida(estado);
    } catch (error) {
      console.log("[Salida] Error al guardar estado:", error);
    }
  }, [
    estadoRestaurado,
    persona,
    vehiculo,
    firma,
    selectedBodega,
    selectedPico,
    base64Vehiculo,
    base64Horometro,
    base64Kilometraje,
    base64Obs,
    obsAdicional,
    turnoCerrado,
    watchedValues,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  // ─── Restaurar estado ─────────────────────────────────────────────────────

  useEffect(() => {
    async function restaurarEstado() {
      let guardado: SalidaStorageDTO | null = null;
      try {
        guardado = await getStorageSalida();
        if (guardado) {
          setPersona(guardado.persona);
          setVehiculo(guardado.vehiculo);
          setFirma(guardado.firma);
          setSelectedBodega(guardado.selectedBodega ?? "");
          setSelectedPico(guardado.selectedPico);
          setBase64Vehiculo(guardado.base64Vehiculo);
          setBase64Horometro(guardado.base64Horometro);
          setBase64Kilometraje(guardado.base64Kilometraje);
          setBase64Obs(guardado.base64Obs);
          setValue("horometro", guardado.horometro);
          setValue("kilometraje", guardado.kilometraje);
          setValue("litros", guardado.cargaCombustible);
          setValue("observaciones", guardado.observaciones);
          setObsAdicional(guardado.obsAdicional);
          if (guardado.obsAdicional) setMotivoConfirmado(true);
          setTurnoCerrado(guardado.turnoCerrado);
          setEstadoInicial(guardado);
        }
      } catch (error) {
        console.log("[Salida] Error al restaurar estado:", error);
      } finally {
        if (!guardado) {
          setEstadoInicial({
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
            base64Obs: "",
            horometro: "",
            kilometraje: "",
            observaciones: "",
            obsAdicional: "",
            turnoCerrado: false,
          });
        }
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, []);

  // ─── Guardar/Salir ────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || !estadoRestaurado) return;
      e.preventDefault();
      Alert.alert("Salir de salida", "¿Qué desea hacer?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir sin guardar",
          style: "destructive",
          onPress: () => {
            Alert.alert("¿Estás seguro?", "Se perderán todos los datos.", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Sí, salir sin guardar",
                style: "destructive",
                onPress: async () => {
                  await removeSalida();
                  navigation.dispatch(e.data.action);
                },
              },
            ]);
          },
        },
        {
          text: "Guardar y salir",
          onPress: async () => {
            await guardarEstado();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, guardarEstado, isLoading, estadoRestaurado]);

  // ─── Render: turno cerrado ────────────────────────────────────────────────

  if (turnoCerrado && !motivoConfirmado) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Salida Excepcional" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.overlay}>
              <View style={styles.modalContent}>
                <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
                  ¡Importante!
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
    );
  }

  // ─── Render: flujo normal ─────────────────────────────────────────────────

  return (
    <View className="flex-1">
      <ScreenHeader title="Salida Combustible" />
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

            {/* Equipo/Vehículo */}
            <InputCard title="Equipo/Vehículo" required>
              <View className="flex-row items-center p-2 gap-2">
                <TextSearch
                  textValue={vehiculo?.descripcion_vehiculo}
                  placeholder="Buscar vehículo"
                  onPress={() =>
                    navigation.navigate("buscarvehiculo", {
                      enabledSelect: true,
                      fromScreen: "salida",
                    })
                  }
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={base64Vehiculo ? "#05a722" : "#000"}
                  setImage={setBase64Vehiculo}
                />
              </View>
            </InputCard>

            {/* Bodega */}
            <InputCard title="Bodega" required>
              <Select
                data={bodegas}
                isLoading={isLoading}
                selectedValue={selectedBodega}
                setSelectedValue={setSelectedBodega}
                labelField="descripcion_bodega"
                valueField="id_bodega"
              />
            </InputCard>

            {/* Pico expendedor — solo habilitado si hay bodega seleccionada */}
            <InputCard title="Pico expendedor" required>
              <Select
                data={picos}
                isLoading={isLoading && !!selectedBodega}
                selectedValue={selectedPico}
                setSelectedValue={setSelectedPico}
                labelField="descripcion_pico"
                valueField="id_pico"
              />
            </InputCard>

            {/* Horómetro */}
            <InputCard title="Horómetro">
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="horometro"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      keyboardType="number-pad"
                      align="center"
                      placeholder="Informe el horómetro"
                      value={value ?? ""}
                      onChangeText={onChange}
                      errorMessage={errors.horometro?.message}
                    />
                  )}
                />
                <Photo
                  form="icon"
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
                      keyboardType="number-pad"
                      align="center"
                      placeholder="Informe el kilometraje"
                      value={value ?? ""}
                      onChangeText={onChange}
                      errorMessage={errors.kilometraje?.message}
                    />
                  )}
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={base64Kilometraje ? "#05a722" : "#000"}
                  setImage={setBase64Kilometraje}
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
                    onChangeText={onChange}
                    errorMessage={errors.litros?.message}
                  />
                )}
              />
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

            {/* Firma y Grabar */}
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
                  title="Grabar"
                  onPress={handleSubmit(handleSaveAll)}
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
