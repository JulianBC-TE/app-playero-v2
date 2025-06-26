import * as ImagePicker from "expo-image-picker";

import { ScreenHeader } from "@/components/ScreenHeader";
import { StackRoutesProps } from "@/route/app.routes";
import { Alert, Image, View } from "react-native";
import { Button } from "@/components/Button";
import { PhotoButton } from "@/components/PhotoButton";

import { toastError, toastSuccess } from "@utils/toastMessage";
import { useEffect, useState } from "react";
import { InputCard } from "@/components/InputCard";
import { Input } from "@/components/Input";
import { api } from "@/services/api";
import { TanqueDTO } from "@/dto/TanqueDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { Select } from "@/components/Select";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import { Check } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";

type FormData = {
	altura_regla: string;
	litros: string;
	temperatura: string;
};

const habilitarTanque = yup.object({
	altura_regla: yup
		.string()
		.required("Altura de la regla es requerido")
		.matches(
			/^[0-9]*\,?[0-9]+$/,
			"El formato de de esta información no és válida"
		),
	temperatura: yup
		.string()
		.required("Temperatura del tanque es requerido")
		.matches(/^[0-9]*\,?[0-9]+$/, "El formato de la temperatura no és válida"),
	litros: yup
		.string()
		.required("Cantidad de litros en el tanque requerido")
		.matches(/^[0-9]*\,?[0-9]+$/, "Formato de Litros no és inválido"),
});

export function Medicion({ navigation, route }: StackRoutesProps<"medicion">) {
	const [base64Image, setBase64Image] = useState<string>("");
	const idBodega = route.params?.idBodega || "0";
	const [isLoading, setIsLoading] = useState(false);
	const [tanques, setTanques] = useState<TanqueDTO[]>([]);
	const [selectedTanques, setSelectedTanques] = useState("");
	const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
	const [fromScreen, setFromScreen] = useState(
		route.params?.fromScreen || "turno"
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(habilitarTanque),
		defaultValues: {
			altura_regla: "", // passar o parametro aqui quando for editar
			temperatura: "",
			litros: "",
		},
	});

	const definirMedicion = ({ altura_regla, litros, temperatura }: FormData) => {
		if (base64Image === "") {
			toastError(
				"Registro fotografico requerido",
				"Por favor, capture una foto del tanque."
			);
			return;
		}
		console.log("Tanque selecionado:", selectedTanques);
		// Busca o nome do tanque selecionado
		const tanqueSelecionado = tanques.find(
			(t) => t.id_tanque === +selectedTanques
		);

		if (!tanqueSelecionado) {
			toastError("Tanque inválido", "Seleccione un tanque válido.");
			return;
		}

		const newMedicion: MedicionDTO = {
			tanque: tanqueSelecionado.descripcion_tanque || "",
			id_tanque: selectedTanques,
			regla: parseFloat(altura_regla),
			temperatura: parseFloat(temperatura),
			litros: parseFloat(litros),
			foto_tanque: base64Image,
		};
		// Atualiza a lista de mediciones
		const updatedMediciones = [...medicion, newMedicion];
		setMedicion(updatedMediciones);

		// Remove o tanque processado da lista
		const tanquesAtualizados = tanques.filter(
			(t) => t.id_tanque !== +selectedTanques
		);
		setTanques(tanquesAtualizados);
		setSelectedTanques(""); // Limpa o tanque selecionado

		reset(); // Limpa os campos do formulário
		setBase64Image(""); // Limpa a imagem capturada
		toastSuccess(
			"Tanque registrado",
			"El tanque ha sido registrado con éxito."
		);

		// Se era o último tanque, conclui
		if (tanquesAtualizados.length === 0) {
			toastSuccess(
				"Tanques Medidos",
				"Todos los tanques han sido medidos con éxito."
			);
			navigation.popTo(fromScreen as any, { onMedicion: updatedMediciones });
		}
	};

	function handleRemoveMedicion(idTanque: string) {
		setMedicion((prev) => prev.filter((item) => item.id_tanque !== idTanque));
		toastSuccess("Medición removida", "La medición ha sido removida.");
	}

	async function handlePhotoCapture() {
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
					setBase64Image(base64);
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

	async function fetchTanques() {
		try {
			setIsLoading(true);
			const response = await api.get("/api/tanques", {
				params: {
					id_bodega: idBodega,
				},
			});

			const data = response.data;
			if (data?.tanques?.length) {
				setTanques(data.tanques);
			}
		} catch (error) {
			toastError("Erro ao buscar tanques", "Tente novamente mais tarde.");
			console.error("Erro ao buscar tanques:", error);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (idBodega) {
			fetchTanques();
		}
	}, []);

	return (
		<View className='flex-1'>
			<ScreenHeader title='Medición' />
			<View className='flex-1 p-4 gap-4 items-center'>
				<InputCard title='Tanque'>
					<Select
						data={tanques}
						isLoading={isLoading}
						selectedValue={selectedTanques}
						setSelectedValue={setSelectedTanques}
						labelField='descripcion_tanque'
						valueField='id_tanque'
					/>
				</InputCard>

				{/* Crie uma renderização condicional baseado na seleção de um tanque */}

				<InputCard title='Altura Regla'>
					<Controller
						control={control}
						name='altura_regla'
						render={({ field: { onChange, value } }) => (
							<Input
								align='center'
								textAlignVertical='top'
								className='ml-2 text-center'
								value={value}
								onChangeText={onChange}
								placeholder='Informe la altura de la regla'
								errorMessage={errors.altura_regla?.message}
							/>
						)}
					/>
				</InputCard>
				<InputCard title='Litros'>
					<Controller
						control={control}
						name='litros'
						render={({ field: { onChange, value } }) => (
							<Input
								align='center'
								textAlignVertical='top'
								className='ml-2'
								value={value}
								onChangeText={onChange}
								placeholder='Litros en el tanque'
								errorMessage={errors.litros?.message}
							/>
						)}
					/>
				</InputCard>
				<InputCard title='Temperatura'>
					<Controller
						control={control}
						name='temperatura'
						render={({ field: { onChange, value } }) => (
							<Input
								align='center'
								textAlignVertical='top'
								className='ml-2'
								value={value}
								onChangeText={onChange}
								placeholder='Informe la temperatura del tanque'
								errorMessage={errors.temperatura?.message}
							/>
						)}
					/>
				</InputCard>
				<InputCard
					title='Fotos'
					className='min-h-48'
				>
					<View className='w-full items-center p-4 gap-2'>
						<Image
							source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
							className='mr-4 w-20 h-20 rounded-lg border border-gray-300'
							resizeMode='cover'
						/>
						<PhotoButton
							isLoading={isLoading}
							iconSize='lg'
							onPress={handlePhotoCapture}
						/>
					</View>
				</InputCard>

				<View className='w-full flex-col justify-center gap-4'>
					<View className='flex-row justify-center gap-4'>
						<Button
							title='Definir'
							onPress={handleSubmit(definirMedicion)}
							isLoading={isLoading}
							icon={Check}
							iconSize='md'
							iconColor='#000'
						/>
					</View>
				</View>
			</View>
		</View>
	);
}
