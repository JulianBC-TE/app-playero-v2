// src/contexts/AuthContext.tsx

import { createContext, useEffect, useState, useCallback } from "react";
import { UserDTO } from "@dto/userDTO";
import { saveUser, getStorageUser, removeUser } from "@storage/storageUse";
import {
  getAuthToken,
  saveAuthToken,
  removeAuthToken,
} from "@storage/storageAuthToken";
import axios from "axios";
import {
  getStorageServerUrl,
  saveServerUrl,
  removeServerUrl,
} from "@storage/storageServer";
import { SERVER_URL_FIJA } from "@utils/serverUrl";
import { ClienteDTO } from "@dto/ClienteDTO";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { getStorageSucursal, saveSucursal } from "@/storage/storageSucursal";

import { httpClient } from "@/backend/api/httpClient";
import { login } from "@/backend/api/authAPI";
import { saveUserLocally, loginOffline, clearSession, inicializarTimestampsSyncLogin } from "@DBmodules/authDB";
import { sincronizarModulos } from "@/backend/db/modules/moduleDB";
import { getSucursalUsuarioActivoLocal } from "@/backend/db/modules/sucursalDB";
import { reintentarSyncFallidas } from "@/backend/db/modules/reintentarSyncDB";
import { sync as syncSecureTime } from "@/services/timeService";
import { runInitialSync } from "@/backend/db/services/initialSync";
import { contarRegistrosSync } from "@/backend/db/services/syncService";
import type { UpdateSyncInfo } from "@/backend/api/versionAPI";
import {
  getUpdatePendiente,
  saveUpdatePendiente,
  type UpdatePendiente,
} from "@/storage/storageUpdate";

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing";

export type SyncErrorCount = number;

export type AuthContextDataProps = {
  user: UserDTO;
  updateUserProfile: (userUpdated: UserDTO) => Promise<void>;
  // Devuelve true si el login fue online, false si fue offline.
  // SignIn usa este valor para saber si debe llamar al hook de sync.
  signIn: (cedula: number, password: string) => Promise<boolean>;
  signOut: (wipeDatabase?: boolean) => Promise<void>; // ◄ Parámetro opcional añadido aquí
  isLoadingUserData: boolean;
  isOffline: boolean;
  cliente: ClienteDTO;
  setCliente: (cliente: ClienteDTO | null) => void;
  serverIP: string | null;
  setServerIP: (ip: string | null) => Promise<void>;
  isLoadingServerIP: boolean;
  sucursal: SucursalDTO;
  setSucursal: (sucursal: SucursalDTO | null) => Promise<void>;
  aplicarResultadoSync: (resultado: {
    estaBloqueado: boolean;
    sucursalCambio?: boolean;
    sucursal?: SucursalDTO;
  }) => Promise<void>;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  syncMessage: string;
  setSyncMessage: (msg: string) => void;
  isManualSync: boolean;
  setIsManualSync: (value: boolean) => void;
  syncCompleteCounter: number;
  incrementSyncComplete: () => void;
  syncErrorCount: SyncErrorCount;
  setSyncErrorCount: (count: SyncErrorCount) => void;
  /** Registros con sync = 0 (creados localmente y todavía no subidos). */
  syncPendingCount: number;
  setSyncPendingCount: (count: number) => void;
  /**
   * Actualización disponible devuelta por la última sincronización.
   * Cuando existe, el Home muestra la card verde "Actualizar".
   */
  updatePendiente: UpdatePendiente | null;
  setUpdatePendiente: (update: UpdatePendiente | null) => Promise<void>;
};

type AuthContextProviderProps = { children: React.ReactNode };

