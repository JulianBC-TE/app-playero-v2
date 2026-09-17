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
import { ClienteDTO } from "@dto/ClienteDTO";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { getStorageSucursal, saveSucursal } from "@/storage/storageSucursal";

import { httpClient } from "@/backend/api/httpClient";
import { login } from "@/backend/api/authAPI";
import { saveUserLocally, loginOffline, clearSession } from "@DBmodules/authDB";
import { sincronizarModulos } from "@/backend/db/modules/moduleDB";
import { reintentarSyncFallidas } from "@/backend/db/modules/reintentarSyncDB";
import { sync as syncSecureTime } from "@/services/timeService";
import { useInitialSync } from "@/hooks/useInitialSync";

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing";

export type AuthContextDataProps = {
  user: UserDTO;
  updateUserProfile: (userUpdated: UserDTO) => Promise<void>;
  // Devuelve true si el login fue online, false si fue offline.
  // SignIn usa este valor para saber si debe llamar al hook de sync.
  signIn: (cedula: number, password: string, onSyncInitialData?: () => Promise<void>,) => Promise<boolean>;
  signOut: (wipeDatabase?: boolean) => Promise<void>; // ◄ Parámetro opcional añadido aquí
  isLoadingUserData: boolean;
  isOffline: boolean;
  cliente: ClienteDTO;
  setCliente: (cliente: ClienteDTO | null) => void;
  serverIP: string | null;
  setServerIP: (ip: string | null) => Promise<void>;
  isLoadingServerIP: boolean;
  sucursal: SucursalDTO;
  setSucursal: (sucursal: SucursalDTO | null) => void;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  syncMessage: string;
  setSyncMessage: (msg: string) => void;
  isManualSync: boolean;
  setIsManualSync: (value: boolean) => void;
  syncCompleteCounter: number;
  incrementSyncComplete: () => void;
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

  const incrementSyncComplete = useCallback(() => {
    setSyncCompleteCounter((c) => c + 1);
  }, []);
  
  async function signIn(cedula: number, password: string, onSyncInitialData?: () => Promise<void>): Promise<boolean> {
    setIsLoadingUserData(true);
    try {
      const online = await httpClient.isOnline();

      if (online) {
        // ── Login online ──────────────────────────────────────────────────
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
        await sincronizarModulos(cedula);
        await saveUserLocally(loginData, password);
        
        if(userData.idUser){
          const { syncInitialData } = useInitialSync(cedula, userData.idUser);
        if (onSyncInitialData) {
          await syncInitialData();
        }
        }

        await reintentarSyncFallidas(cedula);

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
        };
        await saveUser(userData);
        await reintentarSyncFallidas(Number(result.user.cedula));
        setUser(userData);
        setIsOffline(true);

        return false; // ← offline
      }
    } finally {
      setIsLoadingUserData(false);
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

  // ── Carga inicial ─────────────────────────────────────────────────────────

  async function loadUserData(): Promise<void> {
    try {
      setIsLoadingUserData(true);
      const userLogged = await getStorageUser();
      const { token } = await getAuthToken();

      if (userLogged?.cedula) {
        setUser(userLogged);
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
    const ip = await getStorageServerUrl();
    const sucursal = await getStorageSucursal();
    setServerIPState(ip);
    setSucursal(sucursal);
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

  async function setSucursal(sucursal: SucursalDTO | null): Promise<void> {
    if (sucursal !== null) {
      await saveSucursal(sucursal);
      setSucursalState(sucursal);
    } else {
      setSucursalState({} as SucursalDTO);
    }
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
        syncStatus,
        setSyncStatus,
        syncMessage,
        setSyncMessage,
        isManualSync,
        setIsManualSync,
        syncCompleteCounter,
        incrementSyncComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
