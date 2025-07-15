import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";

import { InputCard } from "@/components/InputCard";
import { Photo } from "@/components/Photo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Select } from "@/components/Select";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { api } from "@/services/api";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Input } from "@/components/Input";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { Fuel, Pencil, SaveAll } from "lucide-react-native";
import { Button } from "@/components/Button";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";

export function Calibracion({
	navigation,
	route,
}: StackRoutesProps<"calibracion">) {
	const [tipoOperacion, setTipoOperacion] = useState([
		{ label: "Verificación", value: "1" },
		{ label: "Calibración", value: "2" },
	]);
	const [tipoOperacionSeleccionado, setTipoOperacionSeleccionado] =
		useState("");
	const [turnoCerrado, setTurnoCerrado] = useState(false);
	const { sucursal, user } = useAppContext();
	const [picos, setPicos] = useState<PicoDTO[]>([]);
	const [selectedPico, setSelectedPico] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [obs, setObs] = useState("");
	const [photoObs, setPhotoObs] = useState<string | null>(null);
	const [obsAdicional, setObsAdicional] = useState("");
	const [persona, setPersona] = useState<PersonaDTO | null>(null);
	const [firma, setFirma] = useState<string | null>(null);
	const [photoPrecintoAtual, setPhotoPrecintoAtual] = useState<string>("");
	const [photoPrecintoColocado, setPhotoPrecintoColocado] =
		useState<string>("");
	const [numeroPrecintoColocado, setNumeroPrecintoColocado] = useState("");
	const [numeroPrecintoAtual, setNumeroPrecintoAtual] = useState("");
	const [salida, setSalida] = useState(0);

	const [mediciones, setMediciones] = useState<SequenciaCalibracionDTO>({
		taxilitroInicial: 0,
		taxilitroFinal: 0,
		totalMediciones: 0,
		sequencias: [],
	});

	function handlePhotoObs(image: string) {
		setPhotoObs(image);
	}

	function handlePhotoPrecintoColocado(image: string) {
		setPhotoPrecintoColocado(image);
	}
	function handlePhotoPrecintoAtual(image: string) {
		setPhotoPrecintoAtual(image);
	}

	async function handlePhotoPrecinto(tipo: "colocado" | "retirado" | "obs") {
		try {
			setIsLoading(true);
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== "granted") {
				Alert.alert("Permiso", "Necesitamos permiso para acceder a la cámara.");
				return;
			}
			const photoSelected = await ImagePicker.launchCameraAsync({
				mediaTypes: "images",
				allowsEditing: false,
				aspect: [4, 4],
				quality: 0.3,
				base64: true,
			});
			if (!photoSelected.canceled) {
				const { base64 } = photoSelected.assets[0];
				if (typeof base64 === "string") {
					switch (tipo) {
						case "obs":
							setPhotoObs(base64);
							break;
						case "colocado":
							setPhotoPrecintoColocado(base64);
							break;
						case "retirado":
							setPhotoPrecintoAtual(base64);
							break;
					}
					toastSuccess(
						"Registro Fotográfico",
						"Foto capturada con exitosamente."
					);
				}
			}
		} catch (error) {
			toastError("Error ao capturar foto", "Intente nuevamente más tarde.");
			console.error("Erro ao capturar foto:", error);
		} finally {
			setIsLoading(false);
		}
	}

	async function handleVerificacion() {
		if (tipoOperacionSeleccionado === "") {
			Alert.alert(
				"Tipo de operación requerido",
				"Debe seleccionar un tipo de operación."
			);
			return;
		}
		if (tipoOperacionSeleccionado === "2") {
			if (numeroPrecintoAtual === "") {
				Alert.alert(
					"Precinto",
					"Debe ingresar el número de precinto a retirar."
				);
				return;
			}
			if (photoPrecintoAtual === "") {
				Alert.alert(
					"Precinto",
					"Debe capturar una foto del precinto colocado."
				);
				return;
			}

			if (numeroPrecintoColocado === "") {
				Alert.alert(
					"Precinto",
					"Debe ingresar el número de precinto a colocar."
				);
				return;
			}

			if (photoPrecintoColocado === "") {
				Alert.alert(
					"Precinto",
					"Debe capturar una foto del precinto colocado."
				);
				return;
			}
		}

		if (!selectedPico) {
			Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
			return;
		}

		const picoSurtidor = picos.find(
			(pico) => pico.id_pico_surtidor === Number(selectedPico)
		);
		console.log("Pico Surtidor:", picoSurtidor);

		if (!picoSurtidor) {
			Alert.alert(
				"ID Pico Surtidor",
				"El valor para el pico surtidor no fue encontrado."
			);
			return;
		}
		navigation.navigate("sequencias", {
			pico_surtidor: Number(selectedPico),
		});
	}

	async function fetchPicos() {
		setIsLoading(true);
		try {
			const turno = await api.get(
				`api/registros/turno/status/${sucursal.id_sucursal}`
			);

			const turnoData: StatusTurnoDTO = {
				status: turno.data.status,
				// status: "falta_cerrar", // For testing purposes, set to "normal"
				Inicio_turno: turno.data.Inicio_turno,
				Fin_turno: turno.data.Fin_turno,
				Fin_turno_anterior: turno.data.Fin_turno_anterior,
			};
			if (turnoData.status === "cerrado") setTurnoCerrado(true);

			const data = await api.get(`/api/picos/${sucursal.id_sucursal}`);
			const picos: PicoDTO[] = data.data.picos;
			setPicos(picos);
		} catch (error) {
			console.error("Error al buscar picos:", error);
			toastError("Error al buscar picos", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (route.params?.onSequencia) {
			setMediciones(route.params.onSequencia);
		}
		if (route.params?.onPersona) {
			setPersona(route.params.onPersona);
		}

		if (route.params?.onFirma) {
			setFirma(route.params.onFirma);
		}
	}, [
		route.params?.onPersona,
		route.params?.onFirma,
		route.params?.onSequencia,
	]);

	useEffect(() => {
		fetchPicos();
	}, []);

	async function saveAllData() {
		setIsLoading(true);
		try {
			const now = new Date();
			const fecha = now.toISOString().slice(0, 10);
			const hora = now.toTimeString().slice(0, 8);
			let id_bodega = 0;
			let id_pico = 0;
			picos.map((pico) => {
				if (pico.id_pico_surtidor === Number(selectedPico)) {
					id_bodega = pico.id_bodega;
					id_pico = pico.id_pico;
				}
			});
			console.log("Pico:", id_pico);

			const data = {
				json: {
					fecha_hora: fecha,
					hora: hora,
					bodega: id_bodega,
					obs_gral: obs + " | " + obsAdicional,
					ci_encargado: persona?.cedula,
					nombre_encargado: persona?.nombre_apellido,
					pico: id_pico,
					taxilitro_inicial: mediciones.taxilitroInicial,
					taxilitro_final: mediciones.taxilitroFinal,
					nro_precinto_retirado:
						tipoOperacionSeleccionado === "2" ? numeroPrecintoAtual : "",
					nro_precinto_colocado:
						tipoOperacionSeleccionado === "2" ? numeroPrecintoColocado : "",
					foto_precinto_retirado:
						tipoOperacionSeleccionado === "2" ? photoPrecintoAtual : "",
					foto_precinto_colocado:
						tipoOperacionSeleccionado === "2" ? photoPrecintoColocado : "",
					firma_calibrador: firma,
					tipo_operacion:
						tipoOperacionSeleccionado === "1" ? "VERIFICACION" : "CALIBRACION",
					detalles: mediciones.sequencias.map((medicion) => ({
						val_medicion: medicion.valor_medicion,
						foto_med_balde: medicion.foto_medicion,
						taxilitro_carga: medicion.taxilitro.toString(),
					})),
				},
			};
			await api.post("/api/calibraciones", data);
			toastSuccess(
				"Calibración guardada",
				"Los datos se han guardado correctamente."
			);
		} catch (error) {
			console.error("Error al guardar todos los datos:", error);
			toastError("Error al guardar", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
	}

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
								Está intentando registrar una calibración y el turno se
								encuentra cerrado. Una vez finalizad se debe realizar el cierre
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
			<ScreenHeader
				title='Calibración'
				disableBackButton={mediciones.totalMediciones > 0}
			/>
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
							title='Tipo de operación'
							required={true}
							locked={salida !== 0}
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
						<InputCard
							title='Selecione el pico:'
							required={true}
							locked={salida !== 0}
						>
							{salida === 0 && (
								<Select
									data={picos}
									isLoading={isLoading}
									selectedValue={selectedPico}
									setSelectedValue={setSelectedPico}
									labelField='descripcion_pico'
									valueField='id_pico_surtidor'
								/>
							)}
							{salida !== 0 && (
								<Text className='text-lg text-black font-bold'>
									Pico seleccionado: {selectedPico}
								</Text>
							)}
						</InputCard>

						{tipoOperacionSeleccionado === "2" && (
							<InputCard
								title='Número de Precinto a retirar'
								locked={salida !== 0}
							>
								<View className='flex-row items-center p-2 gap-2'>
									<Input
										editable={salida === 0}
										keyboardType='number-pad'
										align='center'
										placeholder='Número de precinto'
										value={numeroPrecintoAtual}
										onChangeText={setNumeroPrecintoAtual}
									/>
									<Photo
										form='icon'
										disabled={isLoading}
										iconSize='lg'
										iconColor={isLoading ? "#756868eb" : "#000"}
										setImage={handlePhotoPrecintoAtual}
									/>
								</View>
							</InputCard>
						)}
						{tipoOperacionSeleccionado === "2" && (
							<InputCard
								title='Número de Precinto colocado'
								locked={salida !== 0}
							>
								<View className='flex-row items-center p-2 gap-2'>
									<Input
										editable={!isLoading}
										keyboardType='number-pad'
										align='center'
										placeholder='Número de precinto'
										value={numeroPrecintoColocado}
										onChangeText={setNumeroPrecintoColocado}
									/>
									<Photo
										form='icon'
										disabled={salida !== 0}
										iconSize='lg'
										iconColor={salida !== 0 ? "#756868eb" : "#000"}
										setImage={handlePhotoPrecintoColocado}
									/>
								</View>
							</InputCard>
						)}

						<InputCard
							title='Verificación del pico'
							required={true}
							locked={salida !== 0}
						>
							{mediciones.totalMediciones === 0 && (
								<Button
									title='Verificar'
									onPress={() => {
										handleVerificacion();
									}}
									isLoading={isLoading}
									icon={Fuel}
									iconSize='md'
									iconColor='#000'
								/>
							)}
							{mediciones.totalMediciones > 0 && (
								<>
									<Text className='text-lg text-black font-bold'>
										Mediciones Realizadas: {mediciones.totalMediciones}
									</Text>
								</>
							)}
						</InputCard>

						{mediciones.totalMediciones > 0 && (
							<InputCard
								title='Observaciones'
								locked={salida !== 0}
							>
								<View className='flex-row items-center p-2 gap-2'>
									<Input
										multiline
										numberOfLines={4}
										placeholder='observaciones'
										value={obs}
										onChangeText={setObs}
									/>
									<View className='flex-col gap-6'>
										<Photo
											disabled={salida !== 0}
											iconSize='lg'
											iconColor={salida !== 0 ? "#756868eb" : "#000"}
											setImage={handlePhotoObs}
										/>
									</View>
								</View>
							</InputCard>
						)}
						{mediciones.totalMediciones > 0 && (
							<InputCard
								title='Encargado de la calibración'
								required={true}
								locked={salida !== 0}
							>
								<TextSearch
									enabled={salida === 0}
									textValue={persona?.nombre_apellido}
									placeholder='Buscar persona'
									onPress={() =>
										navigation.navigate("buscarpersona", {
											enabledSelect: true,
											fromScreen: "calibracion",
										})
									}
								/>
							</InputCard>
						)}

						{mediciones.totalMediciones > 0 && (
							<>
								<View className='flex-row gap-4'>
									<Button
										disabled={mediciones.totalMediciones === 0}
										title='Firmar'
										onPress={() =>
											navigation.navigate("firma", {
												fromScreen: "calibracion",
												persona: persona,
											})
										}
										isLoading={isLoading}
										icon={Pencil}
										iconSize='md'
										iconColor='#000'
									/>
									{firma && (
										<Button
											title='Grabar'
											onPress={() => saveAllData()}
											isLoading={isLoading}
											icon={SaveAll}
											iconSize='md'
											iconColor='#000'
										/>
									)}
								</View>
							</>
						)}
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
