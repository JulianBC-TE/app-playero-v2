/**
 * @module Playero/Components/InputCard
 * @category UI Components
 */
import clsx from "clsx";
import { View, Text } from "react-native";
import { LockKeyhole, Check } from "lucide-react-native"; // Importa apenas para garantir que os ícones sejam incluídos no bundle

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
