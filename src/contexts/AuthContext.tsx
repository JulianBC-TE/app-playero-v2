import { createContext, useEffect, useState } from "react";
import { UserDTO } from "@dto/userDTO";
import { api } from "@services/api";
import { saveUser, getStorageUser, removeUser } from "@storage/storageUse";
import {
	getAuthToken,
	saveAuthToken,
	removeAuthToken,
} from "@storage/storageAuthToken";
import { getStorageServerUrl, saveServerUrl } from "@storage/storageServer";
import { ClienteDTO } from "@dto/ClienteDTO";
import { SucursalDTO } from "@/dto/userDTO copy";
import { set } from "react-hook-form";

export type AuthContextDataProps = {
	user: UserDTO;
	updateUserProfile: (userUpdated: UserDTO) => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	isLoadingUserData: boolean;
	signOut: () => Promise<void>;
	cliente: ClienteDTO;
	setCliente: (cliente: ClienteDTO | null) => void;
	serverIP: string | null;
	setServerIP: (ip: string | null) => Promise<void>;
	isLoadingServerIP: boolean;
	sucursal: SucursalDTO;
	setSucursal: (sucursal: SucursalDTO | null) => void;
};

type AuthContextProviderProps = {
	children: React.ReactNode;
};

export const AuthContext = createContext<AuthContextDataProps>(
	{} as AuthContextDataProps
);

export function AuthContextProvider({ children }: AuthContextProviderProps) {
	const [user, setUser] = useState<UserDTO>({} as UserDTO);
	const [sucursal, setSucursal] = useState<SucursalDTO>({} as SucursalDTO);
	const [cliente, setCliente] = useState<ClienteDTO>({} as ClienteDTO);
	const [isLoadingUserData, setIsLoadingUserData] = useState(true);
	const [serverIP, setServerIPState] = useState<string | null>(null);
	const [isLoadingServerIP, setIsLoadingServerIP] = useState(true);

	async function UserAndTokenUpdate(userData: UserDTO, token: string) {
		api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
		setUser(userData);
	}

	async function UserAndTokenSave(
		userData: UserDTO,
		token: string,
		refresh_token: string
	) {
		try {
			setIsLoadingUserData(true);
			await saveUser(userData);
			await saveAuthToken({ token, refresh_token });
		} catch (error) {
			throw error;
		} finally {
			setIsLoadingUserData(false);
		}
	}

	async function setClienteState(cliente: ClienteDTO | null) {
		if (cliente !== null) {
			setCliente(cliente);
		} else {
			setCliente({} as ClienteDTO);
		}
	}

	async function signIn(email: string, password: string) {
		try {
			const { data } = await api.post("/sessions", {
				email,
				password,
			});
			if (data.user && data.token && data.refresh_token) {
				UserAndTokenSave(data.user, data.token, data.refresh_token);

				UserAndTokenUpdate(data.user, data.token);
			}
		} catch (error) {
			throw error;
		} finally {
			setIsLoadingUserData(false);
		}
	}

	async function signOut() {
		try {
			setIsLoadingUserData(true);
			setUser({} as UserDTO);
			await removeUser();
			await removeAuthToken();
		} catch (error) {
			throw error;
		} finally {
			setIsLoadingUserData(false);
		}
	}

	async function updateUserProfile(userUpdated: UserDTO) {
		try {
			setUser(userUpdated);
			await saveUser(userUpdated);
		} catch (error) {
			throw error;
		}
	}

	async function loadUserData() {
		try {
			setIsLoadingUserData(true);
			const userLogged = await getStorageUser();
			const { token } = await getAuthToken();
			if (token && userLogged) {
				UserAndTokenUpdate(userLogged, token);
			}
		} catch (error) {
			throw error;
		} finally {
			setIsLoadingUserData(false);
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
		setServerIPState(ip);
		setIsLoadingServerIP(false);
	}

	async function setSucursalState(sucursal: SucursalDTO | null) {
		if (sucursal !== null) {
			setSucursal(sucursal);
		} else {
			setSucursal({} as SucursalDTO);
		}
	}

	useEffect(() => {
		loadUserData();
		loadServerIP();
	}, []);

	useEffect(() => {
		const subscribe = api.registerInterceptTokenManager(signOut);
		return () => {
			subscribe(); // unsubscribe the listener when the component unmounts
		};
	}, [signOut]);

	return (
		<AuthContext.Provider
			value={{
				user,
				signIn,
				isLoadingUserData,
				signOut,
				updateUserProfile,
				serverIP,
				cliente,
				sucursal,
				setServerIP,
				isLoadingServerIP,
				setCliente: setClienteState,
				setSucursal: setSucursalState,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
