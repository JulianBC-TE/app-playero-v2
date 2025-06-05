import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";
import { BuscarCliente } from "./BuscarCliente";
import { Tela2 } from "../Tela2";

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
					name='Tela2'
					component={Tela2}
					options={{
						tabBarLabel: "Crear",
					}}
				/>
			</Tab.Navigator>
		</View>
	);
}
