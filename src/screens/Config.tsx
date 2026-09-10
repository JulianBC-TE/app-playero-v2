/**
 * @module Playero/Screens/Config
 * @category Screens
 */
import { StackRoutesProps } from "@/route/app.routes";
import { Button, View, TouchableOpacity } from "react-native";
import { Text } from "@/components";
import { seedLocalDB } from "@/backend/db/seeds/seedLocalDB";
import { useTheme } from "@/contexts/ThemeContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Sun, Moon, Laptop } from "lucide-react-native";

export function Config({ navigation }: StackRoutesProps<"config">) {
	const { themeMode, changeTheme, activeTheme } = useTheme();

	const options = [
		{ id: 'light', label: 'Claro', icon: Sun },
		{ id: 'dark', label: 'Oscuro', icon: Moon },
		{ id: 'system', label: 'Sistema', icon: Laptop },
	] as const;

	return (
		<View className='flex-1 bg-gray-50 dark:bg-zinc-950'>
			<ScreenHeader title="Configuración" />

			<View className='p-6 gap-6'>
				
				{/* Sección de Base de Datos */}
				<View className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
					<Text className="text-gray-500 dark:text-gray-400 font-medium mb-3">Mantenimiento</Text>
					<Button title="Seed BD" onPress={seedLocalDB} color="#0284c7" />
				</View>

				{/* Sección de Tema/Apariencia */}
				<View className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
					<Text className="text-gray-500 dark:text-gray-400 font-medium mb-4">Apariencia de la aplicación</Text>
					
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
											? 'bg-sky-50 border-sky-500 dark:bg-sky-950/30 dark:border-sky-500' 
											: 'bg-gray-50 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700'
									}`}
								>
									<Icon 
										size={22} 
										color={isSelected ? '#0284c7' : activeTheme === 'dark' ? '#a1a1aa' : '#4b5563'} 
									/>
									<Text className={`text-xs font-semibold mt-2 ${
										isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-gray-600 dark:text-gray-400'
									}`}>
										{opt.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

			</View>
		</View>
	);
}