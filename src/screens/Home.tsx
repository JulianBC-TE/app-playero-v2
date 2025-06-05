import { HomeHeader } from "@/components/HomeHeader";
import { Alert, FlatList, Text, View } from "react-native";

import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { api } from "@/services/api";
import { useAppContext } from "@/hooks/useAppContext";
import { SucursalDTO } from "@/dto/userDTO copy";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";

import { Cog } from "lucide-react-native";

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

			const turno = await api.get("/api/registros/turno/status");
			const { inicio_turno } = turno.data;

			const updatedMenu = baseMenuItems.map((item) => {
				if (item.name === "Traspaso" || item.name === "Abastecimiento") {
					return { ...item, enabled: inicio_turno };
				}
				return { ...item, enabled: true };
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
				"Erro ao carregar Sucursal",
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
