import { use, useEffect, useState } from "react";

import { StackRoutesProps } from "@/route/StackRoutes";

import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { api } from "@services/api";
import { AppError } from "@utils/AppError";
import { Loading } from "@components/Loading";
import { ClienteCard } from "@components/ClienteCard";
import { ClienteDTO } from "@dto/ClienteDTO";
import { useCliente } from "@hooks/useCliente";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { XCircle, Search } from "lucide-react-native";
import { FlatList, TouchableOpacity, View } from "react-native";
import { EmptyList } from "@/components/EmptyList";

export function BuscarCliente({
	navigation,
	route,
}: StackRoutesProps<"buscarcliente">) {
	const { setCliente } = useCliente();
	const [search, setSearch] = useState("");
	const [filteredClientes, setFilteredClientes] = useState<ClienteDTO[]>([]);

	const [isLoading, setIsLoading] = useState(true);
	const [clientes, setClientes] = useState<ClienteDTO[]>([]);
	const enabledSelect = route.params?.enabledSelect ?? false;

	function handleSelectClientes(cliente: ClienteDTO) {
		if (enabledSelect) {
			setCliente(cliente);
			navigation.goBack();
		} else {
			// navigation.navigate("editarpersona", {
			// 	cedula,
			// 	nombre,
			// });
			// Edita o cliente selecionado
		}
		console.log("Cliente:", cliente);
	}

	useEffect(() => {
		if (search.trim() === "") {
			setFilteredClientes(clientes);
		} else {
			const filtered = clientes.filter(
				(clientes) =>
					clientes.descripcion_cliente
						.toString()
						.toLowerCase()
						.includes(search.toLowerCase()) ||
					clientes.ruc.includes(search.toLowerCase())
			);
			setFilteredClientes(filtered);
		}
	}, [search, clientes]);

	async function fetchClientes() {
		try {
			console.log("Apagando cliente do contexto");
			setCliente(null);
			setIsLoading(true);
			const response = await api.get("/api/clientes");

			const clientesData: ClienteDTO[] = response.data.map(
				(cliente: ClienteDTO) => ({
					ruc: cliente.ruc,
					descripcion_cliente: cliente.descripcion_cliente,
				})
			);

			setClientes(clientesData);
		} catch (error) {
			const isAppError = error instanceof AppError;
			const title = isAppError ? "Clientes" : "Error ao buscar Clientes";
			const description = isAppError
				? error.message
				: "Hay un error para buscar Clientes";
			toastError(title, description);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		fetchClientes();
	}, []);

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
							value={search}
							onChangeText={setSearch}
							placeholder='Informe el nombre/RUC del cliente'
						/>
						<View className='absolute left-3 mt-2'>
							<Search
								className='absolute left-3 mt-2'
								size={18}
								color='#666'
							/>
						</View>
						{search.trim() !== "" && (
							<TouchableOpacity
								className='absolute right-3 mt-2'
								onPress={() => {
									setSearch("");
								}}
							>
								<XCircle
									size={18}
									color='#666'
								/>
							</TouchableOpacity>
						)}
					</View>
				</InputCard>

				<FlatList
					className='mt-2'
					data={filteredClientes}
					keyExtractor={(item) => item.ruc}
					renderItem={({ item }) => (
						<ClienteCard
							data={item as ClienteDTO}
							onPress={() => handleSelectClientes(item as ClienteDTO)}
						/>
					)}
					ListFooterComponent={isLoading ? <Loading /> : null}
					ListEmptyComponent={
						!isLoading && !filteredClientes.length ? <EmptyList /> : null
					}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 20 }}
				/>
			</View>
		</View>
	);
}
