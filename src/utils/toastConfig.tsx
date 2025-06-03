import { View, Text, Pressable } from "react-native";
import { AlertCircle } from "lucide-react-native";

type CustomToastProps = {
	text1: string;
	props: {
		onConfirm: () => void;
		onCancel?: () => void;
	};
};

export function CustomToast({ text1, props }: CustomToastProps) {
	return (
		<View className='flex-row items-center justify-between bg-white border border-gray-500 rounded-md p-4'>
			<View className='flex-1'>
				<Text className='text-red-600 font-semibold text-lg mb-2'>{text1}</Text>
				<View className='flex-row gap-4'>
					<Pressable
						className='px-4 py-2 bg-green-500 rounded'
						onPress={props.onConfirm}
					>
						<Text className='text-white'>Confirmar</Text>
					</Pressable>
					{props.onCancel && (
						<Pressable
							className='px-4 py-2 bg-gray-200 rounded'
							onPress={props.onCancel}
						>
							<Text className='text-black'>Cancelar</Text>
						</Pressable>
					)}
				</View>
			</View>
			<View className='ml-4'>
				<AlertCircle
					size={38}
					color='#ea2c0a'
				/>
			</View>
		</View>
	);
}
