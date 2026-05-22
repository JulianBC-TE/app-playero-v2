/**
 * @module Playero/Components/Loading
 * @category UI Components
 */
import { View, ActivityIndicator } from "react-native";

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
