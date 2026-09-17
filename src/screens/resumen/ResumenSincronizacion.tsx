import React, { useState } from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StackRoutesProps } from "@/route/app.routes";
import { HeaderResumen } from "@/components/HeaderResumen";
import { ListaResumenSincronizacion } from "@/components/ListaResumenSincronizacion";

const Tab = createMaterialTopTabNavigator();

export function ResumenSincronizacion({ navigation }: StackRoutesProps<"resumenSincronizacion">) {
  const [fecha, setFecha] = useState(new Date());
  const [isUnlocked, setIsUnlocked] = useState(false);

  const fechaISOString = fecha.toISOString().split("T")[0];

  return (
    <View className="flex-1 bg-gray-50">
      <HeaderResumen 
        title="Resumen" 
        fechaSeleccionada={fecha} 
        onFechaChange={(nuevaFecha) => setFecha(nuevaFecha)} 
        isUnlocked={isUnlocked}
        setIsUnlocked={setIsUnlocked}
      />
      
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarLabelStyle: { fontSize: 13, fontWeight: "bold" },
          tabBarIndicatorStyle: { backgroundColor: "#2563eb" },
        }}
      >
        <Tab.Screen name="resumenSalidas" options={{ tabBarLabel: "Salidas" }}>
          {() => (
            <ListaResumenSincronizacion 
              tipo="salida" 
              fechaFiltro={fechaISOString} 
              isUnlocked={isUnlocked} 
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="resumenAbastecimientos" options={{ tabBarLabel: "Abastecimientos" }}>
          {() => (
            <ListaResumenSincronizacion 
              tipo="abastecimiento" 
              fechaFiltro={fechaISOString} 
              isUnlocked={isUnlocked} 
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="resumenTraspasos" options={{ tabBarLabel: "Traspasos" }}>
          {() => (
            <ListaResumenSincronizacion 
              tipo="traspaso" 
              fechaFiltro={fechaISOString} 
              isUnlocked={isUnlocked} 
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="resumenCalibraciones" options={{ tabBarLabel: "Calibraciones" }}>
          {() => (
            <ListaResumenSincronizacion 
              tipo="calibracion" 
              fechaFiltro={fechaISOString} 
              isUnlocked={isUnlocked} 
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="resumenTurnos" options={{ tabBarLabel: "Turnos" }}>
          {() => (
            <ListaResumenSincronizacion 
              tipo="turno" 
              fechaFiltro={fechaISOString} 
              isUnlocked={isUnlocked} 
            />
          )}
        </Tab.Screen>

        {isUnlocked && (
          <Tab.Screen name="resumenLogs" options={{ tabBarLabel: "Logs" }}>
            {() => (
              <ListaResumenSincronizacion 
                tipo="logs" 
                fechaFiltro={fechaISOString} 
                isUnlocked={isUnlocked} 
              />
            )}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </View>
  );
}