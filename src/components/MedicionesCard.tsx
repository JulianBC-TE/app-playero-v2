/**
 * @module Playero/Components/MedicionesCard
 * @category UI Components
 */
import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	useColorScheme,
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
	const colorScheme = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#F87171" : "#DC2626";

	return (
		<View className='flex-row items-center justify-between p-2 pr-2 rounded-md mb-3 bg-surfaceElevated dark:bg-surfaceElevatedDark border border-border dark:border-borderDark'>
			<View className='flex-1'>
				<Text
					numberOfLines={1}
					className='text-lg font-bold text-text dark:text-textDark'
				>
					{`Tanque ${data.id_tanque}`}
				</Text>
			</View>
			<TouchableOpacity {...rest}>
				<Trash
					size={24}
					color={iconColor}
				/>
			</TouchableOpacity>
		</View>
	);
}
