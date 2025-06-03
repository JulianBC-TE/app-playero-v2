// useServerConfig.ts
import { useState, useEffect } from "react";
import { getStorageServerUrl } from "@storage/storageServer";

export function useServerConfig() {
	const [isChecking, setIsChecking] = useState(true);
	const [hasServerIP, setHasServerIP] = useState(false);

	useEffect(() => {
		async function load() {
			const ip = await getStorageServerUrl();
			setHasServerIP(!!ip);
			setIsChecking(false);
		}
		load();
	}, []);

	return { hasServerIP, isChecking };
}
