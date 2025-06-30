import * as ImagePicker from "expo-image-picker";
import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
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
import {
	Camera,
	CheckCheck,
	FileTerminal,
	Fuel,
	Pencil,
	RulerDimensionLine,
	SaveAll,
} from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { useAppContext } from "@/hooks/useAppContext";
import { api } from "@/services/api";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import {
	getStorageTraspaso,
	removeTraspaso,
	saveTraspaso,
} from "@/storage/storageTraspaso";
import { set } from "react-hook-form";
import {
	getStoragePersona,
	removePersona,
	savePersona,
} from "@/storage/storagePersona";
import { get } from "node_modules/axios/index.cjs";
import { rem } from "nativewind";

export function Traspaso({ navigation, route }: StackRoutesProps<"traspaso">) {
	const [selectedBodegaOrigem, setSelectedBodegaOrigem] = useState<string>("");
	const [selectedBodegaDestino, setSelectedBodegaDestino] =
		useState<string>("");
	const [bodegaOrigem, setBodegaOrigem] = useState<BodegaDTO[]>([]);
	const [bodegaDestino, setBodegaDestino] = useState<BodegaDTO[]>([]);
	const { sucursal, user } = useAppContext();
	const [isLoading, setIsLoading] = useState(false);
	const [turnoCerrado, setTurnoCerrado] = useState(false);
	const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
	const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
	const [picos, setPicos] = useState<PicoDTO[]>([]);
	const [persona, setPersona] = useState<PersonaDTO | null>(null);
	const [firma, setFirma] = useState<string | null>(null);
	const [salida, setSalida] = useState<number>(0);
	const [cargaCombustible, setCargaCombustible] = useState<string>("000,00");

	const [selectedPico, setSelectedPico] = useState<string>("");
	const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
	const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
		useState<number>(0);
	const [totalizadorPicoFinal, setTotalizadorPicoFinal] = useState<number>(0);

	const [base64Obs, setBase64Obs] = useState<string>("");
	const [obs, setObs] = useState<string>("");
	const [obsAdicional, setObsAdicional] = useState<string>("");
	const [shouldContinue, setShouldContinue] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const [estadoRestaurado, setEstadoRestaurado] = useState(false);

	// fotoType precisa ser um enum com 4 possíveis casos
	async function handlePhotoCapture(
		fotoType: "vehiculo" | "horometro" | "kilometraje" | "obs"
	) {
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
					setBase64Obs(base64);
					toastSuccess("Registro Fotográfico", "Foto capturada exitosamente.");
				}
			}
		} catch (error) {
			toastError("Error ao capturar foto", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
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

			const data = await api.get("/api/picos/", {
				params: { id_bodega: selectedBodegaOrigem },
			});
			const picos: PicoDTO[] = data.data.picos;
			setPicos(picos);
			setSelectedPico(picos[0]?.id_pico.toString() || "");
			setEstadoRestaurado(true);
		} catch (error) {
			toastError("Error al buscar picos", "Intente nuevamente.");
		} finally {
			setIsLoading(false);
		}
	}

	async function fetchBodegas() {
		try {
			setIsLoading(true);
			// Obtem las bodegas de origen. Si hay solo una bodega, no se muestra el select
			const origen = await api.get(`api/bodegas/${sucursal.id_sucursal}`);
			setBodegaOrigem(origen.data.bodegas);
			if (origen.data.bodegas.length === 1) {
				setSelectedBodegaOrigem(origen.data.bodegas[0].id_bodega);
			}

			// Obtem las bodegas para traspaso
			const destino = await api.get(
				`api/bodegas/traspaso/${sucursal.id_sucursal}`
			);
			setBodegaDestino(destino.data.bodegas);
		} catch (error) {
			toastError("Error al buscar bodega", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
	}

	function saveState() {
		// let id_bodega = 0;
		// let id_pico_surtidor = 0;

		const now = new Date();
		const fecha = now.toISOString().slice(0, 10);
		const hora = now.toTimeString().slice(0, 8);

		const data: TraspasoDTO = {
			json: {
				bod_origen: Number(selectedBodegaOrigem),
				bod_destino: Number(selectedBodegaDestino),
				id_tanque_destino: Number(medicionInicial[0].id_tanque),
				regla_altura_inicial: medicionInicial[0].regla.toString(),
				litros_tanque_inicial: medicionInicial[0].litros,
				temp_inicial: medicionInicial[0].temperatura,
				// las mediciones finales no son necesarias para grabar
				regla_altura_final: "",
				litros_tanque_final: 0,
				temp_final: 0,
				foto_medicion_final: [],
				id_pico: Number(selectedPico),
				taxilitro_inicial: totalizadorPicoInicial, // Este valor debe ser calculado o enviado
				taxilitro_final: totalizadorPicoFinal, // Este valor debe ser calculado o enviado
				litros_pico: 0, // Este valor debe ser calculado o enviado
				obs_traspaso: obs + " >>" + obsAdicional || "",
				foto_obs_traspaso: base64Obs ? [base64Obs] : [],
				foto_medicion_inicial: medicionInicial[0].foto_tanque
					? [medicionInicial[0].foto_tanque]
					: [],
				fecha: fecha,
				hora: hora,
				firma_receptor: [],
				id_playero: Number(user.cedula),
				id_encargado_receptor: Number(persona?.cedula),
			},
		};
		saveTraspaso(data);
		savePersona(persona);
		return data;
	}

	async function handleSaveAll() {
		if (medicionFinal.length === 0) {
			Alert.alert(
				"Medición final es requerida",
				"Debe registrar la medición final del tanque receptor."
			);
			return;
		}

		if (!firma) {
			Alert.alert("Firma requerida", "Debe registrar la firma del receptor.");
			return;
		}

		const data: TraspasoDTO = await getStorageTraspaso();

		data.json.firma_receptor = firma ? [firma] : [];
		data.json.regla_altura_final = medicionFinal[0].regla.toString();
		data.json.litros_tanque_final = medicionFinal[0].litros;
		data.json.temp_final = medicionFinal[0].temperatura;
		data.json.foto_medicion_final = medicionFinal[0].foto_tanque
			? [medicionFinal[0].foto_tanque]
			: [];
		data.json.obs_traspaso =
			obs + (obsAdicional.length > 0 ? " >>" + obsAdicional : "");

		data.json.litros_pico = Number(cargaCombustible.replace(",", "."));
		data.json.taxilitro_inicial = totalizadorPicoInicial;
		data.json.taxilitro_final = totalizadorPicoFinal;

		// data.json.foto_medicion_final = [];
		// data.json.foto_medicion_inicial = [];
		// data.json.foto_obs = [];
		// data.json.firma_receptor = [];
		// console.log("Data to save:", data);
		try {
			setIsLoading(true);
			await api.post("/api/traspasos", data);
			toastSuccess("Traspaso", "Traspaso guardado exitosamente.");
			setPersona(null);
			setSelectedBodegaDestino("");
			setMedicionInicial([]);
			setMedicionFinal([]);
			setFirma("");
			setObs("");
			setBase64Obs("");
			setSalida(0);
			setCargaCombustible("000,00");
			setTotalizadorPicoInicial(0);
			setTotalizadorPicoFinal(0);
			await removeTraspaso();
			await removePersona();
		} catch (error) {
			console.log("Error al guardar traspaso:", error);
			toastError("Traspaso", "Ocurrió un error al guardar el traspaso.");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleTraspaso() {
		if (!persona) {
			Alert.alert("Persona requerida", "Debe seleccionar un chofer/operador.");
			return;
		}
		if (!selectedBodegaOrigem) {
			Alert.alert(
				"Bodega de origen requerida",
				"Debe seleccionar una bodega origen."
			);
			return;
		}

		if (!selectedBodegaDestino) {
			Alert.alert(
				"Bodega de destino requerida",
				"Debe seleccionar una bodega destino."
			);
			return;
		}

		if (!selectedPico) {
			Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
			return;
		}

		console.log("Pico Selecionado:", selectedPico);
		console.log("Picos:", picos);
		const picoSurtidor = picos.find(
			(pico) => pico.id_pico === Number(selectedPico)
		);
		console.log("Pico Surtidor encontrado:", picoSurtidor);
		setIdPicoSurtidor(Number(picoSurtidor?.id_pico_surtidor));
		console.log("Pico Surtidor:", picoSurtidor?.id_pico_surtidor);

		if (!picoSurtidor || picoSurtidor.id_pico_surtidor === 0) {
			Alert.alert(
				"ID Pico Surtidor",
				"El valor para el pico surtidor no fue encontrado."
			);
			return;
		}
		if (medicionInicial.length === 0) {
			Alert.alert(
				"Medición Inicial requerida",
				"Debe registrar la medición inicial del tanque receptor."
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
			}
			saveState();
			setSalida(1);
			setShouldContinue(true);
		} catch (error) {
			setSalida(0);
			setShouldContinue(false);
			toastError("Registro de Salida", "Intente nuevamente.");
			setIsLoading(false);
			return;
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (sucursal) {
			fetchBodegas();

			(async () => {
				const storedTraspaso = await getStorageTraspaso();

				if (storedTraspaso && storedTraspaso.json) {
					console.log("Restaurando traspaso desde almacenamiento local");
					const { json } = storedTraspaso;
					const personaStorage = await getStoragePersona();

					setSelectedBodegaOrigem(json.bod_origen.toString());
					setSelectedBodegaDestino(json.bod_destino.toString());
					setSelectedPico(json.id_pico.toString());
					setTotalizadorPicoInicial(json.taxilitro_inicial);
					setTotalizadorPicoFinal(json.taxilitro_final);
					setBase64Obs(json.foto_obs_traspaso[0] || "");
					setMedicionInicial([
						{
							tanque: "",
							id_tanque: json.id_tanque_destino.toString(),
							regla: Number(json.regla_altura_inicial),
							litros: json.litros_tanque_inicial,
							temperatura: json.temp_inicial,
							foto_tanque: json.foto_medicion_inicial[0] || "",
						},
					]);
					setPersona(personaStorage);
					setSalida(1);
					setIsLoading(true);
					setShouldContinue(true);
				} else {
					setSelectedBodegaOrigem("");
				}
			})();
		}
	}, []);

	useEffect(() => {
		if (route.params?.onPersona) {
			setPersona(route.params.onPersona);
		}

		if (route.params?.onFirma) {
			setFirma(route.params.onFirma);
		}
		if (route?.params?.onMedicion) {
			if (medicionInicial.length === 0) {
				setMedicionInicial(route.params.onMedicion);
			} else {
				setMedicionFinal(route.params.onMedicion);
			}
		}
	}, [
		route.params?.onPersona,
		route.params?.onMedicion,
		route.params?.onFirma,
	]);

	useEffect(() => {
		if (selectedBodegaOrigem) {
			fetchPicos();
		}
	}, [selectedBodegaOrigem]);

	const fetchBox = useCallback(async () => {
		console.log("[fetchBox]", estadoRestaurado, shouldContinue, salida);

		if (estadoRestaurado === false || shouldContinue === false) return;
		try {
			let idPicoBox = Number(idPico_surtidor);
			console.log("ID Pico Surtidor:", idPico_surtidor);
			console.log("ID Pico Selecionado:", selectedPico);
			console.log("Picos:", picos);
			if (idPicoBox === 0) {
				// Busca el pico surtidor correspondiente para ser usado en el looping
				const picoSurtidor = picos.find(
					(pico) => pico.id_pico === Number(selectedPico)
				);
				setIdPicoSurtidor(Number(picoSurtidor?.id_pico_surtidor));
				idPicoBox = Number(picoSurtidor?.id_pico_surtidor);
			}
			console.log("Buscando datos de salida...", idPicoBox);
			const response = await api.get(`/api/salida-control/${idPicoBox}`);
			if (response.data.estado === "B") {
				setSalida(2);
				setShouldContinue(false);
				setIsLoading(false);
				setTotalizadorPicoInicial(response.data.taxiltroInicioDespacho);
				setTotalizadorPicoFinal(response.data.taxiltroFinDespacho);
				setCargaCombustible(response.data.volumenDespachado.toFixed(2));
			}
		} catch (error) {
			if (idPico_surtidor === 0) {
				setSalida(0);
				setShouldContinue(false);
			}
			console.log("[FetchBox] Pico Surtidor:", idPico_surtidor);
			console.log("[FetchBox] Erro ao buscar dados:", error);
		}
	}, [estadoRestaurado, setSalida, setShouldContinue]);

	const fetchLoop = useCallback(async () => {
		console.log("[fetchLoop]", estadoRestaurado, shouldContinue, salida);
		if (estadoRestaurado && shouldContinue) {
			await fetchBox();
		}

		if (shouldContinue) {
			intervalRef.current = setTimeout(() => {
				fetchLoop(); // Reentrância controlada
			}, 3000);
		}
	}, [estadoRestaurado, fetchBox, shouldContinue]);

	useEffect(() => {
		if (estadoRestaurado && shouldContinue) {
			fetchLoop();
		}

		return () => {
			if (intervalRef.current) {
				clearTimeout(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [estadoRestaurado, shouldContinue, fetchLoop]);

	return turnoCerrado ? (
		<View className='flex-1'>
			<ScreenHeader
				title='Salida Excepcional'
				disableBackButton={salida === 2}
			/>

			<View style={styles.overlay}>
				<View style={styles.modalContent}>
					<Text className='font-bold text-red-500 text-center text-2xl underline mb-4'>
						Importente!!!
					</Text>
					<Text className='font-medium text-justify text-xl mb-4'>
						Está intentando registrar un traspaso y el turno se encuentra
						cerrado. Una vez finalizada se deberá realizar el cierre
						correspondiente en el apartado “Cierre Extra”, para las bodegas que
						hayan sufrido movimientos.
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
		</View>
	) : (
		<View className='flex-1'>
			<ScreenHeader
				title='Traspaso'
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
										fromScreen: "traspaso",
									})
								}
							/>
						</InputCard>
						{bodegaOrigem.length > 1 && (
							<InputCard
								title='Bodega de Origen'
								required={true}
								locked={salida !== 0}
							>
								<View className='flex-row items-center p-2 gap-2'>
									<Select
										enabled={salida === 0}
										data={bodegaOrigem}
										isLoading={isLoading}
										selectedValue={selectedBodegaOrigem}
										setSelectedValue={setSelectedBodegaOrigem}
										labelField='descripcion_bodega'
										valueField='id_bodega'
									/>
								</View>
							</InputCard>
						)}
						<InputCard
							title='Bodega receptora'
							required={true}
							locked={salida !== 0}
						>
							<View className='flex-row items-center p-2 gap-2'>
								<Select
									enabled={salida === 0}
									data={bodegaDestino}
									isLoading={isLoading}
									selectedValue={selectedBodegaDestino}
									setSelectedValue={setSelectedBodegaDestino}
									labelField='descripcion_bodega'
									valueField='id_bodega'
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
									enabled={salida === 0}
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
							title='Medición Inicial del Tanque Expendedor'
							required
						>
							<Button
								disabled={selectedBodegaDestino === "" || salida === 2}
								title='Medir'
								icon={
									medicionInicial?.length > 0 ? CheckCheck : RulerDimensionLine
								}
								iconColor={medicionInicial?.length > 0 ? "#0af706" : "#000"}
								iconSize='md'
								onPress={() => {
									if (medicionInicial?.length > 0) {
										// Gere um alerta com as opções de continuar ou não
										Alert.alert(
											"Medición existente",
											"Ya existe una medición para esta bodega. ¿Desea continuar?",
											[
												{
													text: "Cancelar",
													style: "cancel",
												},
												{
													text: "Continuar",
													onPress: () => {
														navigation.navigate("medicion", {
															idBodega: selectedBodegaDestino,
														});
													},
												},
											]
										);
									} else {
										navigation.navigate("medicion", {
											fromScreen: "traspaso",
											idBodega: selectedBodegaDestino,
										});
									}
								}}
							/>
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
												onPress={handleTraspaso}
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
								<InputCard
									title='Medición Final del Tanque Receptor'
									required
								>
									<Button
										disabled={selectedBodegaDestino === ""}
										title='Medir'
										icon={
											medicionFinal?.length > 0
												? CheckCheck
												: RulerDimensionLine
										}
										iconColor={medicionFinal?.length > 0 ? "#0af706" : "#000"}
										iconSize='md'
										onPress={() => {
											if (medicionFinal?.length > 0) {
												// Gere um alerta com as opções de continuar ou não
												Alert.alert(
													"Medición existente",
													"Ya existe una medición para esta bodega. ¿Desea continuar?",
													[
														{
															text: "Cancelar",
															style: "cancel",
														},
														{
															text: "Continuar",
															onPress: () => {
																navigation.navigate("medicion", {
																	fromScreen: "traspaso",
																	idBodega: selectedBodegaDestino,
																});
															},
														},
													]
												);
											} else {
												navigation.navigate("medicion", {
													fromScreen: "traspaso",
													idBodega: selectedBodegaDestino,
												});
											}
										}}
									/>
								</InputCard>
								<InputCard title='Observaciones'>
									<View className='flex-row items-center p-2 gap-2'>
										<Input
											multiline
											numberOfLines={4}
											placeholder='observaciones'
											value={obs}
											onChangeText={setObs}
										/>
										<View className='flex-col gap-6'>
											<Camera
												disabled={isLoading}
												size={24}
												color='#000'
												onPress={() => handlePhotoCapture("obs")}
											/>
										</View>
									</View>
								</InputCard>
								<View className='flex-row gap-4'>
									<Button
										title='Firmar'
										onPress={() =>
											navigation.navigate("firma", {
												fromScreen: "traspaso",
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
					<View className='flex-row items-center p-4'>
						<View>
							<Button
								title='Remover Estado'
								onPress={async () => {
									await removeTraspaso();
									await removePersona();
								}}
								isLoading={isLoading}
								icon={SaveAll}
								iconSize='md'
								iconColor='#000'
							/>
						</View>
						<View>
							<Text className='text-black font-bold'>
								Pico Selecionado:{selectedPico}
							</Text>
							<Text className='text-black font-bold'>
								IdPicoSelecionado:{idPico_surtidor}
							</Text>
							<Text className='text-black font-bold'>
								Estado Inicial:
								{estadoRestaurado ? "Restaurado" : "No restaurado"}
							</Text>
							<Text className='text-black font-bold'>
								ShouldContinue:
								{shouldContinue ? "True" : "False"}
							</Text>
							<Text className='text-black font-bold'>
								Salida:
								{salida}
							</Text>
						</View>
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
