/**
 * @module Playero/Components/SignatureCapture
 * @category UI Components
 */
import React, { useRef, useState } from "react";
import Signature, {
	SignatureViewRef as SignatureRef,
} from "react-native-signature-canvas";
import { View, Text } from "react-native";
import { Button } from "@/components/Button";
import { PersonaDTO } from "@/dto/PersonaDTO";

type Props = {
	onSave: (base64Image: string) => void;
	onClear?: () => void;
	title?: string;
	persona: PersonaDTO | null;
};

export function SignatureCapture({ onSave, onClear, title, persona }: Props) {
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

			<View className='h-[400px] w-full border border-gray-400 rounded-md overflow-hidden bg-white'>
				<Signature
					key={signatureKey}
					ref={ref}
					onOK={handleOK}
					autoClear={false}
					descriptionText='Teste de assinatura'
					webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { display: none; margin: 0px; }
            body,html { height: 100%; }
          `}
				/>
			</View>
			<View className='flex items-center mt-2'>
				<Text className='text-xl text-teColorPrincipal font-semibold'>
					{persona ? persona.nombre_apellido : "Sin nombre y apellido"}
				</Text>
				<Text className='text-xl text-teColorPrincipal font-semibold'>
					{persona ? persona.cedula : "No hay cédula"}
				</Text>
			</View>

			<View className='flex-row gap-4 mt-12'>
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
