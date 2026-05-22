/**
 * @module Playero/Screens/Config
 * @category Screens
 */
import { StackRoutesProps } from "@/route/app.routes";
import { Button, View } from "react-native";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";


export function Config({ navigation }: StackRoutesProps<"config">) {
	return (
		<View className='flex-1'>
			<Button title="🌱 Seed BD" onPress={seedLocalDB} />
			<View className='flex-1 p-4 gap-4 align-items-center'></View>
		</View>
	);
}
