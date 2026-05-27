import "./global.css";
import { StatusBar } from "react-native";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { CustomToast } from "@/utils/toastConfig";
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";

import { Loading } from "@/components/Loading";
import { Routes } from "@/route/index";
import { AuthContextProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/backend/db/client"; // ← agregar

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });
  const ready = fontsLoaded || fontError;

  return (
    <DatabaseProvider>
      {" "}
      {/* ← envolver todo */}
      <View className="flex-1 bg-teColorSecundarioMedio">
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <AuthContextProvider>
          // Temporal para testear
          {ready ? <Routes /> : <Loading />}
        </AuthContextProvider>
        <Toast
          config={{
            CustomToast: (props) => (
              <CustomToast {...props} text1={props.text1 ?? ""} />
            ),
          }}
        />
      </View>
    </DatabaseProvider>
  );
}
