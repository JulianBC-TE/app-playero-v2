import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { Button } from "@components/Button";
import { useState } from "react";
import { AppError } from "@utils/AppError";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
//import { api } from "@services/api";
import { saveClienteLocal } from "@DBmodules/clienteDB";
import { ClienteDTO } from "@dto/ClienteDTO";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { View } from "react-native";
import { Save } from "lucide-react-native";

type FormData = {
  ruc: string;
  nombre: string;
};

const addClientechema = yup.object({
  nombre: yup
    .string()
    .required("Razón social es requerido")
    .min(3, "El nome debe tener al menos 3 caracteres"),
  ruc: yup
    .string()
    .required("RUC es requerido")
    .matches(/^\d{6,8}(-?[0-9])$/, "El RUC solo puede contener números")
    .min(6, "La cedula debe tener al menos 7 caracteres"),
});

export function CrearCliente() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addClientechema),
    defaultValues: {
      nombre: "", // passar o parametro aqui quando for editar
      ruc: "",
    },
  });

  async function handleNewCliente({ ruc, nombre }: FormData) {
    try {
      setIsLoading(true);
      const clienteData: ClienteDTO = {
        ruc,
        descripcion_cliente: nombre.toUpperCase(),
      };

      await saveClienteLocal(clienteData);

      toastSuccess("Cliente creado exitosamente", "");
    } catch (error) {
      const isAppError = error instanceof AppError;
      const statusCode =
        isAppError && error.statusCode ? error.statusCode : undefined;

      toastError(
        "Error al crear cliente",
        statusCode === 409
          ? "Ya existe un cliente con este RUC"
          : "Error al crear cliente, intente nuevamente",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1">
      {/* <ScreenHeader title='Crear Cliente' /> */}
      <View className="flex-1 p-4 gap-4 items-center">
        <InputCard title="RUC:" required>
          <View className="w-full flex-row items-center">
            <Controller
              control={control}
              name="ruc"
              rules={{ required: "RUC es requerido" }}
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="Informe RUC"
                  placeholderTextColor="$gray600"
                  onChangeText={onChange}
                  errorMessage={errors.ruc?.message}
                />
              )}
            />
          </View>
        </InputCard>

        <InputCard title="Razón Social:" required>
          <View className="w-full flex-row items-center">
            <Controller
              control={control}
              name="nombre"
              rules={{ required: "nombre del cliente es requerido" }}
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder="Informe razón social"
                  placeholderTextColor="$gray600"
                  value={value.toUpperCase()}
                  onChangeText={onChange}
                  errorMessage={errors.nombre?.message}
                />
              )}
            />
          </View>
        </InputCard>
        <View className="flex-row mt-32 gap-5">
          <Button
            title="Crear"
            onPress={handleSubmit(handleNewCliente)}
            isLoading={isLoading}
            icon={Save}
            iconSize="md"
            iconColor="#000"
          />
        </View>
      </View>
    </View>
  );
}
