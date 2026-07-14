import React, { useState } from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StackRoutesProps } from "@/route/app.routes";
import { HeaderResumen } from "@/components/HeaderResumen";
import { ListaResumenSincronizacion } from "@/components/ListaResumenSincronizacion";

const Tab = createMaterialTopTabNavigator();

export function ResumenSincronizacion({ navigation }: StackRoutesProps<"resumenSincronizacion">) {
  const [fecha, setFecha] = useState(new Date());

  // Convertimos el objeto Date nativo al string standard que entiende SQLite (YYYY-MM-DD)
  const fechaISOString = fecha.toISOString().split("T")[0];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Reemplazo por nuestro encabezado reactivo */}
      <HeaderResumen 
        title="Resumen de Sincronización" 
        fechaSeleccionada={fecha} 
        onFechaChange={(nuevaFecha) => setFecha(nuevaFecha)} 
      />
      
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarLabelStyle: { fontSize: 13, fontWeight: "bold" },
          tabBarIndicatorStyle: { backgroundColor: "#2563eb" },
        }}
      >
        <Tab.Screen name="resumenSalidas" options={{ tabBarLabel: "Salidas" }}>
          {() => <ListaResumenSincronizacion tipo="salida" fechaFiltro={fechaISOString} />}
        </Tab.Screen>

        <Tab.Screen name="resumenAbastecimientos" options={{ tabBarLabel: "Abastecimientos" }}>
          {() => <ListaResumenSincronizacion tipo="abastecimiento" fechaFiltro={fechaISOString} />}
        </Tab.Screen>

        <Tab.Screen name="resumenTraspasos" options={{ tabBarLabel: "Traspasos" }}>
          {() => <ListaResumenSincronizacion tipo="traspaso" fechaFiltro={fechaISOString} />}
        </Tab.Screen>

        <Tab.Screen name="resumenCalibraciones" options={{ tabBarLabel: "Calibraciones" }}>
          {() => <ListaResumenSincronizacion tipo="calibracion" fechaFiltro={fechaISOString} />}
        </Tab.Screen>

        <Tab.Screen name="resumenTurnos" options={{ tabBarLabel: "Turnos" }}>
          {() => <ListaResumenSincronizacion tipo="turno" fechaFiltro={fechaISOString} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}