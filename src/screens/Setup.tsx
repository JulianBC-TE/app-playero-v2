import { useState } from "react";

import { useAuth } from "@hooks/useAuth";

import Logo from "@assets/logo.png";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { Controller, useForm } from "react-hook-form";
import { AppError } from "@utils/AppError";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Image, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";
import axios from "axios";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";

type FormData = {
  ip: string;
};

const axiosApi = axios.create({
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export function Setup() {
  const [isLoading, setIsLoading] = useState(false);
  const { setServerIP } = useAuth();
  const [errorText, setErrorText] = useState<any>();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  async function handleSetup({ ip }: FormData) {
    try {
      setIsLoading(true);
      setErrorText(undefined);

      const response = await axiosApi.get(`http://${ip}/ping`);

      if (response.status !== 200) {
        throw new Error(`Sin respuesta del servidor: ${response.status}`);
      }

      await setServerIP(ip);
      toastSuccess("Conexión exitosa", "Servidor encontrado correctamente");
    } catch (error) {
      setErrorText(error);
      const isAppError = error instanceof AppError;
      const title = isAppError ? error.message : "No se pudo conectar al servidor";
      toastError("Error de conexión", title);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-teColorSecundarioMedio">
      <View className="flex-1 p-4 gap-4 items-center">
        <View className="mt-32 mb-12">
          <Image
            source={Logo}
            defaultSource={Logo}
            alt="backgound"
            resizeMode="contain"
          />
        </View>
        <InputCard title="Configurar conexión" required>
          <Controller
            control={control}
            name="ip"
            rules={{ required: "La IP del servidor es obligatoria" }}
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="IP del servidor"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                onChangeText={onChange}
                value={value}
                errorMessage={errors.ip?.message}
              />
            )}
          />
        </InputCard>
        <View className="flex-col justify-between items-center">
          <Button
            title="Conectar"
            onPress={handleSubmit(handleSetup)}
            isLoading={isLoading}
          />
          <Text className="text-red-500 text-center mt-2">
            {errorText?.message || ""}
          </Text>
        </View>
        <View><Button title="🌱 Seed BD" onPress={seedLocalDB} /></View>
      </View>
    </View>
  );
}