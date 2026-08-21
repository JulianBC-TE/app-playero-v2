import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { useCallback, useEffect, useState } from "react";
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
  Image
} from "react-native";
import {
  CheckCheck,
  Pencil,
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
  saveTraspaso,
} from "@/storage/storageTraspaso";
import {
  getStoragePersona,
  removePersona,
  savePersona,
} from "@/storage/storagePersona";
import { Photo } from "@/components/Photo";
// BD — reemplaza api
import { getBodegasDelUsuario, getBodegasTraspaso } from "@DBmodules/bodegaDB";
import { getPicosByBodega } from "@DBmodules/picoDB";
import {
  anularUltimoFinTurnoPorBodega,
  getTipoByBodega,
  getTurnoStatusLocal,
} from "@DBmodules/turnoBD";
import { saveTraspasoLocal } from "@DBmodules/traspasoDB";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";

export function Traspaso({ navigation, route }: StackRoutesProps<"traspaso">) {
  const [selectedBodegaOrigem, setSelectedBodegaOrigem] = useState<string>(" ");
  const [selectedBodegaDestino, setSelectedBodegaDestino] =
    useState<string>(" ");
  const [bodegaOrigem, setBodegaOrigem] = useState<BodegaDTO[]>([]);
  const [bodygaDestino, setBodegaDestino] = useState<BodegaDTO[]>([]);
  const { sucursal, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);

  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  const [cargaCombustible, setCargaCombustible] = useState<string>("");
  const [selectedPico, setSelectedPico] = useState<string>(" ");

  const [base64Obs, setBase64Obs] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [obsAdicional, setObsAdicional] = useState<string>("");

  const [taxilitroInicial, setTaxilitroInicial] = useState<string>("");
  const [base64TaxilitroInicial, setBase64TaxilitroInicial] =
    useState<string>("");
  const [taxilitroFinal, setTaxilitroFinal] = useState<string>("");
  const [base64TaxilitroFinal, setBase64TaxilitroFinal] = useState<string>("");

  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<{
    persona: PersonaDTO | null;
    selectedBodegaOrigem: string;
    selectedBodegaDestino: string;
    selectedPico: string;
    obs: string;
    obsAdicional: string;
    cargaCombustible: string;
    taxilitroInicial: string;
    taxilitroFinal: string;
  } | null>(null);
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
      const turnoStatus = await getTurnoStatusLocal(sucursal.id_sucursal);
      if (
        turnoStatus.status === "cerrado" ||
        turnoStatus.status === "falta_cerrar"
      ) {
        setTurnoCerrado(true);
      }
      const picosDB = await getPicosByBodega(Number(selectedBodegaOrigem));
      setPicos(picosDB);
      setSelectedPico(picosDB[0]?.id_pico.toString() || "");
      setEstadoRestaurado(true);
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
      await setBodegaOrigem(bodegasOrigen);
      await setSelectedBodegaOrigem(bodegasOrigen[0].id_bodega);
      const bodegasDestino = await getBodegasTraspaso(sucursal.id_sucursal);
      await setBodegaDestino(bodegasDestino);
      await setSelectedBodegaDestino(bodegasDestino[0].id_bodega);
    } catch (error) {
      toastError("Error al buscar bodega", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveState() {
    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    const existing = await getStorageTraspaso();

    const data: TraspasoDTO = { 
      bod_origen: Number(selectedBodegaOrigem),
      bod_destino: Number(selectedBodegaDestino),
      id_tanque_destino: Number(medicionInicial[0]?.id_tanque ?? 0),
      regla_altura_inicial: medicionInicial[0]?.regla.toString() ?? "",
      litros_tanque_inicial: medicionInicial[0]?.litros ?? 0,
      temp_inicial: medicionInicial[0]?.temperatura ?? 0,
      regla_altura_final: existing?.regla_altura_final ?? "",
      litros_tanque_final: existing?.litros_tanque_final ?? 0,
      temp_final: existing?.temp_final ?? 0,
      foto_medicion_final: existing?.foto_medicion_final ?? [],
      id_pico: Number(selectedPico),
      taxilitro_inicial: toNumber(taxilitroInicial),
      taxilitro_final: toNumber(taxilitroFinal),
      litros_pico: toNumber(cargaCombustible),
      last_id_salida: 0,
      obs_traspaso: obs,
      obs_adicional: obsAdicional,
      foto_obs_traspaso: base64Obs ? [base64Obs] : [],
      foto_medicion_inicial: medicionInicial[0]?.foto_tanque
        ? [medicionInicial[0].foto_tanque]
        : [],
      foto_taxilitro: base64TaxilitroInicial
        ? [base64TaxilitroInicial]
        : (existing?.foto_taxilitro ?? []),
      foto_taxilitro_fin: base64TaxilitroFinal
        ? [base64TaxilitroFinal]
        : (existing?.foto_taxilitro_fin ?? []),
      fecha: existing?.fecha ?? fecha,
      hora: existing?.hora ?? hora,
      firma_receptor: existing?.firma_receptor ?? [],
      id_playero: Number(user.cedula),
      id_encargado_receptor: Number(persona?.cedula) || 0,
    };

    await saveTraspaso(data);
    await savePersona(persona);
    return data;
  }

  const huboCambios = useCallback(() => {
    if (!estadoInicial || !estadoRestaurado) return false;
    const actual = {
      persona,
      selectedBodegaOrigem,
      selectedBodegaDestino,
      selectedPico,
      obs,
      obsAdicional,
      cargaCombustible,
      taxilitroInicial,
      taxilitroFinal,
    };
    return JSON.stringify(actual) !== JSON.stringify(estadoInicial);
  }, [
    estadoInicial,
    estadoRestaurado,
    persona,
    selectedBodegaOrigem,
    selectedBodegaDestino,
    selectedPico,
    obs,
    obsAdicional,
    cargaCombustible,
    taxilitroInicial,
    taxilitroFinal,
  ]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || !estadoRestaurado) return;

      e.preventDefault();

      Alert.alert(
        "Salir de traspaso",
        "Hay cambios sin confirmar. ¿Qué desea hacer?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "¿Estás seguro?",
                "Se perderán todos los datos de este Traspaso. Esta acción no se puede deshacer.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sí, salir sin guardar",
                    style: "destructive",
                    onPress: async () => {
                      await removeTraspaso();
                      await removePersona();
                      setEstadoInicial(null);
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
              if (medicionInicial && medicionInicial?.length > 0) {
                saveState();
              }
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, huboCambios, isLoading, estadoRestaurado, medicionInicial]);

  async function handleSaveAll() {
    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un chofer/operador.");
      return;
    }
    if (!selectedBodegaOrigem) {
      Alert.alert(
        "Bodega de origen requerida",
        "Debe seleccionar una bodega origen.",
      );
      return;
    }
    if (!selectedBodegaDestino) {
      Alert.alert(
        "Bodega de destino requerida",
        "Debe seleccionar una bodega destino.",
      );
      return;
    }
    if (!taxilitroInicial || toNumber(taxilitroInicial) <= 0) {
      Alert.alert(
        "Taxilitro inicial requerido",
        "Debe ingresar el valor numérico del taxilitro inicial.",
      );
      return;
    }
    if (!base64TaxilitroInicial) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto del taxilitro inicial.",
      );
      return;
    }
    if (medicionInicial.length === 0) {
      Alert.alert(
        "Medición Inicial requerida",
        "Debe registrar la medición inicial.",
      );
      return;
    }
    if (!cargaCombustible || toNumber(cargaCombustible) <= 0) {
      Alert.alert(
        "Litros requeridos",
        "Debe ingresar una cantidad válida de litros cargados.",
      );
      return;
    }
    if (!taxilitroFinal || toNumber(taxilitroFinal) <= 0) {
      Alert.alert(
        "Taxilitro final requerido",
        "Debe ingresar el valor numérico del taxilitro final.",
      );
      return;
    }
    if (!base64TaxilitroFinal) {
      Alert.alert(
        "Foto requerida",
        "Debe capturar la foto del taxilitro final.",
      );
      return;
    }
    if (medicionFinal.length === 0) {
      Alert.alert(
        "Medición final es requerida",
        "Debe registrar la medición final del tanque receptor.",
      );
      return;
    }
    if (!firma) {
      Alert.alert("Firma requerida", "Debe registrar la firma del receptor.");
      return;
    }
    const tipoTurno = await getTipoByBodega(Number(selectedBodegaOrigem));
    if (tipoTurno === "2" && !motivoConfirmado) {
      setTurnoCerrado(true);
      setIsLoading(false);
      return;
    }

    try {
      const data: TraspasoDTO = await getStorageTraspaso();

      data.firma_receptor = firma ? [firma] : [];
      data.regla_altura_final = medicionFinal[0].regla.toString();
      data.litros_tanque_final = medicionFinal[0].litros;
      data.temp_final = medicionFinal[0].temperatura;
      data.foto_medicion_final = medicionFinal[0].foto_tanque
        ? [medicionFinal[0].foto_tanque]
        : [];
      data.obs_traspaso = [data.obs_traspaso, obsAdicional]
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

      setIsLoading(true);

      await saveTraspasoLocal(payload);
      await anularUltimoFinTurnoPorBodega(payload.bod_origen, obsAdicional);

      toastSuccess("Traspaso", "Traspaso guardado exitosamente.");
      await removeTraspaso();
      await removePersona();
      navigation.navigate("home");
    } catch (error) {
      console.log(error);
      toastError("Traspaso", "Ocurrió un error al guardar el traspaso.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (sucursal) {
      fetchBodegas();

      (async () => {
        const storedTraspaso = await getStorageTraspaso();
        let foto_obs_traspaso = storedTraspaso?.foto_obs_traspaso
          ? storedTraspaso.foto_obs_traspaso[0]
          : "";
        let foto_medicion_inicial = storedTraspaso?.foto_medicion_inicial
          ? storedTraspaso.foto_medicion_inicial[0]
          : "";

        let fotoTaxilitroInit = storedTraspaso?.foto_taxilitro
          ? storedTraspaso.foto_taxilitro[0]
          : "";
        let fotoTaxilitroEnd = storedTraspaso?.foto_taxilitro_fin
          ? storedTraspaso.foto_taxilitro_fin[0]
          : "";

        if (storedTraspaso) {
          const personaStorage = await getStoragePersona();

          setSelectedBodegaOrigem(storedTraspaso.bod_origen.toString());
          setSelectedBodegaDestino(storedTraspaso.bod_destino.toString());
          setSelectedPico(storedTraspaso.id_pico.toString());
          setCargaCombustible(
            storedTraspaso.litros_pico
              ? storedTraspaso.litros_pico.toString()
              : "",
          );
          setBase64Obs(foto_obs_traspaso);
          setObs(storedTraspaso.obs_traspaso ?? "");
          setObsAdicional(storedTraspaso.obs_adicional ?? "");
          setMotivoConfirmado(!!storedTraspaso.obs_adicional?.trim());

          setTaxilitroInicial(
            storedTraspaso.taxilitro_inicial
              ? storedTraspaso.taxilitro_inicial.toString()
              : "",
          );
          setBase64TaxilitroInicial(fotoTaxilitroInit);
          setTaxilitroFinal(
            storedTraspaso.taxilitro_final
              ? storedTraspaso.taxilitro_final.toString()
              : "",
          );
          setBase64TaxilitroFinal(fotoTaxilitroEnd);

          if (storedTraspaso.id_tanque_destino) {
            setMedicionInicial([
              {
                id_tanque: storedTraspaso.id_tanque_destino.toString(),
                regla: Number(storedTraspaso.regla_altura_inicial),
                litros: storedTraspaso.litros_tanque_inicial,
                temperatura: storedTraspaso.temp_inicial,
                foto_tanque: foto_medicion_inicial,
              },
            ]);
          } else {
            setMedicionInicial([]);
          }
          if (
            storedTraspaso.regla_altura_final &&
            storedTraspaso.litros_tanque_final > 0
          ) {
            setMedicionFinal([
              {
                id_tanque: storedTraspaso.id_tanque_destino.toString(),
                regla: Number(storedTraspaso.regla_altura_final),
                litros: storedTraspaso.litros_tanque_final,
                temperatura: storedTraspaso.temp_final,
                foto_tanque: storedTraspaso.foto_medicion_final?.[0] || "",
              },
            ]);
          }

          setPersona(personaStorage);
          setIsLoading(false);

          setEstadoInicial({
            persona: personaStorage,
            selectedBodegaOrigem: storedTraspaso.bod_origen.toString(),
            selectedBodegaDestino: storedTraspaso.bod_destino.toString(),
            selectedPico: storedTraspaso.id_pico.toString(),
            obs: storedTraspaso.obs_traspaso ?? "",
            obsAdicional: storedTraspaso.obs_adicional ?? "",
            cargaCombustible: storedTraspaso.litros_pico
              ? storedTraspaso.litros_pico.toString()
              : "",
            taxilitroInicial: storedTraspaso.taxilitro_inicial
              ? storedTraspaso.taxilitro_inicial.toString()
              : "",
            taxilitroFinal: storedTraspaso.taxilitro_final
              ? storedTraspaso.taxilitro_final.toString()
              : "",
          });
        } else {
          setEstadoInicial({
            persona: null,
            selectedBodegaOrigem: "",
            selectedBodegaDestino: "",
            selectedPico: "",
            obs: "",
            obsAdicional: "",
            cargaCombustible: "",
            taxilitroInicial: "",
            taxilitroFinal: "",
          });
          setSelectedBodegaOrigem("");
        }
      })();
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
    if (medicionInicial.length > 0) {
      saveState();
    }
  }, [medicionInicial]);

  useEffect(() => {
    if (cargaCombustible !== undefined) {
      saveState();
    }
  }, [
    cargaCombustible,
    selectedBodegaOrigem,
    selectedBodegaDestino,
    selectedPico,
    obs,
    obsAdicional,
    taxilitroInicial,
    base64TaxilitroInicial,
    taxilitroFinal,
    base64TaxilitroFinal,
  ]);

  useEffect(() => {
    if (medicionFinal.length > 0) {
      (async () => {
        const stored = await getStorageTraspaso();
        if (stored) {
          stored.regla_altura_final = medicionFinal[0].regla.toString();
          stored.litros_tanque_final = medicionFinal[0].litros;
          stored.temp_final = medicionFinal[0].temperatura;
          stored.foto_medicion_final = medicionFinal[0].foto_tanque
            ? [medicionFinal[0].foto_tanque]
            : [];
          await saveTraspaso(stored);
        }
      })();
    }
  }, [medicionFinal]);

  useEffect(() => {
    if (selectedBodegaOrigem) {
      fetchPicos();
    }
  }, [selectedBodegaOrigem]);

  return turnoCerrado && !motivoConfirmado ? (
    <View className="flex-1">
      <ScreenHeader title="Traspaso Excepcional" />

      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
            Importante!!!
          </Text>
          <Text className="font-medium text-justify text-xl mb-4">
            Está intentando registrar un traspaso y el turno se encuentra
            cerrado. Una vez finalizada se deberá realizar el cierre
            correspondiente en el apartado “Cierre Extra”, para las bodegas que
            hayan sufrido movimientos.
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
              let stored = await getStorageTraspaso();
              if (stored) {
                stored.obs_traspaso = obs;
                stored.obs_adicional = obsAdicional;
                await saveTraspaso(stored);
              } else {
                const now = new Date();
                const fecha = now.toISOString().slice(0, 10);
                const hora = now.toTimeString().slice(0, 8);

                const minimalData: TraspasoDTO = {
                  bod_origen: Number(selectedBodegaOrigem),
                  bod_destino: Number(selectedBodegaDestino),
                  id_tanque_destino: 0,
                  regla_altura_inicial: "",
                  litros_tanque_inicial: 0,
                  temp_inicial: 0,
                  regla_altura_final: "",
                  litros_tanque_final: 0,
                  temp_final: 0,
                  foto_medicion_final: [],
                  id_pico: Number(selectedPico),
                  taxilitro_inicial: toNumber(taxilitroInicial),
                  taxilitro_final: toNumber(taxilitroFinal),
                  foto_taxilitro: base64TaxilitroInicial
                    ? [base64TaxilitroInicial]
                    : [],
                  foto_taxilitro_fin: base64TaxilitroFinal
                    ? [base64TaxilitroFinal]
                    : [],
                  litros_pico: toNumber(cargaCombustible),
                  last_id_salida: 0,
                  obs_traspaso: obs,
                  obs_adicional: obsAdicional,
                  foto_obs_traspaso: base64Obs ? [base64Obs] : [],
                  foto_medicion_inicial: [],
                  fecha,
                  hora,
                  firma_receptor: [],
                  id_playero: Number(user.cedula),
                  id_encargado_receptor: Number(persona?.cedula) || 0,
                };
                await saveTraspaso(minimalData);
                await savePersona(persona);
              }

              setMotivoConfirmado(true);
              setTurnoCerrado(false);
            }}
          >
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : (
    <View className="flex-1">
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
                    data={bodegaOrigem}
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
                data={picos}
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

              {medicionInicial && medicionInicial.length > 0 && (
                <View className="w-full items-center p-2 mt-2 bg-gray-100 rounded-md border border-gray-200">
                  <Text className="text-md font-bold text-gray-800">
                    Altura: {medicionInicial[0].regla} cm  —  {medicionInicial[0].litros.toLocaleString()} L
                  </Text>
                  {Boolean(medicionInicial[0].temperatura) && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Temperatura: {medicionInicial[0].temperatura} °C
                    </Text>
                  )}
                </View>
              )}
              <View><Text className="text-xs text-gray-500">
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

              {medicionFinal && medicionFinal.length > 0 && (
                <View className="w-full items-center p-2 mt-2 bg-gray-100 rounded-md border border-gray-200">
                  <Text className="text-md font-bold text-gray-800">
                    Altura: {medicionFinal[0].regla} cm  —  {medicionFinal[0].litros.toLocaleString()} L
                  </Text>
                  {Boolean(medicionFinal[0].temperatura) && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Temperatura: {medicionFinal[0].temperatura} °C
                    </Text>
                  )}
                </View>
              )}
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
                  onPress={() => handleSaveAll()}
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