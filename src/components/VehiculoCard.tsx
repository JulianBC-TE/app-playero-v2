import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	useColorScheme,
	View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { VehiculoDTO } from "@dto/VehiculoDTO";

type Props = TouchableOpacityProps & {
	data: VehiculoDTO;
};

/**
 * Tarjeta que muestra la información de un vehículo (descripción, ID y RUC).
 * Acepta todas las props de `TouchableOpacity` para manejar eventos de toque.
 *
 * @param data - Objeto {@link VehiculoDTO} con los datos del vehículo a mostrar.
 */
export function VehiculoCard({ data, ...rest }: Props) {
	const colorScheme = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#B6C2D5" : "#64748B";

	return (
		<TouchableOpacity {...rest}>
			<View className='flex-row items-center justify-between p-2 pr-2 rounded-md mb-3 bg-surfaceElevated dark:bg-surfaceElevatedDark border border-border dark:border-borderDark'>
				<View className='flex-1'>
					<Text
						numberOfLines={1}
						className='text-lg text-text dark:text-textDark'
					>
						{data.descripcion_vehiculo}
					</Text>
					<View className='flex-row mt-1'>
						<Text className='text-sm font-bold text-text dark:text-textDark'>
							{`${data.id_vehiculo}`}
						</Text>
						<Text className='text-sm text-textMuted dark:text-textMutedDark ml-2'>{`${data.ruc}`}</Text>
					</View>
				</View>
				<ChevronRight
					size={24}
					color={iconColor}
				/>
			</View>
		</TouchableOpacity>
	);
}
