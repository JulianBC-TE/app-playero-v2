import {
	createNativeStackNavigator,
	NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { SignIn } from "../screens/SignIn";
import { Setup } from "../screens/Setup";

type authRoutes = {
	signIn: undefined;
	setUp: undefined;
};

export type authNavigatorRoutesProps = NativeStackNavigationProp<authRoutes>;

const { Navigator, Screen } = createNativeStackNavigator<authRoutes>();

export function AuthRoutes() {
	return (
		<Navigator screenOptions={{ headerShown: false }}>
			<Screen
				name='signIn'
				component={SignIn}
			/>
			<Screen
				name='setUp'
				component={Setup}
			/>
		</Navigator>
	);
}
