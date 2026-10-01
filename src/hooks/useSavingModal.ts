/**
 * @module Playero/Hooks/useSavingModal
 * @category React Hooks
 */
import { useCallback, useState } from "react";

/**
 * Ejecuta una tarea de guardado manteniendo visible el modal de carga
 * desde que se presiona el boton hasta que la tarea finaliza por completo
 * (grabar en SQLite, borrar la entrada de la lista, refrescar, etc.).
 */
export function useSavingModal() {
	const [visible, setVisible] = useState(false);

	const run = useCallback(async <T,>(task: () => T | Promise<T>) => {
		setVisible(true);
		try {
			return await task();
		} finally {
			setVisible(false);
		}
	}, []);

	return { visible, run };
}
