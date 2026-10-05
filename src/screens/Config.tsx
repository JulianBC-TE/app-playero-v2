/**
 * @module Playero/Screens/Config
 * @category Screens
 */
import { StackRoutesProps } from "@/route/app.routes";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";
import { useTheme } from "@/contexts/ThemeContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Sun, Moon, Laptop } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { getVersionInstalada } from "@/backend/api/versionAPI";

export function Config({ navigation }: StackRoutesProps<"config">) {
	const { themeMode, changeTheme, activeTheme } = useTheme();
	const { user, sucursal, isOffline, signOut } = useAuth();
	const versionInstalada = getVersionInstalada();
	const nombreUsuario = user?.name || "Sin usuario";
	const cedulaUsuario = user?.cedula ? String(user.cedula) : "-";
	const descripcionSucursal = sucursal?.descripcion_sucursal || "Sin sucursal";

	const options = [
		{ id: 'light', label: 'Claro', icon: Sun },
		{ id: 'dark', label: 'Oscuro', icon: Moon },
		{ id: 'system', label: 'Sistema', icon: Laptop },
	] as const;

	return (
		<View className='flex-1 bg-background dark:bg-backgroundDark'>
			<ScreenHeader title="Configuración" />

			<View className='p-6 gap-6'>
				{/* Sección de Tema/Apariencia */}
				<View className="bg-surfaceElevated dark:bg-surfaceElevatedDark p-4 rounded-xl shadow-sm border border-border dark:border-borderDark">
					<Text className="text-textMuted dark:text-textMutedDark font-medium mb-4">Apariencia de la aplicación</Text>
					
					<View className="flex-row justify-between gap-2">
						{options.map((opt) => {
							const Icon = opt.icon;
							const isSelected = themeMode === opt.id;
							return (
								<TouchableOpacity
									key={opt.id}
									onPress={() => changeTheme(opt.id)}
									className={`flex-1 flex-col items-center p-3 rounded-lg border ${
										isSelected 
										? 'bg-primarySoft border-primary dark:bg-primarySoftDark dark:border-primaryDark' 
										: 'bg-surface border-border dark:bg-surfaceDark dark:border-borderDark'
									}`}
								>
									<Icon 
										size={22} 
										color={isSelected ? activeTheme === 'dark' ? '#86A2E8' : '#5B79C7' : activeTheme === 'dark' ? '#B6C2D5' : '#64748B'} 
									/>
									<Text className={`text-xs font-semibold mt-2 ${
										isSelected ? 'text-primary dark:text-primaryDark' : 'text-textMuted dark:text-textMutedDark'
									}`}>
										{opt.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				<View className="bg-surfaceElevated dark:bg-surfaceElevatedDark p-4 rounded-xl shadow-sm border border-border dark:border-borderDark">
					<Text className="text-textMuted dark:text-textMutedDark font-medium mb-3">Sesión iniciada</Text>

					<View className="gap-1 mb-4">
						<Text className="text-lg font-bold text-text dark:text-textDark">{nombreUsuario}</Text>
						<Text className="text-sm text-textMuted dark:text-textMutedDark">Cédula: {cedulaUsuario}</Text>
						<Text className="text-sm text-textMuted dark:text-textMutedDark">Sucursal: {descripcionSucursal}</Text>
						<Text className="text-sm text-textMuted dark:text-textMutedDark">
							Modo: {isOffline ? "Offline" : "Online"}
						</Text>
					</View>

					<TouchableOpacity
						onPress={() => signOut()}
						className="h-10 rounded-xl bg-danger dark:bg-dangerDark items-center justify-center"
					>
						<Text className="font-bold text-white dark:text-textInverseDark">Cerrar sesión</Text>
					</TouchableOpacity>
				</View>

				<View className="bg-surfaceElevated dark:bg-surfaceElevatedDark p-4 rounded-xl shadow-sm border border-border dark:border-borderDark">
					<Text className="text-textMuted dark:text-textMutedDark font-medium mb-1">Versión de la app</Text>
					<Text className="text-lg font-bold text-text dark:text-textDark">{versionInstalada}</Text>
				</View>

			</View>
		</View>
	);
}
