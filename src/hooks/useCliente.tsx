import { useContext } from "react";
import { AuthContext } from "@contexts/AuthContext";

export function useCliente() {
	const context = useContext(AuthContext);
	return context;
}
