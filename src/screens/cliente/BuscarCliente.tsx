import { useEffect, useState } from "react";

import { StackRoutesProps } from "@/route/app.routes";

import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
//import { api } from "@services/api";
import { getClientes } from "@DBmodules/clienteDB";
import { AppError } from "@utils/AppError";
import { Loading } from "@components/Loading";
import { ClienteCard } from "@components/ClienteCard";
import { ClienteDTO } from "@dto/ClienteDTO";
import { useCliente } from "@hooks/useCliente";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { XCircle, Search, RefreshCcw } from "lucide-react-native";
import { FlatList, TouchableOpacity, View } from "react-native";
import { EmptyList } from "@/components/EmptyList";
import { Button } from "@/components/Button";

export function BuscarCliente({
  navigation,
  route,
}: StackRoutesProps<"buscarcliente">) {
  const { setCliente } = useCliente();
  const [search, setSearch] = useState("");
  const [filteredClientes, setFilteredClientes] = useState<ClienteDTO[]>([]);
  const [reload, setReload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const enabledSelect = route.params?.enabledSelect ?? false;

  function handleSelectClientes(cliente: ClienteDTO) {
    setCliente(cliente); // Coloca o cliente selecionado no contexto
    navigation.goBack();
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
          clientes.ruc.includes(search.toLowerCase()),
      );
      setFilteredClientes(filtered);
    }
  }, [search, clientes]);

  async function fetchClientes() {
    setIsLoading(true);
    console.log("Fetching clientes...");
    try {
      const data = await getClientes();
      const clientesData: ClienteDTO[] = data.map((cliente) => ({
        ruc: cliente.ruc,
        descripcion_cliente: cliente.descripcion_cliente,
      }));

      setClientes(clientesData);
    } catch (error) {
      const isAppError = error instanceof AppError;
      const title = isAppError ? "Clientes" : "Error ao buscar Clientes";
      const description = isAppError
        ? error.message
        : "Hay un error para buscar Clientes";
      toastError(title, description);
    } finally {
      setReload(false);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchClientes();
  }, [reload]);

  return (
    <View className="flex-1">
      <View className="flex-1 p-4">
        <InputCard title="Busqueda:" required={false}>
          <View className="flex-row items-center gap-2 p-4">
            <View className="flex-row w-full items-center relative">
              <Input
                className="ml-10"
                value={search}
                onChangeText={setSearch}
                placeholder="Informe el nombre/RUC del cliente"
              />

              <View className="absolute left-3 mt-2">
                <Search
                  className="absolute left-3 mt-2"
                  size={18}
                  color="#666"
                />
              </View>
              {search.trim() !== "" && (
                <TouchableOpacity
                  className="absolute right-3 mt-2"
                  onPress={() => {
                    setSearch("");
                  }}
                >
                  <XCircle size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <View className="flex items-center justify-center">
              <RefreshCcw
                size={24}
                color="#000"
                onPress={() => {
                  setFilteredClientes([]);
                  setReload(true);
                }}
              />
            </View>
          </View>
        </InputCard>

        <FlatList
          className="mt-2"
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
