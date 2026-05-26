// src/screens/Home.tsx
//
// MIGRACIÓN OFFLINE-FIRST:
//   Antes: api.get(`api/registros/turno/status/${sucursal.id_sucursal}`)
//   Ahora: getTurnoStatusLocal(sucursal.id_sucursal) — desde turnoBD
//   Permisos: getModulosDelUsuario(cedula) — desde moduleDB

import { HomeHeader } from "@/components/HomeHeader";
import { FlatList, Text, View } from "react-native";
import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
//import { useAppContext } from "@/hooks/useAppContext";
import { useCallback, useState } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";
//import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { useFocusEffect } from "@react-navigation/native";
import { getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { toastError } from "@/utils/toastMessage";
//import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";

// INTEGRACIÓN DE MÓDULOS DEL USUARIO
import { getModulosDelUsuario } from "@DBmodules/moduleDB";
import { useAuth } from "@hooks/useAuth";

export function Home({ navigation }: StackRoutesProps<"home">) {
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
  const { user } = useAuth(); // Extraemos el operario logueado para obtener su cédula
  const [sucursal, setSucursal] = useState<{
    id_sucursal: number;
    descripcion_sucursal: string;
  } | null>(null);

  function handleOpenMenu(route: keyof StackRoutesList, params?: any) {
    navigation.navigate(route, params);
  }

  useFocusEffect(
    useCallback(() => {
      async function loadDashboardData() {
        try {
          setIsLoading(true);

          // 1. Obtener la Sucursal Activa del Usuario
          const sucursalActiva = await getSucursalUsuarioActivoLocal();
          setSucursal(sucursalActiva);

          // 2. Obtener el estado del turno si hay una sucursal activa
          if (sucursalActiva) {
            const statusTurno = await getTurnoStatusLocal(sucursalActiva.id_sucursal);
            // Aquí puedes mapear campos adicionales del estado del turno a los ítems si lo requieres en tu UI
          }

          // 3. CONTROL DE ACCESO ACCIONADO POR LA BD LOCAL (Offline-First)
          if (user?.cedula) {
            const permisosLocales = await getModulosDelUsuario(String(user.cedula));

            if (permisosLocales) {
              // Recorremos los ítems estáticos del menú y alteramos su propiedad 'enabled'
              const itemsFiltrados = baseMenuItems.map((item) => {
                // Formateamos el "route" a minúsculas (ej: 'Abastecimiento' -> 'abastecimiento')
                // para que coincida exactamente con las columnas de tu esquema SQLite
                const campoModulo = item.route.toLowerCase() as keyof typeof permisosLocales;

                // Verificamos si la columna existe en el registro de la base de datos
                const tieneAcceso = permisosLocales[campoModulo] !== undefined
                  ? permisosLocales[campoModulo]
                  : item.enabled; // Si no existe (ej: la ruta 'config'), preserva el valor por defecto

                return {
                  ...item,
                  enabled: !!tieneAcceso, // Forzamos casteo a booleano puro
                };
              });

              setMenuItems(itemsFiltrados);
            }
          }
        } catch (error) {
          console.error("Error cargando el dashboard:", error);
          toastError("Error", "No se pudieron procesar los permisos o el estado del turno local.");
        } finally {
          setIsLoading(false);
        }
      }

      loadDashboardData();
    }, [user])
  );

  return (
    <View className="flex-1 justify-between">
      {!isLoading ? (
        <View className="flex-1 justify-between">
          <View>
            <HomeHeader />
            <View className="px-12">
              <FlatList
                data={menuItems}
                keyExtractor={(item) => item.name}
                numColumns={2}
                columnWrapperStyle={{
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
                contentContainerStyle={{ paddingVertical: 24 }}
                renderItem={({ item }) => (
                  <MenuCard
                    name={item.name}
                    icon={item.icon}
                    route={item.route}
                    onPress={() =>
                      handleOpenMenu(
                        item.route as keyof StackRoutesList,
                        item.params,
                      )
                    }
                    enabled={item.enabled}
                    turno={item.turno}
                  />
                )}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-center text-lg font-bold">
              {sucursal?.descripcion_sucursal || "Ninguna Sucursal Seleccionada"}
              {sucursal ? ` (${sucursal.id_sucursal})` : ""}
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Loading />
        </View>
      )}
    </View>
  );
}