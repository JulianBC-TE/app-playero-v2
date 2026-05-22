/**
 * @module Playero/Components/InputCard
 * @category UI Components
 */
import clsx from "clsx";
import { View, Text } from "react-native";
import { LockKeyhole, Check } from "lucide-react-native"; // Importa apenas para garantir que os ícones sejam incluídos no bundle

/**
 * Contenedor con título para agrupar campos de formulario.
 * Soporta indicador de campo requerido, verificado y bloqueado.
 *
 * @param title - Título que se muestra en la parte superior de la tarjeta.
 * @param children - Contenido interno del contenedor.
 * @param required - Si es `true`, muestra un asterisco rojo o un check verde si está verificado.
 * @param verified - Si es `true`, reemplaza el asterisco por un ícono de check verde.
 * @param locked - Si es `true`, muestra un ícono de candado en lugar del indicador de requerido.
 * @param className - Clases adicionales para personalizar el estilo del contenedor.
 */
export function InputCard({
	title,
	children,
	required = false,
	verified = false, // Adiciona a propriedade verified
	locked = false,
	className,
}: {
	title: string;
	children: React.ReactNode;
	required?: boolean;
	locked?: boolean;
	className?: string;
	verified?: boolean; // Adiciona a propriedade verified
}) {
	return (
		<View className='relative w-full'>
			<View
				className={clsx(
					"bg-teColorPrincipalClaro items-center w-full px-4 rounded-md",
					!className?.includes("min-h-") && "min-h-24", // aplica min-h-24 se não houver override
					className
				)}
			>
				{title && (
					<Text className='text-lg text-black font-bold mt-2'>{title}</Text>
				)}
				{children}
			</View>

			{required && !locked && (
				<Text className='text-red-500 absolute top-0 right-1 text-3xl font-bold'>
					{verified ? (
						<Check
							size={24}
							color={"green"}
						/>
					) : (
						<Text>*</Text>
					)}
				</Text>
			)}
			{locked && (
				<Text className='text-red-500 absolute top-0 right-1 text-3xl font-bold'>
					<LockKeyhole size={16} />
				</Text>
			)}
		</View>
	);
}
