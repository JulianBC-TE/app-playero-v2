import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { useCallback, useEffect, useState } from "react";
import { InputCard } from "@/components/InputCard";
import { Input } from "@/components/Input";
//import { api } from "@/services/api";
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
import { getTanquesByBodega } from "@/backend/db/modules/tanqueDB";

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
    .required("Altura de la regla es requerido")
    .matches(
      /^[0-9]*\,?[0-9]+$/,
      "El formato de de esta información no és válida",
    ),
  tempInicial: yup
    .string()
    .required("Temperatura del tanque es requerido")
    .matches(/^[0-9]*\,?[0-9]+$/, "El formato de la temperatura no és válida"),
  litrosInicial: yup
    .string()
    .required("Cantidad de litros en el tanque requerido")
    .matches(/^[0-9]*\,?[0-9]+$/, "Formato de Litros no és inválido"),
  alturaFinal: yup
    .string()
    .required("Altura final de la regla es requerido")
    .matches(
      /^[0-9]*\,?[0-9]+$/,
      "El formato de de esta información no és válida",
    ),
  tempFinal: yup
    .string()
    .required("Temperatura del tanque es requerido")
    .matches(/^[0-9]*\,?[0-9]+$/, "El formato de la temperatura no és válida"),
  litrosFinal: yup
    .string()
    .required("Cantidad de litros en el tanque requerido")
    .matches(/^[0-9]*\,?[0-9]+$/, "Formato de Litros no és inválido"),
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
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [fromScreen] = useState(route.params?.fromScreen || "abastecimiento");
  const cargaZeta = route.params?.cargaZeta;
  const [litrosTanque, setLitrosTanque] = useState<number>(0);
  const litrosRemision = route.params?.litrosRemision || 0;
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  const {
    watch,
    control,
    handleSubmit,
    reset,
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

  const litros_inicial = Number(litrosInicialWatch);
  const litros_final = Number(litrosFinalWatch);

  const capacidadeRestante = litrosTanque - litros_inicial;

  // ─── Persistencia: guardar estado cuando cambia algo relevante ───
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

  // ─── Restaurar estado al montar ───
  useEffect(() => {
    async function restaurarEstado() {
      try {
        const guardado = await getStorageMedicionAbastecimiento();
        // Solo restaurar si el idBodega coincide para no mezclar sesiones de bodegas distintas
        if (guardado && guardado.idBodega === idBodega) {
          setMedicionInicial(guardado.medicionInicial);
          setMedicionFinal(guardado.medicionFinal);
          setBase64ImageInicial(guardado.base64ImageInicial);
          setBase64ImageFinal(guardado.base64ImageFinal);
          setSelectedTanques(guardado.selectedTanques);
          reset({
            alturaInicial: guardado.alturaInicial || "",
            litrosInicial: guardado.litrosInicial || "",
            tempInicial: guardado.tempInicial || "",

            alturaFinal: guardado.alturaFinal || "",
            litrosFinal: guardado.litrosFinal || "",
            tempFinal: guardado.tempFinal || "",
          });
          // Los tanques ya medidos se filtran DESPUÉS de que fetchTanques cargue
          // — ver el useEffect que combina tanques + medicionInicial restaurada
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

  // ─── Filtrar tanques ya medidos una vez que tengamos tanto tanques como mediciones ───
  useEffect(() => {
    if (
      !estadoRestaurado ||
      tanques.length === 0 ||
      medicionInicial.length === 0
    )
      return;
    const idsTanquesMedidos = medicionInicial.map((m) => Number(m.id_tanque));
    setTanques((prev) =>
      prev.filter((t) => !idsTanquesMedidos.includes(t.id_tanque)),
    );
    // Este efecto solo debe correr una vez al restaurar — no en cada cambio de medicionInicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoRestaurado, tanques.length]);

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
        "Registro fotografico requerido",
        "Por favor, capture una foto del tanque (inicial y final).",
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

    if (Number(litrosFinal) - Number(litrosInicial) > litrosTanque) {
      Alert.alert(
        "Exceso de litros",
        `El total de litros cargados no puede exceder la capacidad del tanque (${litrosTanque} litros).`,
      );
      return;
    }

    const MedicionInicial: MedicionDTO = {
      id_tanque: selectedTanques,
      regla: Number(alturaInicial),
      temperatura: Number(tempInicial),
      litros: Number(litrosInicial),
      foto_tanque: base64ImageInicial,
    };
    const updatedMedicionesIniciales = [...medicionInicial, MedicionInicial];

    setMedicionInicial((prev) => [...prev, MedicionInicial]);

    const MedicionFinal: MedicionDTO = {
      id_tanque: selectedTanques,
      regla: Number(alturaFinal),
      temperatura: Number(tempFinal),
      litros: Number(litrosFinal),
      foto_tanque: base64ImageFinal,
    };
    const updatedMedicionesFinales = [...medicionFinal, MedicionFinal];

    setMedicionFinal((prev) => [...prev, MedicionFinal]);

    let totalLitrosCargados = 0;
    for (let posic = 0; posic < updatedMedicionesIniciales.length; posic++) {
      totalLitrosCargados +=
        updatedMedicionesFinales[posic].litros -
        updatedMedicionesIniciales[posic].litros;
    }
    console.log("Total Litros Cargados:", totalLitrosCargados);
    console.log("Litros Remisión:", litrosRemision);

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

    // Limpiar storage al confirmar todas las mediciones y volver
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
  }, []);

  useEffect(() => {
    if (!selectedTanques || tanques.length === 0) return;

    const tanque = tanques.find((t) => t.id_tanque === Number(selectedTanques));

    if (tanque) {
      setLitrosTanque(Number(tanque.capacidad_litros) || 0);
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
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 p-4 gap-4 items-center">
            <InputCard
              title={`Tanque Capacidad: ${litrosTanque} Litros`}
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
            <View className="flex-row items-center">
              <View className="flex-1 h-0.5 bg-black" />
              <Text className="mx-4 text-black text-xl font-semibold">
                Medición Inicial
              </Text>
              <View className="flex-1 h-0.5 bg-black" />
            </View>

            <InputCard title="Altura Regla" required>
              <Controller
                control={control}
                name="alturaInicial"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="number-pad"
                    align="center"
                    textAlignVertical="top"
                    className="ml-2 text-center"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Informe la altura de la regla"
                    errorMessage={errors.alturaInicial?.message}
                  />
                )}
              />
            </InputCard>
            <InputCard title="Litros" required>
              <Controller
                control={control}
                name="litrosInicial"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="number-pad"
                    align="center"
                    textAlignVertical="top"
                    className="ml-2"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Litros en el tanque"
                    errorMessage={errors.litrosInicial?.message}
                  />
                )}
              />
            </InputCard>
            <InputCard title="Temperatura" required>
              <Controller
                control={control}
                name="tempInicial"
                render={({ field: { onChange, value } }) => (
                  <Input
                    keyboardType="number-pad"
                    align="center"
                    textAlignVertical="top"
                    className="ml-2"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Informe la temperatura del tanque"
                    errorMessage={errors.tempInicial?.message}
                  />
                )}
              />
            </InputCard>
            <InputCard title="Fotos" className="min-h-48" required>
              <View className="w-full items-center p-4 gap-2">
                <Image
                  source={{
                    uri: `data:image/jpeg;base64,${base64ImageInicial}`,
                  }}
                  className="mr-4 w-20 h-20 rounded-lg border border-gray-300"
                  resizeMode="cover"
                />
                <Photo
                  form="button"
                  iconSize="lg"
                  setImage={setBase64ImageInicial}
                />
              </View>
            </InputCard>
            {base64ImageInicial !== "" && (
              <>
                <View className="flex-row items-center">
                  <View className="flex-1 h-0.5 bg-black" />
                  <Text className="mx-4 text-black text-xl font-semibold">
                    Medición Final
                  </Text>
                  <View className="flex-1 h-0.5 bg-black" />
                </View>
                <InputCard title="Altura Regla" required>
                  <Controller
                    control={control}
                    name="alturaFinal"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        keyboardType="number-pad"
                        align="center"
                        textAlignVertical="top"
                        className="ml-2 text-center"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Informe la altura de la regla"
                        errorMessage={errors.alturaFinal?.message}
                      />
                    )}
                  />
                </InputCard>
                <InputCard
                  title={`${capacidadeRestante} litros restantes para el tanque`}
                  required
                >
                  <Controller
                    control={control}
                    name="litrosFinal"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        keyboardType="number-pad"
                        align="center"
                        textAlignVertical="top"
                        className="ml-2"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Litros en el tanque"
                        errorMessage={errors.litrosFinal?.message}
                      />
                    )}
                  />
                </InputCard>
                <InputCard title="Temperatura" required>
                  <Controller
                    control={control}
                    name="tempFinal"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        keyboardType="number-pad"
                        align="center"
                        textAlignVertical="top"
                        className="ml-2"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Informe la temperatura del tanque"
                        errorMessage={errors.tempFinal?.message}
                      />
                    )}
                  />
                </InputCard>
                <InputCard title="Fotos" className="min-h-48" required>
                  <View className="w-full items-center p-4 gap-2">
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${base64ImageFinal}`,
                      }}
                      className="mr-4 w-20 h-20 rounded-lg border border-gray-300"
                      resizeMode="cover"
                    />
                    <Photo
                      form="button"
                      iconSize="lg"
                      setImage={setBase64ImageFinal}
                    />
                  </View>
                </InputCard>
              </>
            )}
            <View className="w-full flex-col justify-center gap-4">
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
