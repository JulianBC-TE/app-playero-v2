import { useNavigation } from "@react-navigation/native";
import { ArrowLeftSquare } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
type Props = {
	title: string;
};

export function ScreenHeader({ title }: Props) {
	const navigation = useNavigation();
	return (
		<View className='flex-row items-center bg-teColorPrincipal pt-14 px-8 pb-2 gap-4'>
			<TouchableOpacity onPress={() => navigation.goBack()}>
				<ArrowLeftSquare
					color='#fff'
					size={32}
				/>
			</TouchableOpacity>
			<Text className='flex-1 text-3xl font-bold text-white'>{title}</Text>
		</View>
	);
}
