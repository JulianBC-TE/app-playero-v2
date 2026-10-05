/**
 * @module Playero/Components/HomeHeaders
 * @category UI Components
 */
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { Text } from "@/components";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { StackRoutesList } from "@/route/app.routes";

interface HomeHeaderProps {
  title?: string;
  subtitle?: string;
}

export function HomeHeader({ title = "Inicio", subtitle }: HomeHeaderProps) {
  const navigation = useNavigation<NavigationProp<StackRoutesList>>();

  return (
    <View className="flex-row items-center bg-primary dark:bg-surfaceElevatedDark border-b border-primary dark:border-borderDark pt-14 px-6 pb-3 gap-3">
      <MaterialIcons color="#fff" name="home" size={28} />
      <View className="flex-1">
        <Text className="text-2xl font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm font-semibold text-white/85" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("config")}
        accessibilityLabel="Configuración"
        className="p-1 active:opacity-70"
      >
        <MaterialIcons color="#fff" name="settings" size={28} />
      </TouchableOpacity>
    </View>
  );
}
