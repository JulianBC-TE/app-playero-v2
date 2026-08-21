import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { useCallback, useEffect, useState } from "react";
import { InputCard } from "@/components/InputCard";
import { Input } from "@/components/Input";
import { TanqueDTO } from "@/dto/TanqueDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { Select } from "@/components/Select";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import { Check } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Photo } from "@/components/Photo";
import {
  getStorageMedicionAbastecimiento,
  removeMedicionAbastecimiento,
  saveMedicionAbastecimiento,
} from "@/storage/storageMedicionAbastecimiento";
import { getTanquesByBodega } from "@DBmodules/tanqueDB";
import { cubicacionService } from "@DBmodules/cubicacionDB";

interface ReglaOp {
  altura: string;
  litros: number;
  label: string;
}

type FormData = {
  alturaInicial: string;
  litrosInicial: string;
  tempInicial: string;
  alturaFinal: string;
  tempFinal: string;
  litrosFinal: string;
};

const habilitarTanque = yup.object({
  alturaInicial: yup
    .string()
    .required("Altura de la regla es requerida")
    .matches(
      /^[0-9]+([.,][0-9]+)?$/,
      "El formato de esta información no es válida",
    ),
  tempInicial: yup
    .string()
    .required("Temperatura del tanque es requerida")
    .matches(
      /^[0-9]+([.,][0-9]+)?$/,
      "El formato de la temperatura no es válida",
    ),
  litrosInicial: yup
    .string()
    .required("Cantidad de litros en el tanque requerida")
    .matches(/^[0-9]+([.,][0-9]+)?$/, "Formato de Litros no es válido"),
  alturaFinal: yup
    .string()
    .required("Altura final de la regla es requerida")
    .matches(
      /^[0-9]+([.,][0-9]+)?$/,
      "El formato de esta información no es válida",
    ),
  tempFinal: yup
    .string()
    .required("Temperatura del tanque es requerida")
    .matches(
      /^[0-9]+([.,][0-9]+)?$/,
      "El formato de la temperatura no es válida",
    ),
  litrosFinal: yup
    .string()
    .required("Cantidad de litros en el tanque requerida")
    .matches(/^[0-9]+([.,][0-9]+)?$/, "Formato de Litros no es válido"),
});

