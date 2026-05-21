import { NavigationContainer } from "@react-navigation/native";
import { StackRoutes } from "./app.routes";
import { AuthRoutes } from "./auth.routes";
import { SetupRoutes } from "./config.routes";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/Loading";

export function Routes() {
	const { user, isLoadingUserData, serverIP, isLoadingServerIP } = useAuth();

	if (isLoadingUserData || isLoadingServerIP) {
		return <Loading />;
	}

	return (
		<NavigationContainer>
			{!serverIP ? (
				<SetupRoutes />
			) : user.cedula ? (
				<StackRoutes />
			) : (
				<AuthRoutes />
			)}
		</NavigationContainer>
	);
}
