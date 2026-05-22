/**
 * @module Playero/Components/ScreenHeader
 * @category UI Components
 */
import { useNavigation } from "@react-navigation/native";
import { ArrowLeftSquare, UserLock } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
type Props = {
	title: string;
	disableBackButton?: boolean;
};

export function ScreenHeader({ title, disableBackButton }: Props) {
	const navigation = useNavigation();
	return (
		<View className='flex-row items-center bg-teColorPrincipal pt-14 px-8 pb-2 gap-4'>
			{!disableBackButton && (
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<ArrowLeftSquare
						color='#fff'
						size={32}
					/>
				</TouchableOpacity>
			)}
			{disableBackButton && (
				<UserLock
					color='#ffffffe6'
					size={32}
				/>
			)}
			<Text className='flex-1 text-3xl font-bold text-white'>{title}</Text>
		</View>
	);
}
