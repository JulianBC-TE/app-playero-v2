import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { Image, View } from "react-native";
import { Button } from "@/components/Button";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { useEffect, useState } from "react"; 
import { InputCard } from "@/components/InputCard";
import { Input } from "@/components/Input";
import { getTanquesByBodega } from "@DBmodules/tanqueDB";
import { cubicacionService } from "@DBmodules/cubicacionDB";
import { TanqueDTO } from "@/dto/TanqueDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { Select } from "@/components/Select";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import { Check } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Photo } from "@/components/Photo";

type FormData = {
  altura_regla: string;
  litros: string;
  temperatura: string;
};

interface AlturaSelectOption {
  id: string;
  label: string;
  altura: number;
  litros: number;
}

const habilitarTanque = yup.object({
  altura_regla: yup
    .string()
    .required("Altura de la regla es requerida"),
  temperatura: yup
    .string()
    .required("Temperatura del tanque es requerida")
    .matches(/^[0-9]*\,?[0-9]+$/, "El formato de la temperatura no es válido"),
  litros: yup
    .string()
    .required("Cantidad de litros requerida"),
});

export function Medicion({ navigation, route }: StackRoutesProps<"medicion">) {
  const [base64Image, setBase64Image] = useState<string>("");
  const idBodega = route.params?.idBodega || "0";
  const [isLoading, setIsLoading] = useState(false);
  const [tanques, setTanques] = useState<TanqueDTO[]>([]);
  const [selectedTanques, setSelectedTanques] = useState("");
  const [alturasCubicacion, setAlturasCubicacion] = useState<AlturaSelectOption[]>([]);
  const [loadingAlturas, setLoadingAlturas] = useState(false);
  const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
  const [fromScreen] = useState(route.params?.fromScreen || "turno");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(habilitarTanque),
    defaultValues: {
      altura_regla: "",
      temperatura: "",
      litros: "",
    },
  });

  // Cargar alturas de cubicación cuando cambia el tanque seleccionado
  useEffect(() => {
    async function loadCubicacionTanque() {
      if (!selectedTanques) {
        setAlturasCubicacion([]);
        setValue("altura_regla", "");
        setValue("litros", "");
        return;
      }

      try {
        setLoadingAlturas(true);
        const puntos = await cubicacionService.obtenerCubicacionPorTanque(Number(selectedTanques));
        //console.log("Puntos de cubicación obtenidos:", selectedTanques, puntos);
        const opciones = puntos.map((p) => ({
          id: String(p.altura),
          label: `${p.altura}  —  ${p.litros.toLocaleString()} L`,
          altura: p.altura,
          litros: p.litros,
        }));

        setAlturasCubicacion(opciones);
      } catch (error) {
        toastError("Error de Cubicación", "No se pudieron obtener las alturas del tanque.");
      } finally {
        setLoadingAlturas(false);
      }
    }

    loadCubicacionTanque();
  }, [selectedTanques]);

  const definirMedicion = ({ altura_regla, litros, temperatura }: FormData) => {
    if (base64Image === "") {
      toastError(
        "Registro fotográfico requerido",
        "Por favor, capture una foto del tanque.",
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

    const newMedicion: MedicionDTO = {
      id_tanque: selectedTanques,
      regla: parseFloat(altura_regla),
      temperatura: parseFloat(temperatura.replace(",", ".")),
      litros: parseFloat(litros),
      foto_tanque: base64Image,
    };

    const updatedMediciones = [...medicion, newMedicion];
    setMedicion(updatedMediciones);

    const tanquesAtualizados = tanques.filter(
      (t) => t.id_tanque !== +selectedTanques,
    );
    setTanques(tanquesAtualizados);
    setSelectedTanques("");

    reset();
    setBase64Image("");
    toastSuccess(
      "Tanque registrado",
      "El tanque ha sido registrado con éxito.",
    );

    if (tanquesAtualizados.length === 0) {
      toastSuccess(
        "Tanques Medidos",
        "Todos los tanques han sido medidos con éxito.",
      );
      navigation.popTo(fromScreen as any, { onMedicion: updatedMediciones });
    }
  };

  async function fetchTanques() {
    try {
      setIsLoading(true);
      const tanquesData = await getTanquesByBodega(Number(idBodega));
      if (tanquesData?.length) {
        setTanques(tanquesData);
      }
    } catch (error) {
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

  return (
    <View className="flex-1">
      <ScreenHeader title="Medición" />
      <View className="flex-1 p-4 gap-4 items-center">
        {/* Selector de Tanque */}
        <InputCard title="Tanque" required>
          <Select
            data={tanques}
            isLoading={isLoading}
            selectedValue={selectedTanques}
            setSelectedValue={setSelectedTanques}
            labelField="descripcion_tanque"
            valueField="id_tanque"
          />
        </InputCard>

        {/* Selector de Altura de Regla / Cubicación */}
        {Boolean(selectedTanques) && (
          <InputCard title="Altura Regla" required>
            <Controller
              control={control}
              name="altura_regla"
              render={({ field: { onChange, value } }) => (
                <Select
                  data={alturasCubicacion}
                  isLoading={loadingAlturas}
                  selectedValue={value}
                  setSelectedValue={(val) => {
                    onChange(val);
                    const puntoElegido = alturasCubicacion.find((item) => item.id === val);
                    if (puntoElegido) {
                      setValue("litros", String(puntoElegido.litros));
                    }
                  }}
                  labelField="label"
                  valueField="id"
                />
              )}
            />
          </InputCard>
        )}

        {/* Campo Litros (Cargado automáticamente al elegir la altura) */}
        <InputCard title="Litros" required>
          <Controller
            control={control}
            name="litros"
            render={({ field: { value } }) => (
              <Input
                keyboardType="number-pad"
                align="center"
                textAlignVertical="top"
                className="ml-2"
                value={value}
                editable={false}
                placeholder="Litros en el tanque (Autocalculado)"
                errorMessage={errors.litros?.message}
              />
            )}
          />
        </InputCard>

        {/* Temperatura */}
        <InputCard title="Temperatura" required>
          <Controller
            control={control}
            name="temperatura"
            render={({ field: { onChange, value } }) => (
              <Input
                keyboardType="number-pad"
                align="center"
                textAlignVertical="top"
                className="ml-2"
                value={value}
                onChangeText={onChange}
                placeholder="Informe la temperatura del tanque"
                errorMessage={errors.temperatura?.message}
              />
            )}
          />
        </InputCard>

        {/* Foto */}
        <InputCard title="Fotos" className="min-h-48" required>
          <View className="w-full items-center p-4 gap-2">
            <Image
              source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
              className="mr-4 w-20 h-20 rounded-lg border border-gray-300"
              resizeMode="cover"
            />
            <Photo form="button" iconSize="lg" setImage={setBase64Image} />
          </View>
        </InputCard>

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
    </View>
  );
}