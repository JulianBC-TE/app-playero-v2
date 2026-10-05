/**
 * @module Playero/Components/textSearch
 * @category UI Components
 */
import { TouchableOpacity, useColorScheme, View } from "react-native";
import { Text } from "@/components";
import { Search } from "lucide-react-native";

export interface TextSearchProps {
	textValue?: string;
	placeholder?: string;
	enabled?: boolean;
	onPress: () => void;
}

/**
 * Campo de búsqueda de solo lectura que actúa como botón.
 * Al presionarlo dispara un callback, típicamente para abrir una pantalla de búsqueda.
 *
 * @param textValue - Texto a mostrar cuando hay un valor seleccionado.
 * @param placeholder - Texto de placeholder cuando no hay valor. Por defecto `"Buscar..."`.
 * @param enabled - Si es `false`, deshabilita la interacción. Por defecto `true`.
 * @param onPress - Callback que se ejecuta al presionar el campo.
 */
export function TextSearch({
	textValue,
	placeholder,
	onPress,
	enabled = true,
}: TextSearchProps) {
	const colorScheme = useColorScheme();

	return (
		<View className='flex-row w-full items-center'>
			<View className='w-full h-10 bg-surface dark:bg-surfaceDark rounded-md border border-border dark:border-borderDark'>
				<TouchableOpacity
					disabled={!enabled}
					className='flex-1 justify-center px-4'
					style={{ flex: 1 }}
					onPress={onPress}
				>
					<Text className='text-lg font-medium ml-7'>
						{textValue || placeholder || "Buscar..."}
					</Text>
					<View className='absolute left-3'>
						<Search
							size={18}
							color={colorScheme === "dark" ? "#B6C2D5" : "#64748B"}
						/>
					</View>
				</TouchableOpacity>
			</View>
		</View>
	);
}

// Exemplo de uso:
// function ParentComponent() {
//   const navigation = useNavigation<NativeStackNavigationProp<StackRoutesList>>();
//
//   return (
//     <TextSearch
//       textValue="Buscar"
//       onPress={() => navigation.navigate('SearchScreen', { query: 'test' })}
//     />
//   );
// }
