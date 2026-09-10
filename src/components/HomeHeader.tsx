/**
 * @module Playero/Components/HomeHeaders
 * @category UI Components
 */
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components";
import { useAuth } from "@hooks/useAuth";

interface HomeHeaderProps {
  title?: string;
}

export function HomeHeader({ title = "Inicio" }: HomeHeaderProps) {
  const { signOut } = useAuth();

  return (
    <View className="flex-row items-center bg-teColorPrincipal pt-14 px-6 pb-3 gap-3">
      <MaterialIcons color="#fff" name="home" size={28} />
      <Text className="flex-1 text-2xl font-bold text-white" numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity 
        onPress={() => signOut()}
        className="p-1 active:opacity-70"
      >
        <MaterialIcons color="#fff" name="exit-to-app" size={28} />
      </TouchableOpacity>
    </View>
  );
}