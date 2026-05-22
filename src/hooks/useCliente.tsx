import { useContext } from "react";
import { AuthContext } from "@contexts/AuthContext";
/**
 * Hook para acceder a los datos del cliente desde el contexto global.
 * @returns El contexto {@link AuthContext}
 */
export function useCliente() {
	const context = useContext(AuthContext);
	return context;
}
