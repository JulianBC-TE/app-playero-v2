import { useContext } from "react";
import { AuthContext } from "@contexts/AuthContext";

export function useAppContext() {
	const context = useContext(AuthContext);
	return context;
}
