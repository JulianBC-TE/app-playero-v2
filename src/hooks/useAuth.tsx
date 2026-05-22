import { useContext } from "react";
import { AuthContext } from "@contexts/AuthContext";
/**
 * Hook para acceder al estado y acciones de autenticación del usuario.
 * @returns El contexto {@link AuthContext}
 */
export function useAuth() {
	const context = useContext(AuthContext);
	return context;
}
