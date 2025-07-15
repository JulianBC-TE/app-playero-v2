import { MedicionDTO } from "@/dto/MedicionDTO";
import { PersonaDTO } from "@/dto/PersonaDTO";

export type RootStackParamList = {
	Home: undefined;
	Config: undefined;
	Turno: { onMedicion: MedicionDTO[] } | undefined;
	Traspaso:
		| { onMedicion: MedicionDTO[]; onFirma?: string; onPersona: PersonaDTO }
		| undefined;
	Abastecimiento: { onMedicion: MedicionDTO[] } | undefined;
	Cliente: { enabledSelect?: boolean } | undefined;
	BuscarCliente: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	CrearCliente: undefined;
	BuscarPersona:
		| { fromScreen?: string; enabledEdit?: boolean; enabledSelect?: boolean }
		| undefined;
	EditarPersona: { cedula: number; nombre: string } | undefined;
	Vehiculo: undefined;
	BuscarVehiculo: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	CrearVehiculo: { onCliente?: ClienteDTO } | undefined;
	Medicion: { fromScreen?: string; idBodega: string } | undefined;
	Firma: { fromScreen?: string; persona: PersonaDTO | null } | undefined;
	Salida:
		| { onFirma?: string; onPersona: PersonaDTO; onVehiculo: VehiculoDTO }
		| undefined;
	Calibracion:
		| {
				onFirma?: string;
				onPersona: PersonaDTO;
				onSequencia: SequenciaCalibracionDTO;
		  }
		| undefined;
	Sequencias: { pico_surtidor?: number } | undefined;
};

declare global {
	namespace ReactNavigation {
		interface RootParamList extends RootStackParamList {}
	}
}
