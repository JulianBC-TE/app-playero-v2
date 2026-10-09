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
import { ActivityIndicator, Alert, FlatList, Modal, useColorScheme, View } from "react-native";
import { Text } from "@/components";
import { MenuCard } from "@/components/MenuCard";
import { StackRoutesList, StackRoutesProps } from "@/route/app.routes";
import { useCallback, useState, useEffect } from "react";
import { Loading } from "@/components/Loading";
import { baseMenuItems, menuItemType } from "@/dto/MenuItens";
import { useFocusEffect } from "@react-navigation/native";
import { getBodegasConCierreAnulado, getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { toastError, toastInfo, toastSuccess } from "@/utils/toastMessage";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";
import { getModulosDelUsuario } from "@DBmodules/moduleDB";
import { useAuth } from "@hooks/useAuth";
import type { TurnoStatus } from "@/backend/db/services/turnoStatusService";
import { contarRegistrosSync, syncTodo } from "@/backend/db/services/syncService";
import { hayListasPendientes } from "@/services/listasPendientesService";
import { descargarEInstalar } from "@/services/updateService";
import { registrarIntentoActualizacion } from "@/storage/storageUpdate";
import { getStorageServerUrl } from "@/storage/storageServer";
import { createUpdateDownloadLink } from "@/backend/api/versionAPI";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download } from "lucide-react-native";

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
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<menuItemType[]>(baseMenuItems);
  
  const { user, signOut, sucursal, setSucursal, aplicarResultadoSync, syncStatus, syncMessage, setSyncStatus, setSyncMessage, isManualSync, setIsManualSync, syncCompleteCounter, incrementSyncComplete, syncErrorCount, setSyncErrorCount, syncPendingCount, setSyncPendingCount, updatePendiente } = useAuth();
  const cedula = user?.cedula; 
  const estaBloqueado = !!user?.bloqueado;
  const colorScheme = useColorScheme();

  const haySucursal = !!sucursal?.id_sucursal;

  // Porcentaje de descarga de la actualización (null = sin descarga activa)
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);

  // Card verde "Actualizar": solo aparece cuando el servidor envió el
  // enlace de actualización junto con la respuesta de la sincronización.
  const menuConUpdate: menuItemType[] = updatePendiente
    ? [
        ...menuItems,
        { name: "Actualizar", icon: Download, route: "update", enabled: true, params: {} },
      ]
    : menuItems;

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

  function handleOpenMenu(route: keyof StackRoutesList | "sync" | "update", params?: any) {
    if (route === "sync") {
      handleSync();
      return;
    }
    if (route === "update") {
      handleActualizar();
      return;
    }
    navigation.navigate(route as keyof StackRoutesList, params);
  }

  async function handleSync() {
    if (!user?.idUser) return;
    if (syncStatus === "syncing") {
      toastInfo("Sync en curso", syncMessage || "Ya hay un proceso activo");
      return;
    }
    try {
      setIsManualSync(true);
      const resultado = await syncTodo(
        user.idUser,
        (msg) => setSyncMessage(msg),
        (status) => setSyncStatus(status),
        setSyncErrorCount,
        true,
        setSyncPendingCount
      );
      // Aplica a la sesión los cambios de bloqueo/sucursal que bajó el sync
      await aplicarResultadoSync(resultado);
      // Forzar refresco del Home después del sync
      incrementSyncComplete();
    } catch (error: any) {
      console.error("[Home] Error en sincronización:", error);
      toastError("No se pudo completar la sincronización", error?.message ?? "Error desconocido");
    }
  }

  /**
   * Valida que la app esté lista para actualizarse y, si lo está,
   * descarga e instala la última versión publicada en el servidor.
   *
   * Reglas:
   *  - No puede haber registros con sync == 0 ni entradas en las listas de
   *    salidas / traspasos / abastecimientos → bloquea la actualización.
   *  - Si hay registros con sync == -1 avisa, pero permite actualizar.
   */
  async function handleActualizar() {
    if (!updatePendiente?.latestVersion) return;
    if (updateProgress !== null) return;

    try {
      const conteo = await contarRegistrosSync();
      const hayListas = await hayListasPendientes();

      if (conteo.pendientes > 0 || hayListas) {
        const motivos: string[] = [];
        if (conteo.pendientes > 0) {
          motivos.push(`${conteo.pendientes} registro(s) sin sincronizar`);
        }
        if (hayListas) {
          motivos.push("entradas en las listas de salidas, traspasos o abastecimientos");
        }
        Alert.alert(
          "No está listo para actualizar",
          `Debe sincronizar todo y limpiar las listas antes de actualizar.\n\nPendientes:\n• ${motivos.join("\n• ")}`,
        );
        return;
      }

      const tieneErrores = conteo.errores > 0;

      // Detecta el bucle de actualización: ya se lanzó el instalador para
      // esta misma versión y la app sigue reportando la misma versión.
      const intentos = updatePendiente.intentos ?? 0;
      const avisoBucle =
        intentos >= 1 && updatePendiente.versionInstalada
          ? `Atención: este es el intento n.º ${intentos + 1} de instalar la versión ${updatePendiente.latestVersion} y la app sigue en la versión ${updatePendiente.versionInstalada}.\n\n` +
            "• Si acabás de instalarla, reiniciá la aplicación para que tome la nueva versión.\n" +
            `• Si ya reiniciaste y el botón volvió a aparecer, el número registrado en el Sistema Playero (${updatePendiente.latestVersion}) no coincide con la versión interna del APK: hay que publicarlo como ${updatePendiente.versionInstalada}.\n\n`
          : "";

      const mensaje = avisoBucle + (tieneErrores
        ? `Atención: hay ${conteo.errores} registro(s) con error de sincronización (sync = -1).\n\nPuede actualizar igualmente, pero revise esos registros después.\n\nSe instalará la versión ${updatePendiente.latestVersion}.`
        : `Se descargará e instalará la versión ${updatePendiente.latestVersion}.\n\n¿Desea continuar?`);

      Alert.alert("Actualizar aplicación", mensaje, [
        { text: "Cancelar", style: "cancel" },
        { text: "Actualizar", onPress: () => descargarActualizacion() },
      ]);
    } catch (error: any) {
      console.error("[Home] Error validando la actualización:", error);
      toastError("No se pudo verificar la actualización", error?.message ?? "Error desconocido");
    }
  }

  /** Descarga el APK con el enlace que dio el servidor y lanza el instalador. */
  async function descargarActualizacion() {
    if (!updatePendiente?.latestVersion) return;

    setUpdateProgress(0);
    try {
      const serverUrl = await getStorageServerUrl();
      const url = await createUpdateDownloadLink();
      await descargarEInstalar(url, serverUrl, setUpdateProgress);
      // El instalador terminó: si al reabrir la app la versión no cambió,
      // handleActualizar() mostrará el aviso de bucle.
      await registrarIntentoActualizacion();
    } catch (error: any) {
      console.error("[Home] Error al actualizar:", error);
      toastError(
        "No se pudo actualizar",
        error?.message ?? "Error desconocido",
      );
    } finally {
      setUpdateProgress(null);
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
      
          if (data && data.idSucursal) {
            await setSucursal({
              id_sucursal: data.idSucursal,
              descripcion_sucursal: data.descripcionSucursal,
            });
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
    }, [cedula, estaBloqueado, syncCompleteCounter]) 
  );

  // ── Render si el usuario está bloqueado ──────────────────────────────────────
  if (estaBloqueado) {
    return (
      <View className="flex-1 bg-dangerSoft dark:bg-dangerSoftDark items-center justify-center px-6 gap-4">
        <Text className="text-danger dark:text-dangerDark text-2xl font-bold text-center">
          Acceso Restringido
        </Text>
        <Text className="text-text dark:text-textDark text-base text-center font-medium">
          El usuario asociado a esta cuenta ha sido bloqueado en el sistema.
        </Text>
        <Loading />
        <Text className="text-textMuted dark:text-textMutedDark text-sm text-center mt-4 italic">
          Cerrando sesión de forma segura y eliminando registros locales...
        </Text>
      </View>
    );
  }

  // ── Render Normal ────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 justify-between bg-background dark:bg-backgroundDark">
      {!isLoading ? (
        <View className="flex-1 justify-between">
          <View>
            <HomeHeader
              title={`${sucursal?.descripcion_sucursal || "Ninguna Sucursal Seleccionada"}${haySucursal ? ` (${sucursal.id_sucursal})` : ""}`}
            />
            <View className="px-12">
              <FlatList
                data={menuConUpdate}
                keyExtractor={(item) => item.name}
                numColumns={2}
                columnWrapperStyle={{
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
                contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 24 }}
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
                  variant={item.route === "update" ? "update" : undefined}
                  syncErrorCount={item.route === "sync" ? syncErrorCount : 0}
                  syncPendingCount={item.route === "sync" ? syncPendingCount : 0}
                />
                )}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Loading />
        </View>
      )}

      {/* Modal de sincronización */}
      <Modal visible={syncStatus === "syncing" && isManualSync} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-surface dark:bg-surfaceElevatedDark rounded-2xl p-8 items-center mx-8 border border-border dark:border-borderDark">
            <ActivityIndicator size="large" color={colorScheme === "dark" ? "#86A2E8" : "#5B79C7"} />
            <Text className="text-lg font-semibold mt-4 text-center text-text dark:text-textDark">
              {syncMessage}
            </Text>
            <Text className="text-sm text-textMuted dark:text-textMutedDark mt-2 text-center">
              Por favor espere...
            </Text>
          </View>
        </View>
      </Modal>
      {/* Modal de descarga de la actualización */}
      <Modal visible={updateProgress !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-surface dark:bg-surfaceElevatedDark rounded-2xl p-8 items-center mx-8 w-80 border border-border dark:border-borderDark">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="text-lg font-semibold mt-4 text-center text-text dark:text-textDark">
              Descargando actualización...
            </Text>
            <View className="h-2 w-full bg-secondarySoft dark:bg-secondarySoftDark rounded-full mt-4 overflow-hidden">
              <View
                className="h-2 bg-green-600 rounded-full"
                style={{ width: `${updateProgress ?? 0}%` }}
              />
            </View>
            <Text className="text-sm text-textMuted dark:text-textMutedDark mt-2 text-center">
              {updateProgress ?? 0}%
            </Text>
            <Text className="text-sm text-textMuted dark:text-textMutedDark mt-1 text-center">
              Al finalizar se abrirá el instalador
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
