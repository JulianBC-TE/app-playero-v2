// src/contexts/AuthContext.tsx

import { createContext, useEffect, useState } from "react";
import { UserDTO } from "@dto/userDTO";
import { saveUser, getStorageUser, removeUser } from "@storage/storageUse";
import { getAuthToken, saveAuthToken, removeAuthToken } from "@storage/storageAuthToken";
import axios from "axios";
import { getStorageServerUrl, saveServerUrl, removeServerUrl } from "@storage/storageServer";
import { ClienteDTO } from "@dto/ClienteDTO";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { getStorageSucursal, saveSucursal } from "@/storage/storageSucursal";

import { httpClient } from "@/backend/api/httpClient";
import { login } from "@/backend/api/authAPI";
import { saveUserLocally, loginOffline, clearSession } from "@DBmodules/authDB";

// ---------------------------------------------------------------------------
// Tipos del contexto
// ---------------------------------------------------------------------------

export type AuthContextDataProps = {
  user: UserDTO;
  updateUserProfile: (userUpdated: UserDTO) => Promise<void>;
  // Devuelve true si el login fue online, false si fue offline.
  // SignIn usa este valor para saber si debe llamar al hook de sync.
  signIn: (cedula: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isLoadingUserData: boolean;
  isOffline: boolean;
  cliente: ClienteDTO;
  setCliente: (cliente: ClienteDTO | null) => void;
  serverIP: string | null;
  setServerIP: (ip: string | null) => Promise<void>;
  isLoadingServerIP: boolean;
  sucursal: SucursalDTO;
  setSucursal: (sucursal: SucursalDTO | null) => void;
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

  // ── signIn ────────────────────────────────────────────────────────────────
  // Retorna true si el login fue online (para que el caller decida si sincronizar).

  async function signIn(cedula: string, password: string): Promise<boolean> {
    setIsLoadingUserData(true);
    try {
      const online = await httpClient.isOnline();

      if (online) {
        // ── Login online ──────────────────────────────────────────────────
        const data = await login(cedula, password);
        const refreshToken = data.refresh_token ?? "";
        const userData: UserDTO = { cedula, name: data.name };

        await saveAuthToken({ token: data.token, refresh_token: refreshToken });
        await saveUser(userData);
        await saveUserLocally({ cedula, name: data.name, password, refreshToken, idSucursal: data.idSucursal });

        httpClient.setToken(data.token);
        setUser(userData);
        setIsOffline(false);

        return true; // ← online
      } else {
        // ── Login offline ─────────────────────────────────────────────────
        const result = await loginOffline(cedula, password);

        if (!result.ok) {
          const messages: Record<typeof result.reason, string> = {
            not_last_user: "Para cambiar de usuario necesitás conexión al servidor.",
            wrong_password: "Contraseña incorrecta.",
            no_local_user: "No hay datos locales. Conectate al servidor para hacer el primer login.",
            error: "Error al iniciar sesión offline.",
          };
          throw new Error(messages[result.reason]);
        }

        const userData: UserDTO = {
          cedula: result.user.cedula,
          name: result.user.name,
        };
        await saveUser(userData);
        setUser(userData);
        setIsOffline(true);

        return false; // ← offline
      }
    } finally {
      setIsLoadingUserData(false);
    }
  }

  // ── signOut ───────────────────────────────────────────────────────────────

  async function signOut(): Promise<void> {
    try {
      setIsLoadingUserData(true);
      if (user.cedula) await clearSession(user.cedula);
      httpClient.clearToken();
      setUser({} as UserDTO);
      setIsOffline(false);
      await removeUser();
      await removeAuthToken();
    } finally {
      setIsLoadingUserData(false);
    }
  }

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
    } finally {
      setIsLoadingUserData(false);
    }
  }

  async function loadServerIP() {
    try {
        const ip = await getStorageServerUrl();
        const sucursal = await getStorageSucursal();

        if (ip) {
            // Verificar que el servidor realmente responde
            try {
                await axios.get(`http://${ip}/ping`, { timeout: 5000 });
                // Si llegó acá, el servidor responde → todo bien
                setServerIPState(ip);
                setSucursal(sucursal);
            } catch {
                // El servidor no responde → limpiar la IP guardada
                await removeServerUrl();
                setServerIPState(null);
            }
        } else {
            setServerIPState(null);
        }
    } catch (error) {
        setServerIPState(null);
    } finally {
        setIsLoadingServerIP(false);
    }
}

  // ── Setters ───────────────────────────────────────────────────────────────

  async function setServerIP(ip: string | null): Promise<void> {
    if (ip !== null) await saveServerUrl(ip);
    setServerIPState(ip);
  }

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}