export const AuthContext = createContext<AuthContextDataProps>(
  {} as AuthContextDataProps,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [user, setUser] = useState<UserDTO>({} as UserDTO);
  const [sucursal, setSucursalState] = useState<SucursalDTO>({} as SucursalDTO);
  const [cliente, setClienteState] = useState<ClienteDTO>({} as ClienteDTO);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isLoadingServerIP, setIsLoadingServerIP] = useState(true);
  const [serverIP, setServerIPState] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [isManualSync, setIsManualSync] = useState(false);
  const [syncCompleteCounter, setSyncCompleteCounter] = useState(0);
  const [syncErrorCount, setSyncErrorCount] = useState(0);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [updatePendiente, setUpdatePendienteState] =
    useState<UpdatePendiente | null>(null);

  /**
   * Guarda (o limpia con null) el aviso de actualización pendiente en
   * React + AsyncStorage. Evita renders innecesarios si no cambió nada.
   */
  const setUpdatePendiente = useCallback(
    async (update: UpdatePendiente | null): Promise<void> => {
      setUpdatePendienteState((prev) => {
        if (!update && !prev) return prev;
        if (
          update &&
          prev &&
          prev.latestVersion === update.latestVersion &&
          prev.tamano === update.tamano
        ) {
          return prev;
        }
        return update;
      });
      await saveUpdatePendiente(update);
    },
    [],
  );

  const incrementSyncComplete = useCallback(() => {
    setSyncCompleteCounter((c) => c + 1);
  }, []);
  
  async function signIn(cedula: number, password: string): Promise<boolean> {
    // NO se marca isLoadingUserData aquí: si lo hacemos, Routes desmonta
    // AuthRoutes y SignIn (que es quien muestra el progreso del sync) nunca
    // llega a renderizarse, dejando solo el spinner centrado de arranque.
    // Limpia el mensaje del ciclo automático anterior para que la pantalla de
    // inicio de sesión arranque sin texto residual.
    setSyncMessage("");
    try {
      const online = await httpClient.isOnline();

      if (online) {
        // ── Login online ──────────────────────────────────────────────────
        setSyncMessage("Validando credenciales...");
        const loginData = await login(cedula, password);
        // ✨ Ahora guardamos TODOS los datos recibidos
        const userData: UserDTO = {
          cedula: loginData.persona.cedula,
          name: loginData.persona.nombreApellido,
          timestamp: loginData.persona.timestamp,
          sync: loginData.persona.sync,
          idUser: loginData.usuarioApp.idUser,
          idSucursal: loginData.usuarioApp.idSucursal,
          bloqueado: loginData.usuarioApp.bloqueado,
          expirationTime: loginData.expirationTime,
        };

        await saveAuthToken({
          token: loginData.token,
          refresh_token: loginData.usuarioApp.refreshToken ?? "",
        });

        await saveUser(userData);

        // Guardar sucursal en el contexto
        const sucursalData: SucursalDTO = {
          id_sucursal: loginData.sucursal.idSucursal,
          descripcion_sucursal: loginData.sucursal.descripcionSucursal,
        };
        await setSucursal(sucursalData);
        setSyncMessage("Cargando módulos del usuario...");
        await sincronizarModulos(cedula);
        setSyncMessage("Preparando datos locales...");
        await saveUserLocally(loginData, password);

        setSyncMessage("Preparando timestamps de sincronización...");
        await inicializarTimestampsSyncLogin(loginData);

        // Resetea los fallidos (sync = -1 → 0) ANTES de subir, para que el
        // envío inicial de pendientes los incluya.
        setSyncMessage("Reintentando registros fallidos...");
        await reintentarSyncFallidas(cedula);

        if (userData.idUser) {
          await runInitialSync(cedula, userData.idUser, setSyncMessage);
          // Avisa a las pantallas que los catálogos se recargaron.
          incrementSyncComplete();
          await actualizarConteoRegistrosSync();
        }

        httpClient.setToken(loginData.token);

        // Establecer ancla de tiempo segura inmediatamente al login
        try { await syncSecureTime(); } catch {}

        setUser(userData);
        setIsOffline(false);

        return true; // ← online
      } else {
        // ── Login offline ─────────────────────────────────────────────────
        const result = await loginOffline(cedula, password);

        if (!result.ok) {
          const messages: Record<typeof result.reason, string> = {
            not_last_user:
              "Para cambiar de usuario necesitás conexión al servidor.",
            wrong_password: "Contraseña incorrecta.",
            no_local_user:
              "No hay datos locales. Conectate al servidor para hacer el primer login.",
            error: "Error al iniciar sesión offline.",
          };
          console.log(messages[result.reason]);
          throw new Error(messages[result.reason]);
        }

        const userData: UserDTO = {
          cedula: Number(result.user.cedula),
          name: result.user.name,
          idUser: result.idUser,
          idSucursal: result.idSucursal,
          bloqueado: result.bloqueado,
        };
        await saveUser(userData);

        // Deja el contexto de sucursal alineado con lo que hay en la BD local
        const datosSesion = await getSucursalUsuarioActivoLocal();
        if (datosSesion?.idSucursal) {
          await setSucursal({
            id_sucursal: Number(datosSesion.idSucursal),
            descripcion_sucursal: datosSesion.descripcionSucursal,
          });
        }

        await reintentarSyncFallidas(Number(result.user.cedula));
        setUser(userData);
        setIsOffline(true);

        return false; // ← offline
      }
    } finally {
      // No deja mensajes del sync pegados en el contexto (si el login falla o
      // termina, la pantalla de login vuelve al formulario limpio).
      setSyncMessage("");
    }
  }

  // ── signOut ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async (wipeDatabase: boolean = false): Promise<void> => {
    try {
      setIsLoadingUserData(true);
      if (user.cedula) await clearSession(user.cedula);
      
      httpClient.clearToken();
      setUser({} as UserDTO);
      setIsOffline(false);
      await removeUser();
      await removeAuthToken();

      if (wipeDatabase) {
        console.log("Procediendo a borrar toda la base de datos local...");
        // ◄ EJECUTA AQUÍ TU LÓGICA DE BORRADO DE BD LOCAL
        // Ejemplo: await limpiarTodaLaBaseDeDatosLocal();
      }
    } catch (error) {
      console.error("Error durante el logout:", error);
    } finally {
      setIsLoadingUserData(false);
    }
  }, [user.cedula]);

  // ── updateUserProfile ─────────────────────────────────────────────────────

  async function updateUserProfile(userUpdated: UserDTO): Promise<void> {
    setUser(userUpdated);
    await saveUser(userUpdated);
  }

  /**
   * Refresca los contadores del badge de "Sincronizar":
   * rojo = registros con error (sync = -1), naranja = pendientes (sync = 0).
   */
  async function actualizarConteoRegistrosSync(): Promise<void> {
    const conteo = await contarRegistrosSync();
    setSyncErrorCount(conteo.errores);
    setSyncPendingCount(conteo.pendientes);
  }

  /**
   * Aplica a la sesión (estado React + AsyncStorage) los datos de usuario que
   * bajó la última sincronización: bloqueo y/o sucursal.
   * Evita que `@playero:user` y `@playero:sucursal` queden con el valor del
   * último login cuando el servidor cambió la sucursal del usuario.
   */
  async function aplicarResultadoSync(resultado: {
    estaBloqueado: boolean;
    sucursalCambio?: boolean;
    sucursal?: SucursalDTO;
    update?: UpdateSyncInfo;
  }): Promise<void> {
    // ── Actualización de la app ──────────────────────────────────────────
    // El servidor avisa en cada sync si la versión instalada no es la
    // última. `disponible: false` limpia el aviso; si el chequeo no corrió
    // (resultado.update undefined) se conserva el aviso anterior.
    if (resultado.update) {
      if (
        resultado.update.disponible &&
        resultado.update.latestVersion
      ) {
        await setUpdatePendiente({
          latestVersion: resultado.update.latestVersion,
          tamano: resultado.update.tamano,
        });
        console.log(
          `⬆️ [SYNC] Actualización disponible: ${resultado.update.latestVersion}`,
        );
      } else {
        await setUpdatePendiente(null);
      }
    }

    const cambios: Partial<UserDTO> = {};

    if (user.bloqueado !== resultado.estaBloqueado) {
      cambios.bloqueado = resultado.estaBloqueado;
      console.log(
        `🔒 [SYNC] Estado de bloqueo: ${user.bloqueado} -> ${resultado.estaBloqueado}`,
      );
      if (resultado.estaBloqueado) {
        console.warn("⚠️ El usuario activo ha sido bloqueado remotamente.");
      }
    }

    const suc = resultado.sucursal;
    if (suc && suc.id_sucursal) {
      // Si el servidor no mandó la descripción, la tomamos de la BD local
      // (recién sincronizada en este ciclo).
      if (!suc.descripcion_sucursal) {
        const local = await getSucursalUsuarioActivoLocal();
        if (local?.idSucursal) {
          suc.descripcion_sucursal = local.descripcionSucursal;
        }
      }

      const desactualizada =
        resultado.sucursalCambio === true ||
        user.idSucursal !== suc.id_sucursal ||
        sucursal.id_sucursal !== suc.id_sucursal;

      if (desactualizada) {
        cambios.idSucursal = suc.id_sucursal;
        await setSucursal(suc);
        console.log(`🔄 [SYNC] Sucursal de sesión actualizada -> ${suc.id_sucursal} (${suc.descripcion_sucursal})`);
      }
    }

    if (Object.keys(cambios).length > 0) {
      await updateUserProfile({ ...user, ...cambios });
    }
  }

  // ── Carga inicial ─────────────────────────────────────────────────────────

  async function loadUserData(): Promise<void> {
    try {
      setIsLoadingUserData(true);
      const userLogged = await getStorageUser();
      const { token } = await getAuthToken();

      if (userLogged?.cedula) {
        setUser(userLogged);
        // Restaura el aviso de actualización pendiente (si sigue vigente).
        const updateGuardada = await getUpdatePendiente();
        if (updateGuardada) setUpdatePendienteState(updateGuardada);
        if (token) {
          httpClient.setToken(token);
          setIsOffline(false);
        } else {
          setIsOffline(true);
        }
      }
    } catch (error) {
      console.warn("Fallo al leer almacenamiento en Bridgeless", error);
    } finally {
      setIsLoadingUserData(false); // ← siempre se ejecuta
    }
  }

  async function setServerIP(ip: string | null) {
    if (ip !== null) {
      await saveServerUrl(ip);
    }
    setServerIPState(ip);
  }

  async function loadServerIP() {
    // La URL del servidor es fija (SERVER_URL_FIJA). Al arrancar se
    // pisa lo que haya guardado (migra IPs viejas de installs existentes).
    try {
      const guardada = await getStorageServerUrl();
      if (guardada !== SERVER_URL_FIJA) {
        await saveServerUrl(SERVER_URL_FIJA);
      }
      setServerIPState(SERVER_URL_FIJA);
    } catch (error) {
      console.warn("No se pudo persistir la URL del servidor", error);
      setServerIPState(SERVER_URL_FIJA);
    }
    const sucursal = await getStorageSucursal();
    await setSucursal(sucursal);
    setIsLoadingServerIP(false);
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /*async function setServerIP(ip: string | null): Promise<void> {
    if (ip !== null) await saveServerUrl(ip);
    setServerIPState(ip);
  }*/

  function setCliente(cliente: ClienteDTO | null): void {
    setClienteState(cliente ?? ({} as ClienteDTO));
  }

  async function setSucursal(nuevaSucursal: SucursalDTO | null): Promise<void> {
    if (nuevaSucursal === null) {
      setSucursalState({} as SucursalDTO);
      return;
    }

    const yaPersistida =
      !!nuevaSucursal.id_sucursal &&
      nuevaSucursal.id_sucursal === sucursal.id_sucursal &&
      nuevaSucursal.descripcion_sucursal === sucursal.descripcion_sucursal;

    // El update funcional evita identidades nuevas (y por lo tanto renders/
    // reinicios de timer) cuando el valor no cambió.
    setSucursalState((prev) =>
      prev &&
      prev.id_sucursal === nuevaSucursal.id_sucursal &&
      prev.descripcion_sucursal === nuevaSucursal.descripcion_sucursal
        ? prev
        : nuevaSucursal,
    );

    if (yaPersistida) return;
    await saveSucursal(nuevaSucursal);
  }

  // ── Efectos ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadUserData();
    loadServerIP();
  }, []);

  useEffect(() => {
    const unsubscribe = httpClient.registerSignOut(signOut);
    return unsubscribe;
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        isLoadingUserData,
        isOffline,
        updateUserProfile,
        serverIP,
        setServerIP,
        isLoadingServerIP,
        cliente,
        setCliente,
        sucursal,
        setSucursal,
        aplicarResultadoSync,
syncStatus,
        setSyncStatus,
        syncMessage,
        setSyncMessage,
        isManualSync,
        setIsManualSync,
        syncCompleteCounter,
        incrementSyncComplete,
        syncErrorCount,
        setSyncErrorCount,
        syncPendingCount,
        setSyncPendingCount,
        updatePendiente,
        setUpdatePendiente
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
