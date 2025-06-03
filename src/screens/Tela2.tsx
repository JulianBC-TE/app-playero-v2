import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/StackRoutes";
import { useState } from "react";
import { Text, View } from "react-native";

export function Tela2() {
	const [search, setSearch] = useState("");
	return (
		<View className='flex-1'>
			<View className='flex-1 p-4 gap-4 align-items-center'>
				<InputCard
					title='Criar Tela 1'
					required
				>
					<Input
						value={search}
						onChangeText={setSearch}
						placeholder='Informe a cédula'
						placeholderTextColor='#9CA3AF' // equivalente ao $gray600
					/>
				</InputCard>
			</View>
		</View>
	);
}
