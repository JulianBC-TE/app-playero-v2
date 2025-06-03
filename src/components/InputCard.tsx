import clsx from "clsx";
import { View, Text } from "react-native";

export function InputCard({
	title,
	children,
	required = false,
	className,
}: {
	title: string;
	children: React.ReactNode;
	required?: boolean;
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
				<Text className='text-lg text-black font-bold mt-2'>{title}</Text>
				{children}
			</View>

			{required && (
				<Text className='text-red-500 absolute top-0 right-1 text-3xl font-bold'>
					*
				</Text>
			)}
		</View>
	);
}
