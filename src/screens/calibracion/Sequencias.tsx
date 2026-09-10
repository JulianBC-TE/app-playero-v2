// src/screens/calibracion/Sequencias.tsx
import { StackRoutesProps } from "@/route/app.routes";
import { toastError } from "@/utils/toastMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Text } from "@/components";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Photo } from "@/components/Photo";
import { Input } from "@/components/Input";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getStorageCalibracion,
  saveCalibracion,
  calibracionDTO,
} from "@/storage/storageCalibracion";

const OPCIONES_MEDICION = Array.from({ length: 21 }, (_, i) => {
  const valor = -200 + i * 20;
  return { label: `${valor} ml`, value: valor.toString() };
});

const toNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  return Number(s.replace(",", "."));
};

interface SequenciaCalibracionExtendidaDTO extends Omit<
  SequenciaCalibracionDTO,
  "sequencias"
> {
  fotoInicialTaxilitro: string;
  fotoFinalTaxilitro: string;
  sequencias: {
    valor_medicion: string;
    foto_medicion: string;
    taxilitro: number;
    litros_cargados: number;
    foto_taxilitro_carga: string;
  }[];
}

export function Sequencias({
  navigation,
  route,
}: StackRoutesProps<"sequencias">) {
  const [isLoading] = useState(false);
  const [pico, setPico] = useState<number>(0);
  const [descripcionPico, setDescripcionPico] = useState<string>("");
  const [cargado, setCargado] = useState(false);

  // Campos de Texto
  const [taxilitroInicial, setTaxilitroInicial] = useState("");
  const [taxilitroFinal, setTaxilitroFinal] = useState("");
  const [litrosCargados, setLitrosCargados] = useState("");
  const [valorMedicion, setValorMedicion] = useState("");

  const insets = useSafeAreaInsets();

  // Fotos
  const [photoSequencia, setPhotoSequencia] = useState("");
  const [photoTaxInicial, setPhotoTaxInicial] = useState("");
  const [photoTaxFinal, setPhotoTaxFinal] = useState("");

  const [mediciones, setMediciones] =
    useState<SequenciaCalibracionExtendidaDTO>({
      taxilitroInicial: 0,
      taxilitroFinal: 0,
      fotoInicialTaxilitro: "",
      fotoFinalTaxilitro: "",
      totalMediciones: 0,
      sequencias: [],
    });

  const medicionesRef = useRef(mediciones);
  useEffect(() => {
    medicionesRef.current = mediciones;
  }, [mediciones]);

  const persistirMediciones = useCallback(
    async (actuales: SequenciaCalibracionExtendidaDTO) => {
      try {
        const estadoGuardado = await getStorageCalibracion();
        if (!estadoGuardado) return;

        const actualizado: calibracionDTO = {
          ...estadoGuardado,
          taxilitroInicial: actuales.taxilitroInicial,
          taxilitroFinal: actuales.taxilitroFinal,
          fotoInicialTaxilitro: actuales.fotoInicialTaxilitro,
          fotoFinalTaxilitro: actuales.fotoFinalTaxilitro,
          totalMediciones: actuales.totalMediciones,
          sequencias: actuales.sequencias,
        };
        await saveCalibracion(actualizado);
      } catch (error) {
        console.log("[Sequencias] Error persistiendo:", error);
      }
    },
    [],
  );

  useEffect(() => {
    if (cargado) {
      persistirMediciones(mediciones);
    }
  }, [mediciones, cargado, persistirMediciones]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (medicionesRef.current.totalMediciones === 0) return;
      e.preventDefault();
      Alert.alert(
        "¿Desea finalizar la verificación?",
        "Las mediciones registradas hasta el momento se guardarán.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Finalizar y salir",
            onPress: () => {
              navigation.navigate("calibracion", {
                onSequencia: medicionesRef.current,
              });
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route.params?.pico_surtidor) {
      setPico(route.params.pico_surtidor);
    }
    if (route.params?.descripcion_pico) {
      setDescripcionPico(route.params.descripcion_pico);
    }
    
    const existData = (route.params as any)?.medicionesExistentes as SequenciaCalibracionExtendidaDTO | undefined;
    if (existData && existData.totalMediciones > 0) {
      setMediciones(existData);
      if (existData.taxilitroFinal) {
        setTaxilitroInicial(existData.taxilitroFinal.toString());
      }
    }
    setCargado(true);
  }, [route.params]);

  function handleRegistrarSecuencia() {
    const esLaPrimera = mediciones.totalMediciones === 0;

    const txIni = toNumber(taxilitroInicial);
    const txFin = toNumber(taxilitroFinal);
    const litros = toNumber(litrosCargados);

    if (!taxilitroInicial.trim() || isNaN(txIni)) {
      toastError("Validación", "Ingrese un taxilitro inicial válido.");
      return;
    }
    if (esLaPrimera && !photoTaxInicial) {
      toastError("Validación", "Debe capturar la foto del taxilitro inicial.");
      return;
    }
    if (!taxilitroFinal.trim() || isNaN(txFin)) {
      toastError("Validación", "Ingrese un taxilitro final válido.");
      return;
    }
    if (!photoTaxFinal) {
      toastError("Validación", "Debe capturar la foto del taxilitro final.");
      return;
    }
    if (!litrosCargados.trim() || isNaN(litros)) {
      toastError("Validación", "Ingrese los litros cargados.");
      return;
    }
    if (!valorMedicion) {
      toastError("Validación", "Seleccione el valor de medición.");
      return;
    }
    if (!photoSequencia) {
      toastError(
        "Validación",
        "Debe tomar una foto de la medición en el balde.",
      );
      return;
    }

    setMediciones((prev) => {
      return {
        taxilitroInicial: esLaPrimera ? txIni : prev.taxilitroInicial,
        taxilitroFinal: txFin,
        fotoInicialTaxilitro: esLaPrimera
          ? photoTaxInicial
          : prev.fotoInicialTaxilitro,
        fotoFinalTaxilitro: photoTaxFinal,
        totalMediciones: prev.totalMediciones + 1,
        sequencias: [
          ...prev.sequencias,
          {
            taxilitro: txFin,
            litros_cargados: litros,
            valor_medicion: valorMedicion,
            foto_medicion: photoSequencia,
            foto_taxilitro_carga: photoTaxFinal,
          },
        ],
      };
    });

    setTaxilitroInicial(taxilitroFinal);
    setTaxilitroFinal("");
    setLitrosCargados("");
    setValorMedicion("");
    setPhotoSequencia("");
    setPhotoTaxFinal("");
  }

  function handleFinalizar() {
    if (medicionesRef.current.totalMediciones === 0) {
      toastError("Sin mediciones", "Debe registrar al menos una secuencia.");
      return;
    }
    navigation.navigate("calibracion", { onSequencia: medicionesRef.current });
  }

  const esPrimeraCarga = mediciones.totalMediciones === 0;

  return (
    <View className="flex-1" style={{ backgroundColor: "#F9FAFB" }}>
      <ScreenHeader title="Secuencia de Verificación" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-4 py-6 gap-5">
          {/* Info del Pico */}
          <View className="rounded-lg overflow-hidden" style={{ elevation: 4 }}>
            <View style={{ backgroundColor: "#3B82F6" }}>
              <InputCard title={descripcionPico ? " " : "Pico surtidor"} locked>
                <Text className="text-3xl text-white text-center font-bold py-2 px-4">
                  {descripcionPico || `Pico N.º ${pico}`}
                </Text>
              </InputCard>
            </View>
          </View>

          {/* Resumen Acumulado */}
          {mediciones.totalMediciones > 0 && (
            <View
              className="rounded-lg overflow-hidden"
              style={{ elevation: 3 }}
            >
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderWidth: 1,
                  borderColor: "#BBF7D0",
                }}
              >
                <InputCard title="Secuencias acumuladas">
                  <View className="p-4 gap-2 w-full">
                    <Text className="text-gray-700 text-center text-3xl">
                      Secuencias:{" "}
                      <Text className="text-red-700 font-bold">
                        {mediciones.totalMediciones}
                      </Text>
                    </Text>
                  </View>
                </InputCard>
              </View>
            </View>
          )}

          {/* Formulario de Registro */}
          <View className="rounded-lg overflow-hidden " style={{ elevation: 3 }}>
            <View style={{ backgroundColor: "#FFFFFF" }}>
              <InputCard title="Formulario de secuencia" required>
                <View className="p-4 gap-4 w-full">
                  <Text className="text-gray-900 font-bold text-center tracking-wider text-xl">
                    LECTURAS DEL TAXILITRO
                  </Text>

                  {/* Taxilitro Inicial */}
                  <View
                    className="gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Text className="text-gray-700 font-semibold text-xl">
                      Taxilitro Inicial
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Input
                          keyboardType="decimal-pad"
                          placeholder="0,00"
                          value={taxilitroInicial}
                          onChangeText={setTaxilitroInicial}
                          editable={esPrimeraCarga && !isLoading}
                        />
                      </View>
                    </View>
                    <View className="items-center gap-2">
                      {esPrimeraCarga ? (
                        <Photo
                          form="button"
                          iconSize="lg"
                          iconColor={photoTaxInicial ? "#059669" : "#9CA3AF"}
                          setImage={setPhotoTaxInicial}
                          disabled={isLoading}
                        />
                      ) : (
                        <Text className="text-green-600 text-xs font-bold px-2">
                          ✓ Foto OK
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Taxilitro Final */}
                  <View
                    className="gap-2 p-3 rounded-lg"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Text className="text-gray-700 font-semibold text-xl">
                      Taxilitro Final
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Input
                          keyboardType="decimal-pad"
                          placeholder="0,00"
                          value={taxilitroFinal}
                          onChangeText={setTaxilitroFinal}
                          editable={!isLoading}
                        />
                      </View>
                    </View>
                    <View className="items-center gap-2">
                      <Photo
                        form="button"
                        iconSize="lg"
                        iconColor={photoTaxFinal ? "#059669" : "#9CA3AF"}
                        setImage={setPhotoTaxFinal}
                        disabled={isLoading}
                      />
                    </View>
                  </View>
                  <View className="h-px bg-gray-200" />

                  {/* SECCIÓN DETALLES FÍSICOS */}
                  <Text className="text-gray-900 font-bold text-center tracking-wider text-xl">
                    MEDICIÓN FISICA (BALDE)
                  </Text>
                  <View
                    className="gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: "#F9FAFB" }}
                  >
                    <View>
                      <Text className="text-gray-700 font-semibold text-xl">
                        Litros cargados
                      </Text>
                      <Input
                        keyboardType="decimal-pad"
                        placeholder="20,00"
                        value={litrosCargados}
                        onChangeText={setLitrosCargados}
                        editable={!isLoading}
                      />
                    </View>
                    <View>
                      <Text className="text-gray-700 font-semibold text-xl">
                        Error de medición (ml)
                      </Text>
                      <Select
                        data={OPCIONES_MEDICION}
                        isLoading={isLoading}
                        selectedValue={valorMedicion}
                        setSelectedValue={setValorMedicion}
                        labelField="label"
                        valueField="value"
                      />
                    </View>

                    <View className="flex-row items-center justify-between mt-2 p-3 rounded-md bg-blue-50 border border-blue-200">
                      <Text className="text-gray-900 font-medium text-xl flex-1">
                        Foto del balde graduado
                      </Text>
                      <Photo
                        form="icon"
                        iconSize="lg"
                        iconColor={photoSequencia ? "#059669" : "#9CA3AF"}
                        setImage={setPhotoSequencia}
                        disabled={isLoading}
                      />
                    </View>
                  </View>
                </View>
              </InputCard>
            </View>
          </View>

          {/* Botones de Control */}
          <View className="flex-row gap-4 justify-center items-center mt-2 pb-6">
            <Button
              title="Registrar"
              isLoading={isLoading}
              onPress={handleRegistrarSecuencia}
            />
            {mediciones.totalMediciones > 0 && (
              <Button
                title="Finalizar"
                isLoading={isLoading}
                onPress={handleFinalizar}
                style={{ backgroundColor: "#059669" }}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}