import {
	ActivityIndicator,
	FlatList,
	TouchableOpacity,
	View,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import debounce from "lodash.debounce";

import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { api } from "@services/api";
import { VehiculoDTO } from "@dto/VehiculoDTO";
import { VehiculoCard } from "@components/VehiculoCard";
import { toastError, toastSuccess } from "@utils/toastMessage";
import { XCircle, Search } from "lucide-react-native";
import { EmptyList } from "@/components/EmptyList";
import { StackRoutesProps } from "@/route/app.routes";
import { ScreenHeader } from "@/components/ScreenHeader";

const PAGE_SIZE = 15;

export function BuscarVehiculo({
	navigation,
	route,
}: StackRoutesProps<"buscarvehiculo">) {
	const [data, setData] = useState<VehiculoDTO[]>([]);
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const fromScreen = route.params?.fromScreen || "";
	const [isLoading, setIsLoading] = useState(false);

	// Cria o debounce uma vez
	const debouncedSetQuery = useRef(
		debounce((value: string) => {
			setDebouncedQuery(value);
		}, 800) // 500ms debounce
	).current;

	function handleSelectVehiculo(id: string, descripcion: string) {
		const vehiculo: VehiculoDTO = {
			id_vehiculo: id,
			descripcion_vehiculo: descripcion,
			ruc: "",
		};

		if (!route.params?.enabledSelect) {
			return;
		} else {
			navigation.popTo(fromScreen as any, { onVehiculo: vehiculo });
			toastSuccess("Vehículo", `${descripcion} seleccionado.`);
		}
	}

	const fetchData = useCallback(
		async (reset = false) => {
			if (isLoading || (!hasMore && !reset)) return;

			setIsLoading(true);
			try {
				const currentPage = reset ? 1 : page;
				const response = await api.get("/api/vehiculos/paginado", {
					params: {
						filter: debouncedQuery,
						page: currentPage,
						limit: PAGE_SIZE,
					},
				});

				if (reset) {
					setData(response.data.vehiculos);
					setPage(2);
					setHasMore(response.data.vehiculos.length === PAGE_SIZE);
				} else {
					setData((prev) => [...prev, ...response.data.vehiculos]);
					setPage((prev) => prev + 1);
					setHasMore(response.data.vehiculos.length === PAGE_SIZE);
				}
			} catch (error) {
				toastError(
					"Error en la Búsqueda",
					"Ocurrió un error al buscar vehículos."
				);
				navigation.goBack();
			} finally {
				setIsLoading(false);
				if (reset) setIsRefreshing(false);
			}
		},
		[debouncedQuery, page, isLoading, hasMore]
	);

	useEffect(() => {
		fetchData(true);
	}, [debouncedQuery]);

	const handleSearch = (text: string) => {
		setQuery(text);
		setIsRefreshing(true);
		debouncedSetQuery(text);
	};

	const handleRefresh = () => {
		setIsRefreshing(true);
		fetchData(true);
	};

	const loadMore = () => {
		if (!isLoading && hasMore) {
			fetchData();
		}
	};

	const handleReset = () => {
		setQuery("");
		setDebouncedQuery("");
		setData([]);
		setPage(1);
		setHasMore(true);
		setIsRefreshing(false);
	};

	return (
		<View className='flex-1 items-center justify-center'>
			{fromScreen && <ScreenHeader title='Buscar Vehículos' />}
			<View className='flex-1 p-4'>
				<InputCard
					title='Busqueda:'
					required={false}
				>
					<View className='flex-row w-full items-center relative'>
						<Input
							className='ml-10'
							value={query}
							onChangeText={handleSearch}
							placeholder='Informe, chapa o ID del vehículo'
						/>

						<View className='absolute left-3 mt-2'>
							<Search
								className='absolute left-3 mt-2'
								size={18}
								color='#666'
							/>
						</View>

						{debouncedQuery.length > 0 ? (
							<TouchableOpacity
								className='absolute right-3 mt-2'
								onPress={() => {
									handleReset();
								}}
							>
								<XCircle
									size={18}
									color='#666'
								/>
							</TouchableOpacity>
						) : null}
					</View>
				</InputCard>

				<FlatList
					className='mt-2'
					data={data}
					keyExtractor={(item) => `${item.id_vehiculo}`}
					renderItem={({ item }) => (
						<VehiculoCard
							data={item as VehiculoDTO}
							onPress={() =>
								handleSelectVehiculo(
									item.id_vehiculo,
									item.descripcion_vehiculo
								)
							}
						/>
					)}
					onEndReached={loadMore}
					onEndReachedThreshold={0.2}
					onRefresh={handleRefresh}
					refreshing={isRefreshing}
					showsVerticalScrollIndicator={false}
					ListFooterComponent={
						isLoading && !isRefreshing ? (
							<ActivityIndicator
								size='small'
								color='#666'
								className='mt-4'
							/>
						) : null
					}
					ListEmptyComponent={!isLoading && !data.length ? <EmptyList /> : null}
				/>
			</View>
		</View>
	);
}
