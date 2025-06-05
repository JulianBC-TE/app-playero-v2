import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";

export function Config({ navigation }: StackRoutesProps<"config">) {
	return (
		<View className='flex-1'>
			<View className='flex-1 p-4 gap-4 align-items-center'></View>
		</View>
	);
}
