import * as Location from "expo-location";
import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { StackRoutesProps } from "@/route/app.routes";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { Controller, set, useForm } from "react-hook-form";
import { Fuel, Pencil, SaveAll } from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAppContext } from "@/hooks/useAppContext";
import { api } from "@/services/api";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Photo } from "@/components/Photo";

type FormData = {
	horometro?: string | null;
	kilometraje?: string | null;
	observaciones?: string;
};
let idAutorizado = 0; // Variable para almacenar el ID autorizado
const registrarSalidaSchema = yup.object({
	horometro: yup
		.string()
		.nullable()
		.notRequired()
		.matches(/^[0-9,]*$/, "Apenas números y coma son permitidos"),

	kilometraje: yup
		.string()
		.nullable()
		.notRequired()
		.matches(/^[0-9]*$/, "Apenas números son permitidos"),
	observaciones: yup
		.string()
		.optional()
		.max(500, "Máximo 500 caracteres permitidos"),
});

export function Salida({ navigation, route }: StackRoutesProps<"salida">) {
	const { sucursal, user } = useAppContext();
	const [isLoading, setIsLoading] = useState(false);
	const [turnoCerrado, setTurnoCerrado] = useState(false);
	const [picos, setPicos] = useState<PicoDTO[]>([]);
	const [persona, setPersona] = useState<PersonaDTO | null>(null);
	const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);
	const [firma, setFirma] = useState<string | null>(null);
	const [salida, setSalida] = useState<number>(0);
	const [cargaCombustible, setCargaCombustible] = useState<string>("000,00");

	const [selectedPico, setSelectedPico] = useState<string>("");
	const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
	const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
		useState<number>(0);
	const [totalizadorPicoFinal, setTotalizadorPicoFinal] = useState<number>(0);

	const [base64Vehiculo, setBase64Vehiculo] = useState<string>("");
	const [base64Horometro, setBase64Horometro] = useState<string>("");
	const [base64Kilometraje, setBase64Kilometraje] = useState<string>("");
	const [base64Obs, setBase64Obs] = useState<string>("");

	const [obsAdicional, setObsAdicional] = useState<string>("");
	const [shouldContinue, setShouldContinue] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const [location, setLocation] = useState<Location.LocationObject | null>(
		null
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(registrarSalidaSchema),
		defaultValues: {
			horometro: "",
			kilometraje: "",
			observaciones: "",
		},
	});

	function handlePhotoVehiculo(base64: string) {
		setBase64Vehiculo(base64);
	}
	function handlePhotoHorometro(base64: string) {
		setBase64Horometro(base64);
	}
	function handlePhotoKilometraje(base64: string) {
		setBase64Kilometraje(base64);
	}
	function handlePhotoObs(base64: string) {
		setBase64Obs(base64);
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

	async function handleSaveAll() {
		let id_bodega = 0;
		let id_pico_surtidor = 0;

		const now = new Date();
		const fecha = now.toISOString().slice(0, 10);
		const hora = now.toTimeString().slice(0, 8);
		picos.map((pico) => {
			if (pico.id_pico === Number(selectedPico)) {
				id_bodega = pico.id_bodega;
				id_pico_surtidor = pico.id_pico_surtidor;
				setIdPicoSurtidor(pico.id_pico_surtidor);
			}
		});

		const data = {
			json: {
				id_suc: sucursal.id_sucursal,
				id_bod: id_bodega,
				id_pico: Number(selectedPico),
				id_vehiculo: vehiculo?.id_vehiculo || "",
				id_playero: Number(user.cedula),
				id_operador: Number(persona?.cedula),
				litros: Number(cargaCombustible),
				kilometraje: Number(control._formValues.kilometraje) || 0,
				horometro: Number(control._formValues.horometro) || 0,
				inicio_taxilitro: totalizadorPicoInicial, // Este valor debe ser calculado o enviado
				fin_taxilitro: totalizadorPicoFinal, // Este valor debe ser calculado o enviado
				ruc_cliente: "",
				fecha: fecha,
				hora: hora,
				precio: 0,
				foto_chapa: base64Vehiculo ? [base64Vehiculo] : [],
				firma_conductor: firma ? [firma] : [],
				foto_kilometraje: base64Kilometraje ? [base64Kilometraje] : [],
				foto_horometro: base64Horometro ? [base64Horometro] : [],
				ubicacion_carga: location
					? `https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`
					: "",
				observaciones_ticket:
					control._formValues.observaciones + " >>" + obsAdicional || "",
				foto_observaciones: base64Obs ? [base64Obs] : [],
			},
		};
		try {
			setIsLoading(true);
			await api.post("/api/tickets", data);
			setIsLoading(false);
			setPersona(null);
			setVehiculo(null);

			setFirma(null);
			setBase64Vehiculo("");
			setBase64Horometro("");
			setBase64Kilometraje("");
			setBase64Obs("");
			reset();
			setSalida(0);
			setCargaCombustible("000,00");
			setTotalizadorPicoInicial(0);
			setTotalizadorPicoFinal(0);
			toastSuccess("Registro de Salida", "Salida registrada exitosamente.");
			navigation.navigate("home");
		} catch (error) {
			console.error("Error al guardar los datos:", error);
			toastError("Registro de Salida", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleSalida({
		kilometraje,
		horometro,
		observaciones,
	}: FormData) {
		if (!persona) {
			Alert.alert("Persona requerida", "Debe seleccionar un operador.");
			return;
		}
		if (!vehiculo) {
			Alert.alert("Vehículo requerido", "Debe seleccionar un vehículo.");
			return;
		}
		if (base64Vehiculo === "") {
			Alert.alert(
				"Foto requerida",
				"Debe capturar una foto de la chapa o el código del vehículo."
			);
			return;
		}
		if (!selectedPico) {
			Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
			return;
		}
		if (kilometraje === "" && horometro === "") {
			Alert.alert(
				"Campos requeridos",
				"Debe completar al menos uno de los campos: Horómetro o Kilometraje."
			);
			return;
		}
		if (horometro !== "" && base64Horometro === "") {
			Alert.alert("Foto requerida", "Debe capturar una foto del horómetro.");
			return;
		}
		if (kilometraje !== "" && base64Kilometraje === "") {
			Alert.alert("Foto requerida", "Debe capturar una foto del kilometraje.");
			return;
		}
		const picoSurtidor = picos.find(
			(pico) => pico.id_pico === Number(selectedPico)
		);

		if (!picoSurtidor) {
			Alert.alert(
				"ID Pico Surtidor",
				"El valor para el pico surtidor no fue encontrado."
			);
			return;
		}

		try {
			setIsLoading(true);

			setIdPicoSurtidor(Number(picoSurtidor.id_pico_surtidor));
			const response = await api.post("/api/autorizar", {
				pico: Number(picoSurtidor.id_pico_surtidor),
			});
			if (response.data.respuesta === "NoCargo") {
				toastError(
					"Pico no Retirado",
					"El pico no se ha retirado del surtidor."
				);
				return;
			} else if (response.data.respuesta !== "Cargando") {
				toastError(
					"Pico no disponible",
					"El pico no está disponible para la carga."
				);
				return;
			}
			idAutorizado = response.data.idUltimaCarga;
			setSalida(1);
			setShouldContinue(true);
		} catch (error) {
			setSalida(0);
			setShouldContinue(false);
			toastError("Registro de Salida", "Intente nuevamente más tarde.");
			setIsLoading(false);
			return;
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (sucursal) {
			fetchPicos();
		}

		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== "granted") {
				setErrorMsg("Permiso de ubicación denegado");
				return;
			}

			const currentLocation = await Location.getCurrentPositionAsync({});
			setLocation(currentLocation);
		})();
	}, []);

	useEffect(() => {
		if (route.params?.onPersona) {
			setPersona(route.params.onPersona);
		}
		if (route.params?.onVehiculo) {
			setVehiculo(route.params.onVehiculo);
		}
		if (route.params?.onFirma) {
			setFirma(route.params.onFirma);
		}
	}, [
		route.params?.onPersona,
		route.params?.onVehiculo,
		route.params?.onFirma,
	]);

	const fetchBox = useCallback(async () => {
		try {
			const response = await api.get(`/api/salida-control/${idPico_surtidor}`);

			if (response.data.estado === "B") {
				if (response.data.id <= idAutorizado) {
					setSalida(0);
					setShouldContinue(false);
					setIsLoading(false);
					idAutorizado = 0;
					return;
				}
				idAutorizado = 0;
				setSalida(2);
				setShouldContinue(false);
				setTotalizadorPicoInicial(response.data.taxiltroInicioDespacho);
				setTotalizadorPicoFinal(response.data.taxiltroFinDespacho);
				setCargaCombustible(response.data.volumenDespachado.toFixed(2));
			}
		} catch (error) {
			console.error("Erro ao buscar dados:", error);
		}
	}, [idPico_surtidor, setSalida, setShouldContinue, setCargaCombustible]);

	const fetchLoop = useCallback(async () => {
		if (!shouldContinue) return;

		await fetchBox();

		if (shouldContinue) {
			intervalRef.current = setTimeout(() => {
				fetchLoop(); // Reentrância controlada
			}, 3000);
		}
	}, [fetchBox, shouldContinue]);

	useEffect(() => {
		if (shouldContinue) {
			fetchLoop();
		}

		return () => {
			if (intervalRef.current) {
				clearTimeout(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [shouldContinue, fetchLoop]);

	return turnoCerrado ? (
		<View className='flex-1'>
			<ScreenHeader title='Salida Excepcional' />
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
				title='Salida Combustible'
				disableBackButton={salida === 1}
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
							title='Chofer/Operador'
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
										fromScreen: "salida",
									})
								}
							/>
						</InputCard>
						<InputCard
							title='Equipo/Vehículo'
							required={true}
							locked={salida !== 0}
						>
							<View className='flex-row items-center p-2 gap-2'>
								<TextSearch
									enabled={salida === 0}
									textValue={vehiculo?.descripcion_vehiculo}
									placeholder='Buscar vehículo'
									onPress={() =>
										navigation.navigate("buscarvehiculo", {
											enabledSelect: true,
											fromScreen: "salida",
										})
									}
								/>
								<Photo
									form='icon'
									iconSize='lg'
									iconColor={salida !== 0 ? "#756868eb" : "#000"}
									setImage={handlePhotoVehiculo}
									disabled={salida !== 0}
								/>
							</View>
						</InputCard>
						<InputCard
							title='Pico expendedor:'
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
									valueField='id_pico'
								/>
							)}
							{salida !== 0 && (
								<Text className='text-lg text-black font-bold'>
									Pico seleccionado: {selectedPico}
								</Text>
							)}
						</InputCard>
						<InputCard
							title='Horómetro'
							locked={salida !== 0}
						>
							<View className='flex-row items-center p-2 gap-2'>
								<Controller
									control={control}
									name='horometro'
									render={({ field: { onChange, value } }) => (
										<Input
											editable={salida === 0}
											keyboardType='number-pad'
											align='center'
											placeholder='Informe el horómetro'
											value={value ?? ""}
											onChangeText={onChange}
											errorMessage={errors.horometro?.message}
										/>
									)}
								/>
								<Photo
									form='icon'
									iconSize='lg'
									iconColor={salida !== 0 ? "#756868eb" : "#000"}
									setImage={handlePhotoHorometro}
									disabled={salida !== 0}
								/>
							</View>
						</InputCard>
						<InputCard
							title='Kilometraje'
							locked={salida !== 0}
						>
							<View className='flex-row items-center p-2 gap-2'>
								<Controller
									control={control}
									name='kilometraje'
									render={({ field: { onChange, value } }) => (
										<Input
											editable={salida === 0}
											keyboardType='number-pad'
											align='center'
											placeholder='Informe el kilometraje'
											value={value ?? ""}
											onChangeText={onChange}
											errorMessage={errors.kilometraje?.message}
										/>
									)}
								/>
								<Photo
									form='icon'
									iconSize='lg'
									iconColor={salida !== 0 ? "#756868eb" : "#000"}
									setImage={handlePhotoKilometraje}
									disabled={salida !== 0}
								/>
							</View>
						</InputCard>
						<InputCard
							title=''
							locked={salida !== 0}
						>
							<View className='flex-row p-2 gap-2'>
								<View className='flex-1 justify-center items-center gap-2'>
									{salida === 0 && (
										<>
											<Text className='text-xl text-black font-bold'>
												Registrar carga
											</Text>
											<Button
												title='Comenzar'
												onPress={handleSubmit(handleSalida)}
												isLoading={isLoading}
												icon={Fuel}
												iconSize='md'
												iconColor='#000'
											/>
										</>
									)}

									{salida === 1 && (
										<>
											<Text className='text-xl text-black font-bold'>
												Cargando...
											</Text>
											<Loading />
										</>
									)}
									{salida === 2 && (
										<>
											<Text className='text-xl text-black font-bold'>
												Finalizado
											</Text>
										</>
									)}
								</View>
								<View className='flex-1 items-center gap-2'>
									<Text className='text-xl text-black font-bold'>
										Litros Cargados
									</Text>
									<Text className='text-2xl text-black font-bold'>
										{cargaCombustible}
									</Text>
								</View>
							</View>
						</InputCard>
						{salida === 2 && (
							<>
								<InputCard title='Observaciones'>
									<View className='flex-row items-center p-2 gap-2'>
										<Controller
											control={control}
											name='observaciones'
											render={({ field: { onChange, value } }) => (
												<Input
													multiline
													numberOfLines={4}
													placeholder='observaciones'
													value={value}
													onChangeText={onChange}
												/>
											)}
										/>
										<View className='flex-col gap-6'>
											<Photo
												form='icon'
												iconSize='lg'
												iconColor='#000'
												setImage={handlePhotoObs}
												disabled={isLoading}
											/>
										</View>
									</View>
								</InputCard>
								<View className='flex-row gap-4'>
									<Button
										title='Firmar'
										onPress={() =>
											navigation.navigate("firma", {
												fromScreen: "salida",
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
											onPress={() => handleSaveAll()}
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
