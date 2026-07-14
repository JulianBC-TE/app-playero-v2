import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList } from "react-native";
import { getRegistrosPorTipo, RegistroResumen, TipoRegistro } from "@DBmodules/resumenBD";
import { toastError } from "@/utils/toastMessage";
import { Loading } from "@/components/Loading";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react-native";

type ListaProps = {
  tipo: TipoRegistro;
  fechaFiltro: string; 
};

// Interfaz para el agrupamiento exclusivo de la pestaña turnos
interface GrupoBodega {
  bodega: string;
  items: RegistroResumen[];
}

export function ListaResumenSincronizacion({ tipo, fechaFiltro }: ListaProps) {
  const [registros, setRegistros] = useState<RegistroResumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    cargarRegistros();
  }, [tipo, fechaFiltro]);

  // Agrupamos los registros por Bodega si estamos en la pestaña "turno"
  const registrosAgrupados = useMemo(() => {
    if (tipo !== "turno") return [];

    const mapa = new Map<string, RegistroResumen[]>();
    registros.forEach((reg) => {
      // Tomamos el nombre de la bodega (que getRegistrosPorTipo asigna a datoPrincipal)
      const bodega = reg.datoPrincipal; 
      if (!mapa.has(bodega)) {
        mapa.set(bodega, []);
      }
      mapa.get(bodega)!.push(reg);
    });

    return Array.from(mapa.entries()).map(([bodega, items]) => ({
      bodega,
      items, // Conserva el orden de mayor a menor hora devuelto por el backend
    }));
  }, [registros, tipo]);

  function obtenerConfiguracionEstado(status: number) {
    switch (status) {
      case 1:
        return {
          backgroundColor: "#5ce98620", // Ajustado opacidad ligera para subfilas compactas
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Loading />
      </View>
    );
  }

  // --- RENDER EXCLUSIVO PARA TURNOS (AGRUPADO POR BODEGA) ---
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
              {/* Encabezado de la Bodega (Banda Superior) */}
              <View className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-800">
                  {item.bodega}
                </Text>
              </View>

              {/* Subfilas de Turnos "Pegadas" */}
              <View>
                {item.items.map((turno, index) => {
                  const config = obtenerConfiguracionEstado(turno.syncStatus);
                  const ComponenteIcono = config.Icono;

                  return (
                    <View 
                      key={turno.id}
                      className={`flex-row justify-between items-center p-4 ${
                        index !== item.items.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                      style={{ backgroundColor: config.backgroundColor }}
                    >
                      {/* Símbolo de Sync + Tipo/Estado */}
                      <View className="flex-1 flex-row items-center pr-4 gap-3">
                        <ComponenteIcono color={config.iconColor} size={18} />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-800">
                            {turno.datoSecundario}
                          </Text>
                        </View>
                      </View>

                      {/* Métrica (---) + Hora */}
                      <View className="items-end min-w-[75px]">
                        <Text className="text-sm font-medium text-gray-400">
                          {turno.litros}
                        </Text>
                        <Text className="text-xs font-bold text-gray-600 mt-0.5">
                          {turno.hora} hs
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  // --- RENDER NORMAL PARA LAS DEMÁS PESTAÑAS (Salidas, Abastecimientos, etc.) ---
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
            <View 
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
                  <Text className="text-[11px] font-medium text-gray-600">
                    {item.hora} hs
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}