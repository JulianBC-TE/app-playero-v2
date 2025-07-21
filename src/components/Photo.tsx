import * as ImagePicker from "expo-image-picker";
import {
	TouchableOpacity,
	ActivityIndicator,
	View,
	TouchableOpacityProps,
	Alert,
} from "react-native";
import { Camera } from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";

type Props = TouchableOpacityProps & {
	form?: "button" | "icon";
	isLoading?: boolean;
	iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "xlg";
	iconColor?: string;
	setImage: (base64: string) => void;
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
	return sizes[size as keyof typeof sizes] || 24;
};

export function Photo({
	form = "button",
	isLoading = false,
	iconSize = "xl",
	iconColor = "#fff",
	setImage,
	...rest
}: Props) {
	async function handlePhotoCapture() {
		try {
			isLoading = true;
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Permiso necesario",
					"Precisamos de permiso para acceder a la cámara."
				);
				return;
			}
			const photoSelected = await ImagePicker.launchCameraAsync({
				mediaTypes: "images",
				cameraType: ImagePicker.CameraType.back,
				allowsEditing: false,
				aspect: [4, 4],
				quality: 0.3,
				base64: true,
			});
			if (!photoSelected.canceled) {
				const { base64 } = photoSelected.assets[0];
				if (typeof base64 === "string") {
					setImage(base64);
					toastSuccess(
						"Foto capturada",
						"La foto ha sido capturada con éxito."
					);
				}
			}
		} catch (error) {
			toastError("Error al capturar foto", "Intente nuevamente más tarde.");
		} finally {
			isLoading = false;
		}
	}

	return (
		<TouchableOpacity
			className={`${
				form === "button" ? "w-12 h-12 rounded-xl  bg-teColorPrincipal" : ""
			} 
				flex-row items-center justify-center`}
			disabled={isLoading}
			onPress={handlePhotoCapture}
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
