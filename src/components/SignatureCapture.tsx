import React, { useRef, useState } from "react";
import Signature, {
	SignatureViewRef as SignatureRef,
} from "react-native-signature-canvas";
import { View, Text } from "react-native";
import { Button } from "@/components/Button";

type Props = {
	onSave: (base64Image: string) => void;
	onClear?: () => void;
	title?: string;
};

export function SignatureCapture({ onSave, onClear, title }: Props) {
	const ref = useRef<SignatureRef>(null);
	const [signatureKey, setSignatureKey] = useState(Date.now()); // gera uma nova key para forçar recriação

	const handleOK = (signature: string) => {
		onSave(signature);
	};

	const handleClear = () => {
		setSignatureKey(Date.now()); // força nova renderização
		onClear?.();
	};

	return (
		<View className='flex-1 bg-teColorSecundarioMedio items-center justify-center p-4'>
			<Text className='text-lg font-semibold mb-2'>{title}</Text>

			<View className='h-72 w-full border border-gray-400 rounded-md overflow-hidden bg-white'>
				<Signature
					key={signatureKey}
					ref={ref}
					onOK={handleOK}
					autoClear={false}
					descriptionText=''
					webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { display: none; margin: 0px; }
            body,html { height: 100%; }
          `}
				/>
			</View>

			<View className='flex-row gap-4 mt-4'>
				<Button
					title='Limpiar'
					onPress={handleClear}
				/>
				<Button
					title='Guardar'
					onPress={() => ref.current?.readSignature()}
				/>
			</View>
		</View>
	);
}
