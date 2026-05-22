/**
 * @module Playero/Components/textSearch
 * @category UI Components
 */
import { Text, TouchableOpacity, View } from "react-native";
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
	return (
		<View className='flex-row w-full items-center'>
			<View className='w-full h-10 bg-white rounded-md border border-gray-300'>
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
							color='#666'
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
