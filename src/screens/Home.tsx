// src/screens/Home.tsx
//
// MIGRACIÓN OFFLINE-FIRST:
//   Antes: api.get(`api/registros/turno/status/${sucursal.id_sucursal}`)
//   Ahora: getTurnoStatusLocal(sucursal.id_sucursal) — desde turnoBD

import { HomeHeader } from "@/components/HomeHeader";
import { FlatList, Text, View } from "react-native";
import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { useAppContext } from "@/hooks/useAppContext";
import { useCallback, useState } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { useFocusEffect } from "@react-navigation/native";
import { getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { toastError } from "@/utils/toastMessage";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";

export function Home({ navigation }: StackRoutesProps<"home">) {
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
  const [sucursal, setSucursal] = useState<{
    id_sucursal: number;
    descripcion_sucursal: string;
  } | null>(null);
  function handleOpenMenu(route: keyof StackRoutesList, params: object) {
    navigation.navigate(route, params as any);
  }

  async function fetchTurno() {
    try {
      setIsLoading(true);
      const sucursalLocal = await getSucursalUsuarioActivoLocal();

      if (!sucursalLocal) {
        // Si no hay usuario o sucursal cargada, se bloquea el menú por seguridad
        setMenuItems(
          baseMenuItems.map((item) => ({ ...item, enabled: false })),
        );
        setSucursal(null);
        return;
      }

      setSucursal(sucursalLocal);

      // Lee el estado del turno directamente desde SQLite local
      const turnoStatus = await getTurnoStatusLocal(sucursalLocal.id_sucursal);

      const turnoData: StatusTurnoDTO = {
        status: turnoStatus.status as StatusTurnoDTO["status"],
        Inicio_turno: turnoStatus.Inicio_turno ?? "",
        Fin_turno: turnoStatus.Fin_turno ?? "",
        Fin_turno_anterior: turnoStatus.Fin_turno_anterior ?? "",
      };

      const updatedMenu = baseMenuItems.map((item) => {
        if (
          item.name === "Salida" ||
          item.name === "Traspaso" ||
          item.name === "Calibración" ||
          item.name === "Abastecimiento"
        ) {
          if (
            turnoData.status === "falta_anterior" ||
            turnoData.status === "normal"
          ) {
            return { ...item, enabled: false };
          } else {
            return { ...item, enabled: true };
          }
        } else {
          if (item.name === "Turno") {
            if (turnoData.status === "falta_anterior") {
              return { ...item, turno: "pendiente" as const, enabled: true };
            } else if (turnoData.status === "normal") {
              return { ...item, turno: "iniciar" as const, enabled: true };
            } else if (turnoData.status === "iniciado") {
              return { ...item, turno: "abierto" as const, enabled: true };
            } else if (turnoData.status === "falta_cerrar") {
              return { ...item, turno: "falta_cerrar" as const };
            } else if (turnoData.status === "cerrado") {
              return { ...item, turno: "cerrado" as const, enabled: true };
            }
          } else {
            return { ...item, enabled: true };
          }
          return item;
        }
      });

      setMenuItems(updatedMenu);
    } catch (error) {
      console.error("[Home] Error al obtener estado del turno:", error);
      toastError("Turno", "No se pudo cargar el estado del turno.");
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchTurno();
    }, []),
  );

  return (
    <View className="flex-1 justify-between">
      {!isLoading ? (
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

          <View>
            <Text className="text-center text-lg font-bold">
              {sucursal?.descripcion_sucursal ||
                "Ninguna Sucursal Seleccionada"}
              ({sucursal?.id_sucursal})
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
