// useServerConfig.ts
import { useState, useEffect } from "react";
import { getStorageServerUrl } from "@storage/storageServer";
import { getStorageSucursal } from "@/storage/storageSucursal";

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
