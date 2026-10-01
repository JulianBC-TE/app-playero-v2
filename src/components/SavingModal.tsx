/**
 * @module Playero/Components/SavingModal
 * @category UI Components
 */
import { ActivityIndicator, Modal, Text, View } from "react-native";

interface Props {
	visible: boolean;
	message?: string;
}

/**
 * Modal de carga no descartable. Se muestra mientras se graba el registro
 * (SQLite + borrado de la entrada en la lista) y se oculta al finalizar.
 */
export function SavingModal({
	visible,
	message = "Grabando registro...",
}: Props) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={() => {}}
		>
			<View className="flex-1 bg-black/50 items-center justify-center">
				<View className="bg-white rounded-2xl px-8 py-8 items-center mx-8">
					<ActivityIndicator
						size='large'
						color='#000'
					/>
					<Text className="text-lg font-semibold mt-4 text-center">
						{message}
					</Text>
					<Text className="text-sm text-gray-500 mt-2 text-center">
						Por favor espere...
					</Text>
				</View>
			</View>
		</Modal>
	);
}
