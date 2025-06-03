import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { PersonaDTO } from "@dto/PersonaDTO";
import { memo } from "react";

type Props = TouchableOpacityProps & {
	data: PersonaDTO;
};

function PersonaCardComponent({ data, ...rest }: Props) {
	return (
		<TouchableOpacity {...rest}>
			<View className='flex flex-row bg-teColorPrincipalClaro items-center mb-3 p-2 px-4 rounded-md'>
				<View className='flex-1'>
					<Text
						numberOfLines={1}
						className='text-lg text-black font-bold'
					>
						{data.nombre_apellido}
					</Text>
					<Text className='text-sm text-black mt-1'>{`${data.cedula}`}</Text>
				</View>
				<ChevronRight
					size={24}
					color='#000'
				></ChevronRight>
			</View>
		</TouchableOpacity>
	);
}

export const PersonaCard = memo(
	PersonaCardComponent,
	(prevProps, nextProps) => {
		return (
			prevProps.data.cedula === nextProps.data.cedula &&
			prevProps.data.nombre_apellido === nextProps.data.nombre_apellido
		);
	}
);
