import { useState } from "react";
import { View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { toastError, toastSuccess } from "@utils/toastMessage";

import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { Button } from "@components/Button";
import { AppError } from "@utils/AppError";
//import { api } from "@services/api";
import { savePersonaLocal } from "../../backend/db/modules/personaDB"

import { Save, UserRoundPlus } from "lucide-react-native";
import axios from "axios";
import { createNavigatorFactory } from "@react-navigation/native";

type FormData = {
	cedula: string;
	nombre: string;
};

const crearPersonaschema = yup.object({
	nombre: yup
		.string()
		.required("Nombre es requerido")
		.min(3, "El nome debe tener al menos 3 caracteres")
		.test("tiene-apellido", "Ingrese el nombre y apellido", (value) => {
			if (!value) return false;
			const words = value.trim().split(/\s+/);
			return words.length >= 2 && words[0].length > 2 && words[1].length > 3;
		}),
	cedula: yup
		.string()
		.required("Cédula es requerido")
		.matches(/^[0-9]+$/, "La cedula solo puede contener números")
		.min(6, "La cedula debe tener al menos 6 caracteres")
		.max(7, "La cedula no puede tener más de 7 caracteres"),
});

export function CrearPersona() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSaved, setIsSaved] = useState(false);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(crearPersonaschema),
		defaultValues: {
			nombre: "", // passar o parametro aqui quando for editar
			cedula: "",
		},
	});

	async function handleNewPersona({ cedula, nombre }: FormData) {
		try {
			setIsLoading(true);
			await savePersonaLocal({
				cedula: +cedula,
				nombre_apellido: nombre.toUpperCase(),
			});
			toastSuccess("Grabación exitosa", "Persona creada exitosamente");
			setIsSaved(true);
		} catch (error) {
			let statusCode: number | undefined;

			if (error instanceof AppError) {
				statusCode = error.statusCode;
			} else if (axios.isAxiosError(error)) {
				statusCode = error.response?.status;
			}

			toastError(
				"Error en la creación",
				statusCode === 409
					? "Ya existe una persona con esta cédula"
					: "Error al crear la persona, intente nuevamente"
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<View className='flex-1'>
			<View className='flex-1 p-4 gap-4 items-center'>
				<InputCard
					title='Cedula:'
					required
				>
					<View className='flex-row w-full items-center'>
						<Controller
							control={control}
							name='cedula'
							rules={{ required: "cedula de identidad es requerido" }}
							render={({ field: { onChange, value } }) => (
								<Input
									keyboardType='number-pad'
									className='font-medium text-xl'
									placeholder='Informe cédula'
									placeholderTextColor='$gray600'
									onChangeText={onChange}
									value={value}
									errorMessage={errors.cedula?.message}
								/>
							)}
						/>
					</View>
				</InputCard>

				<InputCard
					title='Nombre y Apellido:'
					required
				>
					<View className='flex-row'>
						<Controller
							control={control}
							name='nombre'
							rules={{ required: "nombre y apellido es requerido" }}
							render={({ field: { onChange, value } }) => (
								<Input
									placeholder='Informe nombre y apellido'
									placeholderTextColor='$gray600'
									className='font-medium text-xl'
									value={value.toUpperCase()}
									onChangeText={onChange}
									errorMessage={errors.nombre?.message}
								/>
							)}
						/>
					</View>
				</InputCard>
				<View className='flex-row mt-32 gap-5'>
					<Button
						title='Crear'
						onPress={handleSubmit(handleNewPersona)}
						isLoading={isLoading}
						icon={Save}
						iconSize='md'
						iconColor='#000'
					/>
					{isSaved && (
						<Button
							title='Nuevo'
							onPress={() => {
								setIsSaved(false);
								reset({
									nombre: "",
									cedula: "",
								});
							}}
							isLoading={isLoading}
							icon={UserRoundPlus}
							iconSize='md'
							iconColor='#000'
						/>
					)}
				</View>
			</View>
		</View>
	);
}
