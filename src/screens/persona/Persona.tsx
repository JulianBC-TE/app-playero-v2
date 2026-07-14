import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { View } from "react-native";
import { BuscarPersona } from "./BuscarPersona";
import { CrearPersona } from "./CrearPersona";

const Tab = createMaterialTopTabNavigator();

export function Persona({ navigation, route }: StackRoutesProps<"persona">) {
  const puedeCrear = route.params?.puedeCrear ?? true; // si no viene el param, permite crear

  return (
    <View className="flex-1">
      <ScreenHeader title="Persona" />
      <Tab.Navigator>
        <Tab.Screen
          name="buscarpersona"
          component={BuscarPersona}
          initialParams={{ enabledEdit: true, enabledSelect: false }}
          options={{ tabBarLabel: "Buscar" }}
        />
        {puedeCrear && (
          <Tab.Screen
            name="Criar"
            children={() => <CrearPersona />}
            options={{ tabBarLabel: "Crear" }}
          />
        )}
      </Tab.Navigator>
    </View>
  );
}