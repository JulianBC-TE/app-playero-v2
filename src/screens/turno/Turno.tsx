import {
	Alert,
	Image,
	Pressable,
	ScrollView,
	View,
	StyleSheet,
	TouchableOpacity,
	Text,
} from "react-native";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { StackRoutesProps } from "@/route/app.routes";

import { ScreenHeader } from "@/components/ScreenHeader";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";

import { RulerDimensionLine, CheckCheck } from "lucide-react-native";
import { useAppContext } from "@/hooks/useAppContext";
import { AppError } from "@/utils/AppError";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Photo } from "@/components/Photo";

/**
 * Componente para gestionar el turno de trabajo.
 *
 * @param param0 - Props de navegación y ruta.
 * @returns Componente de turno.
 */
export function Turno({ navigation, route }: StackRoutesProps<"turno">) {
	const [isLoading, setIsLoading] = useState(false);
	const [faltaAnterior, setFaltaAnterior] = useState(false);
	const [listaBodegasFaltaAnterior, setListaBodegasFaltaAnterior] = useState<
		BodegaDTO[]
	>([]);
	const [inicioTurno, setInicioTurno] = useState(false);
	const [base64Images, setBase64Images] = useState<string[]>([]);
	const [obs, setObs] = useState("");
	const [obsAdicional, setObsAdicional] = useState("");
	const [selectedBodega, setSelectedBodega] = useState("");
	const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
	const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
	const { sucursal, user } = useAppContext();
	const [blockHeader, setBlockHeader] = useState(false);

	/**
	 * Abre la cámara del dispositivo, solicita permisos si es necesario,
	 * y agrega la foto capturada (en base64) al estado de imágenes.
	 * Muestra mensajes de éxito o error según el resultado.
	 *
	 * @async
	 * @function handlePhotoCapture
	 * @returns {Promise<void>}
	 */
	async function handlePhotoCapture(base64: string) {
		setBase64Images((prev) => [...prev, base64]);
	}

	/**
	 * Muestra un alerta de confirmación para eliminar una foto.
	 * Si el usuario confirma, elimina la foto del estado de imágenes.
	 *
	 * @param {number} indexParaRemover - El índice de la foto a eliminar.
	 */
	const removerFoto = (indexParaRemover: number) => {
		Alert.alert("Apagar Foto", "Está seguro de que desea eliminar esta foto?", [
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

	/**
	 * Procesa el turno actual, recopilando datos de picos y mediciones,
	 * y enviando un registro al servidor.
	 * Muestra mensajes de éxito o error según el resultado.
	 *
	 * @async
	 * @function procesarTurno
	 * @returns {Promise<void>}
	 */

	// A medição pode ter vários tanques não se deve comparar com bodegas.length
	async function procesarTurno() {
		if (medicion.length === 0 || medicion.length < bodegas.length) {
			Alert.alert(
				"Medición requerida",
				"Debe realizar las mediciones de tanque antes de procesar el turno."
			);
			return;
		}
		try {
			setIsLoading(true);
			// 1. Buscar todos los picos de la bodega selecionada
			const picosResult = await api.get("/api/picos", {
				params: {
					id_bodega: selectedBodega,
				},
			});
			const picos = picosResult.data.picos;
			const resultadosTotalizadores: { pico: number; totalizador: any }[] = [];
			// 2. Buscar el taxilitro de cada pico
			// Horustech tiene un id para cada pido y guarda el taxilitro
			// de forma individual
			console.log("Bodega Selecionada:", selectedBodega);
			for (const pico of picos) {
				const totalizadorResult = await api.get(
					`/api/totalizador/${pico.id_pico_surtidor}`
				);
				resultadosTotalizadores.push({
					pico: pico.id_pico,
					totalizador: totalizadorResult.data.totalizador,
				});
			}

			const now = new Date();
			const fecha = now.toISOString().slice(0, 10);
			const hora = now.toTimeString().slice(0, 8);

			const totalizadorLitros = medicion.reduce((acc, cur) => {
				return acc + (cur.litros ?? 0);
			}, 0);

			// 3. Criar o registro de turno
			const nuevoTurno: TurnoDTO = {
				id_suc: Number(sucursal.id_sucursal), // ID da sucursal, deve ser dinâmico
				id_bod: Number(selectedBodega),
				fecha,
				hora,
				ci_playero: Number(user.cedula),
				litros: totalizadorLitros,
				observacion: obs + "|" + obsAdicional,
				// fotos_observacion: [],
				fotos_observacion: base64Images,
				med_tanques: medicion.map((med) => ({
					id_tanque: Number(med.id_tanque),
					regla: med.regla,
					temperatura: med.temperatura,
					litros: med.litros,
					// foto_tanque: [],
					foto_tanque: med.foto_tanque ? [med.foto_tanque] : [],
				})),
				med_picos: resultadosTotalizadores.map((result) => ({
					id_pico: result.pico,
					taxilitro: result.totalizador,
				})),
			};

			await api.post(
				"/api/registros/turno/" + (inicioTurno ? "inicio" : "fin"),
				{ json: nuevoTurno }
			);
			toastSuccess(
				"Turno procesado",
				`El turno ha sido ${inicioTurno ? "iniciado" : "cerrado"} con éxito.`
			);
			// Remove a bodega da lista de bodegas
			const remainBodegas = bodegas.filter(
				(bodega) => Number(bodega.id_bodega) !== Number(selectedBodega)
			);
			setBodegas(remainBodegas);
			// Si hay más turnos para procesar, se debe bloquear el header
			setBlockHeader(true);
			setObs("");
			setBase64Images([]);
			setMedicion([]);
			if (remainBodegas.length === 0) {
				toastSuccess(
					"Abertura de Turnos",
					"Todos los turnos han sido procesados."
				);
				navigation.navigate("home");
			}
		} catch (error) {
			console.log("Error al procesar turno:", error);
			const isAppError = error instanceof AppError;
			const message = isAppError
				? error.message
				: "No se pudo conectar al servidor";
			toastError("Error al precessar turno", message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (route.params?.onMedicion) {
			setMedicion(route.params.onMedicion);
		}
	}, [route.params?.onMedicion]);

	useEffect(() => {
		fetchTurno();
	}, []);

	/**
	 * Obtiene el estado actual del turno y la lista de bodegas.
	 * Establece el estado de inicioTurno en función de los datos obtenidos.
	 * Maneja errores y actualiza el estado de carga en consecuencia.
	 *
	 * @async
	 * @function fetchTurno
	 * @returns {Promise<void>}
	 */
	async function fetchTurno() {
		try {
			setIsLoading(true);
			const turno = await api.get(
				`api/registros/turno/status/${sucursal.id_sucursal}`
			);
			const turnoData: StatusTurnoDTO = {
				status: turno.data.status,
				Inicio_turno: turno.data.Inicio_turno,
				Fin_turno: turno.data.Fin_turno,
				Fin_turno_anterior: turno.data.Fin_turno_anterior,
			};
			if (turnoData.status === "falta_anterior") {
				setListaBodegasFaltaAnterior([]);
				turnoData.Fin_turno_anterior.falta.map(async (bodega: number) => {
					await api.get(`/api/bodegas/one/${bodega}`).then((response) => {
						const bodegaData: BodegaDTO = response.data;
						setListaBodegasFaltaAnterior((prev) => [...prev, bodegaData]);
					});
				});
				setFaltaAnterior(true);
			}

			let statusTurnoEstado = false;
			if (
				//turnoData.status === "falta_anterior" ||
				turnoData.status === "iniciado" ||
				turnoData.status === "falta_cerrar"
			) {
				setInicioTurno(false);
			} else {
				statusTurnoEstado = true;
				setInicioTurno(true);
			}

			const response = await api.get(`/api/bodegas/${sucursal.id_sucursal}`);
			const sucursalData = response.data;
			if (sucursalData?.bodegas) {
				const bodegasFiltradas: BodegaDTO[] = [];
				sucursalData.bodegas.map((bodega: BodegaDTO) => {
					if (statusTurnoEstado) {
						// Iniciar turno
						if (
							bodega.id_bodega &&
							turnoData.Inicio_turno.falta.includes(Number(bodega.id_bodega))
						) {
							bodegasFiltradas.push(bodega);
						}
					} else {
						if (
							bodega.id_bodega &&
							turnoData.Fin_turno.falta.includes(Number(bodega.id_bodega))
						) {
							bodegasFiltradas.push(bodega);
						}
					}
				});
				setBodegas(bodegasFiltradas);
			}
		} catch (error) {
			toastError(
				"Error al buscar turno",
				"No se pudo obtener el estado del turno."
			);
		} finally {
			setIsLoading(false);
		}
	}

	return faltaAnterior ? (
		<View className='flex-1'>
			<ScreenHeader title='Turno no Cerrado' />

			<View style={styles.overlay}>
				<View style={styles.modalContent}>
					<Text className='font-bold text-red-500 text-center text-2xl underline mb-4'>
						Importente!!!
					</Text>
					<Text className='font-medium text-justify text-xl mb-4'>
						En la fecha anterior no se registró el cierre de turno. Favor
						indique el motivo por el cual no se realizó el cierre de:
					</Text>
					<Text className='font-medium text-justify text-xl mb-4'>
						{listaBodegasFaltaAnterior.map((bodega) => (
							<Text
								key={bodega.id_bodega}
								className='font-medium text-justify text-xl mb-4'
							>
								- {bodega.descripcion_bodega}
							</Text>
						))}
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
							setFaltaAnterior(false);
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
				title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
				disableBackButton={blockHeader}
			/>
			<View className='flex-1 p-4 gap-4 items-center'>
				<InputCard
					title='Bodega'
					required
				>
					<Select
						data={bodegas}
						isLoading={isLoading}
						setSelectedValue={setSelectedBodega}
						labelField='descripcion_bodega'
						valueField='id_bodega'
					/>
				</InputCard>
				<InputCard
					title='Medición de Tanque'
					required
				>
					<Button
						disabled={selectedBodega === ""}
						title='Medir'
						icon={medicion?.length > 0 ? CheckCheck : RulerDimensionLine}
						iconColor={medicion?.length > 0 ? "#0af706" : "#000"}
						iconSize='md'
						onPress={() => {
							if (medicion?.length > 0) {
								// Gere um alerta com as opções de continuar ou não
								Alert.alert(
									"Medición existente",
									"Já existe uma medição para esta bodega. Deseja continuar?",
									[
										{
											text: "Cancelar",
											style: "cancel",
										},
										{
											text: "Continuar",
											onPress: () => {
												navigation.navigate("medicion", {
													fromScreen: "turno",
													idBodega: selectedBodega,
												});
											},
										},
									]
								);
							} else {
								navigation.navigate("medicion", {
									idBodega: selectedBodega,
								});
							}
						}}
					/>
				</InputCard>
				<InputCard
					title='Observaciones'
					className='min-h-40'
				>
					<Input
						multiline
						numberOfLines={4}
						textAlignVertical='top'
						className='ml-2'
						value={obs}
						onChangeText={setObs}
						placeholder={"Observaciones de la medicion"}
					/>
				</InputCard>
				<InputCard
					title='Fotos'
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
							form='button'
							iconSize='lg'
							setImage={handlePhotoCapture}
							isLoading={isLoading}
						/>
					</View>
				</InputCard>
				<Button
					isLoading={isLoading}
					onPress={procesarTurno}
					title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
				/>
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
