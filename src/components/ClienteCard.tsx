/**
 * @module Playero/Components/ClientCard
 * @category UI Components
 */
import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	useColorScheme,
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
	const colorScheme = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#B6C2D5" : "#64748B";

	return (
		<TouchableOpacity {...rest}>
			<View className='flex-row items-center justify-between bg-surfaceElevated dark:bg-surfaceElevatedDark border border-border dark:border-borderDark p-2 pr-4 rounded-md mb-3'>
				<View className='flex-1'>
					<Text
						numberOfLines={2}
						className='text-lg font-bold text-text dark:text-textDark'
					>
						{data.descripcion_cliente}
					</Text>
					<View className='flex-row items-center'>
						<Text className='text-sm text-textMuted dark:text-textMutedDark'>{`${data.ruc}`}</Text>
					</View>
				</View>
				<ChevronRight
					className='text-gray-600'
					color={iconColor}
					size={24}
				/>
			</View>
		</TouchableOpacity>
	);
}
