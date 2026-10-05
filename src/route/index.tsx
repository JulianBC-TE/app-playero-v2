// route/index.tsx
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StackRoutes } from "./app.routes";
import { AuthRoutes } from "./auth.routes";
import { useAuth } from "@/hooks/useAuth";
import { useSyncEngine } from "@/hooks/useSyncEngine"; // 1. Importas tu hook
import { Loading } from "@/components/Loading";
import { useTheme } from "@/contexts/ThemeContext";

// Tema oscuro de React Navigation ajustado a la paleta de la app
// (fondo zinc-950 del root, tarjetas zinc-900 de las cards).
const appDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#09090B",
    card: "#18181B",
  },
};

export function Routes() {
  const { user, isLoadingUserData, isLoadingServerIP } = useAuth();
  const { currentTheme } = useTheme();

  // 2. Invocas el motor de sincronización aquí.
  // El hook internamente se encargará de validar si 'user.cedula' existe antes de iniciar el timer.
  // Sube pendientes y baja maestros; NO toca la asignación del usuario
  // (sucursal/bodegas/picos/tanques), eso es solo manual o al iniciar sesión.
  useSyncEngine(12000);

  if (isLoadingUserData || isLoadingServerIP) {
    console.log("loading");
    return <Loading />;
  }

  return (
    <NavigationContainer theme={currentTheme === "dark" ? appDarkTheme : DefaultTheme}>
      {/* Setup desactivado: la URL del servidor está hardcodeada (SERVER_URL_FIJA).
          Para reactivarlo, restaurar: {!serverIP ? <SetupRoutes /> : user.cedula ? ... } */}
      {user.cedula ? <StackRoutes /> : <AuthRoutes />}
    </NavigationContainer>
  );
}
