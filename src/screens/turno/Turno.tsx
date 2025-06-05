import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { StackRoutesProps } from "@/route/app.routes";

import { ScreenHeader } from "@/components/ScreenHeader";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { PhotoButton } from "@/components/PhotoButton";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";

import { RulerDimensionLine, CheckCheck } from "lucide-react-native";
import { useAppContext } from "@/hooks/useAppContext";
import { AppError } from "@/utils/AppError";
import { set } from "react-hook-form";

export function Turno({ navigation, route }: StackRoutesProps<"turno">) {
	const [isLoading, setIsLoading] = useState(false);
	const [inicioTurno, setInicioTurno] = useState(false);
	const [base64Images, setBase64Images] = useState<string[]>([]);
	const [observations, setObservations] = useState("");
	const [selectedBodega, setSelectedBodega] = useState("");
	const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
	const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
	const [turno, setTurno] = useState<TurnoDTO[]>([]);
	const { sucursal, user } = useAppContext();

	async function handlePhotoCapture() {
		try {
			setIsLoading(true);
			const { status } = await ImagePicker.requestCameraPermissionsAsync();
			if (status !== "granted") {
				Alert.alert(
					"Permissão necessária",
					"Precisamos de permissão para acessar a câmera."
				);
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
					setBase64Images((prev) => [...prev, base64]);
					toastSuccess("Foto capturada", "A foto foi capturada com sucesso.");
				}
			}
		} catch (error) {
			toastError("Erro ao capturar foto", "Tente novamente mais tarde.");
			console.error("Erro ao capturar foto:", error);
		} finally {
			setIsLoading(false);
		}
	}

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

	async function procesarTurno() {
		setIsLoading(true);
		try {
			console.log(
				"Iniciando procesamiento de turno para bodega...",
				selectedBodega
			);

			// 1. Buscar todos los picos de la bodega selecionada
			const picosResult = await api.get("/api/picos", {
				params: {
					id_bodega: selectedBodega,
				},
			});
			//console.log("Picos obtidos:", picosResult.data.picos);
			const picos = picosResult.data.picos;

			// 2. Buscar el taxilitro de cada pico
			// Horustech tiene un id para cada pido y guarda el taxilitro
			// de forma individual
			const resultadosTotalizadores = await Promise.all(
				picos.map(async (pico: any) => {
					//console.log("Processando pico surtidor:", pico.id_pico_surtidor);
					const totalizadorResult = await api.get(
						`/api/totalizador/${pico.id_pico_surtidor}`
					);
					//console.log("Totalizado:", totalizadorResult.data.totalizador);
					return {
						pico: pico.id_pico,
						totalizador: totalizadorResult.data.totalizador,
					};
				})
			);
			// Soma os totalizadores para calcular el taxilitro general
			const taxilitroGeneral = resultadosTotalizadores.reduce((acc, cur) => {
				return acc + Number(cur.totalizador ?? 0);
			}, 0);
			console.log("Taxilitro General:", taxilitroGeneral);

			const now = new Date();
			const fecha = now.toISOString().slice(0, 10);
			const hora = now.toTimeString().slice(0, 8);

			const totalizadorLitros = medicion.reduce((acc, cur) => {
				return acc + (cur.litros ?? 0);
			}, 0);
			console.log("Totalizador Litros:", totalizadorLitros);

			// 3. Criar o registro de turno
			const nuevoTurno: TurnoDTO = {
				id_suc: Number(sucursal.id_sucursal), // ID da sucursal, deve ser dinâmico
				id_bod: Number(selectedBodega),
				fecha,
				hora,
				ci_playero: Number(user.cedula),
				litros: totalizadorLitros,
				observacion: observations,
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
			console.log(
				"Nuevo Turno:",
				JSON.stringify({ json: nuevoTurno }, null, 2)
			);
			await api.post(
				"/api/registros/turno/" + (inicioTurno ? "inicio" : "fin"),
				{ json: nuevoTurno }
			);
			toastSuccess(
				"Turno procesado",
				`El turno ha sido ${inicioTurno ? "iniciado" : "cerrado"} con éxito.`
			);
			console.log("Turno procesado con éxito");
		} catch (error) {
			const isAppError = error instanceof AppError;
			const message = isAppError
				? error.message
				: "No se pudo conectar al servidor";
			toastError("Error al precessar turno", message);
			console.error("Error al procesar turno:", error);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (route.params?.onSelect) {
			setMedicion(route.params.onSelect);
		}
	}, [route.params?.onSelect]);

	useEffect(() => {
		fetchTurno();
	}, []);

	async function fetchTurno() {
		try {
			setIsLoading(true);
			const turno = await api.get("/api/registros/turno/status");
			const { inicio_turno } = turno.data;
			setInicioTurno(inicio_turno);

			const response = await api.get("/api/bodegas");
			const sucursal = response.data[0];
			if (sucursal?.bodegas?.length) {
				setBodegas(sucursal.bodegas);
			}
		} catch (error) {
			toastError("Erro ao buscar turno", "Tente novamente mais tarde.");
			console.error("Erro ao buscar turno:", error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<View className='flex-1'>
			<ScreenHeader
				title={`${inicioTurno === false ? "Iniciar Turno" : "Cerrar Turno"}`}
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
						value={observations}
						onChangeText={setObservations}
						placeholder={`Observaciones ${
							inicioTurno ? "para el cierre" : "para la apertura"
						} de turno`}
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
						<PhotoButton
							iconSize='lg'
							onPress={handlePhotoCapture}
							isLoading={isLoading}
						/>
					</View>
				</InputCard>
				<Button
					isLoading={isLoading}
					onPress={procesarTurno}
					title={`${inicioTurno === false ? "Iniciar Turno" : "Cerrar Turno"}`}
				/>
			</View>
		</View>
	);
}
