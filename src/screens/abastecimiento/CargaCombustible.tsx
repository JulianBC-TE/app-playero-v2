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
import { useAppContext } from "@/hooks/useAppContext";
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

  const [salida, setSalida] = useState(0); // 0=iniciar | 1=formulario
  const [isLoading, setIsLoading] = useState(false);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [selectedPico, setSelectedPico] = useState<string>("");
  const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  // Estados para los Inputs
  const [taxilitroInicial, setTaxilitroInicial] = useState<string>("");
  const [taxilitroFinal, setTaxilitroFinal] = useState<string>("");
  const [litrosCargados, setLitrosCargados] = useState<string>("");

  // NUEVO: Estados para las Fotos en Base64
  const [base64FotoTaxilitro, setBase64FotoTaxilitro] = useState<string>("");
  const [base64FotoTaxilitroFin, setBase64FotoTaxilitroFin] =
    useState<string>("");

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
      await saveCargaCombustible({
        selectedPico,
        idPico_surtidor,
        salida,
        idBodega,
        // Agregamos persistencia de los nuevos campos de fotos si tu storage los soporta
        taxilitroInicial,
        taxilitroFinal,
        litrosCargados,
        base64FotoTaxilitro,
        base64FotoTaxilitroFin,
      });
    } catch (error) {
      console.log("[CargaCombustible] Error guardando:", error);
    }
  }, [
    estadoRestaurado,
    selectedPico,
    idPico_surtidor,
    salida,
    idBodega,
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
        const guardado = await getStorageCargaCombustible();
        if (guardado && guardado.idBodega === idBodega) {
          setSelectedPico(guardado.selectedPico);
          setIdPicoSurtidor(Number(guardado.idPico_surtidor) || 0);
          setSalida(guardado.salida === 1 ? 1 : Number(guardado.salida) || 0);

          // Restaurar campos de texto y fotos si existen en el storage externo
          if (guardado.taxilitroInicial)
            setTaxilitroInicial(guardado.taxilitroInicial);
          if (guardado.taxilitroFinal)
            setTaxilitroFinal(guardado.taxilitroFinal);
          if (guardado.litrosCargados)
            setLitrosCargados(guardado.litrosCargados);
          if (guardado.base64FotoTaxilitro)
            setBase64FotoTaxilitro(guardado.base64FotoTaxilitro);
          if (guardado.base64FotoTaxilitroFin)
            setBase64FotoTaxilitroFin(guardado.base64FotoTaxilitroFin);
        } else {
          await removeCargaCombustible();
        }
      } catch (error) {
        console.log("[CargaCombustible] Error restaurando:", error);
      } finally {
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, [idBodega]);

  function handleSalida() {
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
      return;
    }
    const picoSurtidor = picos.find(
      (pico) => pico.id_pico === Number(selectedPico),
    );
    if (!picoSurtidor) {
      Alert.alert(
        "ID Pico Surtidor",
        "El valor para el pico surtidor no fue encontrado.",
      );
      return;
    }
    setIdPicoSurtidor(Number(picoSurtidor.id_pico_surtidor));
    setSalida(1);
  }

  async function handleFinalizar() {
    const taxIni = Number(taxilitroInicial.replace(",", "."));
    const taxFin = Number(taxilitroFinal.replace(",", "."));
    const litros = Number(litrosCargados.replace(",", "."));
    console.log(taxIni, taxFin, litros);
    if (
      (!taxIni && taxIni != 0) ||
      (!taxFin && taxFin != 0) ||
      (!litros && litros != 0)
    ) {
      Alert.alert(
        "Datos incompletos",
        "Debe ingresar taxilitro inicial, final y litros cargados.",
      );
      return;
    }
    if (taxFin < taxIni) {
      Alert.alert("Error", "El taxilitro final no puede ser menor al inicial.");
      return;
    }

    // VALIDACIÓN DE FOTOS OBLIGATORIAS
    if (!base64FotoTaxilitro || !base64FotoTaxilitroFin) {
      Alert.alert(
        "Evidencia requerida",
        "Por favor, capture la foto del taxilitro inicial y final.",
      );
      return;
    }

    const carga: CargaZetaDTO = {
      id_pico_para_zeta: Number(selectedPico),
      taxilitro_inicial: taxIni,
      taxilitro_final: taxFin,
      litros_zeta: litros,
      // ── NUEVO: Mandamos las fotos adjuntas en el DTO de retorno ──
      foto_taxilitro: base64FotoTaxilitro,
      foto_taxilitro_fin: base64FotoTaxilitroFin,
    };

    await removeCargaCombustible();
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
                  {picos.find(
                    (pico) => String(pico.id_pico) === String(selectedPico),
                  )?.descripcion_pico || selectedPico}
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
                {/* 1. SECCIÓN TAXILITRO INICIAL */}
                <InputCard title="Taxilitro Inicial" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="Ingrese el taxilitro inicial"
                    value={taxilitroInicial}
                    onChangeText={setTaxilitroInicial}
                  />
                  <View className="w-full items-center p-2 gap-2 mt-2 border-t border-gray-100">
                    {base64FotoTaxilitro !== "" && (
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${base64FotoTaxilitro}`,
                        }}
                        className="w-40 h-24 rounded-lg border border-gray-300"
                        resizeMode="cover"
                      />
                    )}
                    <Photo
                      form="button"
                      iconSize="md"
                      setImage={setBase64FotoTaxilitro}
                    />
                  </View>
                </InputCard>

                {/* 2. SECCIÓN LITROS CARGADOS */}
                <InputCard title="Litros Cargados" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="Ingrese los litros cargados"
                    value={litrosCargados}
                    onChangeText={setLitrosCargados}
                  />
                </InputCard>

                {/* 3. SECCIÓN TAXILITRO FINAL */}
                <InputCard title="Taxilitro Final" required>
                  <Input
                    keyboardType="numeric"
                    align="center"
                    placeholder="Ingrese el taxilitro final"
                    value={taxilitroFinal}
                    onChangeText={setTaxilitroFinal}
                  />
                  <View className="w-full items-center p-2 gap-2 mt-2 border-t border-gray-100">
                    {base64FotoTaxilitroFin !== "" && (
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${base64FotoTaxilitroFin}`,
                        }}
                        className="w-40 h-24 rounded-lg border border-gray-300"
                        resizeMode="cover"
                      />
                    )}
                    <Photo
                      form="button"
                      iconSize="md"
                      setImage={setBase64FotoTaxilitroFin}
                    />
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
