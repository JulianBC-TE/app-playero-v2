import React, { useState, useEffect, useMemo } from "react";
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  Alert, 
  ScrollView, 
  Image, 
  TouchableWithoutFeedback 
} from "react-native";
import { Text } from "@/components";
import { getRegistrosPorTipo, eliminarRegistroPorTipo, RegistroResumen, TipoRegistro, ImagenDetalle } from "@DBmodules/resumenBD";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Loading } from "@/components/Loading";
import { CheckCircle2, AlertTriangle, Clock, Trash2, X, Image as ImageIcon } from "lucide-react-native";

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

  return (
    <View className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
      <View className="flex-row items-center gap-2 mb-2">
        <ImageIcon size={16} color="#4b5563" />
        <Text className="text-xs font-bold text-gray-700">{img.titulo}</Text>
      </View>
      
      {hasError ? (
        <View className="w-full h-40 bg-gray-200 rounded-xl items-center justify-center p-3 border border-dashed border-gray-300">
          <AlertTriangle color="#9ca3af" size={24} />
          <Text className="text-xs text-gray-500 font-medium text-center mt-1">
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

export function ListaResumenSincronizacion({ tipo, fechaFiltro, isUnlocked }: ListaProps) {
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemSeleccionado, setItemSeleccionado] = useState<RegistroResumen | null>(null);
  const [imagenModalUri, setImagenModalUri] = useState<string | null>(null);

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
          backgroundColor: "#5ce98620",
          borderColor: "#8ff8b4",
          iconColor: "#16a34a",
          Icono: CheckCircle2,
          texto: "Sincronizado"
        };
      case -1:
        return {
          backgroundColor: "#fef2f2",
          borderColor: "#fecaca",
          iconColor: "#dc2626",
          Icono: AlertTriangle,
          texto: "Error Sync"
        };
      default:
        return {
          backgroundColor: "#fefce8",
          borderColor: "#fef08a",
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Loading />
      </View>
    );
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

          <View className="bg-white rounded-t-3xl p-6 shadow-2xl max-h-[88%]">
            
            {/* Encabezado */}
            <View className="flex-row justify-between items-center border-b border-gray-100 pb-3 mb-3">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <ComponenteIcono color={config.iconColor} size={22} />
                <Text className="text-xl font-bold text-gray-800" numberOfLines={1}>
                  {itemSeleccionado.datoPrincipal}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setItemSeleccionado(null)} className="p-1">
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            {/* Contenido */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* Badge Estado */}
              <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                <Text className="text-xs font-bold text-gray-400 uppercase">Estado Sincronización</Text>
                <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: config.backgroundColor }}>
                  <ComponenteIcono color={config.iconColor} size={14} />
                  <Text className="text-xs font-bold" style={{ color: config.iconColor }}>{config.texto}</Text>
                </View>
              </View>

              {/* Campos */}
              <Text className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Información Detallada
              </Text>

              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 gap-3 mb-5">
                {itemSeleccionado.camposDetalle && itemSeleccionado.camposDetalle.length > 0 ? (
                  itemSeleccionado.camposDetalle.map((campo, index) => (
                    <View key={index} className="flex-row justify-between items-start border-b border-gray-100/80 pb-2">
                      <Text className="text-xs font-semibold text-gray-500 flex-1 pr-2">
                        {campo.label}
                      </Text>
                      <Text className="text-xs font-bold text-gray-800 flex-1 text-right">
                        {campo.value !== null && campo.value !== undefined ? String(campo.value) : "—"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-gray-400 text-center">No hay campos adicionales disponibles.</Text>
                )}
              </View>

              {/* Galería de Fotografías */}
              <Text className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
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
                <View className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4 items-center">
                  <Text className="text-xs text-gray-400">Sin imágenes adjuntas en este registro.</Text>
                </View>
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
      <View className="flex-1 bg-gray-50 px-5 py-4">
        <FlatList
          data={registrosAgrupados}
          keyExtractor={(item) => `grupo-${item.bodega}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-16">
              <Text className="text-gray-400 text-base text-center px-6">
                No se encontraron turnos para la fecha seleccionada.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: GrupoBodega }) => (
            <View className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
              <View className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-800">{item.bodega}</Text>
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
                        index !== item.items.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                      style={{ backgroundColor: config.backgroundColor }}
                    >
                      <View className="flex-1 flex-row items-center pr-4 gap-3">
                        <ComponenteIcono color={config.iconColor} size={18} />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-800">
                            {turno.datoSecundario}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end min-w-[75px]">
                        <Text className="text-sm font-medium text-gray-400">{turno.litros}</Text>
                        <Text className="text-xs font-bold text-gray-600 mt-0.5">{turno.hora} hs</Text>
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
    <View className="flex-1 bg-gray-50 px-5 py-4">
      <FlatList
        data={registros}
        keyExtractor={(item) => `${tipo}-${item.id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-16">
            <Text className="text-gray-400 text-base text-center px-6">
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
                  <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                    {item.datoPrincipal}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                    {item.datoSecundario}
                  </Text>
                </View>
              </View>

              <View className="items-end min-w-[85px]">
                <Text className="text-base font-black text-gray-900">
                  {typeof item.litros === "number" ? `${item.litros.toLocaleString()} L` : item.litros}
                </Text>
                <View className="mt-1 px-2 py-0.5 bg-white/70 rounded border border-gray-200">
                  <Text className="text-[11px] font-medium text-gray-600">{item.hora} hs</Text>
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