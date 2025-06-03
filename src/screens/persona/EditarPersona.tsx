import { View } from "react-native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Input } from "@components/Input";
import { InputCard } from "@components/InputCard";
import { ScreenHeader } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { AppError } from "@utils/AppError";
import { yupResolver } from "@hookform/resolvers/yup";
import { toastError, toastSuccess } from "@utils/toastMessage";
import * as yup from "yup";
import { api } from "@services/api";
import { StackRoutesProps } from "@/route/StackRoutes";
import { Save } from "lucide-react-native";

type FormData = {
	nombre_apellido: string;
	cedula: number;
};

const addPersonschema = yup.object({
	nombre_apellido: yup
		.string()
		.required("Nombre es requerido")
		.min(3, "El nome debe tener al menos 3 caracteres")
		.test("tiene-apellido", "Ingrese el nombre y apellido", (value) => {
			if (!value) return false;
			const words = value.trim().split(/\s+/);
			return words.length >= 2 && words[0].length > 3 && words[1].length > 3;
		}),
});

export function EditarPersona({
	navigation,
	route,
}: StackRoutesProps<"editarpersona">) {
	const [isLoading, setIsLoading] = useState(false);
	const cedula = route.params?.cedula;
	const nombre = route.params?.nombre;

	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm({
		resolver: yupResolver(addPersonschema),
		defaultValues: {
			nombre_apellido: nombre || "",
		},
	});

	// Usar watch para observar o valor do campo
	const nombreApellidoValue = watch("nombre_apellido");

	async function handleEditPerson(data: { nombre_apellido: string }) {
		try {
			setIsLoading(true);
			console.log(cedula, data.nombre_apellido);
			// await api.patch(`/api/personas/${cedula}`, {
			// 	nombre_apellido: data.nombre_apellido.toUpperCase(),
			// });
			setIsLoading(false);
			toastSuccess("Grabación exitosa", "Persona editada con éxito");
			navigation.goBack();
		} catch (error) {
			setIsLoading(false);
			const isAppError = error instanceof AppError;
			const title = isAppError ? error.message : "No se pudo crear la persona";
			toastError("Error en la creación", title);
		}
	}

	// Atualizar o valor quando nombre mudar
	useEffect(() => {
		if (nombre) {
			setValue("nombre_apellido", nombre);
		}
	}, [nombre, setValue]);

	// Para verificar se o valor está sendo definido corretamente
	useEffect(() => {}, [nombreApellidoValue]);

	return (
		<View className='flex-1'>
			<ScreenHeader title='Editar Personas' />
			<View className='flex-1 p-4 gap-4 items-center'>
				<InputCard
					title='Cedula:'
					required={false}
				>
					<View className='flex-row w-full items-center'>
						<Input
							editable={false}
							placeholder='Informe cédula'
							placeholderTextColor='$gray600'
							value={cedula?.toString() || ""}
						/>
					</View>
				</InputCard>

				<InputCard
					title='Nombre y Apellido:'
					required
				>
					<View className='flex-row w-full items-center'>
						<Controller
							control={control}
							name='nombre_apellido'
							rules={{ required: "nombre y apellido es requerido" }}
							render={({ field: { onChange, value } }) => (
								<Input
									placeholder='Informe nombre y apellido'
									placeholderTextColor='$gray600'
									value={value}
									onChangeText={onChange}
									errorMessage={errors.nombre_apellido?.message}
								/>
							)}
						/>
					</View>
				</InputCard>
				<View className='mt-32'>
					<Button
						title='Grabar'
						onPress={handleSubmit(handleEditPerson)}
						isLoading={isLoading}
						icon={Save}
						iconSize='md'
						iconColor='#000'
					/>
				</View>
			</View>
		</View>
	);
}
