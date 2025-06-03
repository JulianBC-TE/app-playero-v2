import Toast from "react-native-toast-message";

export function toastError(title: string, message: string) {
	Toast.show({
		type: "error",
		text1: title,
		text2: message,
		position: "top",
		text1Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#000",
		},
		text2Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#ed0b0b",
		},
	});
}

export function toastSuccess(title: string, message: string) {
	Toast.show({
		type: "success",
		text1: title,
		text2: message,
		position: "top",
		text1Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#000",
		},
		text2Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#1c7c1c",
		},
	});
}

export function toastInfo(title: string, message: string) {
	Toast.show({
		type: "info",
		text1: title,
		text2: message,
		position: "top",
		text1Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#000",
		},
		text2Style: {
			fontSize: 16,
			fontWeight: "500",
			color: "#1c7c1c",
		},
	});
}
