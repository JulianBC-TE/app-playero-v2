import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { VehiculoDTO } from "@dto/VehiculoDTO";

type Props = TouchableOpacityProps & {
	data: VehiculoDTO;
};

export function VehiculoCard({ data, ...rest }: Props) {
	return (
		<TouchableOpacity {...rest}>
			<View className='flex-row items-center justify-between p-2 pr-2 rounded-md mb-3 bg-teColorSecundarioMedio'>
				<View className='flex-1'>
					<Text
						numberOfLines={1}
						className='text-lg font-bold text-black'
					>
						{data.descripcion_vehiculo}
					</Text>
					<View className='flex-row mt-1'>
						<Text className='text-sm text-gray-500'>
							{`${data.id_vehiculo}`}
						</Text>
						<Text className='text-sm text-gray-500 ml-2'>{`${data.ruc}`}</Text>
					</View>
				</View>
				<ChevronRight
					size={24}
					color='#000'
				/>
			</View>
		</TouchableOpacity>
	);
}
