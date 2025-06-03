import { LucideIcon } from "lucide-react-native";
import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";

type Props = TouchableOpacityProps & {
	name: string;
	icon: LucideIcon;
	route: string;
	enabled?: boolean;
};

export function MenuCard({
	name,
	icon: IconComponent,
	route,
	enabled = false,
	...rest
}: Props) {
	return (
		<TouchableOpacity
			disabled={!enabled}
			{...rest}
		>
			<View
				className={`flex flex-col items-center p-2 pr-4 w-40 h-32 rounded-md mb-3 ${
					enabled ? "bg-teColorPrincipalClaro" : "bg-gray-100"
				}`}
				style={{
					shadowColor: "#000",
					shadowOffset: { width: 4, height: 6 },
					shadowOpacity: 0.25,
					shadowRadius: 4,
					elevation: 5,
				}}
			>
				{/* <VStack
				bg={enabled ? "$teColorPrincipalClaro" : "$gray100"}
				alignItems='center'
				p='$2'
				pr='$4'
				w='$40'
				h='$32'
				rounded='$md'
				shadowColor='$gray500'
				mb='$3'
				style={{
					shadowColor: "#000",
					shadowOffset: { width: 4, height: 6 },
					shadowOpacity: 0.25,
					shadowRadius: 4,
					elevation: 5, // obrigatório no Android
				}}
			> */}
				<IconComponent
					width={64}
					height={64}
					color={enabled ? "#000" : "#c9c0c0"}
				/>
				<Text
					className='text-lg mt-2'
					style={{ color: enabled ? "#000" : "#c9c0c0" }}
				>
					{name}
				</Text>
			</View>
		</TouchableOpacity>
	);
}
