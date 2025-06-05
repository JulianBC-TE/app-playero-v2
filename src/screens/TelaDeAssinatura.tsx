import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SignatureCapture } from "@/components/SignatureCapture";
import { View } from "react-native";

export function TelaDeAssinatura() {
	const handleSave = (base64: string) => {
		console.log("Base64 da assinatura:", base64);
		// salvar no estado, contexto ou enviar para API
	};

	return (
		<View className='flex-1'>
			<ScreenHeader title='Firma' />
			<SignatureCapture
				onSave={handleSave}
				title='Firma del Chofer'
			/>
		</View>
	);
}
