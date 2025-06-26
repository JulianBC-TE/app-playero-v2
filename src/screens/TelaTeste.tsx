import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export function TelaTeste({
	navigation,
	route,
}: StackRoutesProps<"telaTeste">) {
	const [modalVisible, setModalVisible] = useState(false);
	const [persona, setPersona] = useState<PersonaDTO | null>(null);
	const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);

	useEffect(() => {
		if (route.params?.onPersona) {
			console.log("Received persona:", route.params.onPersona);
			setPersona(route.params.onPersona);
		}
		if (route.params?.onVehiculo) {
			console.log("Received vehiculo:", route.params.onVehiculo);
			setVehiculo(route.params.onVehiculo);
		}
	}, [route.params?.onPersona, route.params?.onVehiculo]);

	return modalVisible ? (
		<View className='flex-1'>
			<ScreenHeader title='Salida Excepcional' />

			<View style={styles.overlay}>
				<View style={styles.modalContent}>
					<Text className='font-bold text-red-500 text-center text-2xl underline mb-4'>
						Importente!!!
					</Text>
					<Text className='font-medium text-justify text-xl mb-4'>
						Está intentando registrar una salida y el turno se encuentra
						cerrado. Una vez finalizada la/s carga/s se deberá realizar el
						cierre correspondiente en el apartado “Cierre Extra”, para las
						bodegas que hayan sufrido movimientos.
					</Text>
					<InputCard
						className='min-h-40'
						title='Indique el motivo'
						required
					>
						<Input
							placeholder='Describa el motivo'
							multiline
							numberOfLines={4}
						/>
					</InputCard>
					<TouchableOpacity
						style={styles.button}
						onPress={() => setModalVisible(false)}
					>
						<Text style={styles.buttonText}>Guardar</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	) : (
		<View className='flex-1'>
			<ScreenHeader title='Salida Combustible' />
			<View className='flex-1 items-center p-4 gap-4'>
				<InputCard
					title='Chefer/Operador'
					required={true}
				>
					<TextSearch
						textValue={persona?.nombre_apellido}
						placeholder='Buscar persona'
						onPress={() =>
							navigation.navigate("buscarpersona", {
								enabledSelect: true,
								fromScreen: "telaTeste",
							})
						}
					/>
				</InputCard>
				<InputCard
					title='Equipo/Vehículo/Operador'
					required={true}
				>
					<TextSearch
						textValue={vehiculo?.descripcion_vehiculo}
						placeholder='Buscar vehículo'
						onPress={() =>
							navigation.navigate("buscarvehiculo", {
								enabledSelect: true,
								fromScreen: "telaTeste",
							})
						}
					/>
				</InputCard>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f0f0f0",
	},
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		//justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		marginTop: 100,
		width: 350,
		padding: 20,
		backgroundColor: "#fff",
		borderRadius: 10,
		elevation: 5, // Android shadow
	},
	title: {
		fontSize: 18,
		marginBottom: 20,
		textAlign: "center",
	},
	button: {
		marginTop: 20,
		backgroundColor: "#007BFF",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		textAlign: "center",
	},
});
