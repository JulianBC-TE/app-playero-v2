import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";
import { BuscarVehiculo } from "./BuscarVehiculo";
import { CrearVehiculo } from "./CrearVehiculo";

const Tab = createMaterialTopTabNavigator();

export function Vehiculo({ navigation, route }: StackRoutesProps<"vehiculo">) {
	return (
		<View className='flex-1'>
			<ScreenHeader title='Equipos y Vehículos' />
			<Tab.Navigator>
				<Tab.Screen
					name='buscarvehiculo'
					component={BuscarVehiculo}
					initialParams={{ enabledSelect: false }}
					options={{
						tabBarLabel: "Buscar",
					}}
				/>
				<Tab.Screen
					name='crearvehiculo'
					children={(props) => (
						<CrearVehiculo {...(props as StackRoutesProps<"crearvehiculo">)} />
					)}
					options={{
						tabBarLabel: "Crear",
					}}
				/>
			</Tab.Navigator>
		</View>
	);
}
