import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components";
import { SalidaStorageDTO } from "@/storage/storageSalida";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { PicoDTO } from "@/dto/PicosDTO";

type Props = {
  id: string;
  label: string;
  fechaCreacion?: number;
  onEditar: () => void;
  onEliminar: () => void;
};

export function getSalidaLabel(
  data: SalidaStorageDTO,
  bodegas: BodegaDTO[],
  picos: PicoDTO[]
): string {
  const pico = picos.find((p) => p.id_pico === Number(data.selectedPico));
  const bodega = bodegas.find((b) => b.id_bodega === data.selectedBodega);
  const picoName = pico?.descripcion_pico || `Pico #${data.selectedPico || "?"}`;
  const bodegaName =
    bodega?.descripcion_bodega || `Bodega #${data.selectedBodega || "?"}`;
  return `${picoName} - ${bodegaName}`;
}

export function EntryListItem({
  label,
  onEditar,
  onEliminar,
}: Props) {
  return (
    <TouchableOpacity
      className="mx-4 mb-3 bg-surfaceElevated dark:bg-surfaceElevatedDark rounded-xl border border-border dark:border-borderDark shadow-sm"
      onPress={onEditar}
      onLongPress={onEliminar}
      activeOpacity={0.7}
    >
      <View className="p-4">
        <Text className="text-lg font-bold text-text dark:text-textDark">{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
