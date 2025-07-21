import {
	createNativeStackNavigator,
	NativeStackScreenProps,
} from "@react-navigation/native-stack";

import { Home } from "@/screens/Home";
import { Config } from "@/screens/Config";
import { Cliente } from "@/screens/cliente/Cliente";
import { BuscarCliente } from "@/screens/cliente/BuscarCliente";
import { Persona } from "@/screens/persona/Persona";
import { Turno } from "@/screens/turno/Turno";
import { BuscarPersona } from "@/screens/persona/BuscarPersona";
import { EditarPersona } from "@/screens/persona/EditarPersona";
import { Vehiculo } from "@/screens/vehiculo/Vehiculo";
import { BuscarVehiculo } from "@/screens/vehiculo/BuscarVehiculo";
import { CrearVehiculo } from "@/screens/vehiculo/CrearVehiculo";
import { Medicion } from "@/screens/turno/Medicion";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { Firma } from "@/screens/Firma";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { Salida } from "@/screens/salida/Salida";
import { ClienteDTO } from "@/dto/ClienteDTO";
import { Traspaso } from "@/screens/traspaso/Traspaso";
import { Calibracion } from "@/screens/calibracion/Calibracion";
import { Sequencias } from "@/screens/calibracion/Sequencias";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";
import { Abastecimiento } from "@/screens/abastecimiento/Abastecimiento";
import { CargaCombustible } from "@/screens/abastecimiento/CargaCombustible";
import { MedicionAbastecimiento } from "@/screens/abastecimiento/MedicionAbastecimiento";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";

export type StackRoutesList = {
	home: undefined;
	config: undefined;
	persona: undefined;
	turno:
		| { onFirma?: string; onPersona: PersonaDTO; onMedicion: MedicionDTO[] }
		| undefined;
	traspaso:
		| { onFirma?: string; onPersona: PersonaDTO; onMedicion: MedicionDTO[] }
		| undefined;
	abastecimiento:
		| {
				onCargaZeta?: CargaZetaDTO;
				onMedicionInicial?: MedicionDTO[] | null;
				onMedicionFinal?: MedicionDTO[] | null;
		  }
		| undefined;
	cargaCombustible: { idBodega: string } | undefined;
	medicionAbastecimiento:
		| {
				fromScreen?: string;
				idBodega: string;
				cargaZeta: number;
				litrosRemision: number;
		  }
		| undefined;
	calibracion:
		| {
				onFirma?: string;
				onPersona?: PersonaDTO;
				onSequencia?: SequenciaCalibracionDTO;
		  }
		| undefined;
	sequencias: { pico_surtidor?: number } | undefined;
	cliente: { enabledSelect?: boolean } | undefined;
	buscarcliente: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	editarpersona: { cedula: number; nombre: string } | undefined;
	buscarpersona:
		| { fromScreen?: string; enabledEdit?: boolean; enabledSelect?: boolean }
		| undefined;
	vehiculo: undefined;
	buscarvehiculo: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	crearvehiculo: { onCliente?: ClienteDTO } | undefined;
	medicion: { fromScreen?: string; idBodega: string } | undefined;
	firma: { fromScreen?: string; persona: PersonaDTO | null } | undefined;
	salida:
		| { onFirma?: string; onPersona: PersonaDTO; onVehiculo: VehiculoDTO }
		| undefined;
};

export type StackRoutesProps<T extends keyof StackRoutesList> =
	NativeStackScreenProps<StackRoutesList, T>;

const Stack = createNativeStackNavigator<StackRoutesList>();

export function StackRoutes() {
	return (
		<Stack.Navigator
			initialRouteName='home'
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name='home'
				component={Home}
			/>
			<Stack.Screen
				name='persona'
				component={Persona}
			/>
			<Stack.Screen
				name='cliente'
				component={Cliente}
			/>
			<Stack.Screen
				name='buscarcliente'
				component={BuscarCliente}
			/>
			<Stack.Screen
				name='editarpersona'
				component={EditarPersona}
			/>
			<Stack.Screen
				name='buscarpersona'
				component={BuscarPersona}
			/>
			<Stack.Screen
				name='vehiculo'
				component={Vehiculo}
			/>
			<Stack.Screen
				name='buscarvehiculo'
				component={BuscarVehiculo}
			/>
			<Stack.Screen
				name='crearvehiculo'
				component={CrearVehiculo}
			/>
			<Stack.Screen
				name='turno'
				component={Turno}
			/>
			<Stack.Screen
				name='medicion'
				component={Medicion}
			/>
			<Stack.Screen
				name='config'
				component={Config}
			/>
			<Stack.Screen
				name='firma'
				component={Firma}
			/>
			<Stack.Screen
				name='salida'
				component={Salida}
			/>
			<Stack.Screen
				name='traspaso'
				component={Traspaso}
			/>
			<Stack.Screen
				name='calibracion'
				component={Calibracion}
			/>
			<Stack.Screen
				name='sequencias'
				component={Sequencias}
			/>
			<Stack.Screen
				name='abastecimiento'
				component={Abastecimiento}
			/>
			<Stack.Screen
				name='cargaCombustible'
				component={CargaCombustible}
			/>
			<Stack.Screen
				name='medicionAbastecimiento'
				component={MedicionAbastecimiento}
			/>
		</Stack.Navigator>
	);
}
