import {
	createNativeStackNavigator,
	NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { SignIn } from "../screens/SignIn";
import { Setup } from "../screens/Setup";

type authRoutes = {
	setUp: undefined;
	signIn: undefined;
};

export type authNavigatorRoutesProps = NativeStackNavigationProp<authRoutes>;

const { Navigator, Screen } = createNativeStackNavigator<authRoutes>();

export function SetupRoutes() {
	return (
		<Navigator screenOptions={{ headerShown: false }}>
			<Screen
				name='setUp'
				component={Setup}
			/>
			<Screen
				name='signIn'
				component={SignIn}
			/>
		</Navigator>
	);
}
