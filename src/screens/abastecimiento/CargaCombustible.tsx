import { Fuel, ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/Button";
import { InputCard } from "@/components/InputCard";
import { Loading } from "@/components/Loading";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { toastError } from "@/utils/toastMessage";
import { Select } from "@/components/Select";
import { StackRoutesProps } from "@/route/app.routes";
import { PicoDTO } from "@/dto/PicosDTO";
import { api } from "@/services/api";
import { useAppContext } from "@/hooks/useAppContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CargaZetaDTO } from "@/dto/CargaZetaDTO";

import {
	saveCargaCombustible,
	getStorageCargaCombustible,
	removeCargaCombustible,
} from "@/storage/storageCargaCombustible";

let idAutorizado = 0;

export function CargaCombustible({
	navigation,
	route,
}: StackRoutesProps<"cargaCombustible">) {
	const { sucursal } = useAppContext();

	const idBodega = route.params?.idBodega || "0";

	const [salida, setSalida] = useState(0); // 0=iniciar | 1=cargando | 2=finalizado
	const [cargaCombustible, setCargaCombustible] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [shouldContinue, setShouldContinue] = useState(false);

	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const [picos, setPicos] = useState<PicoDTO[]>([]);
	const [selectedPico, setSelectedPico] = useState<string>("");

	const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);

	const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
		useState<number>(0);

	const [totalizadorPicoFinal, setTotalizadorPicoFinal] =
		useState<number>(0);

	const [estadoRestaurado, setEstadoRestaurado] = useState(false);

	// =====================================================
	// FETCH PICOS
	// =====================================================
	async function fetchPicos() {
		setIsLoading(true);

		try {
			const data = await api.get(`/api/picos/${sucursal.id_sucursal}`);
			const picos: PicoDTO[] = data.data.picos;
			setPicos(picos);
		} catch (error) {
			console.error("Error al buscar picos:", error);
			toastError("Error al buscar picos", "Intente nuevamente más tarde.");
		} finally {
			setIsLoading(false);
		}
	}

	// =====================================================
	// GUARDAR STORAGE
	// =====================================================
	const guardarEstado = useCallback(async () => {
		if (!estadoRestaurado) return;

		try {
			await saveCargaCombustible({
				selectedPico,
				idPico_surtidor,
				salida,
				cargaCombustible,
				totalizadorPicoInicial,
				totalizadorPicoFinal,
				idBodega,
			});
		} catch (error) {
			console.log("[CargaCombustible] Error guardando:", error);
		}
	}, [
		estadoRestaurado,
		selectedPico,
		idPico_surtidor,
		salida,
		cargaCombustible,
		totalizadorPicoInicial,
		totalizadorPicoFinal,
		idBodega,
	]);

	useEffect(() => {
		guardarEstado();
	}, [guardarEstado]);
	

	// =====================================================
	// RESTAURAR STORAGE
	// =====================================================
	useEffect(() => {
		async function restaurarEstado() {
			try {
				const guardado = await getStorageCargaCombustible();

				if (guardado && guardado.idBodega === idBodega) {
					setSelectedPico(guardado.selectedPico);
					setIdPicoSurtidor(
						Number(guardado.idPico_surtidor) || 0
					);

					setCargaCombustible(
						Number(guardado.cargaCombustible) || 0
					);

					setTotalizadorPicoInicial(
						Number(guardado.totalizadorPicoInicial) || 0
					);

					setTotalizadorPicoFinal(
						Number(guardado.totalizadorPicoFinal) || 0
					);

					// Si estaba "cargando", volver a inicio
					setSalida(
						guardado.salida === 1
							? 0
							: Number(guardado.salida) || 0
					);
				} else {
					await removeCargaCombustible();
				}
			} catch (error) {
				console.log(
					"[CargaCombustible] Error restaurando:",
					error
				);
			} finally {
				setEstadoRestaurado(true);
			}
		}

		restaurarEstado();
	}, [idBodega]);

	// =====================================================
	// COMENZAR CARGA
	// =====================================================
	async function handleSalida() {
		if (!selectedPico) {
			Alert.alert(
				"Pico requerido",
				"Debe seleccionar un pico expedidor."
			);
			return;
		}

		const picoSurtidor = picos.find(
			(pico) => pico.id_pico === Number(selectedPico)
		);

		if (!picoSurtidor) {
			Alert.alert(
				"ID Pico Surtidor",
				"El valor para el pico surtidor no fue encontrado."
			);
			return;
		}

		try {
			setIsLoading(true);

			setIdPicoSurtidor(Number(picoSurtidor.id_pico_surtidor));

			const response = await api.post("/api/autorizar", {
				pico: Number(picoSurtidor.id_pico_surtidor),
			});

			if (response.data.respuesta === "NoCargo") {
				toastError(
					"Pico no Retirado",
					"El pico no se ha retirado del surtidor."
				);
				return;
			}

			if (response.data.respuesta !== "Cargando") {
				toastError(
					"Pico no disponible",
					"El pico no está disponible para la carga."
				);
				return;
			}

			idAutorizado = response.data.idUltimaCarga;

			setSalida(1);
			setShouldContinue(true);
		} catch (error) {
			setSalida(0);
			setShouldContinue(false);

			toastError(
				"Registro de Salida",
				"Intente nuevamente más tarde."
			);
		} finally {
			setIsLoading(false);
		}
	}

	// =====================================================
	// CONSULTAR ESTADO DESPACHO
	// =====================================================
	const fetchBox = useCallback(async () => {
		try {
			const response = await api.get(
				`/api/salida-control/${idPico_surtidor}`
			);

			if (response.data.estado === "B") {
				if (response.data.id <= idAutorizado) {
					setSalida(0);
					setShouldContinue(false);
					setIsLoading(false);
					idAutorizado = 0;
					return;
				}

				idAutorizado = 0;

				setSalida(2);
				setShouldContinue(false);

				setTotalizadorPicoInicial(
					Number(response.data.taxiltroInicioDespacho) || 0
				);

				setTotalizadorPicoFinal(
					Number(response.data.taxiltroFinDespacho) || 0
				);

				setCargaCombustible(
					Number(response.data.volumenDespachado) || 0
				);
			}
		} catch (error) {
			console.error("Error al buscar datos:", error);
		}
	}, [idPico_surtidor]);

	// =====================================================
	// LOOP POLLING
	// =====================================================
	const fetchLoop = useCallback(async () => {
		if (!shouldContinue) return;

		await fetchBox();

		if (shouldContinue) {
			intervalRef.current = setTimeout(() => {
				fetchLoop();
			}, 3000);
		}
	}, [fetchBox, shouldContinue]);

	useEffect(() => {
		if (shouldContinue) {
			fetchLoop();
		}

		return () => {
			if (intervalRef.current) {
				clearTimeout(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [shouldContinue, fetchLoop]);

	// =====================================================
	// INIT
	// =====================================================
	useEffect(() => {
		fetchPicos();
	}, []);

	// =====================================================
	// UI
	// =====================================================
	return (
		<View className="flex-1">
			<ScreenHeader title="Abastecimiento" />

			<View className="flex-1 items-center p-4 gap-4">
				<InputCard
					title="Pico expendedor:"
					required={true}
					locked={salida !== 0}
				>
					{salida === 0 && (
						<Select
							data={picos}
							isLoading={isLoading}
							selectedValue={selectedPico}
							setSelectedValue={setSelectedPico}
							labelField="descripcion_pico"
							valueField="id_pico"
						/>
					)}

					{salida !== 0 && (
						<Text className="text-lg text-black font-bold">
							Pico seleccionado: {selectedPico}
						</Text>
					)}
				</InputCard>

				<InputCard
					title=""
					locked={salida === 1}
					verified={salida === 2}
				>
					<View className="flex-row p-2 gap-2">
						<View className="flex-1 justify-center items-center gap-2">
							{salida === 0 && (
								<>
									<Text className="text-xl text-black font-bold">
										Registrar carga
									</Text>

									<Button
										title="Comenzar"
										onPress={handleSalida}
										isLoading={isLoading}
										icon={Fuel}
										iconSize="md"
										iconColor="#000"
									/>
								</>
							)}

							{salida === 1 && (
								<>
									<Text className="text-xl text-black font-bold">
										Cargando...
									</Text>
									<Loading />
								</>
							)}

							{salida === 2 && (
								<>
									<Text className="text-xl text-black font-bold">
										Finalizado
									</Text>

									<Button
										title="Volver"
										onPress={async () => {
											const carga: CargaZetaDTO = {
												id_pico_para_zeta:
													Number(selectedPico),
												taxilitro_inicial:
													totalizadorPicoInicial,
												taxilitro_final:
													totalizadorPicoFinal,
												litros_zeta:
													cargaCombustible,
											};

											await removeCargaCombustible();

											navigation.popTo(
												"abastecimiento",
												{
													onCargaZeta: carga,
												}
											);
										}}
										isLoading={isLoading}
										icon={ArrowLeft}
										iconSize="md"
										iconColor="#000"
									/>
								</>
							)}
						</View>

						<View className="flex-1 items-center gap-2">
							<Text className="text-xl text-black font-bold">
								Litros Cargados
							</Text>

							<Text className="text-2xl text-black font-bold">
								{cargaCombustible}
							</Text>
						</View>
					</View>
				</InputCard>
			</View>
		</View>
	);
}