import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/StackRoutes";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { PhotoButton } from "@/components/PhotoButton";
import { Input } from "@/components/Input";
import { RulerDimensionLine, CheckCheck } from "lucide-react-native";
import { api } from "@/services/api";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { Select } from "@/components/Select";
import { MedicionDTO } from "@/dto/MedicionDTO";

export function Turno({ navigation, route }: StackRoutesProps<"turno">) {
	const [isLoading, setIsLoading] = useState(false);
	const [inicioTurno, setInicioTurno] = useState(false);
	const [base64Images, setBase64Images] = useState<string[]>([]);
	const [observations, setObservations] = useState("");
	const [selectedBodega, setSelectedBodega] = useState("");
	const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
	const [medicion, setMedicion] = useState<MedicionDTO[]>([]);

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
		try {
			console.log(
				"Iniciando procesamiento de turno para bodega...",
				selectedBodega
			);
			// pega todos os picos de uma bodega
			const picosResult = await api.get("/api/picos", {
				params: {
					id_bodega: selectedBodega,
				},
			});
			console.log("Picos obtidos:", picosResult.data.picos);
			const picos = picosResult.data.picos;
			const med_picos = await Promise.all(
				picos.map(async (pico: any) => {
					console.log("Processando pico:", pico.id_pico);
					const totalizadorResult = await api.get("/api/totalizador", {
						params: {
							pico: pico.id_pico,
						},
					});
					console.log("Totalizado:", totalizadorResult);
					return {
						pico: pico.id_pico,
						totalizador: totalizadorResult.data.totalizador,
					};
				})
			);
			console.log("Picos e totalizadores obtidos:", med_picos);
		} catch (error) {
			toastError("Erro ao processar turno", "Tente novamente mais tarde.");
			console.error("Erro ao processar turno:", error);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (route.params?.onSelect) {
			// route.params.onSelect.map((medicion: MedicionDTO) => {
			// 	console.log(
			// 		medicion.tanque,
			// 		medicion.id_tanque,
			// 		medicion.litros,
			// 		medicion.regla,
			// 		medicion.temperatura
			// 	);
			// });
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
						onPress={() =>
							navigation.navigate("medicion", { idBodega: selectedBodega })
						}
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
					onPress={procesarTurno}
					disabled={isLoading || selectedBodega === ""}
					title={`${inicioTurno === false ? "Iniciar Turno" : "Cerrar Turno"}`}
				/>
			</View>
		</View>
	);
}
