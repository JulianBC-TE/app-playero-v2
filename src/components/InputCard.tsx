import clsx from "clsx";
import { View, Text } from "react-native";
import { LockKeyhole } from "lucide-react-native"; // Importa apenas para garantir que os ícones sejam incluídos no bundle

export function InputCard({
	title,
	children,
	required = false,
	locked = false,
	className,
}: {
	title: string;
	children: React.ReactNode;
	required?: boolean;
	locked?: boolean;
	className?: string;
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
					*
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
