import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	useColorScheme,
	View,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import { PersonaDTO } from "@dto/PersonaDTO";
import { memo } from "react";

type Props = TouchableOpacityProps & {
	data: PersonaDTO;
};

/**
 * Tarjeta que muestra el nombre y cédula de una persona.
 * Acepta todas las props de `TouchableOpacity` para manejar eventos de toque.
 * Optimizada con `memo` para evitar re-renders innecesarios cuando la cédula
 * y el nombre no cambian.
 *
 * @param data - Objeto {@link PersonaDTO} con los datos de la persona a mostrar.
 */
function PersonaCardComponent({ data, ...rest }: Props) {
	const colorScheme = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#B6C2D5" : "#64748B";

	return (
		<TouchableOpacity {...rest}>
			<View className='flex flex-row bg-primarySoft dark:bg-primarySoftDark border border-primary dark:border-primaryDark items-center mb-3 p-2 px-4 rounded-md'>
				<View className='flex-1'>
					<Text
						numberOfLines={1}
						className='text-lg text-primarySoftText dark:text-primarySoftTextDark font-bold'
					>
						{data.nombre_apellido}
					</Text>
					<Text className='text-sm text-primarySoftText dark:text-primarySoftTextDark mt-1'>{`${data.cedula}`}</Text>
				</View>
				<ChevronRight
					size={24}
					color={iconColor}
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
