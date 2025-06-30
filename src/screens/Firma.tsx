import { ScreenHeader } from "@/components/ScreenHeader";
import { SignatureCapture } from "@/components/SignatureCapture";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";

export function Firma({ navigation, route }: StackRoutesProps<"firma">) {
	const fromScreen = route.params?.fromScreen || "";
	const persona: PersonaDTO | null = route.params?.persona || null;

	const handleSave = (signature: string) => {
		const base64 = signature.replace(/^data:image\/png;base64,/, "");
		navigation.popTo(fromScreen as any, { onFirma: base64 });
	};

	return (
		<View className='flex-1'>
			<ScreenHeader title='Firma' />
			<SignatureCapture
				persona={persona}
				onSave={handleSave}
				title='Firma'
			/>
		</View>
	);
}
