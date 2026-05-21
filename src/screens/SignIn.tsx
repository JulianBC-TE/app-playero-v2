// src/screens/SignIn.tsx

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Image, ScrollView, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { authNavigatorRoutesProps } from "@route/auth.routes";
import { useAuth } from "@hooks/useAuth";
import { useInitialSync } from "@/hooks/useInitialSync";
import { AppError } from "@utils/AppError";
import { toastError } from "@/utils/toastMessage";

import Logo from "@assets/logo.png";
import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { InputCard } from "@/components/InputCard";


import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";

type FormData = {
  cedula: string;
  password: string;
};

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<authNavigatorRoutesProps>();
  const { signIn } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  async function handleSignIn({ cedula, password }: FormData) {
    try {
      setIsLoading(true);

      // signIn devuelve si el login fue online u offline
      const wasOnline = await signIn(cedula, password);

      // Solo sincronizar si hubo conexión al servidor
      if (wasOnline) {
        await useInitialSync(cedula, password);
      }
    } catch (error) {
      const isAppError = error instanceof AppError;
      const title = isAppError
        ? error.message
        : "No se pudo iniciar sesión";
      toastError("Error en la autenticación", title);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
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
          <InputCard className="h-52 gap-2" title="Ingrese cédula y contraseña" required>
            <Controller
              control={control}
              name="cedula"
              rules={{ required: "La cédula es obligatoria" }}
              render={({ field: { onChange } }) => (
                <Input
                  align="center"
                  placeholder="Cédula"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  errorMessage={errors.cedula?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              rules={{ required: "La contraseña es obligatoria" }}
              render={({ field: { onChange } }) => (
                <Input
                  align="center"
                  placeholder="Contraseña"
                  secureTextEntry
                  onChangeText={onChange}
                  errorMessage={errors.password?.message}
                />
              )}
            />
          </InputCard>
          <View>
            <Button
              title="Conectar"
              onPress={handleSubmit(handleSignIn)}
              isLoading={isLoading}
            />
            <Button title="🌱 Seed BD" onPress={seedLocalDB} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}