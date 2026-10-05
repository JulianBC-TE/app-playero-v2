/**
 * @module Playero/Components/ScreenHeader
 * @category UI Components
 */
import { useNavigation } from "@react-navigation/native";
import { ArrowLeftSquare, UserLock } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components";
type Props = {
	title: string;
	disableBackButton?: boolean;
	actions?: React.ReactNode;
};

/**
 * Encabezado estándar para pantallas internas.
 * Muestra el título y, opcionalmente, un botón para volver a la pantalla anterior.
 * Cuando el botón de retroceso está deshabilitado, muestra un ícono de candado.
 *
 * @param title - Título a mostrar en el encabezado.
 * @param disableBackButton - Si es `true`, oculta el botón de retroceso y muestra el ícono de bloqueo.
 */
export function ScreenHeader({ title, disableBackButton, actions }: Props) {
	const navigation = useNavigation();
	return (
		<View className='flex-row items-center bg-primary dark:bg-surfaceElevatedDark border-b border-primary dark:border-borderDark pt-14 px-8 pb-2 gap-4'>
			{!disableBackButton && (
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<ArrowLeftSquare
						color='#fff'
						size={32}
					/>
				</TouchableOpacity>
			)}
			{disableBackButton && (
				<UserLock
					color='#ffffffe6'
					size={32}
				/>
			)}
			<Text className='flex-1 text-3xl font-bold text-white'>{title}</Text>
			{actions}
		</View>
	);
}
