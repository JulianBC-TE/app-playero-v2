import { Fuel, ArrowLeft, Check } from "lucide-react-native";
import { Button } from "@/components/Button";
import { InputCard } from "@/components/InputCard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { toastError } from "@/utils/toastMessage";
import { Select } from "@/components/Select";
import { StackRoutesProps } from "@/route/app.routes";
import { PicoDTO } from "@/dto/PicosDTO";
import { useAppContext } from "@/hooks/useAppContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";
import { Input } from "@/components/Input";
import {
  saveCargaCombustible,
  getStorageCargaCombustible,
  removeCargaCombustible,
} from "@/storage/storageCargaCombustible";
// BD
import { getPicosByBodega } from "@DBmodules/picoDB";

let idAutorizado = 0;

export function CargaCombustible({
  navigation,
  route,
}: StackRoutesProps<"cargaCombustible">) {
  const { sucursal } = useAppContext();

  const idBodega = route.params?.idBodega || "0";

  const [salida, setSalida] = useState(0); // 0=iniciar | 1=cargando | 2=finalizado
  const [cargaCombustible, setCargaCombustible] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldContinue, setShouldContinue] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [selectedPico, setSelectedPico] = useState<string>("");

  const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);

  const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
    useState<number>(0);

  const [totalizadorPicoFinal, setTotalizadorPicoFinal] = useState<number>(0);

  const [estadoRestaurado, setEstadoRestaurado] = useState(false);

  const [taxilitroInicial, setTaxilitroInicial] = useState<string>("");
  const [taxilitroFinal, setTaxilitroFinal] = useState<string>("");
  const [litrosCargados, setLitrosCargados] = useState<string>("");

  // =====================================================
  // FETCH PICOS
  // =====================================================
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
  // =====================================================
  // GUARDAR STORAGE
  // =====================================================
  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;

    try {
      await saveCargaCombustible({
        selectedPico,
        idPico_surtidor,
        salida,
        cargaCombustible,
        totalizadorPicoInicial,
        totalizadorPicoFinal,
        idBodega,
      });
    } catch (error) {
      console.log("[CargaCombustible] Error guardando:", error);
    }
  }, [
    estadoRestaurado,
    selectedPico,
    idPico_surtidor,
    salida,
    cargaCombustible,
    totalizadorPicoInicial,
    totalizadorPicoFinal,
    idBodega,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  // =====================================================
  // RESTAURAR STORAGE
  // =====================================================
  useEffect(() => {
    async function restaurarEstado() {
      try {
        const guardado = await getStorageCargaCombustible();

        if (guardado && guardado.idBodega === idBodega) {
          setSelectedPico(guardado.selectedPico);
          setIdPicoSurtidor(Number(guardado.idPico_surtidor) || 0);

          setCargaCombustible(Number(guardado.cargaCombustible) || 0);

          setTotalizadorPicoInicial(
            Number(guardado.totalizadorPicoInicial) || 0,
          );

          setTotalizadorPicoFinal(Number(guardado.totalizadorPicoFinal) || 0);

          // Si estaba "cargando", volver a inicio
          setSalida(guardado.salida === 1 ? 0 : Number(guardado.salida) || 0);
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

  // =====================================================
  // COMENZAR CARGA
  // =====================================================
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
    setSalida(1); // muestra los campos manuales
  }

  // ──────────────────────────────────────────────────────────────
  // handleFinalizar() — función NUEVA que reemplaza el botón "Volver"
  // cuando salida===2 en la versión anterior
  // ──────────────────────────────────────────────────────────────

  async function handleFinalizar() {
    const taxIni = Number(taxilitroInicial.replace(",", "."));
    const taxFin = Number(taxilitroFinal.replace(",", "."));
    const litros = Number(litrosCargados.replace(",", "."));

    if (!taxIni || !taxFin || !litros) {
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

    const carga: CargaZetaDTO = {
      id_pico_para_zeta: Number(selectedPico),
      taxilitro_inicial: taxIni,
      taxilitro_final: taxFin,
      litros_zeta: litros,
    };

    await removeCargaCombustible();

    navigation.popTo("abastecimiento", { onCargaZeta: carga });
  }

  // =====================================================
  // INIT
  // =====================================================
  useEffect(() => {
    fetchPicos();
  }, []);

  // =====================================================
  // UI
  // =====================================================
  return (
    <View className="flex-1">
      <ScreenHeader title="Abastecimiento Zeta" />

      <View className="flex-1 items-center p-4 gap-4">
        {/* Selección de pico — solo editable en el paso inicial */}
        <InputCard title="Pico expendedor:" required locked={salida !== 0}>
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
            <Text className="text-lg text-black font-bold">
              Pico seleccionado: {selectedPico}
            </Text>
          )}
        </InputCard>

        {/* Paso 0: botón para iniciar */}
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

        {/* Paso 1: el operario ingresa los datos manualmente */}
        {salida === 1 && (
          <>
            <InputCard title="Taxilitro Inicial" required>
              <Input
                keyboardType="numeric"
                align="center"
                placeholder="Ingrese el taxilitro inicial"
                value={taxilitroInicial}
                onChangeText={setTaxilitroInicial}
              />
            </InputCard>

            <InputCard title="Taxilitro Final" required>
              <Input
                keyboardType="numeric"
                align="center"
                placeholder="Ingrese el taxilitro final"
                value={taxilitroFinal}
                onChangeText={setTaxilitroFinal}
              />
            </InputCard>

            <InputCard title="Litros Cargados" required>
              <Input
                keyboardType="numeric"
                align="center"
                placeholder="Ingrese los litros cargados"
                value={litrosCargados}
                onChangeText={setLitrosCargados}
              />
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
    </View>
  );
}
