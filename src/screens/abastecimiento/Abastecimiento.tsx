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
import { useCallback, useEffect, useState } from "react";
import {
  CheckCheck,
  Fuel,
  RulerDimensionLine,
  SaveAll,
} from "lucide-react-native";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Select } from "@/components/Select";
import { useAppContext } from "@/hooks/useAppContext";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { api } from "@/services/api";
import { Input } from "@/components/Input";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { Photo } from "@/components/Photo";
import { Button } from "@/components/Button";
import { StackRoutesProps } from "@/route/app.routes";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import {
  getStorageAbastecimiento,
  removeAbastecimiento,
  saveAbastecimiento,
  AbastecimientoStorageDTO,
} from "@/storage/storageAbastecimiento";
import { removeMedicionAbastecimiento } from "@/storage/storageMedicionAbastecimiento";  // ← agregar


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
  const { sucursal, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [obs, setObs] = useState<string>("");
  const [base64FotoObs, setBase64FotoObs] = useState<string[]>([]);
  const [obsAdicional, setObsAdicional] = useState("");
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
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  const [estadoInicial, setEstadoInicial] =
    useState<AbastecimientoStorageDTO | null>(null);

  // ─── Persistencia: guarda el estado cada vez que cambia algo relevante ───
  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;
    try {
      const estado: AbastecimientoStorageDTO = {
        ordenCompra,
        remision,
        litros,
        selectedBodega,
        tipoOperacionSeleccionado,
        base64Images,
        base64FotoObs,
        obs,
        obsAdicional,
        cargaZeta,
        medicionInicial,
        medicionFinal,
        turnoCerrado,
      };
      await saveAbastecimiento(estado);
    } catch (error) {
      console.log("[Abastecimiento] Error al guardar estado:", error);
    }
  }, [
    estadoRestaurado,
    ordenCompra,
    remision,
    litros,
    selectedBodega,
    tipoOperacionSeleccionado,
    base64Images,
    base64FotoObs,
    obs,
    obsAdicional,
    cargaZeta,
    medicionInicial,
    medicionFinal,
    turnoCerrado,
  ]);
  const huboCambios = useCallback(() => {
    if (!estadoInicial || !estadoRestaurado) return false;

    const actual = {
      ordenCompra,
      remision,
      litros,
      selectedBodega,
      tipoOperacionSeleccionado,
      base64Images,
      base64FotoObs,
      obs,
      obsAdicional,
      cargaZeta,
      medicionInicial,
      medicionFinal,
      turnoCerrado,
    };

    return JSON.stringify(actual) !== JSON.stringify(estadoInicial);
  }, [
    estadoInicial,
    ordenCompra,
    remision,
    litros,
    selectedBodega,
    tipoOperacionSeleccionado,
    base64Images,
    base64FotoObs,
    obs,
    obsAdicional,
    cargaZeta,
    medicionInicial,
    medicionFinal,
    turnoCerrado,
  ]);

  useEffect(() => {
    if (!estadoRestaurado) return;

    guardarEstado();
  }, [guardarEstado, estadoRestaurado]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || !estadoRestaurado) return;

      /*if (!huboCambios()) {
        return;
      }*/

      e.preventDefault();

      Alert.alert(
        "Salir de abastecimiento",
        "Hay cambios sin confirmar. ¿Qué desea hacer?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          // DESPUÉS
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "¿Estás seguro?",
                "Se perderán todos los datos de este Abastecimiento. Esta acción no se puede deshacer.",
                [
                  {
                    text: "Cancelar",
                    style: "cancel",
                  },
                  {
                    text: "Sí, salir sin guardar",
                    style: "destructive",
                    onPress: async () => {
                      await removeAbastecimiento();
                      await removeMedicionAbastecimiento();
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
              await guardarEstado();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, guardarEstado, huboCambios, isLoading, estadoRestaurado]);

  // ─── Restaurar estado al montar ───
  useEffect(() => {
    async function restaurarEstado() {
      let guardado: AbastecimientoStorageDTO | null = null;
      try {
        guardado = await getStorageAbastecimiento();
        if (guardado) {
          setEstadoInicial(guardado);
          setOrdenCompra(guardado.ordenCompra);
          setRemision(guardado.remision);
          setLitros(guardado.litros);
          setSelectedBodega(guardado.selectedBodega);
          setTipoOperacionSeleccionado(guardado.tipoOperacionSeleccionado);
          setBase64Images(guardado.base64Images);
          setBase64FotoObs(guardado.base64FotoObs);
          setObs(guardado.obs);
          setObsAdicional(guardado.obsAdicional);
          if(guardado.obsAdicional)setMotivoConfirmado(true);
          if (guardado.cargaZeta) {
            setCargaZeta({
              ...guardado.cargaZeta,
              id_pico_para_zeta:
                Number(guardado.cargaZeta.id_pico_para_zeta) || 0,
              taxilitro_inicial:
                Number(guardado.cargaZeta.taxilitro_inicial) || 0,
              taxilitro_final: Number(guardado.cargaZeta.taxilitro_final) || 0,
              litros_zeta: Number(guardado.cargaZeta.litros_zeta) || 0,
            });
          } else {
            setCargaZeta(null);
          }
          setMedicionInicial(guardado.medicionInicial);
          setMedicionFinal(guardado.medicionFinal);
          setTurnoCerrado(guardado.turnoCerrado);
        }
      } catch (error) {
        console.log("[Abastecimiento] Error al restaurar estado:", error);
      } finally {
        if (!guardado) {
          setEstadoInicial({
            ordenCompra: "",
            remision: "",
            litros: "",
            selectedBodega: "",
            tipoOperacionSeleccionado: "",
            base64Images: [],
            base64FotoObs: [],
            obs: "",
            obsAdicional: "",
            cargaZeta: null,
            medicionInicial: [],
            medicionFinal: [],
            turnoCerrado: false,
          });
        }
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, []);

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

  async function fetchBodegas() {
    try {
      setIsLoading(true);
      // Verificar estado del turno
      const turno = await api.get(
        `api/registros/turno/status/${sucursal.id_sucursal}`,
      );
      if (turno.data.status === "cerrado" || turno.data.status === "falta_cerrar") setTurnoCerrado(true);
      const response = await api.get(`/api/bodegas/${sucursal.id_sucursal}`);
      setBodegas(response.data.bodegas);
      setIsLoading(false);
    } catch (error) {
      toastError("Bodegas", "Error al cargar las bodegas");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBodegas();
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

  // Parámetros que vienen de sub-pantallas (CargaCombustible, MedicionAbastecimiento)
  useEffect(() => {
    if (route.params?.onCargaZeta) {
      setCargaZeta(route.params.onCargaZeta);
    }

    const newMedicionInicial = route.params?.onMedicionInicial;
    const newMedicionFinal = route.params?.onMedicionFinal;

    if (newMedicionInicial && newMedicionFinal) {
      // Ambas vienen juntas desde MedicionAbastecimiento — guardar en un solo paso
      setMedicionInicial(newMedicionInicial);
      setMedicionFinal(newMedicionFinal);

      // Guardamos explícitamente con los nuevos valores sin esperar el useEffect de guardarEstado
      saveAbastecimiento({
        ordenCompra,
        remision,
        litros,
        selectedBodega,
        tipoOperacionSeleccionado,
        base64Images,
        base64FotoObs,
        obs,
        obsAdicional,
        cargaZeta,
        medicionInicial: newMedicionInicial,
        medicionFinal: newMedicionFinal,
        turnoCerrado,
      }).catch(console.error);
    }
  }, [
    route.params?.onCargaZeta,
    route.params?.onMedicionInicial,
    route.params?.onMedicionFinal,
  ]);

  function handleFotoObs(image: string) {
    setBase64FotoObs((prev) => [...prev, image]);
  }

  async function saveAll() {
    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    const litrosTotalMedicionInicial =
      medicionInicial?.reduce((acc, med) => acc + med.litros, 0) || 0;
    const litrosTotalMedicionFinal =
      medicionFinal?.reduce((acc, med) => acc + med.litros, 0) || 0;

    const data = {
      json: {
        id_suc: sucursal.id_sucursal,
        id_bod: Number(selectedBodega),
        fecha: fecha,
        hora: hora,
        nro_oc: Number(ordenCompra),
        nro_remision: remision,
        litros_remision: Number(litros),
        playero: Number(user.cedula),
        foto_rev_docs: base64Images,
        zeta_no_llega: Number(tipoOperacionSeleccionado),
        id_pico_para_zeta: Number(cargaZeta?.id_pico_para_zeta) || 0,
        taxilitro_inicial: Number(cargaZeta?.taxilitro_inicial) || 0,
        taxilitro_final: Number(cargaZeta?.taxilitro_final) || 0,
        litros_zeta: Number(cargaZeta?.litros_zeta) || 0,
        obs_repos: obs + "|" + obsAdicional,
        foto_obs_repos: base64FotoObs,
        litros_total_repos: String(
          litrosTotalMedicionFinal -
            litrosTotalMedicionInicial -
            (Number(cargaZeta?.litros_zeta) || 0),
        ),
        mediciones_tanque: medicionInicial?.map((med, index) => ({
          id_tanque: Number(med.id_tanque),
          inicio: {
            regla: String(med.regla),
            temperatura: med.temperatura,
            litros: med.litros,
            foto_medicion: med.foto_tanque,
          },
          fin: {
            regla: String(medicionFinal[index].regla),
            temperatura: medicionFinal[index]?.temperatura,
            litros: medicionFinal[index]?.litros,
            foto_medicion: medicionFinal[index]?.foto_tanque,
          },
        })),
      },
    };
    try {
      setIsLoading(true);
      await api.post("/api/Abastecimientos-V2", data);

      // Limpiar storage al grabar exitosamente
      await removeAbastecimiento();

      toastSuccess("Abastecimiento", "Abastecimiento registrado con éxito");
      navigation.navigate("home");
    } catch (error) {
      console.error("Error al registrar el abastecimiento:", error);
      toastError("Abastecimiento", "Error al registrar el abastecimiento");
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
                data={bodegas}
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
                          navigation.navigate("cargaCombustible", {
                            idBodega: selectedBodega,
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
                {medicionInicial?.length === 0 &&
                  ((tipoOperacionSeleccionado === "1" &&
                    (cargaZeta?.litros_zeta ?? 0) > 0) ||
                    tipoOperacionSeleccionado === "0") && (
                    <InputCard title={"Medición de tanques"} required={true}>
                      <Button
                        title="Medir"
                        icon={
                          (medicionInicial?.length ?? 0) > 0
                            ? CheckCheck
                            : RulerDimensionLine
                        }
                        iconColor={"#000"}
                        iconSize="md"
                        onPress={() => {
                          navigation.navigate("medicionAbastecimiento", {
                            fromScreen: "abastecimiento",
                            idBodega: selectedBodega,
                            cargaZeta: cargaZeta?.litros_zeta || 0,
                            litrosRemision: Number(litros),
                          });
                        }}
                      />
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
                      onPress={saveAll}
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
