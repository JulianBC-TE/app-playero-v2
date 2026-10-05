import React, { useState, useEffect, useMemo } from "react";
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  Alert, 
  ScrollView, 
  Image, 
  TouchableWithoutFeedback,
  ActivityIndicator,
  useColorScheme
} from "react-native";
import { Text } from "@/components";
import { getRegistrosPorTipo, eliminarRegistroPorTipo, RegistroResumen, TipoRegistro, ImagenDetalle } from "@DBmodules/resumenBD";
import { reenviarRegistroIndividual } from "@DBmodules/reenviarRegistroDB";
import { duplicarRegistroConError } from "@DBmodules/duplicarConErrorDB";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Loading } from "@/components/Loading";
import { CheckCircle2, AlertTriangle, Clock, Trash2, X, Image as ImageIcon, RefreshCw, Copy } from "lucide-react-native";

type ListaProps = {
  tipo: TipoRegistro;
  fechaFiltro: string; 
  isUnlocked: boolean;
};

interface GrupoBodega {
  bodega: string;
  items: RegistroResumen[];
}

// Subcomponente para renderizar la imagen con control de fallos
function TarjetaImagen({ img, onPress }: { img: ImagenDetalle; onPress: () => void }) {
  const [hasError, setHasError] = useState(false);
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#A1A1AA" : "#4b5563";
  const errorColor = colorScheme === "dark" ? "#71717A" : "#9ca3af";

  return (
    <View className="bg-surfaceElevated dark:bg-surfaceElevatedDark p-3 rounded-2xl border border-border dark:border-borderDark">
      <View className="flex-row items-center gap-2 mb-2">
        <ImageIcon size={16} color={iconColor} />
        <Text className="text-xs font-bold text-text dark:text-textDark">{img.titulo}</Text>
      </View>
      
      {hasError ? (
        <View className="w-full h-40 bg-secondarySoft dark:bg-secondarySoftDark rounded-xl items-center justify-center p-3 border border-dashed border-border dark:border-borderDark">
          <AlertTriangle color={errorColor} size={24} />
          <Text className="text-xs text-textMuted dark:text-textMutedDark font-medium text-center mt-1">
            No se pudo cargar el archivo de imagen
          </Text>
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          <Image
            source={{ uri: img.uri }}
            style={{ width: "100%", height: 200, borderRadius: 12 }}
            resizeMode="cover"
            onError={(e) => {
              console.log("[Imagen Error]", img.uri, e.nativeEvent.error);
              setHasError(true);
            }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Componente de vista de logs con filtros y colores
function ListaLogs({ registros }: { registros: RegistroResumen[] }) {
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "creacion" | "sync_ok" | "sync_error">("todos");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const registrosFiltrados = useMemo(() => {
    if (filtroActivo === "todos") return registros;
    return registros.filter((r) => {
      if (filtroActivo === "creacion" && r.syncStatus === 0) return true;
      if (filtroActivo === "sync_ok" && r.syncStatus === 1) return true;
      if (filtroActivo === "sync_error" && r.syncStatus === -1) return true;
      return false;
    });
  }, [registros, filtroActivo]);

  const getBackgroundColor = (syncStatus: number) => {
    switch (syncStatus) {
      case 0: return isDark ? "#422006" : "#fef9c3"; // amarillo - creacion
      case 1: return isDark ? "#052e16" : "#dcfce7"; // verde - sync_ok
      case -1: return isDark ? "#450a0a" : "#fee2e2"; // rojo - sync_error
      default: return isDark ? "#18181b" : "#ffffff";
    }
  };

  const getAccionLabel = (syncStatus: number) => {
    switch (syncStatus) {
      case 0: return "creación";
      case 1: return "sync_ok";
      case -1: return "sync_error";
      default: return "";
    }
  };

  const renderLogItem = ({ item }: { item: RegistroResumen }) => (
    <View 
      style={{ 
        backgroundColor: getBackgroundColor(item.syncStatus),
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#27272a' : '#e5e5e5',
      }}
    >
      <Text style={{ fontSize: 13, color: isDark ? '#f4f4f5' : '#000000' }}>
        {item.hora}  {item.datoPrincipal}  {item.datoSecundario}  {getAccionLabel(item.syncStatus)}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      {/* Filtros */}
      <View className="flex-row px-3 py-2 gap-2 bg-surface dark:bg-surfaceElevatedDark border-b border-border dark:border-borderDark">
        {[
          { key: "todos", label: "Todos" },
          { key: "creacion", label: "Creación" },
          { key: "sync_ok", label: "Sync OK" },
          { key: "sync_error", label: "Sync Error" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFiltroActivo(f.key as any)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: filtroActivo === f.key ? "#2563eb" : isDark ? "#27272a" : "#e5e7eb",
            }}
          >
            <Text style={{ 
              fontSize: 12, 
              fontWeight: "bold",
              color: filtroActivo === f.key ? "#ffffff" : isDark ? "#d4d4d8" : "#374151" 
            }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de logs */}
      <FlatList
        data={registrosFiltrados}
        keyExtractor={(item) => `log-${item.id}`}
        renderItem={renderLogItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-16">
            <Text className="text-textMuted dark:text-textMutedDark text-base text-center px-6">
              No se encontraron logs para esta fecha.
            </Text>
          </View>
        }
      />
    </View>
  );
}

export function ListaResumenSincronizacion({ tipo, fechaFiltro, isUnlocked }: ListaProps) {
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemSeleccionado, setItemSeleccionado] = useState<RegistroResumen | null>(null);
  const [imagenModalUri, setImagenModalUri] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  async function cargarRegistros() {
    try {
      setIsLoading(true);
      const data = await getRegistrosPorTipo(tipo, fechaFiltro);
      setRegistros(data);
    } catch (error) {
      console.error(`[Resumen] Error cargando tipo ${tipo} para fecha ${fechaFiltro}:`, error);
      toastError("Error", "No se pudieron obtener los registros locales.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarRegistros();
  }, [tipo, fechaFiltro]);

  const registrosAgrupados = useMemo(() => {
    if (tipo !== "turno") return [];
    const mapa = new Map<string, RegistroResumen[]>();
    registros.forEach((reg) => {
      const bodega = reg.datoPrincipal; 
      if (!mapa.has(bodega)) {
        mapa.set(bodega, []);
      }
      mapa.get(bodega)!.push(reg);
    });

    return Array.from(mapa.entries()).map(([bodega, items]) => ({
      bodega,
      items,
    }));
  }, [registros, tipo]);

  function obtenerConfiguracionEstado(status: number) {
    switch (status) {
      case 1:
        return {
          backgroundColor: isDark ? "#14532d33" : "#5ce98620",
          borderColor: isDark ? "#166534" : "#8ff8b4",
          iconColor: "#16a34a",
          Icono: CheckCircle2,
          texto: "Sincronizado"
        };
      case -1:
        return {
          backgroundColor: isDark ? "#7f1d1d33" : "#fef2f2",
          borderColor: isDark ? "#b91c1c" : "#fecaca",
          iconColor: "#dc2626",
          Icono: AlertTriangle,
          texto: "Error Sync"
        };
      default:
        return {
          backgroundColor: isDark ? "#713f1233" : "#fefce8",
          borderColor: isDark ? "#a16207" : "#fef08a",
          iconColor: "#ca8a04",
          Icono: Clock,
          texto: "Pendiente"
        };
    }
  }

  function handleEliminarRegistro() {
    if (!itemSeleccionado) return;

    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro local?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const ok = await eliminarRegistroPorTipo(tipo, itemSeleccionado.id);
            if (ok) {
              toastSuccess("Éxito", "Registro eliminado correctamente.");
              setItemSeleccionado(null);
              cargarRegistros();
            } else {
              toastError("Error", "No se pudo eliminar el registro.");
            }
          }
        }
      ]
    );
  }

  async function handleReenviar() {
    if (!itemSeleccionado || isRetrying) return;

    Alert.alert(
      "Reenviar Registro",
      "¿Deseas reintentar el envío de este registro al servidor?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reenviar",
          onPress: async () => {
            setIsRetrying(true);
            try {
              const result = await reenviarRegistroIndividual(tipo, itemSeleccionado.id);
              if (result.success) {
                toastSuccess("Éxito", "Registro enviado correctamente.");
                setItemSeleccionado(null);
                cargarRegistros();
              } else {
                toastError("Error al reenviar", result.error || "No se pudo enviar el registro.");
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              toastError("Error inesperado", msg);
            } finally {
              setIsRetrying(false);
            }
          }
        }
      ]
    );
  }

  function handleDuplicar() {
    if (!itemSeleccionado) return;

    Alert.alert(
      "Duplicar Registro (Test)",
      "Se creará una copia de este registro con sync = -1 para probar el reenvío.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Duplicar",
          onPress: async () => {
            const ok = await duplicarRegistroConError(tipo, itemSeleccionado.id);
            if (ok) {
              toastSuccess("Duplicado", "Copia creada con error de sync.");
              setItemSeleccionado(null);
              cargarRegistros();
            } else {
              toastError("Error", "No se pudo duplicar el registro.");
            }
          }
        }
      ]
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <Loading />
      </View>
    );
  }

  // Si es tipo logs, renderizar componente especial
  if (tipo === "logs") {
    return <ListaLogs registros={registros} />;
  }

  const renderDetalleModal = () => {
    if (!itemSeleccionado) return null;
    const config = obtenerConfiguracionEstado(itemSeleccionado.syncStatus);
    const ComponenteIcono = config.Icono;

    return (
      <Modal 
        visible={!!itemSeleccionado} 
        transparent 
        animationType="slide"
        onRequestClose={() => setItemSeleccionado(null)} 
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setItemSeleccionado(null)} 
          />

          <View className="bg-surface dark:bg-surfaceElevatedDark rounded-t-3xl p-6 shadow-2xl max-h-[88%]">
            
            {/* Encabezado */}
            <View className="flex-row justify-between items-center border-b border-border dark:border-borderDark pb-3 mb-3">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <ComponenteIcono color={config.iconColor} size={22} />
                <Text className="text-xl font-bold text-text dark:text-textDark" numberOfLines={1}>
                  {itemSeleccionado.datoPrincipal}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setItemSeleccionado(null)} className="p-1">
                <X color={isDark ? "#A1A1AA" : "#6b7280"} size={24} />
              </TouchableOpacity>
            </View>

            {/* Contenido */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* Badge Estado */}
              <View className="flex-row items-center justify-between bg-surfaceElevated dark:bg-surfaceDark p-3 rounded-xl border border-border dark:border-borderDark mb-4">
                <Text className="text-xs font-bold text-textMuted dark:text-textMutedDark uppercase">Estado Sincronización</Text>
                <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: config.backgroundColor }}>
                  <ComponenteIcono color={config.iconColor} size={14} />
                  <Text className="text-xs font-bold" style={{ color: config.iconColor }}>{config.texto}</Text>
                </View>
              </View>

              {/* Campos */}
              <Text className="text-sm font-bold text-text dark:text-textDark mb-2 uppercase tracking-wide">
                Información Detallada
              </Text>

              <View className="bg-surfaceElevated dark:bg-surfaceDark rounded-2xl p-4 border border-border dark:border-borderDark gap-3 mb-5">
                {itemSeleccionado.camposDetalle && itemSeleccionado.camposDetalle.length > 0 ? (
                  itemSeleccionado.camposDetalle.map((campo, index) => (
                    <View key={index} className="flex-row justify-between items-start border-b border-border/80 dark:border-borderDark pb-2">
                      <Text className="text-xs font-semibold text-textMuted dark:text-textMutedDark flex-1 pr-2">
                        {campo.label}
                      </Text>
                      <Text className="text-xs font-bold text-text dark:text-textDark flex-1 text-right">
                        {campo.value !== null && campo.value !== undefined ? String(campo.value) : "—"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-textMuted dark:text-textMutedDark text-center">No hay campos adicionales disponibles.</Text>
                )}
              </View>

              {/* Galería de Fotografías */}
              <Text className="text-sm font-bold text-text dark:text-textDark mb-2 uppercase tracking-wide">
                Fotografías y Adjuntos
              </Text>

              {itemSeleccionado.imagenes && itemSeleccionado.imagenes.length > 0 ? (
                <View className="gap-3 mb-4">
                  {itemSeleccionado.imagenes.map((img: ImagenDetalle, index: number) => (
                    <TarjetaImagen 
                      key={index} 
                      img={img} 
                      onPress={() => setImagenModalUri(img.uri)} 
                    />
                  ))}
                </View>
              ) : (
                <View className="p-4 bg-surfaceElevated dark:bg-surfaceDark rounded-xl border border-border dark:border-borderDark mb-4 items-center">
                  <Text className="text-xs text-textMuted dark:text-textMutedDark">Sin imágenes adjuntas en este registro.</Text>
                </View>
              )}

              {/* Reenvío (solo para sync = -1) */}
              {itemSeleccionado.syncStatus === -1 && (
                <TouchableOpacity 
                  onPress={handleReenviar}
                  disabled={isRetrying}
                  className={`mt-2 flex-row justify-center items-center gap-2 py-3.5 rounded-xl shadow-sm ${isRetrying ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"}`}
                >
                  {isRetrying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <RefreshCw color="#fff" size={20} />
                  )}
                  <Text className="text-white font-bold text-base">
                    {isRetrying ? "Reenviando..." : "Reenviar"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Duplicar (modo admin/test) - crea copia con sync = -1, solo visible para admin */}
              {isUnlocked && (
                <TouchableOpacity 
                  onPress={handleDuplicar}
                  className={`mt-2 flex-row justify-center items-center gap-2 py-3.5 rounded-xl shadow-sm bg-green-600 active:bg-green-700`}
                >
                  <Copy color="#fff" size={20} />
                  <Text className="text-white font-bold text-base">Duplicar para Test</Text>
                </TouchableOpacity>
              )}

              {/* Borrado */}
              {isUnlocked && (
                <TouchableOpacity 
                  onPress={handleEliminarRegistro}
                  className="mt-2 bg-red-600 flex-row justify-center items-center gap-2 py-3.5 rounded-xl active:bg-red-700 shadow-sm"
                >
                  <Trash2 color="#fff" size={20} />
                  <Text className="text-white font-bold text-base">Eliminar Registro</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Modal de Zoom de Imagen */}
        <Modal 
          visible={!!imagenModalUri} 
          transparent 
          animationType="fade"
          onRequestClose={() => setImagenModalUri(null)}
        >
          <TouchableOpacity 
            className="flex-1 bg-black justify-center items-center p-4"
            activeOpacity={1}
            onPress={() => setImagenModalUri(null)}
          >
            <TouchableOpacity 
              onPress={() => setImagenModalUri(null)}
              className="absolute top-12 right-6 z-10 bg-white/20 p-2 rounded-full"
            >
              <X color="#fff" size={28} />
            </TouchableOpacity>

            {imagenModalUri && (
              <TouchableWithoutFeedback>
                <Image
                  source={{ uri: imagenModalUri }}
                  style={{ width: "100%", height: "80%" }}
                  resizeMode="contain"
                />
              </TouchableWithoutFeedback>
            )}
          </TouchableOpacity>
        </Modal>
      </Modal>
    );
  };

  if (tipo === "turno") {
    return (
      <View className="flex-1 bg-background dark:bg-backgroundDark px-5 py-4">
        <FlatList
          data={registrosAgrupados}
          keyExtractor={(item) => `grupo-${item.bodega}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-16">
              <Text className="text-textMuted dark:text-textMutedDark text-base text-center px-6">
                No se encontraron turnos para la fecha seleccionada.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: GrupoBodega }) => (
            <View className="mb-5 overflow-hidden rounded-2xl border border-border dark:border-borderDark bg-surface dark:bg-surfaceElevatedDark shadow-xs">
              <View className="bg-surfaceElevated dark:bg-surfaceDark px-4 py-3 border-b border-border dark:border-borderDark">
                <Text className="text-lg font-bold text-text dark:text-textDark">{item.bodega}</Text>
              </View>

              <View>
                {item.items.map((turno, index) => {
                  const config = obtenerConfiguracionEstado(turno.syncStatus);
                  const ComponenteIcono = config.Icono;

                  return (
                    <TouchableOpacity 
                      key={turno.id}
                      onPress={() => setItemSeleccionado(turno)}
                      className={`flex-row justify-between items-center p-4 ${
                        index !== item.items.length - 1 ? "border-b border-border dark:border-borderDark" : ""
                      }`}
                      style={{ backgroundColor: config.backgroundColor }}
                    >
                      <View className="flex-1 flex-row items-center pr-4 gap-3">
                        <ComponenteIcono color={config.iconColor} size={18} />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-text dark:text-textDark">
                            {turno.datoSecundario}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end min-w-[75px]">
                        <Text className="text-sm font-medium text-textMuted dark:text-textMutedDark">{turno.litros}</Text>
                        <Text className="text-xs font-bold text-textMuted dark:text-textMutedDark mt-0.5">{turno.hora} hs</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
        {renderDetalleModal()}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark px-5 py-4">
      <FlatList
        data={registros}
        keyExtractor={(item) => `${tipo}-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-16">
            <Text className="text-textMuted dark:text-textMutedDark text-base text-center px-6">
              No se encontraron registros para esta categoría en la fecha seleccionada.
            </Text>
          </View>
        }
        renderItem={({ item }: { item: RegistroResumen }) => {
          const config = obtenerConfiguracionEstado(item.syncStatus);
          const ComponenteIcono = config.Icono;

          return (
            <TouchableOpacity 
              onPress={() => setItemSeleccionado(item)}
              className="p-4 mb-3 rounded-xl shadow-xs flex-row justify-between items-center border"
              style={{ 
                backgroundColor: config.backgroundColor, 
                borderColor: config.borderColor 
              }}
            >
              <View className="flex-1 flex-row items-center pr-4 gap-3">
                <ComponenteIcono color={config.iconColor} size={20} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-text dark:text-textDark" numberOfLines={1}>
                    {item.datoPrincipal}
                  </Text>
                  <Text className="text-xs text-textMuted dark:text-textMutedDark mt-0.5" numberOfLines={1}>
                    {item.datoSecundario}
                  </Text>
                </View>
              </View>

              <View className="items-end min-w-[85px]">
                <Text className="text-base font-black text-text dark:text-textDark">
                  {typeof item.litros === "number" ? `${item.litros.toLocaleString()} L` : item.litros}
                </Text>
                <View className="mt-1 px-2 py-0.5 bg-surface/70 dark:bg-surfaceElevatedDark rounded border border-border dark:border-borderDark">
                  <Text className="text-[11px] font-medium text-textMuted dark:text-textMutedDark">{item.hora} hs</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {renderDetalleModal()}
    </View>
  );
}
