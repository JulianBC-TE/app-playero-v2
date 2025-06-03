import { View } from "react-native";
import { Loading } from "./Loading";
import { Picker } from "@react-native-picker/picker";
import { useEffect } from "react";

interface SelectProps<T> {
	isLoading: boolean;
	data: T[];
	selectedValue?: string;
	setSelectedValue: (value: string) => void;
	labelField: keyof T;
	valueField: keyof T;
}

export function Select<T>({
	data,
	selectedValue,
	isLoading,
	setSelectedValue,
	labelField,
	valueField,
}: SelectProps<T>) {
	useEffect(() => {
		if (!isLoading && data.length > 0 && !selectedValue) {
			const firstValue = data[0][valueField];
			setSelectedValue(String(firstValue));
		}
	}, [isLoading, data, selectedValue, setSelectedValue, valueField]);

	return (
		<View className='justify-center w-full h-12 rounded-md border border-gray-500 bg-white'>
			{isLoading ? (
				<Loading />
			) : (
				<Picker
					style={{ width: "100%", color: "#000" }}
					selectedValue={selectedValue}
					onValueChange={(itemValue) => setSelectedValue(itemValue)}
				>
					{data.map((item, index) => (
						<Picker.Item
							key={index}
							label={String(item[labelField])}
							value={item[valueField] as string | number}
						/>
					))}
				</Picker>
			)}
		</View>
	);
}
