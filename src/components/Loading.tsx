/**
 * @module Playero/Components/Loading
 * @category UI Components
 */
import { View, ActivityIndicator, useColorScheme } from "react-native";

/**
 * Indicador de carga centrado. Muestra un spinner mientras se procesan datos.
 * El color del spinner se adapta al tema activo (negro en claro, blanco en oscuro).
 */
export function Loading() {
	const colorScheme = useColorScheme();

	return (
		<View>
			<ActivityIndicator
				size='large'
				color={colorScheme === "dark" ? "#F4F4F5" : "#000"}
			/>
		</View>
	);
}
