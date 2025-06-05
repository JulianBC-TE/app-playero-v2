import { useState } from "react";

import { authNavigatorRoutesProps } from "@route/auth.routes";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "@hooks/useAuth";

import Logo from "@assets/logo.png";

import { Input } from "@components/Input";
import { Button } from "@components/Button";
import { Controller, useForm } from "react-hook-form";
import { AppError } from "@utils/AppError";
import { toastError } from "@/utils/toastMessage";
import { Image, ScrollView, Text, View } from "react-native";
import { InputCard } from "@/components/InputCard";

type FormData = {
	cedula: string;
	password: string;
};

export function SignIn() {
	const [isLoading, setIsLoading] = useState(false);
	const navigation = useNavigation<authNavigatorRoutesProps>();
	const { signIn } = useAuth();
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>();

	async function handleSignIn({ cedula, password }: FormData) {
		try {
			setIsLoading(true);
			await signIn(cedula, password);
		} catch (error) {
			console.log(error);
			const isAppError = error instanceof AppError;
			const title = isAppError
				? error.message
				: "Não foi possível realizar o login";

			toastError("Error en la autenticación", title);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<ScrollView
			contentContainerStyle={{ flexGrow: 1 }}
			showsVerticalScrollIndicator={false}
		>
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
						className='h-52 gap-2'
						title='Ingrese cédula y contraseña'
						required
					>
						<Controller
							control={control}
							name='cedula'
							rules={{ required: "Correo es obligarório" }}
							render={({ field: { onChange } }) => (
								<Input
									align='center'
									placeholder='cédula'
									keyboardType='number-pad'
									autoCapitalize='none'
									onChangeText={onChange}
									errorMessage={errors.cedula?.message}
								/>
							)}
						/>
						<Controller
							control={control}
							name='password'
							rules={{ required: "la contraseña es oblicatoria" }}
							render={({ field: { onChange } }) => (
								<Input
									align='center'
									placeholder='Contraseña'
									secureTextEntry
									onChangeText={onChange}
									errorMessage={errors.password?.message}
								/>
							)}
						/>
					</InputCard>
					<View>
						<Button
							title='Conectar'
							onPress={handleSubmit(handleSignIn)}
							isLoading={isLoading}
						/>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
