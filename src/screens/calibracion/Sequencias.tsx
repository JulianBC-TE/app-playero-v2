import * as ImagePicker from "expo-image-picker";
import { StackRoutesProps } from "@/route/app.routes";
import { api } from "@/services/api";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { Camera, Fuel, ListCheck, RotateCw, Save } from "lucide-react-native";
import { Loading } from "@/components/Loading";
import { Select } from "@/components/Select";
import { SequenciaCalibracionDTO } from "@/dto/SequenciaCalibracionDTO";
import { ScreenHeader } from "@/components/ScreenHeader";

export function Sequencias({
	navigation,
	route,
}: StackRoutesProps<"sequencias">) {
	const [isLoading, setIsLoading] = useState(false);
	const [salida, setSalida] = useState(0);
	const [cargaCombustible, setCargaCombustible] = useState("0,000");
	const [id_pico_surtidor, setIdPicoSurtidor] = useState(0);
	const [shouldContinue, setShouldContinue] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const [valorMedicion, setValorMedicion] = useState("0");
	const [photoSequencia, setPhotoSequencia] = useState("");

	const [mediciones, setMediciones] = useState<SequenciaCalibracionDTO>({
		taxilitroInicial: 0,
		taxilitroFinal: 0,
		totalMediciones: 0,
		sequencias: [],
	});

	const medicion = Array.from({ length: 21 }, (_, i) => {
		const valor = -200 + i * 20;
		return {
			label: `${valor.toString()} ml`,
			value: valor.toString(),
		};
	});

	function handleSaveSecuencia() {
		setMediciones((prev) => ({
			...prev,
			sequencias: [
				...prev.sequencias,
				{
					taxilitro: mediciones.taxilitroFinal,
					valor_medicion: valorMedicion,
					foto_medicion: photoSequencia,
				},
			],
		}));
		setPhotoSequencia("");
		setValorMedicion("");
		setCargaCombustible("0,000");
		setSalida(3);
	}

	async function handlePhotoSequencia() {
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
					setPhotoSequencia(base64);
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

	async function handleMedicion() {
		try {
			setIsLoading(true);
			setSalida(1);
			console.log(
				"Iniciando carga...",
				id_pico_surtidor,
				typeof id_pico_surtidor
			);
			const response = await api.post("/api/autorizar", {
				pico: id_pico_surtidor,
			});
			if (response.data.respuesta === "NoCargo") {
				toastError("Carga", "No se realizó ninguna carga.");
				setSalida(0);
				return;
			} else if (response.data.respuesta !== "Cargando") {
				toastError(
					"Pico no disponible",
					"El pico no está disponible para la carga."
				);
			}
			console.log("Cargando...");
			setSalida(1);
			setShouldContinue(true);
		} catch (error) {
			setSalida(0);
			setShouldContinue(false);
			console.error("Error al iniciar la carga:", error);
			toastError("Registro de Salida", "Intente nuevamente más tarde.");
			setIsLoading(false);
			return;
		} finally {
			setIsLoading(false);
		}
	}

	const fetchBox = useCallback(async () => {
		try {
			const response = await api.get(`/api/salida-control/${id_pico_surtidor}`);
			if (response.data.estado === "B") {
				console.log("Finalizando carga...");
				setSalida(2);
				setShouldContinue(false);

				console.log(response.data);
				if (mediciones.taxilitroInicial === 0) {
					setMediciones((prev) => ({
						...prev,
						taxilitroInicial: response.data.taxiltroInicioDespacho,
					}));
				}
				setMediciones((prev) => ({
					...prev,
					taxilitroFinal: response.data.taxiltroFinDespacho,
					totalMediciones: prev.totalMediciones + 1,
				}));
				setCargaCombustible(response.data.volumenDespachado.toFixed(2));
			}
		} catch (error) {
			console.error("Erro ao buscar dados:", error);
		}
	}, [id_pico_surtidor, setSalida, setShouldContinue, setCargaCombustible]);

	const fetchLoop = useCallback(async () => {
		if (!shouldContinue) return;

		await fetchBox();

		if (shouldContinue) {
			intervalRef.current = setTimeout(() => {
				console.log("Agendando nova verificação...");
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

	useEffect(() => {
		if (route.params?.pico_surtidor) {
			setIdPicoSurtidor(route.params.pico_surtidor);
		}
	}, [route.params?.pico_surtidor]);

	return (
		<View className='flex-1'>
			<ScreenHeader
				title='Secuencia de Verificación'
				disableBackButton={salida !== 0}
			/>
			<View className='flex-1 items-center p-4 gap-4'>
				<InputCard
					title=''
					locked={salida !== 0}
				>
					<View className='flex-row p-2 gap-2'>
						<View className='flex-1 justify-center items-center gap-2'>
							{salida === 0 && (
								<>
									<Text className='text-xl text-black font-bold'>
										Realizar carga
									</Text>
									<Button
										title='Comenzar'
										onPress={handleMedicion}
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
							{salida === 2 ||
								(salida === 3 && (
									<>
										<Text className='text-xl text-black font-bold'>
											Finalizado
										</Text>
									</>
								))}
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
					<InputCard
						title='Valor de la medicion em mililitros:'
						required={true}
					>
						<View className='flex-row items-center p-2 gap-2'>
							<View className='w-full'>
								<Select
									data={medicion}
									isLoading={isLoading}
									selectedValue={valorMedicion}
									setSelectedValue={setValorMedicion}
									labelField='label'
									valueField='value'
								/>
							</View>
							<View>
								<Camera
									color={"#000"}
									size={24}
									onPress={() => handlePhotoSequencia()}
								/>
							</View>
						</View>
					</InputCard>
				)}

				{salida === 2 && valorMedicion && photoSequencia && (
					<View>
						<View className='flex flex-row items-center gap-2'>
							<Button
								title='Registrar'
								icon={Save}
								iconColor='#000'
								onPress={() => handleSaveSecuencia()}
							/>
						</View>
					</View>
				)}
				{salida === 3 && (
					<View>
						<View className='flex flex-row items-center gap-2'>
							<Button
								title='Seguinte'
								icon={RotateCw}
								iconColor='#000'
								onPress={() => handleMedicion()}
							/>

							<Button
								title='Finalizar'
								icon={ListCheck}
								iconColor='#000'
								onPress={() =>
									navigation.popTo("calibracion", { onSequencia: mediciones })
								}
							/>
						</View>
					</View>
				)}
			</View>
		</View>
	);
}
