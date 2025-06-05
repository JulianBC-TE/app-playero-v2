import { useState } from "react";

import { useAuth } from "@hooks/useAuth";

import Logo from "@assets/logo.png";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { Controller, useForm } from "react-hook-form";
import { AppError } from "@utils/AppError";
import axios from "axios";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Image, ScrollView, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";

type FormData = {
	ip: string;
};

export function Setup() {
	const [isLoading, setIsLoading] = useState(false);
	const { setServerIP } = useAuth();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>();

	async function handleSetup({ ip }: FormData) {
		try {
			setIsLoading(true);
			const response = await axios.get(`http://${ip}/ping`);
			if (response.status === 200) {
				await setServerIP(ip);
			}
			toastSuccess("Conexión exitosa", "Conectado al servidor correctamente");
		} catch (error) {
			setIsLoading(false);
			const isAppError = error instanceof AppError;
			const title = isAppError
				? error.message
				: "No se pudo conectar al servidor";
			toastError("Error ", title);
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
				<View>
					<Button
						title='Conectar'
						onPress={handleSubmit(handleSetup)}
						isLoading={isLoading}
					/>
				</View>
			</View>
		</View>
	);
}
