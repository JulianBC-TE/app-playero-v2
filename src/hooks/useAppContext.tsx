import { useContext } from "react";
import { AuthContext } from "@contexts/AuthContext";
/**
 * Devuelve el contexto global de autenticación de la aplicación.
 * @returns El contexto {@link AuthContext}
 */
export function useAppContext() {
	const context = useContext(AuthContext);
	return context;
}
