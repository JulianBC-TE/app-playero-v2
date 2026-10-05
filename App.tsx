// App.tsx
import "./global.css";
import { StatusBar } from "react-native";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { CustomToast } from "@/utils/toastConfig";
import { colorScheme } from "nativewind"; // 🔥 Importar aquí
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";
import { useEffect } from "react";

import { Loading } from "@/components/Loading";
import { Routes } from "@/route/index";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/backend/db/client";
import { initTheme, getCurrentThemeMode, useTheme } from "@/contexts/ThemeContext"; // 🔥 Importar

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });
  const ready = fontsLoaded || fontError;
  const { currentTheme } = useTheme();

  // 🔥 Aplicar el tema guardado al arrancar (fuera del árbol de navegación).
  // Para el modo "system", colorScheme.set("system") resetea el override y
  // la app sigue el esquema real del SO (sin tener que re-sincronizar acá).
  useEffect(() => {
    (async () => {
      await initTheme();
      colorScheme.set(getCurrentThemeMode());
    })();
  }, []);

  return (
    <DatabaseProvider>
      <View className="flex-1 bg-teColorSecundarioMedio dark:bg-zinc-950">
        <StatusBar
          barStyle={currentTheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />
        <AuthContextProvider>
          {ready ? <Routes /> : <Loading />}
        </AuthContextProvider>
        <Toast
          config={{
            CustomToast: (props) => (
              <CustomToast {...props} text1={props.text1 ?? ""} />
            ),
          }}
        />
      </View>
    </DatabaseProvider>
  );
}
