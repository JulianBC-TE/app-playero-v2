/**
 * @module Playero/Components/Button
 * @category UI Components
 */
import {
	TouchableOpacity,
	Text,
	ActivityIndicator,
	View,
	TouchableOpacityProps,
	useColorScheme,
} from "react-native";
import { LucideIcon } from "lucide-react-native";

type Props = TouchableOpacityProps & {
	title: string;
	variant?: "solid" | "outline";
	isLoading?: boolean;
	icon?: LucideIcon;
	iconSize?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
	iconColor?: string;
};

const getIconSize = (size: string) => {
	const sizes = {
		"2xs": 12,
		xs: 14,
		sm: 16,
		md: 20,
		lg: 24,
		xl: 28,
	};
	return sizes[size as keyof typeof sizes] || 28;
};

/**
 * Botón reutilizable con soporte para variantes, estado de carga e ícono opcional.
 *
 * @param title - Texto que se muestra en el botón.
 * @param variant - Estilo visual: `"solid"` (relleno) u `"outline"` (borde). Por defecto `"solid"`.
 * @param isLoading - Si es `true`, muestra un spinner y deshabilita el botón.
 * @param icon - Componente de ícono de Lucide a mostrar junto al texto.
 * @param iconSize - Tamaño del ícono: `"2xs"` | `"xs"` | `"sm"` | `"md"` | `"lg"` | `"xl"`. Por defecto `"xl"`.
 * @param iconColor - Color del ícono en formato hex. Por defecto `"#fff"`.
 */
export function Button({
	title,
	variant = "solid",
	isLoading = false,
	icon: IconComponent,
	iconSize = "xl",
	iconColor,
	...rest
}: Props) {
	const colorScheme = useColorScheme();
	const isDark = colorScheme === "dark";
	const contentColor = iconColor ?? (isDark ? "#0F172A" : "#FFFFFF");

	return (
		<TouchableOpacity
			className='w-36 h-10 rounded-xl flex-row items-center justify-center bg-primary dark:bg-primaryDark active:bg-primaryPressed dark:active:bg-primaryPressedDark'
			disabled={isLoading}
			{...rest}
		>
			{isLoading ? (
				<ActivityIndicator
					color={contentColor}
					size='small'
				/>
			) : (
				<View className='flex-row items-center'>
					<Text className='text-xl font-bold' style={{ color: contentColor }}>{title}</Text>
					{IconComponent && (
						<View className='ml-2'>
							<IconComponent
								size={getIconSize(iconSize)}
								color={contentColor}
							/>
						</View>
					)}
				</View>
			)}
		</TouchableOpacity>
	);
}
