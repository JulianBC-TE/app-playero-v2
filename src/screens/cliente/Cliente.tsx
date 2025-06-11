import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";
import { BuscarCliente } from "./BuscarCliente";
import { CrearCliente } from "./CrearCliente";

const Tab = createMaterialTopTabNavigator();

export function Cliente({ navigation, route }: StackRoutesProps<"cliente">) {
	return (
		<View className='flex-1'>
			<ScreenHeader title='Clientes' />
			<Tab.Navigator>
				<Tab.Screen
					name='buscarcliente'
					component={BuscarCliente}
					initialParams={{ enabledSelect: route.params?.enabledSelect }}
					options={{
						tabBarLabel: "Buscar",
					}}
				/>
				<Tab.Screen
					name='Crear'
					component={CrearCliente}
				/>
			</Tab.Navigator>
		</View>
	);
}
