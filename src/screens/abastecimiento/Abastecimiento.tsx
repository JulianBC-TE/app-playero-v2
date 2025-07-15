import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Pressable,
	Image,
} from "react-native";
import { useEffect, useState } from "react";

import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Select } from "@/components/Select";
import { useAppContext } from "@/hooks/useAppContext";
import { StackRoutesProps } from "@/route/app.routes";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { api } from "@/services/api";
import { Input } from "@/components/Input";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { Photo } from "@/components/Photo";

export function Abastecimiento({
	navigation,
	route,
}: StackRoutesProps<"abastecimiento">) {
	const [tipoOperacion, setTipoOperacion] = useState([
		{ label: "Llega en la ZETA", value: "1" },
		{ label: "NO Llega en la ZETA", value: "2" },
	]);
	const [tipoOperacionSeleccionado, setTipoOperacionSeleccionado] =
		useState("");
	const [turnoCerrado, setTurnoCerrado] = useState(false);
	const { sucursal, user } = useAppContext();
	const [isLoading, setIsLoading] = useState(false);
	const [obsAdicional, setObsAdicional] = useState("");
	const [ordenCompra, setOrdenCompra] = useState("");
	const [remision, setRemision] = useState("");
	const [litros, setLitros] = useState("");
	const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
	const [selectedBodega, setSelectedBodega] = useState<string>("");
	const [base64Images, setBase64Images] = useState<string[]>([]);

	async function handlePhotoCapture(image: string) {
		setBase64Images((prev) => [...prev, image]);
		toastSuccess("Foto capturada", "La foto ha sido capturada con éxito.");
	}

	/**
	 * Muestra un alerta de confirmación para eliminar una foto.
	 * Si el usuario confirma, elimina la foto del estado de imágenes.
	 *
	 * @param {number} indexParaRemover - El índice de la foto a eliminar.
	 */
	const removerFoto = (indexParaRemover: number) => {
		Alert.alert("Borrar Foto", "Está seguro de que desea eliminar esta foto?", [
			{
				text: "Cancelar",
				style: "cancel",
			},
			{
				text: "Remover",
				onPress: () => {
					setBase64Images((prev) =>
						prev.filter((_, index) => index !== indexParaRemover)
					);
				},
			},
		]);
	};

	async function fetchBodegas() {
		try {
			setIsLoading(true);
			const response = await api.get(`/api/bodegas/${sucursal.id_sucursal}`);
			setBodegas(response.data.bodegas);
			setIsLoading(false);
		} catch (error) {
			toastError("Bodegas", "Error al cargar las bodegas");
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		fetchBodegas();
	}, []);

	return turnoCerrado ? (
		<View className='flex-1'>
			<ScreenHeader title='Turno Cerrado' />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps='handled'
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.overlay}>
						<View style={styles.modalContent}>
							<Text className='font-bold text-red-500 text-center text-2xl underline mb-4'>
								Importente!!!
							</Text>
							<Text className='font-medium text-justify text-xl mb-4'>
								Está intentando registrar un abastecimiento y el turno se
								encuentra cerrado. Una vez finalizado se debe realizar el cierre
								correspondiente las bodegas correspondientes.
							</Text>
							<InputCard
								className='min-h-40'
								title='Indique el motivo'
								required
							>
								<Input
									value={obsAdicional}
									placeholder='Describa el motivo'
									multiline
									numberOfLines={4}
									onChangeText={setObsAdicional}
								/>
							</InputCard>
							<TouchableOpacity
								style={styles.button}
								onPress={() => {
									if (obsAdicional.trim() === "") {
										Alert.alert(
											"Motivo requerido",
											"Por favor describa el motivo."
										);
										return;
									}
									setTurnoCerrado(false);
								}}
							>
								<Text style={styles.buttonText}>Guardar</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	) : (
		<View className='flex-1'>
			<ScreenHeader title='Abastecimiento' />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps='handled'
					showsVerticalScrollIndicator={false}
				>
					<View className='flex-1 items-center p-4 gap-4'>
						<InputCard
							title='Orden de Compra'
							required={true}
						>
							<Input
								keyboardType='number-pad'
								align='center'
								placeholder='informe el número de orden de compra'
								value={ordenCompra}
								onChangeText={setOrdenCompra}
							/>
						</InputCard>
						<InputCard
							title='Número de Remisión'
							required={true}
						>
							<Input
								keyboardType='number-pad'
								align='center'
								placeholder='Informe el número de remisión'
								value={remision}
								onChangeText={setRemision}
							/>
						</InputCard>
						<InputCard
							title='Litros según remisión'
							required={true}
						>
							<Input
								keyboardType='number-pad'
								align='center'
								placeholder='Informe los litros según remisión'
								value={litros}
								onChangeText={setLitros}
							/>
						</InputCard>
						<InputCard
							title='Fotos de precintos y documentación'
							className='min-h-64'
						>
							<View className='w-full items-center p-4 gap-2'>
								<ScrollView horizontal={true}>
									{base64Images.map((img, index) => (
										<Pressable
											key={index}
											onPress={() => removerFoto(index)}
										>
											<Image
												source={{ uri: `data:image/jpeg;base64,${img}` }}
												className='mr-4 w-56 h-36 rounded-lg border border-gray-300'
												resizeMode='cover'
											/>
										</Pressable>
									))}
								</ScrollView>
								<Photo
									isLoading={isLoading}
									iconSize='xs'
									iconColor='#fff'
									setImage={handlePhotoCapture}
								/>
							</View>
						</InputCard>
						<InputCard
							title='Selecione la bodega'
							required={true}
						>
							<Select
								data={bodegas}
								isLoading={isLoading}
								selectedValue={selectedBodega}
								setSelectedValue={setSelectedBodega}
								labelField='descripcion_bodega'
								valueField='id_bodega'
							/>
						</InputCard>
						<InputCard
							title='Tipo de operación'
							required={true}
						>
							<Select
								data={tipoOperacion}
								isLoading={isLoading}
								selectedValue={tipoOperacionSeleccionado}
								setSelectedValue={setTipoOperacionSeleccionado}
								labelField={"label"}
								valueField='value'
							/>
						</InputCard>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
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
