import { StackRoutesList } from "@/route/app.routes";

import {
	ArrowRightLeft,
	Container,
	Users,
	Fuel,
	DraftingCompass,
	Replace,
	Tractor,
	Cog,
	LucideIcon,
	Pencil,
} from "lucide-react-native";

export type menuItemType = {
	name: string;
	icon: LucideIcon;
	route: keyof StackRoutesList;
	enabled?: boolean;
	turno?: "abierto" | "cerrado" | "pendiente" | "iniciar" | "falta_cerrar";
	params: object;
};

export const baseMenuItems: menuItemType[] = [
	{
		name: "Turno",
		icon: ArrowRightLeft,
		route: "turno",
		enabled: true,
		turno: "iniciar",
		params: {},
	},
	{
		name: "Salida",
		icon: Fuel,
		route: "salida",
		enabled: false,
		params: {},
	},
	{
		name: "Traspaso",
		icon: Container,
		route: "cliente",
		enabled: false,
		params: {},
	},
	{
		name: "Abastecimiento",
		icon: Replace,
		route: "cliente",
		enabled: false,
		params: {},
	},
	{
		name: "Equipo/Vehículo",
		icon: Tractor,
		route: "vehiculo",
		enabled: true,
		params: {},
	},
	{
		name: "Personas",
		icon: Users,
		route: "persona",
		enabled: true,
		params: {},
	},
	{
		name: "Calibración",
		icon: DraftingCompass,
		route: "medicion",
		enabled: false,
		params: {},
	},

	{
		name: "Teste",
		icon: Pencil,
		route: "telaTeste",
		enabled: true,
		params: {},
	},
];
