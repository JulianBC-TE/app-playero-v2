// hooks/useSyncEngine.ts
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth"; // Consumimos nuestro AuthContext
import { syncTodo } from "@/backend/db/services/syncService"; // Tu syncService actualizado

export function useSyncEngine(intervaloMs: number = 15000) {
  // 1. Extraemos 'updateUserProfile' del contexto para poder actualizar la memoria viva de React
  const { user, updateUserProfile } = useAuth(); 
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Función recursiva que maneja el ciclo de sincronización
    const ejecutarCicloSincro = async () => {
      try {
        //console.log("⏱️ Timer disparado automáticamente.");
        
        // 2. Capturamos el booleano que nos devuelve syncTodo (si está bloqueado o no en el servidor)
        const estaBloqueado = await syncTodo(user.idUser!); 
        
        // 3. Comparamos el estado del servidor contra el estado actual en la memoria de React
        if (user.bloqueado !== estaBloqueado) {
          console.log(`🔒 [SINCRO BACKGROUND] El estado de bloqueo cambió. Servidor: ${estaBloqueado}, App React: ${user.bloqueado}`);
          
          // 4. Forzamos la actualización del contexto global de autenticación
          await updateUserProfile({
            ...user,
            bloqueado: estaBloqueado
          });
          
          if (estaBloqueado) {
            console.warn("⚠️ El usuario activo ha sido bloqueado remotamente.");
          }
        }
        
      } catch (error) {
        console.error("⚠️ Error en el ciclo periódico de sincronización:", error);
      } finally {
        // Solo programamos el siguiente ciclo si el usuario sigue autenticado
        if (user && user.cedula) {
          timerRef.current = setTimeout(ejecutarCicloSincro, intervaloMs);
        }
      }
    };

    // Si el usuario inicia sesión, arrancamos el proceso automático
    if (user && user.cedula) {
      console.log(`🚀 Motor de sincronización activado cada ${intervaloMs / 1000}s para la cédula: ${user.cedula}`);
      timerRef.current = setTimeout(ejecutarCicloSincro, 2000); // Pequeño delay inicial al loguearse
    }

    // LIMPIEZA: Si el usuario hace signOut o cambia, destruimos el timer inmediatamente
    return () => {
      if (timerRef.current) {
        console.log("🛑 Motor de sincronización detenido.");
        clearTimeout(timerRef.current);
      }
    };
    
    // Agregamos 'updateUserProfile' a las dependencias para que React trackee el efecto correctamente
  }, [user, intervaloMs, updateUserProfile]); 

  return null;
}