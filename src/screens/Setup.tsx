import { useState } from "react";

import { useAuth } from "@hooks/useAuth";

import Logo from "@assets/logo.png";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { Controller, useForm } from "react-hook-form";
import { AppError } from "@utils/AppError";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Image, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";
import axios from "axios";
import { SucursalDTO } from "@/dto/sucursalDTO";
import { useAppContext } from "@/hooks/useAppContext";

type FormData = {
	ip: string;
};

const axiosApi = axios.create({
	timeout: 20000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

export function Setup() {
	const { setSucursal } = useAppContext();
	const [isLoading, setIsLoading] = useState(false);
	const { setServerIP } = useAuth();
	const [errorText, setErrorText] = useState<any>();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>();

	async function handleSetup({ ip }: FormData) {
		try {
			setIsLoading(true);
			const response = await axiosApi.get(`http://${ip}/ping`);
			if (response.status === 200) {
				// Busca la sucursal y la guarda en el storage
				const sucursalResponse = await axiosApi.get(
					`http://${ip}/api/sucursales`
				);
				const sucursalData: SucursalDTO = sucursalResponse.data[0];
				setSucursal(sucursalData);
				toastSuccess("Conexión exitosa", "Conectado al servidor correctamente");
				await setServerIP(ip);
			} else {
				toastError("Axios Error", "Hubo un error al conectar al servidor");
				throw new Error(`AXIOS:erro no HTTP response: ${response.status}`);
			}
		} catch (error) {
			setErrorText(error);
			const isAppError = error instanceof AppError;
			const title = isAppError
				? error.message
				: "No se pudo conectar al servidor";
			toastError("[axios error] ", title);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<View className='flex-1 bg-teColorSecundarioMedio'>
			<View className='flex-1 p-4 gap-4 items-center'>
				<View className='mt-32 mb-12'>
					<Image
						source={Logo}
						defaultSource={Logo}
						alt='backgound'
						resizeMode='contain'
					/>
				</View>
				<InputCard
					title='Configurar conexión'
					required
				>
					<Controller
						control={control}
						name='ip'
						rules={{ required: "la IP del servidor es obligatória" }}
						render={({ field: { onChange } }) => (
							<Input
								placeholder='ip del servidor'
								keyboardType='numbers-and-punctuation'
								autoCapitalize='none'
								onChangeText={onChange}
								errorMessage={errors.ip?.message}
							/>
						)}
					/>
				</InputCard>
				<View className='flex-col justify-between items-center'>
					<Button
						title='Conectar'
						onPress={handleSubmit(handleSetup)}
						isLoading={isLoading}
					/>
					<Text className='text-red-500 text-center mt-2'>
						{errorText?.message || ""}
					</Text>
				</View>
			</View>
		</View>
	);
}
