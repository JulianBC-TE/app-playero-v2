import { StackRoutesProps } from "@/route/app.routes";
import { api } from "@/services/api";
import { toastError } from "@/utils/toastMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { Fuel, ListCheck, RotateCw, Save } from "lucide-react-native";
import { Loading } from "@/components/Loading";
import { Select } from "@/components/Select";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Photo } from "@/components/Photo";
import {
  getStorageCalibracion,
  saveCalibracion,
  calibracionDTO,
} from "@/storage/storageCalibracion";

let idAutorizado = 0;

export function Sequencias({
  navigation,
  route,
}: StackRoutesProps<"sequencias">) {
  const [isLoading, setIsLoading] = useState(false);
  const [salida, setSalida] = useState(0);
  const [cargaCombustible, setCargaCombustible] = useState("0,000");
  const [id_pico_surtidor, setIdPicoSurtidor] = useState(0);
  const [shouldContinue, setShouldContinue] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [valorMedicion, setValorMedicion] = useState("0");
  const [photoSequencia, setPhotoSequencia] = useState("");

  const [mediciones, setMediciones] = useState<SequenciaCalibracionDTO>({
    taxilitroInicial: 0,
    taxilitroFinal: 0,
    totalMediciones: 0,
    sequencias: [],
  });

  // Ref para acceder al valor más reciente de mediciones dentro de callbacks
  const medicionesRef = useRef(mediciones);
  useEffect(() => {
    medicionesRef.current = mediciones;
  }, [mediciones]);

  const medicion = Array.from({ length: 21 }, (_, i) => {
    const valor = -200 + i * 20;
    return { label: `${valor.toString()} ml`, value: valor.toString() };
  });

  // ─── Persistir mediciones parciales en el storage de calibración ────────────
  // Se llama cada vez que mediciones cambia para sobrevivir cierres inesperados.
  const persistirMediciones = useCallback(
    async (mediacionesActuales: SequenciaCalibracionDTO) => {
      try {
        const estadoGuardado = await getStorageCalibracion();
        if (!estadoGuardado) return; // No hay sesión de calibración activa

        const actualizado: calibracionDTO = {
          ...estadoGuardado,
          taxilitroInicial: mediacionesActuales.taxilitroInicial,
          taxilitroFinal: mediacionesActuales.taxilitroFinal,
          totalMediciones: mediacionesActuales.totalMediciones,
          sequencias: mediacionesActuales.sequencias,
        };
        await saveCalibracion(actualizado);
      } catch (error) {
        console.log("[Sequencias] Error al persistir mediciones:", error);
      }
    },
    []
  );

  useEffect(() => {
    persistirMediciones(mediciones);
  }, [mediciones, persistirMediciones]);

  // ─── Bloquear retroceso con popup ──────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Si no hay ninguna medición todavía, dejar salir libremente
      if (medicionesRef.current.totalMediciones === 0) return;

      // Bloquear la navegación hacia atrás
      e.preventDefault();

      Alert.alert(
        "¿Desea finalizar la verificación?",
        "Si sale ahora, las mediciones registradas hasta el momento se conservarán.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Finalizar y salir",
            onPress: () => {
              navigation.dispatch(e.data.action);
              // Notificar a Calibracion con las mediciones actuales
              navigation.navigate("calibracion", {
                onSequencia: medicionesRef.current,
              });
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  // ─── Lógica existente ──────────────────────────────────────────────────────
  function handleSaveSecuencia() {
    setMediciones((prev) => ({
      ...prev,
      sequencias: [
        ...prev.sequencias,
        {
          taxilitro: mediciones.taxilitroFinal,
          valor_medicion: valorMedicion,
          foto_medicion: photoSequencia,
        },
      ],
    }));
    setPhotoSequencia("");
    setValorMedicion("");
    setCargaCombustible("0,000");
    setSalida(3);
  }

  async function handlePhotoSequencia(base64: string) {
    setPhotoSequencia(base64);
  }

  async function handleMedicion() {
    try {
      setIsLoading(true);
      setSalida(1);

      const response = await api.post("/api/autorizar", {
        pico: id_pico_surtidor,
      });
      if (response.data.respuesta === "NoCargo") {
        toastError("Carga", "No se realizó ninguna carga.");
        setSalida(0);
        return;
      } else if (response.data.respuesta !== "Cargando") {
        toastError(
          "Pico no disponible",
          "El pico no está disponible para la carga."
        );
        return;
      }
      idAutorizado = response.data.idUltimaCarga;
      setSalida(1);
      setShouldContinue(true);
    } catch (error) {
      setSalida(0);
      setShouldContinue(false);
      console.error("Error al iniciar la carga:", error);
      toastError("Registro de Salida", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  const fetchBox = useCallback(async () => {
    try {
      const response = await api.get(`/api/salida-control/${id_pico_surtidor}`);
      if (response.data.estado === "B") {
        if (response.data.id <= idAutorizado) {
          setSalida(0);
          setShouldContinue(false);
          setIsLoading(false);
          idAutorizado = 0;
          return;
        }
        idAutorizado = 0;
        setSalida(2);
        setShouldContinue(false);

        if (medicionesRef.current.taxilitroInicial === 0) {
          setMediciones((prev) => ({
            ...prev,
            taxilitroInicial: response.data.taxiltroInicioDespacho,
          }));
        }
        setMediciones((prev) => ({
          ...prev,
          taxilitroFinal: response.data.taxiltroFinDespacho,
          totalMediciones: prev.totalMediciones + 1,
        }));
        setCargaCombustible(response.data.volumenDespachado.toFixed(2));
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  }, [id_pico_surtidor]);

  const fetchLoop = useCallback(async () => {
    if (!shouldContinue) return;
    await fetchBox();
    if (shouldContinue) {
      intervalRef.current = setTimeout(() => {
        fetchLoop();
      }, 3000);
    }
  }, [fetchBox, shouldContinue]);

  useEffect(() => {
    if (shouldContinue) fetchLoop();
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldContinue, fetchLoop]);

  useEffect(() => {
    if (route.params?.pico_surtidor) {
      setIdPicoSurtidor(route.params.pico_surtidor);
    }
  }, [route.params?.pico_surtidor]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1">
      <ScreenHeader
        title="Secuencia de Verificación"
        disableBackButton={salida !== 0}
      />
      <View className="flex-1 items-center p-4 gap-4">
        <InputCard title="" locked={salida !== 0}>
          <View className="flex-row p-2 gap-2">
            <View className="flex-1 justify-center items-center gap-2">
              {salida === 0 && (
                <>
                  <Text className="text-xl text-black font-bold">
                    Realizar carga
                  </Text>
                  <Button
                    title="Comenzar"
                    onPress={handleMedicion}
                    isLoading={isLoading}
                    icon={Fuel}
                    iconSize="md"
                    iconColor="#000"
                  />
                </>
              )}
              {salida === 1 && (
                <>
                  <Text className="text-xl text-black font-bold">
                    Cargando...
                  </Text>
                  <Loading />
                </>
              )}
              {(salida === 2 || salida === 3) && (
                <Text className="text-xl text-black font-bold">Finalizado</Text>
              )}
            </View>
            <View className="flex-1 items-center gap-2">
              <Text className="text-xl text-black font-bold">
                Litros Cargados
              </Text>
              <Text className="text-2xl text-black font-bold">
                {cargaCombustible}
              </Text>
            </View>
          </View>
        </InputCard>

        {salida === 2 && (
          <InputCard title="Valor de la medicion em mililitros:" required={true}>
            <View className="flex-row items-center p-2 gap-2">
              <View className="w-full">
                <Select
                  data={medicion}
                  isLoading={isLoading}
                  selectedValue={valorMedicion}
                  setSelectedValue={setValorMedicion}
                  labelField="label"
                  valueField="value"
                />
              </View>
              <View>
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor="#000"
                  setImage={handlePhotoSequencia}
                  disabled={isLoading || !valorMedicion}
                />
              </View>
            </View>
          </InputCard>
        )}

        {salida === 2 && valorMedicion && photoSequencia && (
          <View>
            <View className="flex flex-row items-center gap-2">
              <Button
                title="Registrar"
                icon={Save}
                iconColor="#000"
                onPress={() => handleSaveSecuencia()}
              />
            </View>
          </View>
        )}

        {salida === 3 && (
          <View>
            <View className="flex flex-row items-center gap-2">
              <Button
                title="Seguinte"
                icon={RotateCw}
                iconColor="#000"
                onPress={() => handleMedicion()}
              />
              <Button
                title="Finalizar"
                icon={ListCheck}
                iconColor="#000"
                onPress={() =>
                  navigation.navigate("calibracion", {
                    onSequencia: mediciones,
                  })
                }
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}