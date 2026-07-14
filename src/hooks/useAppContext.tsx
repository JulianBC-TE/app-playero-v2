import { useContext } from "react";
import { AuthContext, type AuthContextDataProps } from "@contexts/AuthContext";

/**
 * Hook para acceder al contexto global de autenticación.
 * ⚠️ Debe usarse dentro de un AuthContextProvider
 * @returns El contexto {@link AuthContext}
 * @throws Error si se usa fuera del AuthContextProvider
 */
export function useAppContext(): AuthContextDataProps {
	const context = useContext(AuthContext);

	// ✨ Validar que exista el contexto
	if (!context || !context.user) {
		throw new Error(
			"useAppContext debe ser usado dentro de un AuthContextProvider"
		);
	}

	return context;
}