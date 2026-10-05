import { useState } from "react";

import { useAuth } from "@hooks/useAuth";

import Logo from "@assets/logo.png";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { Controller, useForm } from "react-hook-form";
import { AppError } from "@utils/AppError";
import { esUrlServidor, normalizarServerUrl } from "@utils/serverUrl";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Image, View } from "react-native";
import { Text } from "@/components";
import { InputCard } from "@/components/InputCard";
import axios from "axios";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";

type FormData = {
  url: string;
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

  async function handleSetup({ url }: FormData) {
    try {
      setIsLoading(true);
      setErrorText(undefined);

      const serverUrl = normalizarServerUrl(url);
      const response = await axiosApi.get(`${serverUrl}/ping`);

      if (response.status !== 200) {
        throw new Error(`Sin respuesta del servidor: ${response.status}`);
      }

      await setServerIP(serverUrl);
      console.log("Conexión exitosa", "Servidor encontrado correctamente");
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
		<View className="flex-1 bg-background dark:bg-backgroundDark">
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
            name="url"
            rules={{
              required: "La URL del servidor es obligatoria",
              validate: (value) =>
                esUrlServidor(value) || "Ingresá una URL válida (ej: https://playero.tecnoedilsa.com.py)",
            }}
            render={({ field: { onChange, value } }) => (
              <Input
                placeholder="https://playero.tecnoedilsa.com.py"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                textContentType="URL"
                onChangeText={onChange}
                value={value}
                errorMessage={errors.url?.message}
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
			<Text className="text-danger dark:text-dangerDark text-center mt-2">
            {errorText?.message || ""}
          </Text>
        </View>
        
      </View>
    </View>
  );
}/**<View><Button title="🌱 Seed BD" onPress={seedLocalDB} /></View> */
