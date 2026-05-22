/**
 * @module Playero/Components/ClientCard
 * @category UI Components
 */
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

/**
 * Tarjeta que muestra la información de un cliente (nombre y RUC).
 * Acepta todas las props de `TouchableOpacity` para manejar eventos de toque.
 *
 * @param data - Objeto {@link ClienteDTO} con los datos del cliente a mostrar.
 */
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
