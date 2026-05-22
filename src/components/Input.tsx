/**
 * @module Playero/Components/Input
 * @category UI Components
 */
import { useState } from "react";
import { TextInput, View, Text, TextInputProps } from "react-native";

type Props = TextInputProps & {
	isReadOnly?: boolean;
	isInvalid?: boolean;
	errorMessage?: string | null;
	align?: "left" | "center" | "right";
};

/**
 * Campo de texto personalizado con soporte para estado de foco, error y modo solo lectura.
 * Extiende `TextInputProps` de React Native.
 *
 * @param isReadOnly - Si es `true`, el campo no es editable. Por defecto `false`.
 * @param isInvalid - Marca el campo como inválido mostrando borde rojo.
 * @param errorMessage - Mensaje de error a mostrar debajo del campo.
 * @param align - Alineación del texto: `"left"` | `"center"` | `"right"`. Por defecto `"left"`.
 */
export function Input({
	isReadOnly = false,
	errorMessage = null,
	isInvalid = false,
	align = "left",
	onFocus,
	onBlur,
	...rest
}: Props) {
	const [isFocused, setIsFocused] = useState(false);
	const isMultiline = rest.multiline === true;

	const invalid = !!errorMessage || isInvalid;

	const handleFocus = (e: any) => {
		setIsFocused(true);
		onFocus?.(e);
	};

	const handleBlur = (e: any) => {
		setIsFocused(false);
		onBlur?.(e);
	};

	// Determina a classe da borda baseada no estado
	const getBorderClass = () => {
		if (invalid) return "border border-red-500";
		if (isFocused) return "border border-green-500";
		return "border-0";
	};

	return (
		<View className='w-full mb-0 mt-2'>
			<View
				className={`
          w-full
          rounded-md 
          bg-white 
          justify-center
          ${getBorderClass()}
          ${isReadOnly ? "opacity-50" : "opacity-100"}
		  ${!isMultiline ? "h-10" : "h-24"}
        `}
			>
				<TextInput
					className={`
						
            w-full
            px-4 
			 ${isMultiline ? "py-2" : ""}
            bg-white 
            text-black 
            rounded-md
          `}
					style={{
						textAlign: align,
						lineHeight: 20,
						paddingTop: 0,
						paddingBottom: 0,
					}}
					placeholderTextColor='#6B7280' // gray-500 equivalent
					editable={!isReadOnly}
					onFocus={handleFocus}
					onBlur={handleBlur}
					numberOfLines={isMultiline ? rest.numberOfLines ?? 4 : undefined}
					{...rest}
				/>
			</View>

			{/* Error Message */}
			{errorMessage && (
				<Text className='text-red-500 text-sm mt-1'>{errorMessage}</Text>
			)}
		</View>
	);
}
