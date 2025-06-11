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
	turno?: "abierto" | "cerrado" | "pendiente" | "iniciar" | "falta_cerrar";
};

export function MenuCard({
	name,
	icon: IconComponent,
	route,
	enabled = false,
	turno,
	...rest
}: Props) {
	// Define a cor de fundo com base no turno ou no enabled
	const getBackgroundClass = () => {
		console.log("Turno>>>>>:", turno);
		if (turno) {
			switch (turno) {
				case "abierto":
					return "bg-teColorTurnoAbierto";
				case "pendiente":
					return "bg-teColorTurnoPendiente";
				case "cerrado":
					return "bg-teColorTurnoCerrado";
				case "iniciar":
					return "bg-teColorTurnoAbrir";
				case "falta_cerrar":
					return "teColorTurnoCierreEspecial";
				default:
					return "bg-gray-100";
			}
		} else {
			return enabled ? "bg-teColorPrincipalClaro" : "bg-gray-100";
		}
	};

	const isActive = turno !== undefined || enabled;

	return (
		<TouchableOpacity
			disabled={!isActive}
			{...rest}
		>
			<View
				className={`flex flex-col items-center p-2 pr-4 w-40 h-32 rounded-md mb-3 ${getBackgroundClass()}`}
				style={{
					shadowColor: "#000",
					shadowOffset: { width: 4, height: 6 },
					shadowOpacity: 0.25,
					shadowRadius: 4,
					elevation: 5,
				}}
			>
				<IconComponent
					width={64}
					height={64}
					color={isActive ? "#000" : "#c9c0c0"}
				/>
				<Text
					className='text-lg mt-2'
					style={{ color: isActive ? "#000" : "#c9c0c0" }}
				>
					{name}
				</Text>
			</View>
		</TouchableOpacity>
	);
}
