import { HomeHeader } from "@/components/HomeHeader";
import { Alert, FlatList, Text, View } from "react-native";

import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { api } from "@/services/api";
import { useAppContext } from "@/hooks/useAppContext";
import { useCallback, useEffect, useState } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";

import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { useFocusEffect } from "@react-navigation/native";

export function Home({ navigation }: StackRoutesProps<"home">) {
	const [isLoading, setIsLoading] = useState(true);
	const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
	const { sucursal, serverIP } = useAppContext();

	function handleOpenMenu(route: keyof StackRoutesList, params: object) {
		navigation.navigate(route, params as any);
	}

	async function fetchTurno(retry = false) {
		try {
			console.log(`Fetching turno...[${serverIP}]`);
			const turno = await api.get(
				`api/registros/turno/status/${sucursal.id_sucursal}`
			);
			console.log("Turno actualizado exitosamente");
			const turnoData: StatusTurnoDTO = {
				status: turno.data.status,
				// status: "falta_cerrar", // For testing purposes, set to "normal"
				Inicio_turno: turno.data.Inicio_turno,
				Fin_turno: turno.data.Fin_turno,
				Fin_turno_anterior: turno.data.Fin_turno_anterior,
			};
			const updatedMenu = baseMenuItems.map((item) => {
				if (
					item.name === "Salida" ||
					item.name === "Traspaso" ||
					item.name === "Calibración" ||
					item.name === "Abastecimiento"
				) {
					if (
						turnoData.status === "falta_anterior" ||
						turnoData.status === "normal"
						// turnoData.status === "cerrado"
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
		} catch (error: any) {
			console.log("Erro ao buscar turnos:", error);
			if (!retry && error?.message?.toLowerCase().includes("network error")) {
				console.log("Ententando novamente:");
				setTimeout(() => fetchTurno(true), 1500);
				return;
			}
			Alert.alert(
				"No se pudo cargar el turno",
				"Recargar?",
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Recargar",
						onPress: () => fetchTurno(false),
					},
				],
				{ cancelable: false }
			);
		} finally {
			setIsLoading(false);
		}
	}

	useFocusEffect(
		useCallback(() => {
			fetchTurno();
		}, [])
	);

	return (
		<View className='flex-1 justify-between'>
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

					<View>
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
