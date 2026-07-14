import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncTodo } from '@/backend/db/services/syncService'; // Ajusta la ruta según tu proyecto

interface SyncSchedulerOptions {
  intervalMs?: number;      // Tiempo entre sincronizaciones (por defecto 5 minutos)
  syncOnAppFocus?: boolean;  // ¿Forzar sincronización inmediata al volver a abrir la app?
}

export function useSyncScheduler({
  intervalMs = 1 * 10 * 1000, // 5 minutos por defecto
  syncOnAppFocus = true,
}: SyncSchedulerOptions = {}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Función interna para ejecutar el ciclo unificado de sincronización
  const ejecutarSincronizacion = async () => {
    if (isSyncing) return; // Evita ejecuciones duplicadas concurrentes
    
    setIsSyncing(true);
    try {
      // Llama a tu orquestador maestro (Subida -> Bajada)
      await syncTodo();
    } catch (error) {
      console.error("⚠️ Error en el ciclo periódico de syncTodo:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const startTimer = () => {
    stopTimer(); // Limpieza preventiva
    timerRef.current = setInterval(() => {
      console.log('🔄 Sincronizador periódico: Ejecutando ciclo automático...');
      ejecutarSincronizacion();
    }, intervalMs);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // 1. Ejecutar una sincronización inicial apenas abre la app
    ejecutarSincronizacion();
    
    // 2. Iniciar el contador periódico
    startTimer();

    // 3. Controlar cambios de estado de la app (Background / Foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Si pasa de segundo plano/cerrado a ACTIVO
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        startTimer();
        
        if (syncOnAppFocus) {
          ejecutarSincronizacion();
        }
      }

      // Si la app va al segundo plano, frenamos el timer para no desperdiciar recursos del sistema
      if (nextAppState === 'background') {
        stopTimer();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Limpieza al desmontar el componente raíz
    return () => {
      subscription.remove();
      stopTimer();
    };
  }, [intervalMs, syncOnAppFocus]);

  return { isSyncing, forzarSyncManual: ejecutarSincronizacion };
}