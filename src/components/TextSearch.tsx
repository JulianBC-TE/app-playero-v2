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
