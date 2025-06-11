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
import { TelaTeste } from "@/screens/TelaTeste"; // Assuming TelaTeste is a test screen
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { Salida } from "@/screens/salida/Salida";
import { ClienteDTO } from "@/dto/ClienteDTO";

export type StackRoutesList = {
	home: undefined;
	config: undefined; // Assuming Medicion is a part of Turno for this example
	persona: undefined;
	turno: { onSelect: MedicionDTO[] } | undefined;
	cliente: { enabledSelect?: boolean } | undefined;
	buscarcliente: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	editarpersona: { cedula: number; nombre: string } | undefined;
	buscarpersona:
		| { fromScreen?: string; enabledEdit?: boolean; enabledSelect?: boolean }
		| undefined;
	vehiculo: undefined;
	buscarvehiculo: { fromScreen?: string; enabledSelect?: boolean } | undefined;
	crearvehiculo: { onCliente?: ClienteDTO } | undefined;
	medicion: { idBodega: string } | undefined; // Assuming Medicion is a part of Turno for this example
	firma: { fromScreen?: string; persona: PersonaDTO | null } | undefined;
	salida:
		| { onFirma?: string; onPersona: PersonaDTO; onVehiculo: VehiculoDTO }
		| undefined;
	telaTeste: { onPersona: PersonaDTO; onVehiculo: VehiculoDTO } | undefined;
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
				component={Medicion} // Assuming Medicion is a part of Turno for this example
			/>
			<Stack.Screen
				name='config'
				component={Config} // Assuming Medicion is a part of Turno for this example
			/>
			<Stack.Screen
				name='firma'
				component={Firma} // Assuming Medicion is a part of Turno for this example
			/>
			<Stack.Screen
				name='salida'
				component={Salida} // Assuming TelaTeste is a test screen
			/>
			<Stack.Screen
				name='telaTeste'
				component={TelaTeste} // Assuming TelaTeste is a test screen
			/>
		</Stack.Navigator>
	);
}
