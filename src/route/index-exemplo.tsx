import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { AuthRoutes } from "./auth.routes";
import { StackRoutes } from "./app.routes";
import { SetupRoutes } from "./config.routes";

import { useAuth } from "@hooks/useAuth";
import { Loading } from "@components/Loading";

export function Routes() {
	const { user, isLoadingUserData, serverIP, isLoadingServerIP } = useAuth();

	const theme = DefaultTheme;

	theme.colors.background =
		gluestackUIConfig.tokens.colors.teColorSecundarioClaro;

	if (isLoadingUserData) {
		return <Loading />;
	}

	return (
		<Box
			bg='$teColorPrincipalClaro'
			flex={1}
		>
			<NavigationContainer theme={theme}>
				{!serverIP ? <SetupRoutes /> : user.id ? <AppRoutes /> : <AuthRoutes />}
			</NavigationContainer>
		</Box>
	);
}
