import { AppError } from "@utils/AppError";
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { getAuthToken, saveAuthToken } from "@storage/storageAuthToken";
import { get } from "node_modules/axios/index.cjs";
import { getStorageServerUrl } from "@/storage/storageServer";

type SignOut = () => Promise<void>;
type PromiseType = {
	onSuccess: (token: string) => void;
	onFailure: (error: AxiosError) => void;
};

type APIInstanceProps = AxiosInstance & {
	registerInterceptTokenManager: (signOut: SignOut) => () => void;
};

const api = axios.create({
	timeout: 20000, // Definindo um timeout padrão de 10 segundos
}) as APIInstanceProps;

let failedQueue: Array<PromiseType> = [];
let isRefreshing = false;

api.registerInterceptTokenManager = (signOut) => {
	// Adicionando interceptor de requisição para configurar token em todas as requisições
	const requestInterceptor = api.interceptors.request.use(
		async (config) => {
			try {
				const serverIP = await getStorageServerUrl();

				if (serverIP) {
					config.baseURL = serverIP;
					if (!serverIP.startsWith("http://")) {
						config.baseURL = `http://${serverIP}`;
					}
				}

				const { token } = await getAuthToken();
				if (token && config.headers) {
					config.headers.Authorization = `Bearer ${token}`;
				}
				return config;
			} catch (error) {
				return Promise.reject(error);
			}
		},
		(error) => {
			return Promise.reject(error);
		}
	);

	// Interceptor de resposta para lidar com erros e refresh token
	const responseInterceptor = api.interceptors.response.use(
		(response) => response,
		async (error) => {
			if (!error.response) {
				// Erros de rede ou timeouts
				return Promise.reject(
					new AppError(
						"Não foi possível conectar ao servidor. Verifique sua conexão."
					)
				);
			}

			const { response } = error;
			const originalRequest = error.config as AxiosRequestConfig & {
				_retry?: boolean;
			};

			// Tratamento específico para erro 401 (Unauthorized)
			if (response?.status === 401) {
				// Tratamento para token expirado ou inválido
				if (
					response.data?.message === "token.expired" ||
					response.data?.message === "token.invalid"
				) {
					if (originalRequest._retry) {
						// Evita loop infinito se o refresh token também falhar
						signOut();
						return Promise.reject(
							new AppError(
								"Sua sessão expirou. Por favor, faça login novamente."
							)
						);
					}

					originalRequest._retry = true;
					const { refresh_token } = await getAuthToken();

					if (!refresh_token) {
						signOut();
						return Promise.reject(
							new AppError("Sem token de autenticação. Por favor, faça login.")
						);
					}

					if (isRefreshing) {
						return new Promise((resolve, reject) => {
							failedQueue.push({
								onSuccess: (token: string) => {
									if (originalRequest.headers) {
										originalRequest.headers.Authorization = `Bearer ${token}`;
									}
									resolve(api(originalRequest));
								},
								onFailure: (err: AxiosError) => {
									reject(err);
								},
							});
						});
					}

					isRefreshing = true;

					return new Promise(async (resolve, reject) => {
						try {
							const { data } = await axios.post(
								`${api.defaults.baseURL}/api/auth/refresh-token`,
								{ refresh_token }
							);

							await saveAuthToken({
								token: data.token,
								refresh_token: data.refresh_token,
							});

							// Reconstruindo dados originais se existirem
							if (
								originalRequest.data &&
								typeof originalRequest.data === "string"
							) {
								try {
									originalRequest.data = JSON.parse(originalRequest.data);
								} catch (e) {
									console.warn(
										"Falha ao fazer parse dos dados da requisição original:",
										e
									);
								}
							}

							// Atualizando headers
							api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
							if (originalRequest.headers) {
								originalRequest.headers.Authorization = `Bearer ${data.token}`;
							}

							// Processando fila de requisições que falharam durante o refresh
							failedQueue.forEach((request) => {
								request.onSuccess(data.token);
							});

							console.log("Token atualizado com sucesso");
							resolve(api(originalRequest));
						} catch (refreshError) {
							// Processando falhas na fila
							failedQueue.forEach((request) => {
								request.onFailure(refreshError as AxiosError);
							});

							console.error("Falha ao atualizar token:", refreshError);

							// Verificando se o erro do refresh tem um código específico
							if (axios.isAxiosError(refreshError) && refreshError.response) {
								reject(
									new AppError(
										refreshError.response.data?.message ||
											"Não foi possível renovar sua sessão",
										refreshError.response.status
									)
								);
							} else {
								reject(new AppError("Erro ao atualizar sua sessão", 401));
							}

							signOut();
						} finally {
							isRefreshing = false;
							failedQueue = [];
						}
					});
				}

				// Outros erros 401 não relacionados ao token
				signOut();
				return Promise.reject(
					new AppError(response.data?.message || "Acesso não autorizado", 401)
				);
			}

			// Tratando outros códigos de erro HTTP (400, 404, 500, etc)
			if (response?.data) {
				return Promise.reject(
					new AppError(
						response.data.message || `Erro ${response.status}`,
						response.status
					)
				);
			}

			// Fallback para qualquer outro tipo de erro
			return Promise.reject(
				new AppError("Ocorreu um erro inesperado", error.code)
			);
		}
	);

	// Retornando função para limpar os interceptors
	return () => {
		api.interceptors.request.eject(requestInterceptor);
		api.interceptors.response.eject(responseInterceptor);
	};
};

export { api };
