// route/index.tsx
import { NavigationContainer } from "@react-navigation/native";
import { StackRoutes } from "./app.routes";
import { AuthRoutes } from "./auth.routes";
import { useAuth } from "@/hooks/useAuth";
import { useSyncEngine } from "@/hooks/useSyncEngine"; // 1. Importas tu hook
import { Loading } from "@/components/Loading";
//import { ThemeProvider } from "@/contexts/ThemeContext";

export function Routes() {
  const { user, isLoadingUserData, isLoadingServerIP } = useAuth();

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
    <NavigationContainer>
      {/* Setup desactivado: la URL del servidor está hardcodeada (SERVER_URL_FIJA).
          Para reactivarlo, restaurar: {!serverIP ? <SetupRoutes /> : user.cedula ? ... } */}
      {user.cedula ? <StackRoutes /> : <AuthRoutes />}
    </NavigationContainer>
  );
}
