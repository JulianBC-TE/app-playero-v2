// src/screens/SignIn.tsx

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Image, ScrollView, View } from "react-native";
import { Text } from "@/components";
import { Controller, useForm } from "react-hook-form";

import { authNavigatorRoutesProps } from "@route/auth.routes";
import { useAuth } from "@hooks/useAuth";
import { AppError } from "@utils/AppError";
import { toastError } from "@/utils/toastMessage";

import Logo from "@assets/logo.png";
import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { InputCard } from "@/components/InputCard";
import { Loading } from "@/components/Loading"; // ◄ IMPORTAMOS EL COMPONENTE DE CARGA

import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";

type FormData = {
  cedula: number;
  password: string;
};

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<authNavigatorRoutesProps>();
  const { signIn, syncMessage } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  async function handleSignIn({ cedula, password }: FormData) {
    try {
      setIsLoading(true);

      // El contexto se encarga de bajar y subir todo antes de cambiar de pantalla.
      await signIn(cedula, password);
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

  // ── Vista de Carga a pantalla completa ──────────────────────────────────────
  // Al ejecutarse el signIn, la pantalla se queda aquí hasta que todo termina.
  // syncMessage muestra el mismo texto que el modal de sincronización del Home:
  // qué se está subiendo o descargando en este momento.
  if (isLoading) {
    return (
      <View className="flex-1 bg-teColorSecundarioMedio items-center justify-center">
        <Loading />
        <Text className="mt-4 text-lg font-semibold text-black text-center px-6">
          {syncMessage || "Iniciando sesión y sincronizando datos por primera vez..."}
        </Text>
        <Text className="mt-2 text-sm text-gray-500 text-center px-6">
          Por favor espere...
        </Text>
      </View>
    );
  }

  // ── Vista del Formulario de Login ───────────────────────────────────────────
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
          <InputCard
            className="h-52 gap-2"
            title="Ingrese cédula y contraseña"
            required
          >
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
          </View>
        </View>
      </View>
    </ScrollView>
  );
}