/**
 * @module Playero/Components/MedicionesCard
 * @category UI Components
 */
import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";
import { Trash } from "lucide-react-native";
import { MedicionDTO } from "@/dto/MedicionDTO";

type Props = TouchableOpacityProps & {
	data: MedicionDTO;
};

/**
 * Tarjeta que muestra la información de una medición de tanque con opción de eliminarla.
 * El botón de eliminar acepta todas las props de `TouchableOpacity`.
 *
 * @param data - Objeto {@link MedicionDTO} con los datos de la medición a mostrar.
 */
export function MedicionesCard({ data, ...rest }: Props) {
	return (
		<View className='flex-row items-center justify-between p-2 pr-2 rounded-md mb-3 bg-teColorPrincipalClaro'>
			<View className='flex-1'>
				<Text
					numberOfLines={1}
					className='text-lg font-bold text-black'
				>
					{`Tanque ${data.id_tanque}`}
				</Text>
			</View>
			<TouchableOpacity {...rest}>
				<Trash
					size={24}
					color='#000'
				/>
			</TouchableOpacity>
		</View>
	);
}
