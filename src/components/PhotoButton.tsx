import {
	TouchableOpacity,
	ActivityIndicator,
	View,
	TouchableOpacityProps,
} from "react-native";
import { Camera } from "lucide-react-native";

type Props = TouchableOpacityProps & {
	isLoading?: boolean;
	iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "xlg";
	iconColor?: string;
};

const getIconSize = (size: string) => {
	const sizes = {
		xs: 14,
		sm: 16,
		md: 20,
		lg: 24,
		xl: 28,
		xxl: 36,
		xlg: 48,
	};
	return sizes[size as keyof typeof sizes] || 28;
};

export function PhotoButton({
	isLoading = false,
	iconSize = "xl",
	iconColor = "#fff",
	...rest
}: Props) {
	return (
		<TouchableOpacity
			className='w-12 h-12 rounded-xl flex-row items-center justify-center bg-teColorPrincipal'
			disabled={isLoading}
			{...rest}
		>
			{isLoading ? (
				<ActivityIndicator
					color='white'
					size='small'
				/>
			) : (
				<View className='items-center'>
					<Camera
						size={getIconSize(iconSize)}
						color={iconColor}
					/>
				</View>
			)}
		</TouchableOpacity>
	);
}
