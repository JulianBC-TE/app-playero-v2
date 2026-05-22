/**
 * @module Playero/Components/Loading
 * @category UI Components
 */
import { View, ActivityIndicator } from "react-native";

/**
 * Indicador de carga centrado. Muestra un spinner mientras se procesan datos.
 */
export function Loading() {
	return (
		<View>
			<ActivityIndicator
				size='large'
				color='#000'
			/>
		</View>
	);
}
