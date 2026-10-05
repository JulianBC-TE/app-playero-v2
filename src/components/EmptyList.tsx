/**
 * @module Playero/Components/EmptyList
 * @category UI Components
 */
import { useColorScheme, View } from "react-native";
import { Text } from "@/components";
import { Frown } from "lucide-react-native";

/**
 * Componente de estado vacío que se muestra cuando una lista no tiene resultados.
 * Renderiza un ícono y el mensaje "No se encontraron resultados".
 */
export function EmptyList() {
	const colorScheme = useColorScheme();

	return (
		<View className='flex-1 items-center justify-center mt-36'>
			<Frown
				size={64}
				color={colorScheme === "dark" ? "#B6C2D5" : "#64748B"}
			/>
			<Text className='text-2xl text-textMuted dark:text-textMutedDark font-semibold'>
				No se encontraron resultados
			</Text>
		</View>
	);
}
