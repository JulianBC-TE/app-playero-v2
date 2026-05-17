// src/screens/calibracion/Sequencias.tsx
//
// Pantalla de secuencias de verificación — flujo MANUAL.
// El usuario ingresa los valores medidos directamente (taxilitro inicial,
// taxilitro final, litros cargados) sin dispensadores inteligentes.
// Puede registrar múltiples secuencias antes de finalizar y volver a Calibracion.

import { StackRoutesProps } from "@/route/app.routes";
import { toastError } from "@/utils/toastMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { ListCheck, Plus } from "lucide-react-native";
import { Select } from "@/components/Select";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Photo } from "@/components/Photo";
import { Input } from "@/components/Input";
import {
  getStorageCalibracion,
  saveCalibracion,
  calibracionDTO,
} from "@/storage/storageCalibracion";

// Opciones de medición en mililitros (-200 a +200 en pasos de 20)
const OPCIONES_MEDICION = Array.from({ length: 21 }, (_, i) => {
  const valor = -200 + i * 20;
  return { label: `${valor} ml`, value: valor.toString() };
});

export function Sequencias({
  navigation,
  route,
}: StackRoutesProps<"sequencias">) {
  const [isLoading, setIsLoading] = useState(false);

  // ─── Datos del pico (vienen desde Calibracion vía route.params) ──────────
  const [pico, setPico] = useState<number>(0);

  // ─── Campos que el usuario ingresa para cada secuencia ───────────────────
  const [taxilitroInicial, setTaxilitroInicial] = useState("");
  const [taxilitroFinal, setTaxilitroFinal] = useState("");
  const [litrosCargados, setLitrosCargados] = useState("");
  const [valorMedicion, setValorMedicion] = useState("");
  const [photoSequencia, setPhotoSequencia] = useState("");

  // ─── Acumulado de todas las secuencias registradas ───────────────────────
  const [mediciones, setMediciones] = useState<SequenciaCalibracionDTO>({
    taxilitroInicial: 0,
    taxilitroFinal: 0,
    totalMediciones: 0,
    sequencias: [],
  });

  const medicionesRef = useRef(mediciones);
  useEffect(() => {
    medicionesRef.current = mediciones;
  }, [mediciones]);

  // ─── Persistir en storage ante cierres inesperados ───────────────────────
  const persistirMediciones = useCallback(
    async (mediacionesActuales: SequenciaCalibracionDTO) => {
      try {
        const estadoGuardado = await getStorageCalibracion();
        if (!estadoGuardado) return;

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
    [],
  );

  useEffect(() => {
    persistirMediciones(mediciones);
  }, [mediciones, persistirMediciones]);

  // ─── Bloquear retroceso si ya hay secuencias registradas ─────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (medicionesRef.current.totalMediciones === 0) return;

      e.preventDefault();
      Alert.alert(
        "¿Desea finalizar la verificación?",
        "Si sale ahora, las mediciones registradas hasta el momento se conservarán.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Finalizar y salir",
            onPress: () => {
              navigation.dispatch(e.data.action);
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

  // ─── Leer pico desde parámetros de ruta ──────────────────────────────────
  useEffect(() => {
    if (route.params?.pico_surtidor) {
      setPico(route.params.pico_surtidor);
    }
  }, [route.params?.pico_surtidor]);

  // ─── Validar y registrar una secuencia ───────────────────────────────────
  function handleRegistrarSecuencia() {
    if (!taxilitroInicial || isNaN(Number(taxilitroInicial))) {
      toastError("Validación", "Ingrese un taxilitro inicial válido.");
      return;
    }
    if (!taxilitroFinal || isNaN(Number(taxilitroFinal))) {
      toastError("Validación", "Ingrese un taxilitro final válido.");
      return;
    }
    if (!litrosCargados || isNaN(Number(litrosCargados))) {
      toastError("Validación", "Ingrese los litros cargados.");
      return;
    }
    if (!valorMedicion) {
      toastError("Validación", "Seleccione el valor de medición.");
      return;
    }
    if (!photoSequencia) {
      toastError("Validación", "Debe tomar una foto de la medición.");
      return;
    }

    const txIni = Number(taxilitroInicial);
    const txFin = Number(taxilitroFinal);
    const litros = Number(litrosCargados);

    setMediciones((prev) => {
      const esLaPrimera = prev.totalMediciones === 0;
      return {
        // taxilitroInicial global: solo se fija en la primera secuencia
        taxilitroInicial: esLaPrimera ? txIni : prev.taxilitroInicial,
        // taxilitroFinal global: siempre se actualiza al de la última secuencia
        taxilitroFinal: txFin,
        totalMediciones: prev.totalMediciones + 1,
        sequencias: [
          ...prev.sequencias,
          {
            taxilitro: txFin,
            litros_cargados: litros,
            valor_medicion: valorMedicion,
            foto_medicion: photoSequencia,
          },
        ],
      };
    });

    // Limpiar campos para la próxima secuencia
    setTaxilitroInicial("");
    setTaxilitroFinal("");
    setLitrosCargados("");
    setValorMedicion("");
    setPhotoSequencia("");
  }

  function handleFinalizar() {
    if (medicionesRef.current.totalMediciones === 0) {
      toastError("Sin mediciones", "Debe registrar al menos una secuencia.");
      return;
    }
    navigation.navigate("calibracion", { onSequencia: medicionesRef.current });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View className="flex-1">
      <ScreenHeader title="Secuencia de Verificación" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center p-4 gap-4">
          {/* Pico seleccionado (solo informativo, viene de Calibracion) */}
          <InputCard title="Pico surtidor" locked>
            <Text className="text-lg text-black font-bold p-2">
              Pico N.º {pico}
            </Text>
          </InputCard>

          {/* Resumen de secuencias ya registradas */}
          {mediciones.totalMediciones > 0 && (
            <InputCard title="Secuencias registradas">
              <Text className="text-black text-base p-2">
                Total: {mediciones.totalMediciones}
              </Text>
              <Text className="text-black text-base p-2">
                Taxilitro inicial: {mediciones.taxilitroInicial}
              </Text>
              <Text className="text-black text-base p-2">
                Taxilitro final: {mediciones.taxilitroFinal}
              </Text>
            </InputCard>
          )}

          {/* Formulario de nueva secuencia */}
          <InputCard title="Nueva secuencia" required>
            <View className="p-2 gap-3">
              <Text className="text-black font-semibold">
                Taxilitro inicial
              </Text>
              <Input
                keyboardType="numeric"
                placeholder="Ej: 12345"
                value={taxilitroInicial}
                onChangeText={setTaxilitroInicial}
                editable={!isLoading}
              />

              <Text className="text-black font-semibold">Taxilitro final</Text>
              <Input
                keyboardType="numeric"
                placeholder="Ej: 12400"
                value={taxilitroFinal}
                onChangeText={setTaxilitroFinal}
                editable={!isLoading}
              />

              <Text className="text-black font-semibold">Litros cargados</Text>
              <Input
                keyboardType="numeric"
                placeholder="Ej: 20.5"
                value={litrosCargados}
                onChangeText={setLitrosCargados}
                editable={!isLoading}
              />

              <Text className="text-black font-semibold">
                Valor de medición (ml)
              </Text>
              <Select
                data={OPCIONES_MEDICION}
                isLoading={isLoading}
                selectedValue={valorMedicion}
                setSelectedValue={setValorMedicion}
                labelField="label"
                valueField="value"
              />

              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-black font-semibold">
                  Foto de la medición
                </Text>
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={photoSequencia ? "#05a722" : "#000"}
                  setImage={setPhotoSequencia}
                  disabled={isLoading}
                />
              </View>
              {photoSequencia ? (
                <Text className="text-green-600 text-sm">✓ Foto capturada</Text>
              ) : null}
            </View>
          </InputCard>

          {/* Botones */}
          <View className="flex-row gap-4">
            <Button
              title="Registrar"
              icon={Plus}
              iconColor="#000"
              isLoading={isLoading}
              onPress={handleRegistrarSecuencia}
            />
            {mediciones.totalMediciones > 0 && (
              <Button
                title="Finalizar"
                icon={ListCheck}
                iconColor="#000"
                isLoading={isLoading}
                onPress={handleFinalizar}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
