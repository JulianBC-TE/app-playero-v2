// src/screens/SignIn.tsx

import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Image, ImageBackground, ScrollView, View } from "react-native";
import { Text } from "@/components";
import { Controller, useForm } from "react-hook-form";

import { authNavigatorRoutesProps } from "@route/auth.routes";
import { useAuth } from "@hooks/useAuth";
import { AppError } from "@utils/AppError";
import { toastError } from "@/utils/toastMessage";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { InputCard } from "@/components/InputCard";
import { Loading } from "@/components/Loading"; // ◄ IMPORTAMOS EL COMPONENTE DE CARGA
import { useTheme } from "@/contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LoginLight from "@assets/login-light.png";
import LoginDark from "@assets/login-dark.png";
import LogoClaro from "@assets/logo-claro.png";
import LogoOscuro from "@assets/logo-oscuro.png";

type FormData = {
  cedula: number;
  password: string;
};

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<authNavigatorRoutesProps>();
  const { signIn, syncMessage } = useAuth();
  const { activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = activeTheme === "dark";
  const loginImage = isDark ? LoginDark : LoginLight;
  const logoImage = isDark ? LogoOscuro : LogoClaro;

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
		<View className="flex-1 overflow-hidden">
			<ImageBackground
				source={loginImage}
				defaultSource={loginImage}
				resizeMode="cover"
				style={{ position: "absolute", top: 0, bottom: 0, left: -120, right: -120 }}
				imageStyle={{ transform: [{ translateX: -90 }] }}
			>
				<View className="flex-1" />
			</ImageBackground>
			<View className="flex-1 bg-black/20 items-center justify-center px-6">
				<View className="bg-surface/90 dark:bg-surfaceElevatedDark/90 border border-border dark:border-borderDark rounded-2xl px-6 py-6 items-center w-full max-w-sm">
					<Loading />
					<Text className="mt-4 text-lg font-semibold text-text dark:text-textDark text-center">
						{syncMessage || "Iniciando sesión y sincronizando datos por primera vez..."}
					</Text>
					<Text className="mt-2 text-sm text-textMuted dark:text-textMutedDark text-center">
						Por favor espere...
					</Text>
				</View>
			</View>
		</View>
		);
	}

	// ── Vista del Formulario de Login ───────────────────────────────────────────
	return (
		<ScrollView
			contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
			showsVerticalScrollIndicator={false}
		>
		<View className="flex-1 bg-background dark:bg-backgroundDark">
			<View className="flex-1 p-4 gap-4 items-center">
			<View className="mt-32 mb-12">
				<Image
					source={logoImage}
					defaultSource={logoImage}
					alt="backgound"
					resizeMode="contain"
					className="w-72 h-24"
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
