// src/screens/Home.tsx
//
// MIGRACIÓN OFFLINE-FIRST:
//   Antes: api.get(`api/registros/turno/status/${sucursal.id_sucursal}`)
//   Ahora: getTurnoStatusLocal(sucursal.id_sucursal) — desde turnoBD
//   Permisos: getModulosDelUsuario(cedula) — desde moduleDB
//
// LÓGICA DE NEGOCIO (igual que la versión original):
//   - Módulos operativos (Salida, Traspaso, Calibración, Abastecimiento):
//       habilitados solo si turno está en estado "iniciado", "falta_cerrar" o "cerrado"
//       Y el usuario tiene permiso de módulo.
//   - Ítem "Turno": siempre habilitado, muestra la etiqueta de estado del turno.
//   - Persona / Vehículo: siempre visibles; puedeCrear controlado por permiso.
//   - Resto: solo controlado por permisos de módulo.

import { HomeHeader } from "@/components/HomeHeader";
import { ActivityIndicator, FlatList, Modal, Text, View } from "react-native";
import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { useCallback, useState, useEffect } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";
import { useFocusEffect } from "@react-navigation/native";
import { getBodegasConCierreAnulado, getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";
import { getModulosDelUsuario } from "@DBmodules/moduleDB";
import { useAuth } from "@hooks/useAuth";
import type { TurnoStatus } from "@/backend/db/services/turnoStatusService";
import { syncTodo } from "@/backend/db/services/syncService";

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Rutas de los módulos que requieren turno activo para poder operar. */
const RUTAS_OPERATIVAS = new Set([
  "salida",
  "traspaso",
  "calibracion",
  "abastecimiento",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Devuelve true cuando el estado del turno permite realizar operaciones
 * (salida, traspaso, calibración, abastecimiento).
 * Cuando el turno está "cerrado" o en "falta_cerrar", las pantallas operativas
 * se encargan ellas mismas de mostrar el aviso y pedir justificación.
 */
function turnoPermiteOperar(status: TurnoStatus): boolean {
  return status === "iniciado" || status === "cerrado" || status === "falta_cerrar";
}

/**
 * Traduce el estado del turno a la etiqueta visual que muestra MenuCard
 * en el ítem "Turno".
 */
function etiquetaTurno(status: TurnoStatus): menuItemType["turno"] {
  switch (status) {
    case "falta_anterior": return "pendiente";
    case "normal":         return "iniciar";
    case "iniciado":      return "abierto";
    case "falta_cerrar":   return "falta_cerrar";
    case "falta_inicio":   return "pendiente";
    case "cerrado":        return "cerrado";
  }
}

/**
 * Consulta si el usuario tiene permiso para el módulo indicado por ruta.
 * Acepta ModulosLocal completo (que incluye `cedula: number` además de los
 * campos booleanos), por lo que se usa `typeof valor === "boolean"` en lugar
 * de asumir que todos los campos son booleans.
 * Si los permisos son null (sin datos en BD), devuelve `fallback`.
 */
function tienePermiso(
  permisos: Record<string, unknown> | null | undefined,
  ruta: string,
  fallback: boolean,
): boolean {
  if (!permisos) return fallback;
  const valor = permisos[ruta];
  return typeof valor === "boolean" ? valor : fallback;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function Home({ navigation }: StackRoutesProps<"home">) {
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  
  const { user, signOut } = useAuth(); 
  const cedula = user?.cedula; 
  const estaBloqueado = !!user?.bloqueado;

  const [sucursal, setSucursal] = useState<{
    id_sucursal: number;
    descripcion_sucursal: string;
  } | null>(null);

  // ── CONTROL DE USUARIO BLOQUEADO (30 Segundos) ─────────────────────────────
  useEffect(() => {
    let temporizador: NodeJS.Timeout;

    if (estaBloqueado) {
      toastError(
        "Usuario Bloqueado",
        "Su usuario se encuentra bloqueado. La aplicación se cerrará en 15 segundos."
      );

      temporizador = setTimeout(async () => {
        console.log("Tiempo cumplido. Borrando datos y cerrando sesión...");
        // Pasamos 'true' para indicar que haga el borrado completo de la BD en el AuthContext
        // (Nota: ignora cualquier warning de type-checking si la firma aún no está actualizada)
        await signOut(true as any); 
      }, 15000); // 30 segundos
    }

    return () => {
      if (temporizador) clearTimeout(temporizador);
    };
  }, [estaBloqueado, signOut]);

  function handleOpenMenu(route: keyof StackRoutesList | "sync", params?: any) {
    if (route === "sync") {
      handleSync();
      return;
    }
    navigation.navigate(route as keyof StackRoutesList, params);
  }

  async function handleSync() {
    if (isSyncing || !user?.idUser) return;
    setIsSyncing(true);
    setSyncMessage("Iniciando sincronización...");
    try {
      await syncTodo(user.idUser, (msg) => setSyncMessage(msg));
      toastSuccess("Sincronización", "Completada exitosamente");
    } catch (error) {
      console.error("[Home] Error en sincronización:", error);
      toastError("Error", "Error durante la sincronización");
    } finally {
      setIsSyncing(false);
      setSyncMessage("");
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Evitamos ejecutar la lógica hasta que haya cédula disponible o si está bloqueado
      if (!cedula || estaBloqueado) return;

      async function loadDashboardData() {
        try {
          setIsLoading(true);

          // 1. Sucursal activa del usuario logueado (Lectura local)
          const data = await getSucursalUsuarioActivoLocal();
      
          if (data) {
            setSucursal({
              id_sucursal: data.idSucursal,
              descripcion_sucursal: data.descripcionSucursal
            });
          } else {
            setSucursal(null);
          }

          // 2. Estado del turno (offline-first)
          let turnoStatus: TurnoStatus = "normal";
          
          if (data && data.idSucursal) {
            const resultado = await getTurnoStatusLocal(cedula);
            turnoStatus = resultado.status as TurnoStatus;
            //console.log(resultado.Fin_turno_anterior);
          }

          // 3. Permisos de módulos del usuario (offline-first)
          const permisosLocales = await getModulosDelUsuario(cedula);
          const anulado = await getBodegasConCierreAnulado(cedula);
          //console.log(anulado);
          if(turnoStatus == "iniciado" && anulado.hayPendientes){
            turnoStatus = "falta_cerrar"
          }
          // 4. Calcular estado de cada ítem del menú y filtrar los no activos
          const itemsVisibles = baseMenuItems
            .map((item) => {
              const ruta = item.route.toLowerCase();

              // ── Ítem "Turno" ──────────────────────────────────────────────
              if (ruta === "turno") {
                console.log(turnoStatus, user);
                return {
                  ...item,
                  enabled: true,
                  turno: etiquetaTurno(turnoStatus),
                };
              }

              // ── Persona / Vehículo ─────────────────────────────────────────
              if (ruta === "persona" || ruta === "vehiculo") {
                const puedeCrear = tienePermiso(permisosLocales, ruta, true);
                return {
                  ...item,
                  enabled: true,
                  params: { ...item.params, puedeCrear },
                };
              }

              // ── Módulos operativos ─────────────────────────────────────────
              if (RUTAS_OPERATIVAS.has(ruta)) {
                const tieneAcceso = tienePermiso(permisosLocales, ruta, item.enabled ?? true);
                const turnoActivo = turnoPermiteOperar(turnoStatus);
                return { ...item, enabled: tieneAcceso && turnoActivo };
              }

              // ── Resto de módulos ───────────────────────────────────────────
              const tieneAcceso = tienePermiso(permisosLocales, ruta, item.enabled ?? true);
              return { ...item, enabled: tieneAcceso };
            })
            .filter((item) => item.enabled);

          setMenuItems(itemsVisibles);
        } catch (error) {
          console.error("[Home] Error cargando dashboard:", error);
          toastError(
            "Error",
            "No se pudieron cargar los permisos o el estado del turno.",
          );
        } finally {
          setIsLoading(false);
        }
      }

      loadDashboardData();
    }, [cedula, estaBloqueado]) 
  );

  // ── Render si el usuario está bloqueado ──────────────────────────────────────
  if (estaBloqueado) {
    return (
      <View className="flex-1 bg-red-100 items-center justify-center px-6 gap-4">
        <Text className="text-red-700 text-2xl font-bold text-center">
          Acceso Restringido
        </Text>
        <Text className="text-black text-base text-center font-medium">
          El usuario asociado a esta cuenta ha sido bloqueado en el sistema.
        </Text>
        <Loading />
        <Text className="text-gray-500 text-sm text-center mt-4 italic">
          Cerrando sesión de forma segura y eliminando registros locales...
        </Text>
      </View>
    );
  }

  // ── Render Normal ────────────────────────────────────────────────────────────
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

          <View className="mb-20">
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

      {/* Modal de sincronización */}
      <Modal visible={isSyncing} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl p-8 items-center mx-8">
            <ActivityIndicator size="large" color="#000" />
            <Text className="text-lg font-semibold mt-4 text-center">
              {syncMessage}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              Por favor espere...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}