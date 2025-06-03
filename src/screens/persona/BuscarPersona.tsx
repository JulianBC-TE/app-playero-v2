import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { PersonaCard } from "@components/PersonaCard";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@services/api";
import { PersonaDTO } from "@dto/PersonaDTO";
import {
	ActivityIndicator,
	FlatList,
	View,
	TouchableOpacity,
} from "react-native";
import { XCircle, Search } from "lucide-react-native";

import debounce from "lodash.debounce";
import { EmptyList } from "@/components/EmptyList";
import { toastError, toastSuccess } from "@utils/toastMessage";

import { StackRoutesProps } from "@/route/StackRoutes";

interface Props {
	enabledEdit?: boolean;
}

const PAGE_SIZE = 15;

export function BuscarPersona({
	navigation,
	route,
}: StackRoutesProps<"buscarpersona">) {
	const [data, setData] = useState<PersonaDTO[]>([]);
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const enabledEdit = route.params?.enabledEdit ?? false;
	const [isLoading, setIsLoading] = useState(false);

	// Cria o debounce uma vez
	const debouncedSetQuery = useRef(
		debounce((value: string) => {
			setDebouncedQuery(value);
		}, 800) // 500ms debounce
	).current;

	function handleSelectPerson(cedula: number, nombre: string) {
		const persona: PersonaDTO = {
			cedula,
			nombre_apellido: nombre,
		};

		if (!enabledEdit) {
			if (route.params?.enabledSelect) {
				toastSuccess("", `Selecionado ${nombre}`);
				navigation.goBack();
			} else {
				toastError(
					"Selección no permitida",
					"No se puede seleccionar una persona."
				);
			}
		} else {
			navigation.navigate("editarpersona", {
				cedula,
				nombre,
			});
		}
	}

	const fetchData = useCallback(
		async (reset = false) => {
			if (isLoading || (!hasMore && !reset)) return;

			setIsLoading(true);
			try {
				const currentPage = reset ? 1 : page;
				const response = await api.get("/api/personas/paginado", {
					params: {
						filter: debouncedQuery,
						page: currentPage,
						limit: PAGE_SIZE,
					},
				});

				if (reset) {
					setData(response.data.personas);
					setPage(2);
					setHasMore(response.data.personas.length === PAGE_SIZE);
				} else {
					setData((prev) => [...prev, ...response.data.personas]);
					setPage((prev) => prev + 1);
					setHasMore(response.data.personas.length === PAGE_SIZE);
				}
			} catch (error) {
				toastError(
					"Error en la Búsqueda",
					"Ocurrió un error al buscar personas."
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
		<View className='flex-1'>
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
							placeholder='Informe nombre o cédula'
							placeholderTextColor='$gray600'
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
					keyExtractor={(item, index) => `${item.cedula}-${index}`}
					renderItem={({ item }) => (
						<PersonaCard
							data={item as PersonaDTO}
							onPress={() =>
								handleSelectPerson(
									(item as PersonaDTO).cedula,
									(item as PersonaDTO).nombre_apellido
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
