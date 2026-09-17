// route/index.tsx
import { NavigationContainer } from "@react-navigation/native";
import { StackRoutes } from "./app.routes";
import { AuthRoutes } from "./auth.routes";
import { SetupRoutes } from "./config.routes";
import { useAuth } from "@/hooks/useAuth";
import { useSyncEngine } from "@/hooks/useSyncEngine"; // 1. Importas tu hook
import { Loading } from "@/components/Loading";
//import { ThemeProvider } from "@/contexts/ThemeContext";

export function Routes() {
  const { user, isLoadingUserData, serverIP, isLoadingServerIP } = useAuth();

  // 2. Invocas el motor de sincronización aquí.
  // El hook internamente se encargará de validar si 'user.cedula' existe antes de iniciar el timer.
  useSyncEngine(12000); // Intervalo de 2 minutos (120000 ms)

  if (isLoadingUserData || isLoadingServerIP) {
    console.log("loading");
    return <Loading />;
  }

  return (
    <NavigationContainer>
      {!serverIP ? (
        <SetupRoutes />
      ) : user.cedula ? (
        <StackRoutes />
      ) : (
        <AuthRoutes />
      )}
    </NavigationContainer>
  );
}