export function MedicionAbastecimiento({
  navigation,
  route,
}: StackRoutesProps<"medicionAbastecimiento">) {
  const [base64ImageInicial, setBase64ImageInicial] = useState<string>("");
  const [base64ImageFinal, setBase64ImageFinal] = useState<string>("");
  const idBodega = route.params?.idBodega || "0";
  const [isLoading, setIsLoading] = useState(false);
  const [tanques, setTanques] = useState<TanqueDTO[]>([]);
  const [selectedTanques, setSelectedTanques] = useState("");
  const [reglas, setReglas] = useState<ReglaOp[]>([]);
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [fromScreen] = useState(route.params?.fromScreen || "abastecimiento");
  const [litrosTanque, setLitrosTanque] = useState<number>(0);
  const litrosRemision = route.params?.litrosRemision || 0;
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  const formatComma = (val: string) => val.replace(/\./g, ",");
  const parseNum = (val?: string) => Number(val ? val.replace(",", ".") : 0);

  const {
    watch,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(habilitarTanque),
    defaultValues: {
      alturaInicial: "",
      alturaFinal: "",
      tempInicial: "",
      tempFinal: "",
      litrosInicial: "",
      litrosFinal: "",
    },
  });

  const alturaInicialWatch = watch("alturaInicial");
  const litrosInicialWatch = watch("litrosInicial");
  const tempInicialWatch = watch("tempInicial");

  const alturaFinalWatch = watch("alturaFinal");
  const litrosFinalWatch = watch("litrosFinal");
  const tempFinalWatch = watch("tempFinal");

  const litros_inicial = parseNum(litrosInicialWatch);
  const litros_final = parseNum(litrosFinalWatch);

  const capacidadeRestante = Math.max(0, litrosTanque - litros_inicial);

  // Selecciona la altura desde el desplegable y asigna los litros automáticamente
  const seleccionarAlturaInicial = (alturaVal: string) => {
    setValue("alturaInicial", alturaVal);
    const match = reglas.find((r) => r.altura === alturaVal);
    if (match) {
      setValue("litrosInicial", formatComma(String(match.litros)));
    }
  };

  const seleccionarAlturaFinal = (alturaVal: string) => {
    setValue("alturaFinal", alturaVal);
    const match = reglas.find((r) => r.altura === alturaVal);
    if (match) {
      setValue("litrosFinal", formatComma(String(match.litros)));
    }
  };

  const confirmarEliminacionFoto = (onConfirm: () => void) => {
    Alert.alert(
      "Eliminar imagen",
      "¿Desea eliminar esta fotografía y capturar una nueva?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: onConfirm },
      ],
    );
  };

  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;

    try {
      await saveMedicionAbastecimiento({
        medicionInicial,
        medicionFinal,
        base64ImageInicial,
        base64ImageFinal,
        selectedTanques,
        idBodega,

        alturaInicial: alturaInicialWatch,
        litrosInicial: litrosInicialWatch,
        tempInicial: tempInicialWatch,

        alturaFinal: alturaFinalWatch,
        litrosFinal: litrosFinalWatch,
        tempFinal: tempFinalWatch,
      });
    } catch (error) {
      console.log("[MedicionAbastecimiento] Error al guardar estado:", error);
    }
  }, [
    estadoRestaurado,
    medicionInicial,
    medicionFinal,
    base64ImageInicial,
    base64ImageFinal,
    selectedTanques,
    idBodega,
    alturaInicialWatch,
    litrosInicialWatch,
    tempInicialWatch,
    alturaFinalWatch,
    litrosFinalWatch,
    tempFinalWatch,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  useEffect(() => {
    async function restaurarEstado() {
      try {
        const guardado = await getStorageMedicionAbastecimiento();
        if (guardado && guardado.idBodega === idBodega) {
          setMedicionInicial(guardado.medicionInicial || []);
          setMedicionFinal(guardado.medicionFinal || []);
          setBase64ImageInicial(guardado.base64ImageInicial || "");
          setBase64ImageFinal(guardado.base64ImageFinal || "");
          setSelectedTanques(guardado.selectedTanques || "");
          reset({
            alturaInicial: formatComma(guardado.alturaInicial || ""),
            litrosInicial: formatComma(guardado.litrosInicial || ""),
            tempInicial: formatComma(guardado.tempInicial || ""),
            alturaFinal: formatComma(guardado.alturaFinal || ""),
            litrosFinal: formatComma(guardado.litrosFinal || ""),
            tempFinal: formatComma(guardado.tempFinal || ""),
          });
        }
      } catch (error) {
        console.log(
          "[MedicionAbastecimiento] Error al restaurar estado:",
          error,
        );
      } finally {
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, []);

  // Filtrado de tanques ya medidos
  useEffect(() => {
    if (!estadoRestaurado || medicionInicial.length === 0) return;
    const idsTanquesMedidos = medicionInicial.map((m) => Number(m.id_tanque));
    setTanques((prev) =>
      prev.filter((t) => !idsTanquesMedidos.includes(t.id_tanque)),
    );
  }, [estadoRestaurado, medicionInicial]);

  const definirMedicion = ({
    alturaInicial,
    litrosInicial,
    tempInicial,
    alturaFinal,
    tempFinal,
    litrosFinal,
  }: FormData) => {
    if (base64ImageInicial === "" || base64ImageFinal === "") {
      Alert.alert(
        "Registro fotográfico requerido",
        "Por favor, capture una foto del tanque (tanto para la medición inicial como la final).",
      );
      return;
    }

    const tanqueSelecionado = tanques.find(
      (t) => t.id_tanque === +selectedTanques,
    );

    if (!tanqueSelecionado) {
      toastError("Tanque inválido", "Seleccione un tanque válido.");
      return;
    }

    const altIni = parseNum(alturaInicial);
    const tempIni = parseNum(tempInicial);
    const litIni = parseNum(litrosInicial);

    const altFin = parseNum(alturaFinal);
    const tempFin = parseNum(tempFinal);
    const litFin = parseNum(litrosFinal);

    if (litFin - litIni > litrosTanque) {
      Alert.alert(
        "Exceso de litros",
        `El total de litros cargados no puede exceder la capacidad del tanque (${litrosTanque.toLocaleString()} litros).`,
      );
      return;
    }

    const MedicionInicialObj: MedicionDTO = {
      id_tanque: selectedTanques,
      regla: altIni,
      temperatura: tempIni,
      litros: litIni,
      foto_tanque: base64ImageInicial,
    };

    const MedicionFinalObj: MedicionDTO = {
      id_tanque: selectedTanques,
      regla: altFin,
      temperatura: tempFin,
      litros: litFin,
      foto_tanque: base64ImageFinal,
    };

    const updatedMedicionesIniciales = [...medicionInicial, MedicionInicialObj];
    const updatedMedicionesFinales = [...medicionFinal, MedicionFinalObj];

    setMedicionInicial(updatedMedicionesIniciales);
    setMedicionFinal(updatedMedicionesFinales);

    let totalLitrosCargados = 0;
    for (let i = 0; i < updatedMedicionesIniciales.length; i++) {
      totalLitrosCargados +=
        updatedMedicionesFinales[i].litros -
        updatedMedicionesIniciales[i].litros;
    }

    if (totalLitrosCargados < litrosRemision && tanques.length > 1) {
      const tanquesAtualizados = tanques.filter(
        (t) => t.id_tanque !== +selectedTanques,
      );
      setTanques(tanquesAtualizados);
      reset();
      setBase64ImageInicial("");
      setBase64ImageFinal("");
      toastSuccess(
        "Tanque registrado",
        "El tanque ha sido registrado con éxito.",
      );
      return;
    }

    removeMedicionAbastecimiento().catch(() => {});
    navigation.popTo(fromScreen as any, {
      onMedicionInicial: updatedMedicionesIniciales,
      onMedicionFinal: updatedMedicionesFinales,
    });
  };

  async function fetchTanques() {
    setIsLoading(true);
    try {
      const data = await getTanquesByBodega(Number(idBodega));
      setTanques(data);
      if (data.length > 0 && !selectedTanques) {
        setSelectedTanques(data[0].id_tanque.toString());
      }
    } catch {
      toastError(
        "Error al buscar tanques",
        "No se pudieron cargar los tanques.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (idBodega) {
      fetchTanques();
    }
  }, [idBodega]);

  useEffect(() => {
    if (!selectedTanques || tanques.length === 0) return;

    const tanque = tanques.find((t) => t.id_tanque === Number(selectedTanques));
    if (tanque) {
      setLitrosTanque(Number(tanque.capacidad_litros) || 0);

      // Carga las opciones de regla/cubicación para el desplegable
      cubicacionService
        .obtenerCubicacionPorTanque(tanque.id_tanque)
        .then((dataCubicacion: any[]) => {
          const listaFormateada: ReglaOp[] = (dataCubicacion || []).map((item) => ({
            altura: String(item.altura),
            litros: item.litros,
            label: `${item.altura} cm - ${item.litros.toLocaleString()} L`,
          }));
          setReglas(listaFormateada);
        })
        .catch(() => setReglas([]));
    }
  }, [selectedTanques, tanques]);

  return (
    <View className="flex-1">
      <ScreenHeader title="Mediciones" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 p-4 gap-4 items-center">
            <InputCard
              title={`Tanque Capacidad: ${litrosTanque.toLocaleString()} Litros`}
              required
            >
              <Select
                data={tanques}
                isLoading={isLoading}
                selectedValue={selectedTanques}
                setSelectedValue={setSelectedTanques}
                labelField="descripcion_tanque"
                valueField="id_tanque"
              />
            </InputCard>

            {/* SECCIÓN MEDICIÓN INICIAL */}
            <View className="flex-row items-center w-full my-2">
              <View className="flex-1 h-0.5 bg-gray-400" />
              <Text className="mx-4 text-black text-xl font-bold">
                Medición Inicial
              </Text>
              <View className="flex-1 h-0.5 bg-gray-400" />
            </View>

            <InputCard title="Altura Regla (cm)" required>
              <Controller
                control={control}
                name="alturaInicial"
                render={({ field: { value } }) => (
                  <Select
                    data={reglas}
                    isLoading={isLoading}
                    selectedValue={value}
                    setSelectedValue={seleccionarAlturaInicial}
                    labelField="label"
                    valueField="altura"
                  />
                )}
              />
            </InputCard>

            <InputCard title="Litros Iniciales" required>
              <Controller
                control={control}
                name="litrosInicial"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="decimal-pad"
                    align="center"
                    className="ml-2"
                    value={value}
                    onChangeText={(text) => onChange(formatComma(text))}
                    placeholder="Litros en el tanque"
                    errorMessage={errors.litrosInicial?.message}
                  />
                )}
              />
            </InputCard>

            <InputCard title="Temperatura (°C)" required>
              <Controller
                control={control}
                name="tempInicial"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="decimal-pad"
                    align="center"
                    className="ml-2"
                    value={value}
                    onChangeText={(text) => onChange(formatComma(text))}
                    placeholder="Temperatura del tanque"
                    errorMessage={errors.tempInicial?.message}
                  />
                )}
              />
            </InputCard>

            <InputCard title="Foto Medición Inicial" className="min-h-48" required>
              <View className="w-full items-center p-4 gap-2">
                {base64ImageInicial ? (
                  <Pressable
                    onPress={() =>
                      confirmarEliminacionFoto(() => setBase64ImageInicial(""))
                    }
                  >
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64ImageInicial}`,
                      }}
                      className="w-48 h-32 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
                <Photo
                  form="button"
                  iconSize="lg"
                  iconColor={base64ImageInicial ? "#05a722" : "#000"}
                  setImage={setBase64ImageInicial}
                />
              </View>
            </InputCard>

            {/* SECCIÓN MEDICIÓN FINAL */}
            {base64ImageInicial !== "" && (
              <>
                <View className="flex-row items-center w-full my-2">
                  <View className="flex-1 h-0.5 bg-gray-400" />
                  <Text className="mx-4 text-black text-xl font-bold">
                    Medición Final
                  </Text>
                  <View className="flex-1 h-0.5 bg-gray-400" />
                </View>

                <InputCard title="Altura Regla Final (cm)" required>
                  <Controller
                    control={control}
                    name="alturaFinal"
                    render={({ field: { value } }) => (
                      <Select
                        data={reglas}
                        isLoading={isLoading}
                        selectedValue={value}
                        setSelectedValue={seleccionarAlturaFinal}
                        labelField="label"
                        valueField="altura"
                      />
                    )}
                  />
                </InputCard>

                <InputCard
                  title={`Litros Finales (Disp. Tanque: ${capacidadeRestante.toLocaleString()} L)`}
                  required
                >
                  <Controller
                    control={control}
                    name="litrosFinal"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        keyboardType="decimal-pad"
                        align="center"
                        className="ml-2"
                        value={value}
                        onChangeText={(text) => onChange(formatComma(text))}
                        placeholder="Litros finales en el tanque"
                        errorMessage={errors.litrosFinal?.message}
                      />
                    )}
                  />
                </InputCard>

                <InputCard title="Temperatura Final (°C)" required>
                  <Controller
                    control={control}
                    name="tempFinal"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        keyboardType="decimal-pad"
                        align="center"
                        className="ml-2"
                        value={value}
                        onChangeText={(text) => onChange(formatComma(text))}
                        placeholder="Temperatura final del tanque"
                        errorMessage={errors.tempFinal?.message}
                      />
                    )}
                  />
                </InputCard>

                <InputCard
                  title="Foto Medición Final"
                  className="min-h-48"
                  required
                >
                  <View className="w-full items-center p-4 gap-2">
                    {base64ImageFinal ? (
                      <Pressable
                        onPress={() =>
                          confirmarEliminacionFoto(() => setBase64ImageFinal(""))
                        }
                      >
                        <Image
                          source={{
                            uri: `data:image/jpeg;base64,${base64ImageFinal}`,
                          }}
                          className="w-48 h-32 rounded-lg border border-gray-300"
                          resizeMode="cover"
                        />
                      </Pressable>
                    ) : null}
                    <Photo
                      form="button"
                      iconSize="lg"
                      iconColor={base64ImageFinal ? "#05a722" : "#000"}
                      setImage={setBase64ImageFinal}
                    />
                  </View>
                </InputCard>
              </>
            )}

            <View className="w-full flex-col justify-center gap-4 mt-2">
              <View className="flex-row justify-center gap-4">
                <Button
                  title="Definir"
                  onPress={handleSubmit(definirMedicion)}
                  isLoading={isLoading}
                  icon={Check}
                  iconSize="md"
                  iconColor="#000"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}