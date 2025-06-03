import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { ClienteDTO } from "@dto/ClienteDTO";

type Props = TouchableOpacityProps & {
	data: ClienteDTO;
};

export function ClienteCard({ data, ...rest }: Props) {
	return (
		<TouchableOpacity {...rest}>
			<View className='flex-row items-center justify-between bg-teColorSecundarioMedio p-2 pr-4 rounded-md mb-3'>
				<View className='flex-1'>
					<Text
						numberOfLines={2}
						className='text-lg font-bold text-black'
					>
						{data.descripcion_cliente}
					</Text>
					<View className='flex-row items-center'>
						<Text className='text-sm text-gray-600'>{`${data.ruc}`}</Text>
					</View>
				</View>
				<ChevronRight
					className='text-gray-600'
					color='#4b5563'
					size={24}
				/>
			</View>
		</TouchableOpacity>
	);
}
