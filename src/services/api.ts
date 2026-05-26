import { AppError } from "@utils/AppError";
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { getAuthToken, saveAuthToken } from "@storage/storageAuthToken";
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
	timeout: 22000,
}) as APIInstanceProps;

let failedQueue: PromiseType[] = [];
let isRefreshing = false;

api.registerInterceptTokenManager = (signOut) => {
	// Adicionando interceptor de requisição para configurar token em todas as requisições
	const requestInterceptor = api.interceptors.request.use(
		async (config) => {
			try {
				//->se trae el ip guardado
				const serverIP = await getStorageServerUrl();
				//->se verifica que el ip se cargue y este en el formato adecuado
				if (serverIP) {
					config.baseURL = serverIP;
					if (!serverIP.startsWith("http://")) {
						config.baseURL = `http://${serverIP}`;
					}
				}
				//->traer el  token guardado y settearlo
				const { token } = await getAuthToken();
				if (token && config.headers) {
					config.headers.Authorization = `Bearer ${token}`;
				}
				//->devolver el config
				return config;
			} catch (error) {
				console.log("aqui 1", error);
				return Promise.reject(error);
			}
		},
		(error) => {
			return Promise.reject(error);
		}
	);

	// Interceptor de resposta para lidar com erros e refresh token
	const responseInterceptor = api.interceptors.response.use(
		//->Si fue exitosa se pasa directamente la respuesta
		(response) => response,
		//->si dió error, timeuot, etc, se trata
		async (error) => {
			if (!error.response) {
				// Erros de rede ou timeouts
				return Promise.reject(new AppError("No se pudo conectar al servidor."));
			}

			const { response } = error;
			//->guardar una copia de la recuaest que falló
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
								"Su sesión ha expirado. Por favor, inicie sesión nuevamente."
							)
						);
					}
					//->se trata de traer los tokens
					originalRequest._retry = true;
					const { refresh_token } = await getAuthToken();
					//->se verifica que vengan los tokens
					if (!refresh_token) {
						signOut();
						return Promise.reject(
							new AppError(
								"Sin token de autenticación. Por favor, inicie sesión."
							)
						);
					}
					//->si ya hay un token en refresh
					if (isRefreshing) {
						//->encola la request para reintentar cuando el refresh termine
						return new Promise((resolve, reject) => {
							// define qué hacer con esta request cuando el refresh se resuelva o falle
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
					//->si no se esta en refreshing, ahora si se tiene que estar ya que se está refrescando la request actual
					isRefreshing = true;
					//->probamos hacer el refresh
					return new Promise(async (resolve, reject) => {
						try {
							const { data } = await axios.post(
								`${api.defaults.baseURL}/api/auth/refresh-token`,
								{ refresh_token }
							);
							//-> si se hiso el resfresh de forma correcta ya tenemos los tokens nuevos
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
									console.log("aqui 2", e);
									console.warn(
										"Falla al parsear los datos de la solicitud original:",
										e
									);
								}
							}

							// Atualizando headers
							api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
							//->si hay request origianl tambien a esa hay que actualizarle los headers
							if (originalRequest.headers) {
								originalRequest.headers.Authorization = `Bearer ${data.token}`;
							}

							// Processando fila de requisições que falharam durante o refresh
							failedQueue.forEach((request) => {
								request.onSuccess(data.token);
							});

							console.log("Token atualizado com sucesso");
							//-> ya con los tokens correctos se hace la recuesto original de nuevo
							resolve(api(originalRequest));
						} catch (refreshError) {
							console.log("aqui 3", error);
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
							// se resetean las flags para permitir futuros refreshes
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
				new AppError("Ocurrió un error inesperado", error.code)
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
