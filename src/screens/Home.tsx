import { HomeHeader } from "@/components/HomeHeader";
import { FlatList, Text, View } from "react-native";

import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/StackRoutes";
import { api } from "@/services/api";
import { useAppContext } from "@/hooks/useAppContext";
import { SucursalDTO } from "@/dto/userDTO copy";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";

import { Cog, AlertOctagon } from "lucide-react-native";
import { Button } from "@/components/Button";

export function Home({ navigation }: StackRoutesProps<"home">) {
	const [isLoading, setIsLoading] = useState(true);
	const [isReady, setIsready] = useState(false);
	const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
	const { setSucursal, sucursal } = useAppContext();

	function handleOpenMenu(route: keyof StackRoutesList, params: object) {
		navigation.navigate(route, params as any);
	}

	async function fetchSucursal() {
		setMenuItems(baseMenuItems);
		try {
			setIsLoading(true);
			// Isso deve ficar no login
			const response = await api.get("/api/sucursales");
			const sucursal: SucursalDTO = response.data[0];
			setSucursal(sucursal);

			const turno = await api.get("/api/registros/turno/status");
			const { inicio_turno } = turno.data;
			const updatedMenu = menuItems.map((item) => {
				item.enabled = true; // Reset all items to disabled
				// Testar Salida, Traspaso, Abastecimiento
				if (
					item.name === "Salida" ||
					item.name === "Traspaso" ||
					item.name === "Abastecimiento"
				) {
					return { ...item, enabled: inicio_turno };
				}
				return item;
			});
			setIsready(true);
			setMenuItems(updatedMenu);
		} catch (error) {
			// Cria um novo menu de configurações caso ocorra erro na conexão com o backend
			// Se não tiver Config na lista adiciona
			if (!menuItems.some((item) => item.name === "Config")) {
				menuItems.push({
					name: "Config",
					icon: Cog,
					route: "config",
					enabled: true,
					params: {},
				});
			}
			// usando a biblioteca react-native-toast-message crie um toast contendo um botão para recarregar a página
			// e tentar novamente
			Toast.show({
				type: "CustomToast",
				text1: "Erro ao carregar Sucursal. Recarregar?",
				position: "top",
				visibilityTime: 5000,

				props: {
					onConfirm: () => setIsready(false),
				},
			});

			setSucursal(null);
			setIsready(true);
			console.log("Error fetching Sucursal:", error);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		fetchSucursal();
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
					<View className='mb-4'>
						<Text className='text-center text-lg font-bold mt-4'>
							{sucursal?.descripcion_sucursal || "Nenhuma Sucursal Selecionada"}
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
