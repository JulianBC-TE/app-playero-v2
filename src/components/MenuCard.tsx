/**
 * @module Playero/Components/MenuCard
 * @category UI Components
 */
import { LucideIcon } from "lucide-react-native";
import {
	TouchableOpacity,
	TouchableOpacityProps,
	View,
} from "react-native";
import { Text } from "@/components";

type Props = TouchableOpacityProps & {
	name: string;
	icon: LucideIcon;
	route: string;
	enabled?: boolean;
	turno?: "abierto" | "cerrado" | "pendiente" | "iniciar" | "falta_cerrar";
	syncErrorCount?: number;
};

/**
 * Tarjeta de menú con ícono y nombre para la pantalla de inicio.
 * El color de fondo varía según el estado del turno o si está habilitada.
 * Se deshabilita automáticamente cuando no hay turno activo ni está habilitada.
 *
 * @param name - Nombre de la opción de menú a mostrar.
 * @param icon - Componente de ícono de Lucide a mostrar.
 * @param route - Ruta de navegación asociada a la tarjeta.
 * @param enabled - Si es `true`, habilita la tarjeta cuando no hay estado de turno. Por defecto `false`.
 * @param turno - Estado del turno: `"abierto"` | `"cerrado"` | `"pendiente"` | `"iniciar"` | `"falta_cerrar"`.
 * @param syncErrorCount - Cantidad de registros con error de sincronización (se muestra como badge rojo).
 */
export function MenuCard({
	name,
	icon: IconComponent,
	route,
	enabled = false,
	turno,
	syncErrorCount,
	...rest
}: Props) {
	// Define color de fondo basado en el turno o en enabled
	const getBackgroundClass = () => {
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
					return "bg-teColorTurnoPendiente";
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

				{syncErrorCount > 0 && (
					<View style={{
						position: "absolute",
						top: 8,
						right: 8,
						backgroundColor: "#dc2626",
						width: 20,
						height: 20,
						borderRadius: 10,
						alignItems: "center",
						justifyContent: "center",
						minWidth: 20,
						padding: 0,
					}}>
						<Text
							style={{
								color: "#ffffff",
								fontSize: 12,
								fontWeight: "bold",
							}}>
							{syncErrorCount}
						</Text>
					</View>
				)}

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