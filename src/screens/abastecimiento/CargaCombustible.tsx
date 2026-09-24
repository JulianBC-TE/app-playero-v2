import { Fuel, Check } from "lucide-react-native";
import { Button } from "@/components/Button";
import { InputCard } from "@/components/InputCard";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Text,
  View,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { toastError } from "@/utils/toastMessage";
import { Select } from "@/components/Select";
import { StackRoutesProps } from "@/route/app.routes";
import { PicoDTO } from "@/dto/PicosDTO";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";
import { Input } from "@/components/Input";
import { Photo } from "@/components/Photo";
import {
  saveCargaCombustible,
  getStorageCargaCombustible,
  removeCargaCombustible,
} from "@/storage/storageCargaCombustible";
import { getPicosByBodega } from "@DBmodules/picoDB";

export function CargaCombustible({
  navigation,
  route,
}: StackRoutesProps<"cargaCombustible">) {
  const idBodega = route.params?.idBodega || "0";
  const entryId = route.params?.entryId || "0";

  const [salida, setSalida] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [selectedPico, setSelectedPico] = useState<string>(""); 
  const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  const [taxilitroInicial, setTaxilitroInicial] = useState<string>("");
  const [taxilitroFinal, setTaxilitroFinal] = useState<string>("");
  const [litrosCargados, setLitrosCargados] = useState<string>("");

  const [base64FotoTaxilitro, setBase64FotoTaxilitro] = useState<string>("");
  const [base64FotoTaxilitroFin, setBase64FotoTaxilitroFin] = useState<string>("");

  // Sanitización de decimales
  const handleDecimalChange = (text: string, setter: (val: string) => void) => {
    let cleaned = text.replace(/[^0-9.,]/g, "");
    const parts = cleaned.split(/[.,]/);
    if (parts.length > 2) {
      cleaned = parts[0] + "," + parts.slice(1).join("");
    }
    setter(cleaned);
  };

  const parseNum = (val: string): number => {
    if (!val) return 0;
    const num = parseFloat(val.replace(",", "."));
    return isNaN(num) ? 0 : num;
  };

  async function fetchPicos() {
    setIsLoading(true);
    try {
      const picosDB = await getPicosByBodega(Number(idBodega));
      setPicos(picosDB);
    } catch (error) {
      console.error("Error al buscar picos desde BD:", error);
      toastError("Error al buscar picos", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;
    try {
      await saveCargaCombustible(
        {
          selectedPico,
          idPico_surtidor,
          salida,
          idBodega,
          taxilitroInicial,
          taxilitroFinal,
          litrosCargados,
          base64FotoTaxilitro,
          base64FotoTaxilitroFin,
        },
        entryId
      );
    } catch (error) {
      console.log("[CargaCombustible] Error guardando:", error);
    }
  }, [
    estadoRestaurado,
    selectedPico,
    idPico_surtidor,
    salida,
    idBodega,
    entryId,
    taxilitroInicial,
    taxilitroFinal,
    litrosCargados,
    base64FotoTaxilitro,
    base64FotoTaxilitroFin,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  useEffect(() => {
    async function restaurarEstado() {
      try {
        const guardado = await getStorageCargaCombustible(entryId);
        if (guardado && guardado.idBodega === idBodega) {
          setSelectedPico(guardado.selectedPico);
          setIdPicoSurtidor(Number(guardado.idPico_surtidor) || 0);
          setSalida(guardado.salida === 1 ? 1 : Number(guardado.salida) || 0);

          if (guardado.taxilitroInicial) setTaxilitroInicial(guardado.taxilitroInicial);
          if (guardado.taxilitroFinal) setTaxilitroFinal(guardado.taxilitroFinal);
          if (guardado.litrosCargados) setLitrosCargados(guardado.litrosCargados);
          if (guardado.base64FotoTaxilitro) setBase64FotoTaxilitro(guardado.base64FotoTaxilitro);
          if (guardado.base64FotoTaxilitroFin) setBase64FotoTaxilitroFin(guardado.base64FotoTaxilitroFin);
        } else {
          await removeCargaCombustible(entryId);
        }
      } catch (error) {
        console.log("[CargaCombustible] Error restaurando:", error);
      } finally {
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, [idBodega, entryId]);

  function handleSalida() {
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
      return;
    }
    const picoSurtidor = picos.find((pico) => pico.id_pico === Number(selectedPico));
    if (!picoSurtidor) {
      Alert.alert("ID Pico Surtidor", "El valor para el pico surtidor no fue encontrado.");
      return;
    }
    setIdPicoSurtidor(Number(picoSurtidor.id_pico_surtidor));
    setSalida(1);
  }

  async function handleFinalizar() {
    const taxIni = parseNum(taxilitroInicial);
    const taxFin = parseNum(taxilitroFinal);
    const litros = parseNum(litrosCargados);

    if (taxIni <= 0 && taxFin <= 0 && litros <= 0) {
      Alert.alert("Datos incompletos", "Debe ingresar valores válidos mayores a cero.");
      return;
    }

    if (taxFin < taxIni) {
      Alert.alert("Error", "El taxilitro final no puede ser menor al inicial.");
      return;
    }

    if (!base64FotoTaxilitro || !base64FotoTaxilitroFin) {
      Alert.alert("Evidencia requerida", "Por favor, capture la foto del taxilitro inicial y final.");
      return;
    }

    const carga: CargaZetaDTO = {
      id_pico_para_zeta: Number(selectedPico),
      taxilitro_inicial: taxIni,
      taxilitro_final: taxFin,
      litros_zeta: litros,
      foto_taxilitro: base64FotoTaxilitro,
      foto_taxilitro_fin: base64FotoTaxilitroFin,
    };

    await removeCargaCombustible(entryId);
    navigation.popTo("abastecimiento", { onCargaZeta: carga });
  }

  useEffect(() => {
    fetchPicos();
  }, []);

  return (
    <View className="flex-1">
      <ScreenHeader title="Abastecimiento Zeta" />
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
            <InputCard title="Pico expedidor:" required locked={salida !== 0}>
              {salida === 0 ? (
                <Select
                  data={picos}
                  isLoading={isLoading}
                  selectedValue={selectedPico}
                  setSelectedValue={setSelectedPico}
                  labelField="descripcion_pico"
                  valueField="id_pico"
                />
              ) : (
                <View></View>
              )}
              {salida !== 0 && (
                <Text className="text-lg text-black font-bold">
                  {picos.find((pico) => String(pico.id_pico) === String(selectedPico))
                    ?.descripcion_pico || selectedPico}
                </Text>
              )}
            </InputCard>

            {salida === 0 && (
              <Button
                title="Comenzar"
                onPress={handleSalida}
                isLoading={isLoading}
                icon={Fuel}
                iconSize="md"
                iconColor="#000"
              />
            )}

            {salida === 1 && (
              <>
                <InputCard title="Taxilitro Inicial" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="0.00"
                    value={taxilitroInicial}
                    onChangeText={(text) => handleDecimalChange(text, setTaxilitroInicial)}
                  />
                  <View className="w-full items-center p-2 gap-2 mt-2 border-t border-gray-100">
                    {base64FotoTaxilitro !== "" && (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${base64FotoTaxilitro}` }}
                        className="w-40 h-24 rounded-lg border border-gray-300"
                        resizeMode="cover"
                      />
                    )}
                    <Photo form="button" iconSize="md" setImage={setBase64FotoTaxilitro} />
                  </View>
                </InputCard>

                <InputCard title="Litros Cargados" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="0.00"
                    value={litrosCargados}
                    onChangeText={(text) => handleDecimalChange(text, setLitrosCargados)}
                  />
                </InputCard>

                <InputCard title="Taxilitro Final" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="0.00"
                    value={taxilitroFinal}
                    onChangeText={(text) => handleDecimalChange(text, setTaxilitroFinal)}
                  />
                  <View className="w-full items-center p-2 gap-2 mt-2 border-t border-gray-100">
                    {base64FotoTaxilitroFin !== "" && (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${base64FotoTaxilitroFin}` }}
                        className="w-40 h-24 rounded-lg border border-gray-300"
                        resizeMode="cover"
                      />
                    )}
                    <Photo form="button" iconSize="md" setImage={setBase64FotoTaxilitroFin} />
                  </View>
                </InputCard>

                <Button
                  title="Confirmar"
                  onPress={handleFinalizar}
                  icon={Check}
                  iconSize="md"
                  iconColor="#000"
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}