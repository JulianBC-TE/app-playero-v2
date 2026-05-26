// src/screens/vehiculo/CrearVehiculo.tsx
//
// MIGRACIÓN OFFLINE-FIRST:
//   Eliminado: import axios (no se usaba, era residuo de la versión con API)
//   Sin otros cambios — ya usaba saveVehiculoLocal desde vehiculoDB

import { Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { StackRoutesProps } from "@/route/app.routes";
import { toastError, toastSuccess } from "@utils/toastMessage";
import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { Button } from "@components/Button";
import { AppError } from "@utils/AppError";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { saveVehiculoLocal } from "@DBmodules/vehiculoDB";
import { SaveIcon, SquarePlus } from "lucide-react-native";
import { useCliente } from "@/hooks/useCliente";

type FormData = {
  id_vehiculo: string;
  descripcion_vehiculo: string;
};

const addVehiculochema = yup.object({
  descripcion_vehiculo: yup
    .string()
    .required("Descripción es requerido")
    .min(3, "La descripción debe tener al menos 3 caracteres"),
  id_vehiculo: yup
    .string()
    .required("Id/Chapa es requerido")
    .min(3, "La identificación debe tener al menos 3 caracteres"),
});

export function CrearVehiculo({
  navigation,
  route,
}: StackRoutesProps<"crearvehiculo">) {
  const { cliente,} = useCliente();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm({
    resolver: yupResolver(addVehiculochema),
    defaultValues: {
      descripcion_vehiculo: "",
      id_vehiculo: "",
    },
  });

  async function handleNewVehiculo({
    id_vehiculo,
    descripcion_vehiculo,
  }: FormData) {
    try {
      setIsLoading(true);

      const nuevoVehiculo = {
        id_vehiculo: id_vehiculo.toUpperCase().replace(/\s+/g, ""),
        descripcion_vehiculo: descripcion_vehiculo.toUpperCase(),
        ruc: cliente?.ruc || "",
      };

      await saveVehiculoLocal(nuevoVehiculo);

      setIsSaved(true);
      toastSuccess(
        "Creación de vehículo",
        "Vehículo guardado localmente con éxito",
      );
    } catch (error) {
      console.error("Error al guardar localmente:", error);

      let message = "Error al crear vehículo, intente nuevamente";

      if (error instanceof AppError) {
        message = error.message;
      }

      toastError("Error en la creación", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1">
      <View className="flex-1 items-center p-4 gap-4">
        <InputCard title="ID Vehículo:" required>
          <View className="w-full items-center">
            <Controller
              control={control}
              name="id_vehiculo"
              rules={{ required: "Identificación es requerido" }}
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value.toUpperCase()}
                  placeholder="Identificación"
                  placeholderTextColor="$gray600"
                  onChangeText={onChange}
                  errorMessage={errors.id_vehiculo?.message}
                />
              )}
            />
          </View>
        </InputCard>

        <InputCard title="Descripción del Vehículo:" required>
          <View className="w-full items-center">
            <Controller
              control={control}
              name="descripcion_vehiculo"
              rules={{ required: "Descripción es requerido" }}
              render={({ field: { onChange, value } }) => (
                <Input
                  value={value.toUpperCase()}
                  placeholder="Descripcion"
                  placeholderTextColor="$gray600"
                  onChangeText={onChange}
                  errorMessage={errors.descripcion_vehiculo?.message}
                />
              )}
            />
          </View>
        </InputCard>

        <InputCard title="Cliente:" required={true}>
          <View className="flex-row w-full items-center">
            <View className="w-full h-10 bg-white rounded-md border border-gray-300">
              <TouchableOpacity
                className="flex-1 justify-center px-4"
                onPress={() =>
                  navigation.navigate("cliente", { enabledSelect: true })
                }
                style={{ flex: 1 }}
              >
                <Text className="text-lg font-medium">
                  {cliente?.descripcion_cliente || "Selecionar cliente"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </InputCard>

        <View className="flex-row gap-4 mt-32">
          <Button
            title="Crear"
            onPress={handleSubmit(handleNewVehiculo)}
            isLoading={isLoading}
            disabled={isSaved}
            icon={SaveIcon}
            iconSize="md"
            iconColor="#000"
          />
          {isSaved && (
            <Button
              title="Nuevo"
              onPress={() => {
                reset({
                  id_vehiculo: "",
                  descripcion_vehiculo: "",
                });
                clearErrors();
                setIsSaved(false);
              }}
              icon={SquarePlus}
              iconSize="md"
              iconColor="#000"
            />
          )}
        </View>
      </View>
    </View>
  );
}
