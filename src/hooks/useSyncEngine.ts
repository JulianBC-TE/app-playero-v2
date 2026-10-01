// hooks/useSyncEngine.ts
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { syncTodo } from "@/backend/db/services/syncService";

export function useSyncEngine(intervaloMs: number = 120000) {
  const {
    user,
    sucursal,
    aplicarResultadoSync,
    syncStatus,
    setSyncStatus,
    setSyncMessage,
    setIsManualSync,
    setSyncErrorCount,
    setSyncPendingCount,
  } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncStatusRef = useRef(syncStatus);

  // Mantener el ref sincronizado con el estado actual
  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    if (!user || !user.cedula) return;

    const ejecutarCicloSincro = async () => {
      // Guard: no ejecutar si ya hay un sync en curso
      if (syncStatusRef.current === "syncing") {
        console.log("⏱️ [SYNC ENGINE] Ya hay una sincronización en curso. Saltando ciclo.");
        return;
      }

      try {
        setSyncStatus("syncing");
        setIsManualSync(false);

        const resultado = await syncTodo(
          user.idUser!,
          (msg) => setSyncMessage(msg),
          undefined,
          (count) => setSyncErrorCount(count),
          false,
          (count) => setSyncPendingCount(count)
        );

        // Refresca la sesión (sucursal + bloqueo) si el servidor cambió algo
        await aplicarResultadoSync(resultado);
      } catch (error) {
        console.error("⚠️ Error en el ciclo periódico de sincronización:", error);
      } finally {
        setSyncStatus("idle");
      }
    };

    console.log(`🚀 Motor de sincronización activado cada ${intervaloMs / 1000}s para la cédula: ${user.cedula}`);

    // Ejecutar una vez al inicio (con pequeño delay)
    const initialTimeout = setTimeout(() => {
      ejecutarCicloSincro();
      // Luego arrancar el intervalo regular
      intervalRef.current = setInterval(ejecutarCicloSincro, intervaloMs);
    }, 2000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        console.log("🛑 Motor de sincronización detenido.");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, sucursal, intervaloMs]);
}
