import { HomeHeader } from "@/components/HomeHeader";
import { Alert, FlatList, Text, View } from "react-native";

import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { api } from "@/services/api";
import { useAppContext } from "@/hooks/useAppContext";
import { SucursalDTO } from "@/dto/userDTO copy";
import { useEffect, useState } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";

import { Cog } from "lucide-react-native";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";

export function Home({ navigation }: StackRoutesProps<"home">) {
	const [isLoading, setIsLoading] = useState(true);
	const [isReady, setIsready] = useState(false);
	const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
	const { setSucursal, sucursal, serverIP } = useAppContext();

	function handleOpenMenu(route: keyof StackRoutesList, params: object) {
		navigation.navigate(route, params as any);
	}

	async function fetchSucursal() {
		try {
			setIsLoading(true);

			const response = await api.get("/api/sucursales");
			const sucursalData: SucursalDTO = response.data[0];
			setSucursal(sucursalData);

			const turno = await api.get(
				`api/registros/turno/status/${sucursalData.id_sucursal}`
			);
			console.log("Turno Response:", turno.data);

			const turnoData: StatusTurnoDTO = {
				status: turno.data.status,
				Inicio_turno: turno.data.Inicio_turno,
				Fin_turno: turno.data.Fin_turno,
				Fin_turno_anterior: turno.data.Fin_turno_anterior,
			};
			console.log("Turno Data:", turnoData);
			const updatedMenu = baseMenuItems.map((item) => {
				if (
					item.name === "Salida" ||
					item.name === "Traspaso" ||
					item.name === "Calibración" ||
					item.name === "Abastecimiento"
				) {
					if (
						turnoData.status === "falta_anteriores" ||
						turnoData.status === "normal" ||
						turnoData.status === "cerrado"
					) {
						return { ...item, enabled: false };
					} else {
						return { ...item, enabled: true };
					}
				} else {
					if (item.name === "Turno") {
						//turno?: "abierto" | "cerrado" | "pendiente" | "iniciar" | "falta_cerrar";
						if (turnoData.status === "falta_anterior") {
							return { ...item, turno: "pendiente" as const, enabled: true };
						} else if (turnoData.status === "normal") {
							return { ...item, turno: "iniciar" as const, enabled: true };
						} else if (turnoData.status === "iniciado") {
							return { ...item, turno: "abierto" as const, enabled: true };
						} else if (turnoData.status === "falta_cerrar") {
							return { ...item, turno: "falta_cerrar" as const };
						} else if (turnoData.status === "cerrado") {
							return { ...item, turno: "cerrado" as const, enabled: true };
						}
					} else {
						return { ...item, enabled: true };
					}
					return item;
				}
			});
			setMenuItems(updatedMenu);
			setIsready(true);
		} catch (error) {
			const fallbackMenu = [
				...baseMenuItems,
				{
					name: "Config",
					icon: Cog,
					route: "config" as keyof StackRoutesList,
					enabled: true,
					params: {},
				},
			];

			setMenuItems(fallbackMenu);
			setSucursal(null);

			Alert.alert(
				"No se pudo cargar la sucursal",
				"Recarregar?",
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Recarregar",
						onPress: () => fetchSucursal(),
					},
				],
				{ cancelable: false }
			);

			console.log("Erro ao buscar sucursal:", error);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (!isReady) fetchSucursal();
	}, [isReady]);

	return (
		<View>
			{!isLoading ? (
				<View>
					<HomeHeader />
					<View className='px-12'>
						<FlatList
							data={menuItems}
							keyExtractor={(item) => item.name}
							numColumns={2}
							columnWrapperStyle={{
								justifyContent: "space-between",
								marginBottom: 10,
							}}
							contentContainerStyle={{ paddingVertical: 24 }}
							renderItem={({ item }) => (
								<MenuCard
									name={item.name}
									icon={item.icon}
									route={item.route}
									onPress={() =>
										handleOpenMenu(
											item.route as keyof StackRoutesList,
											item.params
										)
									}
									enabled={item.enabled}
									turno={item.turno}
								/>
							)}
						/>
					</View>
					<View className='mb-4 mt-4'>
						<Text className='text-center text-lg font-bold'>
							{sucursal?.descripcion_sucursal || "Nenhuma Sucursal Selecionada"}
							({sucursal?.id_sucursal})
						</Text>
						<Text className='text-center text-sm'>
							{serverIP || "Nenhum Servidor Configurado"}
						</Text>
					</View>
				</View>
			) : (
				<View className='flex-1 items-center justify-center'>
					<Loading />
				</View>
			)}
		</View>
	);
}
