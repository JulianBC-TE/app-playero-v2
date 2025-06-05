import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";
import { BuscarPersona } from "./BuscarPersona";
import { CrearPersona } from "./CrearPersona";

const Tab = createMaterialTopTabNavigator();

export function Persona({ navigation, route }: StackRoutesProps<"persona">) {
	return (
		<View className='flex-1'>
			<ScreenHeader title='Persona' />
			<Tab.Navigator>
				<Tab.Screen
					name='buscarpersona'
					component={BuscarPersona}
					initialParams={{ enabledEdit: true, enabledSelect: false }}
					options={{
						tabBarLabel: "Buscar",
					}}
				/>
				<Tab.Screen
					name='Criar'
					children={() => <CrearPersona />}
					options={{
						tabBarLabel: "Crear",
					}}
				/>
			</Tab.Navigator>
		</View>
	);
}
