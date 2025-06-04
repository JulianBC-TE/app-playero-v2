import { StackRoutesList } from "@/route/StackRoutes";

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
	enabled: boolean;
	params: object;
};

export const baseMenuItems: menuItemType[] = [
	{
		name: "Turno",
		icon: ArrowRightLeft,
		route: "turno",
		enabled: false,
		params: {},
	},
	{
		name: "Salida",
		icon: Fuel,
		route: "cliente",
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
		enabled: false,
		params: {},
	},
	{
		name: "Personas",
		icon: Users,
		route: "persona",
		enabled: false,
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
		name: "Firma",
		icon: Pencil,
		route: "telaDeAssinatura",
		enabled: true,
		params: {},
	},
];
