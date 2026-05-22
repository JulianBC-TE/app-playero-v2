// useServerConfig.ts
import { useState, useEffect } from "react";
import { getStorageServerUrl } from "@storage/storageServer";
import { getStorageSucursal } from "@/storage/storageSucursal";
/**
 * Hook que verifica si la aplicación tiene configurada una IP de servidor y una sucursal.
 *
 * @returns Un objeto con:
 * - `hasServerIP` — `true` si hay una URL de servidor guardada.
 * - `isChecking` — `true` mientras se está cargando la configuración.
 */
export function useServerConfig() {
	const [isChecking, setIsChecking] = useState(true);
	const [hasServerIP, setHasServerIP] = useState(false);

	useEffect(() => {
		async function load() {
			const ip = await getStorageServerUrl();
			const sucursal = await getStorageSucursal();
			setHasServerIP(!!ip);
			setIsChecking(false);
		}
		load();
	}, []);

	return { hasServerIP, isChecking };
}
