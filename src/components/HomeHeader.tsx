/**
 * @module Playero/Components/HomeHeaders
 * @category UI Components
 */
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, Text } from "react-native";
import { useAuth } from "@hooks/useAuth";
interface HomeHeaderProps {
	title?: string;
}

export function HomeHeader({ title = "Inicio" }: HomeHeaderProps) {
	const { signOut } = useAuth();

	return (
		<View className='flex-row items-center bg-teColorPrincipal pt-14 px-8 pb-2 gap-4'>
			<MaterialIcons
				color='#fff'
				name='home'
				size={32}
			/>
			<Text className='flex-1 text-3xl font-bold text-white'>{title}</Text>
			<TouchableOpacity onPress={() => signOut()}>
				<MaterialIcons
					color='#fff'
					name='exit-to-app'
					size={32}
				/>
			</TouchableOpacity>
		</View>
	);
}
