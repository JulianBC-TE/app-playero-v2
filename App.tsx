// App.tsx
import "./global.css";
import { StatusBar } from "react-native";
import { View, useColorScheme as useSystemColorScheme } from "react-native";
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
import { initTheme, getCurrentThemeMode } from "@/contexts/ThemeContext"; // 🔥 Importar

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });
  const systemColorScheme = useSystemColorScheme();
  const ready = fontsLoaded || fontError;

  // 🔥 Sincronizar colorScheme AQUI, FUERA del árbol de navegación
  useEffect(() => {
    (async () => {
      await initTheme();
      const themeMode = getCurrentThemeMode();
      const actualTheme = themeMode === "system" 
        ? (systemColorScheme ?? "light") 
        : themeMode;
      colorScheme.set(actualTheme);
    })();
  }, []);

  // 🔥 Sincronizar cuando el sistema cambia
  useEffect(() => {
    if (systemColorScheme) {
      const themeMode = getCurrentThemeMode();
      if (themeMode === "system") {
        colorScheme.set(systemColorScheme);
      }
    }
  }, [systemColorScheme]);

  return (
    <DatabaseProvider>
      <View className="flex-1 bg-teColorSecundarioMedio">
        <StatusBar
          barStyle="light-content"
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