import React, { useState } from "react";
import { View, TouchableOpacity, Modal, TextInput, Alert } from "react-native";
import { Text } from "@/components";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeftSquare, ChevronLeft, ChevronRight, Calendar, Lock, Unlock, X } from "lucide-react-native";
import { DatePickerModal } from "react-native-paper-dates";
import { verifyAdminPassword } from "@/backend/db/logs/logPassword";

type HeaderResumenProps = {
  title: string;
  fechaSeleccionada: Date;
  onFechaChange: (nuevaFecha: Date) => void;
  isUnlocked: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
};

export function HeaderResumen({ 
  title, 
  fechaSeleccionada, 
  onFechaChange,
  isUnlocked,
  setIsUnlocked
}: HeaderResumenProps) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [modalClaveVisible, setModalClaveVisible] = useState(false);
  const [claveInput, setClaveInput] = useState("");

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

  async function handleValidarClave() {
    const isValid = await verifyAdminPassword(claveInput);
    if (isValid) {
      setIsUnlocked(true);
      setModalClaveVisible(false);
      setClaveInput("");
      Alert.alert("Éxito", "Modo administrador activado.");
    } else {
      Alert.alert("Error", "Clave incorrecta.");
    }
  }

  function handleLockPress() {
    if (isUnlocked) {
      setIsUnlocked(false);
      Alert.alert("Bloqueado", "Modo administrador desactivado.");
    } else {
      setModalClaveVisible(true);
    }
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

        {/* Icono de Candado */}
        <TouchableOpacity onPress={handleLockPress} className="p-1">
          {isUnlocked ? (
            <Unlock color="#22c55e" size={26} />
          ) : (
            <Lock color="#fff" size={26} />
          )}
        </TouchableOpacity>
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

      <DatePickerModal
        locale="es"
        mode="single"
        visible={open}
        onDismiss={onDismissSingle}
        date={fechaSeleccionada}
        onConfirm={onConfirmSingle}
        validRange={{ endDate: new Date() }}
      />

      {/* Modal para ingresar clave de desbloqueo */}
      <Modal visible={modalClaveVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white w-full rounded-2xl p-5 shadow-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-800">Ingresar Clave Admin</Text>
              <TouchableOpacity onPress={() => setModalClaveVisible(false)}>
                <X color="#6b7280" size={22} />
              </TouchableOpacity>
            </View>

            <TextInput
              secureTextEntry
              keyboardType="numeric"
              placeholder="Clave requerida"
              value={claveInput}
              onChangeText={setClaveInput}
              allowFontScaling={false}
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-800 mb-4"
            />

            <TouchableOpacity 
              onPress={handleValidarClave}
              className="bg-blue-600 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold text-base">Desbloquear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}