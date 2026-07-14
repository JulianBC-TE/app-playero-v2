import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeftSquare, ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import { DatePickerModal } from "react-native-paper-dates";
import { SafeAreaProvider } from "react-native-safe-area-context";

type HeaderResumenProps = {
  title: string;
  fechaSeleccionada: Date;
  onFechaChange: (nuevaFecha: Date) => void;
};

export function HeaderResumen({ title, fechaSeleccionada, onFechaChange }: HeaderResumenProps) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  function cambiarDia(cantidad: number) {
    const nueva = new Date(fechaSeleccionada);
    nueva.setDate(nueva.getDate() + cantidad);
    onFechaChange(nueva);
  }

  const onDismissSingle = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirmSingle = React.useCallback(
    (params: { date: Date | undefined }) => {
      setOpen(false);
      if (params.date) {
        onFechaChange(params.date);
      }
    },
    [setOpen, onFechaChange]
  );

  function obtenerFechaStringVisual(): string {
    return fechaSeleccionada.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  return (
    <View className="bg-teColorPrincipal pt-14 pb-3">
      <View className="flex-row items-center px-8 gap-4 mb-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeftSquare color="#fff" size={32} />
        </TouchableOpacity>
        <Text className="flex-1 text-2xl font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View className="mx-6 bg-white/10 rounded-xl flex-row justify-between items-center py-2 px-3">
        <TouchableOpacity onPress={() => cambiarDia(-1)} className="p-1 active:opacity-50">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setOpen(true)} 
          className="flex-1 flex-row items-center justify-center gap-2 px-2 py-1 rounded-md active:bg-white/20"
        >
          <Calendar color="#fff" size={16} />
          <Text className="text-white text-sm font-semibold capitalize text-center">
            {obtenerFechaStringVisual()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => cambiarDia(1)} className="p-1 active:opacity-50">
          <ChevronRight color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Este modal corre 100% en JS/TS, no usa código nativo que rompa Expo Go */}
      <DatePickerModal
        locale="es"
        mode="single"
        visible={open}
        onDismiss={onDismissSingle}
        date={fechaSeleccionada}
        onConfirm={onConfirmSingle}
        validRange={{ endDate: new Date() }} // Máximo hoy
      />
    </View>
  );
}