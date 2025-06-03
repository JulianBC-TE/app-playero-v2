import { Text, View } from "react-native";
import { Frown } from "lucide-react-native";

export function EmptyList() {
	return (
		<View className='flex-1 items-center justify-center mt-36'>
			<Frown
				size={64}
				color='#9CA3AF' // equivalent to $gray600
			/>
			<Text className='text-2xl text-gray-500 font-semibold'>
				No se encontraron resultados
			</Text>
		</View>
	);
}
