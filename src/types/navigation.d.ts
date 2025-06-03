import { MedicionDTO } from "@/dto/MedicionDTO";

export type RootStackParamList = {
	Home: undefined;
	Config: undefined;
	Turno: { onSelect: MedicionDTO[] } | undefined;
	Cliente: { enabledSelect?: boolean } | undefined;
	BuscarCliente: { enabledSelect?: boolean } | undefined;
	CrearCliente: undefined;
	BuscarPersona: { enabledEdit?: boolean; enabledSelect?: boolean } | undefined;
	EditarPersona: { cedula: number; nombre: string } | undefined;
	Vehiculo: undefined;
	BuscarVehiculo: { enabledSelect?: boolean } | undefined;
	CrearVehiculo: undefined;
	Medicion: { idBodega: string } | undefined;
};

declare global {
	namespace ReactNavigation {
		interface RootParamList extends RootStackParamList {}
	}
}
