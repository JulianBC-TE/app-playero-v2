import * as Location from "expo-location";
import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
import { VehiculoDTO } from "@/dto/VehiculoDTO";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackRoutesProps } from "@/route/app.routes";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { Fuel, Pencil, SaveAll, RotateCcw } from "lucide-react-native";
import { toastError, toastSuccess, toastInfo } from "@/utils/toastMessage";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAppContext } from "@/hooks/useAppContext";
import { api } from "@/services/api";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Photo } from "@/components/Photo";
import {
  getStorageSalida,
  removeSalida,
  saveSalida,
  SalidaStorageDTO,
} from "@/storage/storageSalida";

// ─── Tipos de respuesta de la API ───────────────────────────────────────────

type UltimaCargaResponse = {
  id: number;
  id_hrs: number;
  pico: number;
  volumen_ml: string | number; // Prisma BigInt serializado como string
  total_ini: string | number | null;
  total_fin: string | number | null;
  fecha_hora: string;
} | null;

type TotalizadorResponse = {
  pico: number;
  totalizador: number; // litros con 2 decimales
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convierte volumen_ml (BigInt serializado / centilitros*100) a litros.
 * La API guarda volumen_ml dividido por 100 para obtener litros con 2 decimales.
 */
function volumenMlALitros(volumen_ml: string | number): number {
  return Number(volumen_ml) / 100;
}

/**
 * Convierte total_ini / total_fin (taxilitros almacenados como BigInt*100) a litros.
 */
function taxilitroALitros(taxilitro: string | number | null): number {
  if (taxilitro === null || taxilitro === undefined) return 0;
  return Number(taxilitro) / 100;
}

// ─── Form & Schema ────────────────────────────────────────────────────────────

type FormData = {
  horometro?: string | null;
  kilometraje?: string | null;
  observaciones?: string;
};

let idAutorizado = 0;

const registrarSalidaSchema = yup.object({
  horometro: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^[0-9,]*$/, "Solo números y coma permitidos"),
  kilometraje: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^[0-9]*$/, "Solo números permitidos"),
  observaciones: yup
    .string()
    .optional()
    .max(500, "Máximo 500 caracteres permitidos"),
});

// ─── Componente ───────────────────────────────────────────────────────────────

export function Salida({ navigation, route }: StackRoutesProps<"salida">) {
  const { sucursal, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecuperando, setIsRecuperando] = useState(false);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<SalidaStorageDTO | null>(
    null,
  );
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [vehiculo, setVehiculo] = useState<VehiculoDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [salida, setSalida] = useState<number>(0);
  const [cargaCombustible, setCargaCombustible] = useState<string>("000,00");

  const [selectedPico, setSelectedPico] = useState<string>("");
  const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
  const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
    useState<number>(0);
  const [totalizadorPicoFinal, setTotalizadorPicoFinal] = useState<number>(0);

  const [motivoConfirmado, setMotivoConfirmado] = useState(false);

  // Flag: había una carga interrumpida al restaurar (salida guardada === 1)
  const [huboInterrupcion, setHuboInterrupcion] = useState(false);

  const [base64Vehiculo, setBase64Vehiculo] = useState<string>("");
  const [base64Horometro, setBase64Horometro] = useState<string>("");
  const [base64Kilometraje, setBase64Kilometraje] = useState<string>("");
  const [base64Obs, setBase64Obs] = useState<string>("");

  const [obsAdicional, setObsAdicional] = useState<string>("");
  const [shouldContinue, setShouldContinue] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registrarSalidaSchema),
    defaultValues: {
      horometro: "",
      kilometraje: "",
      observaciones: "",
    },
  });

  // ─── Persistencia ────────────────────────────────────────────────────────────

  const guardarEstado = useCallback(async () => {
    if (!estadoRestaurado) return;
    try {
      const estado: SalidaStorageDTO = {
        persona,
        vehiculo,
        firma,
        selectedPico,
        idPico_surtidor,
        salida,
        cargaCombustible,
        totalizadorPicoInicial,
        totalizadorPicoFinal,
        base64Vehiculo,
        base64Horometro,
        base64Kilometraje,
        base64Obs,
        horometro: control._formValues.horometro ?? "",
        kilometraje: control._formValues.kilometraje ?? "",
        observaciones: control._formValues.observaciones ?? "",
        obsAdicional,
        turnoCerrado,
      };
      await saveSalida(estado);
    } catch (error) {
      console.log("[Salida] Error al guardar estado:", error);
    }
  }, [
    estadoRestaurado,
    persona,
    vehiculo,
    firma,
    selectedPico,
    idPico_surtidor,
    salida,
    cargaCombustible,
    totalizadorPicoInicial,
    totalizadorPicoFinal,
    base64Vehiculo,
    base64Horometro,
    base64Kilometraje,
    base64Obs,
    obsAdicional,
    turnoCerrado,
  ]);

  useEffect(() => {
    guardarEstado();
  }, [guardarEstado]);

  // ─── Detección de cambios ─────────────────────────────────────────────────

  const huboCambios = useCallback(() => {
    if (!estadoInicial || !estadoRestaurado) return false;
    const actual: SalidaStorageDTO = {
      persona,
      vehiculo,
      firma,
      selectedPico,
      idPico_surtidor,
      salida,
      cargaCombustible,
      totalizadorPicoInicial,
      totalizadorPicoFinal,
      base64Vehiculo,
      base64Horometro,
      base64Kilometraje,
      base64Obs,
      horometro: control._formValues.horometro ?? "",
      kilometraje: control._formValues.kilometraje ?? "",
      observaciones: control._formValues.observaciones ?? "",
      obsAdicional,
      turnoCerrado,
    };
    return JSON.stringify(actual) !== JSON.stringify(estadoInicial);
  }, [
    estadoInicial,
    estadoRestaurado,
    persona,
    vehiculo,
    firma,
    selectedPico,
    idPico_surtidor,
    salida,
    cargaCombustible,
    totalizadorPicoInicial,
    totalizadorPicoFinal,
    base64Vehiculo,
    base64Horometro,
    base64Kilometraje,
    base64Obs,
    obsAdicional,
    turnoCerrado,
    control._formValues,
  ]);

  // ─── Guardar/Salir ────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || !estadoRestaurado) return;
      //if (!huboCambios()) return;

      e.preventDefault();

      Alert.alert(
        "Salir de salida",
        "Hay cambios sin confirmar. ¿Qué desea hacer?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "¿Estás seguro?",
                "Se perderán todos los datos de esta Salida. Esta acción no se puede deshacer.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sí, salir sin guardar",
                    style: "destructive",
                    onPress: async () => {
                      await removeSalida();
                      setEstadoInicial(null);
                      navigation.dispatch(e.data.action);
                    },
                  },
                ],
              );
            },
          },
          {
            text: "Guardar y salir",
            onPress: async () => {
              await guardarEstado();
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, guardarEstado, huboCambios, isLoading, estadoRestaurado]);

  // ─── Restaurar estado al montar ──────────────────────────────────────────

  useEffect(() => {
    async function restaurarEstado() {
      let guardado: SalidaStorageDTO | null = null;
      try {
        guardado = await getStorageSalida();
        if (guardado) {
          setPersona(guardado.persona);
          setVehiculo(guardado.vehiculo);
          setFirma(guardado.firma);
          setSelectedPico(guardado.selectedPico);
          setIdPicoSurtidor(guardado.idPico_surtidor);
          setCargaCombustible(guardado.cargaCombustible);
          setTotalizadorPicoInicial(
            Number(guardado.totalizadorPicoInicial) || 0,
          );
          setTotalizadorPicoFinal(Number(guardado.totalizadorPicoFinal) || 0);
          setBase64Vehiculo(guardado.base64Vehiculo);
          setBase64Horometro(guardado.base64Horometro);
          setBase64Kilometraje(guardado.base64Kilometraje);
          setBase64Obs(guardado.base64Obs);
          setValue("horometro", guardado.horometro);
          setValue("kilometraje", guardado.kilometraje);
          setValue("observaciones", guardado.observaciones);
          setObsAdicional(guardado.obsAdicional);
          if (guardado.obsAdicional) setMotivoConfirmado(true);
          setTurnoCerrado(guardado.turnoCerrado);
          setEstadoInicial(guardado);

          // ── NUEVO: detectar interrupción durante la carga ──────────────────
          if (guardado.salida === 1) {
            // Había una carga en curso cuando la app se cerró.
            // Volvemos a estado 0 y marcamos la interrupción para mostrar el Alert.
            console.log("salida = ", guardado.salida)
            setSalida(0);
            setHuboInterrupcion(true);
          } else {
            setSalida(guardado.salida);
          }
        }
      } catch (error) {
        console.log("[Salida] Error al restaurar estado:", error);
      } finally {
        if (!guardado) {
          setEstadoInicial({
            persona: null,
            vehiculo: null,
            firma: null,
            selectedPico: "",
            idPico_surtidor: 0,
            salida: 0,
            cargaCombustible: "000,00",
            totalizadorPicoInicial: 0,
            totalizadorPicoFinal: 0,
            base64Vehiculo: "",
            base64Horometro: "",
            base64Kilometraje: "",
            base64Obs: "",
            horometro: "",
            kilometraje: "",
            observaciones: "",
            obsAdicional: "",
            turnoCerrado: false,
          });
        }
        setEstadoRestaurado(true);
      }
    }
    restaurarEstado();
  }, []);

  // ─── Alert de recuperación (se dispara después de restaurar) ─────────────

  useEffect(() => {
    if (!huboInterrupcion || !estadoRestaurado){console.log("No mostrar mensaje de alerta");return;}

    // Solo mostramos el Alert si tenemos un pico surtidor guardado para consultar
    if (idPico_surtidor === 0) {
      setHuboInterrupcion(false);
      return;
    }

    Alert.alert(
      "Carga interrumpida",
      "La app se cerró durante una carga en curso. ¿Desea intentar recuperar los litros cargados?",
      [
        {
          text: "Recuperar",
          onPress: () => {
            setHuboInterrupcion(false);
            setShouldContinue(true);
            setSalida(1)
            //handleRecuperarCarga();
            fetchLoop();
          },
        },
        {
          text: "Empezar de nuevo",
          style: "cancel",
          onPress: () => {
            setHuboInterrupcion(false);
            // Limpiamos los totalizadores para que no aparezca el botón "Recuperar"
            setTotalizadorPicoInicial(0);
            setTotalizadorPicoFinal(0);
          },
        },
      ],
      { cancelable: false },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huboInterrupcion, estadoRestaurado]);

  // ─── Recuperación de carga perdida ───────────────────────────────────────

  /**
   * Intenta recuperar los litros de una carga que ocurrió pero no fue capturada.
   *
   * Estrategia:
   * 1. Llama a GET /abastecimientos/ultimacarga/:pico (sincroniza + consulta BD)
   *    - Si total_ini coincide con totalizadorPicoInicial guardado → carga correcta, usarla.
   *    - Si no hay coincidencia pero hay datos → usar como mejor estimación.
   * 2. Fallback: GET /api/totalizador/:pico → litros = totalizadorActual - totalizadorPicoInicial
   * 3. Si todo falla → toastError y el playero ingresa los litros manualmente.
   */
  /*async function handleRecuperarCarga() {
    if (idPico_surtidor === 0) {
      toastError(
        "Recuperación fallida",
        "No hay pico surtidor registrado. Seleccioná el pico e intentá nuevamente.",
      );
      return;
    }
    console.log("intentando recuperar");

    setIsRecuperando(true);
    try {
      // ── Intento 1: última carga de la BD ─────────────────────────────────
      let recuperado = false;
      try {
        const res = await api.get<UltimaCargaResponse>(
          `/abastecimientos/ultimacarga/${idPico_surtidor}`,
        );
        const ultimaCarga = res.data;

        if (ultimaCarga && ultimaCarga.volumen_ml !== undefined) {
          const litros = volumenMlALitros(ultimaCarga.volumen_ml);
          const taxIni = taxilitroALitros(ultimaCarga.total_ini);
          const taxFin = taxilitroALitros(ultimaCarga.total_fin);

          // Verificamos si esta carga corresponde a la que iniciamos.
          // Si guardamos un totalizadorPicoInicial > 0, comparamos con tolerancia de 1 litro.
          const totalIniGuardado = totalizadorPicoInicial;
          const esLaCargaCorrecta =
            totalIniGuardado === 0 || // No tenemos referencia → aceptamos
            Math.abs(taxIni - totalIniGuardado) < 1; // Tolerancia 1 litro

          if (litros > 0) {
            setTotalizadorPicoInicial(taxIni);
            setTotalizadorPicoFinal(taxFin);
            setCargaCombustible(litros.toFixed(2));
            setSalida(2);
            recuperado = true;

            if (esLaCargaCorrecta) {
              toastSuccess(
                "Carga recuperada",
                `Se recuperaron ${litros.toFixed(2)} litros del pico ${idPico_surtidor}.`,
              );
            } else {
              // Datos recuperados, pero el taxilitro inicial no coincide exactamente.
              // Podría ser una carga diferente. Avisamos al playero.
              toastInfo(
                "Carga recuperada con advertencia",
                `Se encontraron ${litros.toFixed(2)} L, pero verificá que correspondan a esta carga.`,
              );
            }
          }
        }
      } catch (errUltimaCarga) {
        console.warn(
          "[Salida] handleRecuperarCarga: fallo en ultimacarga, intentando totalizador.",
          errUltimaCarga,
        );
      }

      // ── Intento 2 (fallback): totalizador actual − totalizador inicial ────
      if (!recuperado && totalizadorPicoInicial > 0) {
        try {
          const res = await api.get<TotalizadorResponse>(
            `/api/totalizador/${idPico_surtidor}`,
          );
          const totalizadorActual = res.data.totalizador;
          const litros = totalizadorActual - totalizadorPicoInicial;

          if (litros > 0) {
            setTotalizadorPicoFinal(totalizadorActual);
            setCargaCombustible(litros.toFixed(2));
            setSalida(2);
            recuperado = true;
            toastSuccess(
              "Carga recuperada (estimada)",
              `Se estimaron ${litros.toFixed(2)} L usando el totalizador actual del pico.`,
            );
          } else {
            // litros <= 0: el totalizador no avanzó (carga no ocurrió realmente)
            toastError(
              "Sin carga detectada",
              "El totalizador no registró movimiento. La carga puede no haberse realizado.",
            );
          }
        } catch (errTotalizador) {
          console.warn(
            "[Salida] handleRecuperarCarga: fallo en totalizador.",
            errTotalizador,
          );
        }
      }

      // ── Intento 3: sin referencia de totalizador inicial ─────────────────
      if (!recuperado && totalizadorPicoInicial === 0) {
        toastError(
          "Recuperación fallida",
          "No hay referencia del totalizador inicial. Ingresá los litros manualmente en Observaciones.",
        );
        // Pasamos a estado 2 igual para que el playero pueda grabar con datos manuales
        setSalida(2);
      }

      // Si llegamos acá y recuperado sigue false (todos los intentos fallaron con error)
      if (!recuperado && totalizadorPicoInicial > 0) {
        toastError(
          "Recuperación fallida",
          "No se pudo contactar al servidor. Verificá la conexión e intentá nuevamente.",
        );
      }
    } finally {
      setIsRecuperando(false);
    }
  }*/

  // ─── Fotos ───────────────────────────────────────────────────────────────

  function handlePhotoVehiculo(base64: string) {
    setBase64Vehiculo(base64);
  }
  function handlePhotoHorometro(base64: string) {
    setBase64Horometro(base64);
  }
  function handlePhotoKilometraje(base64: string) {
    setBase64Kilometraje(base64);
  }
  function handlePhotoObs(base64: string) {
    setBase64Obs(base64);
  }

  // ─── Picos ───────────────────────────────────────────────────────────────

  async function fetchPicos() {
    setIsLoading(true);
    try {
      const turno = await api.get(
        `api/registros/turno/status/${sucursal.id_sucursal}`,
      );
      const turnoData: StatusTurnoDTO = {
        status: turno.data.status,
        Inicio_turno: turno.data.Inicio_turno,
        Fin_turno: turno.data.Fin_turno,
        Fin_turno_anterior: turno.data.Fin_turno_anterior,
      };
      if (turnoData.status === "cerrado" || turnoData.status == "falta_cerrar")
        setTurnoCerrado(true);

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

  // ─── Grabar ticket ───────────────────────────────────────────────────────

  async function handleSaveAll() {
    let id_bodega = 0;
    let id_pico_surtidor = 0;

    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);
    picos.map((pico) => {
      if (pico.id_pico === Number(selectedPico)) {
        id_bodega = pico.id_bodega;
        id_pico_surtidor = pico.id_pico_surtidor;
        setIdPicoSurtidor(pico.id_pico_surtidor);
      }
    });

    const data = {
      json: {
        id_suc: sucursal.id_sucursal,
        id_bod: id_bodega,
        id_pico: Number(selectedPico),
        id_vehiculo: vehiculo?.id_vehiculo || "",
        id_playero: Number(user.cedula),
        id_operador: Number(persona?.cedula),
        litros: Number(cargaCombustible),
        kilometraje: Number(control._formValues.kilometraje) || 0,
        horometro:
          Number((control._formValues.horometro || "").replace(",", ".")) || 0,
        inicio_taxilitro: Number(totalizadorPicoInicial) || 0,
        fin_taxilitro: Number(totalizadorPicoFinal) || 0,
        ruc_cliente: "",
        fecha: fecha,
        hora: hora,
        precio: 0,
        foto_chapa: base64Vehiculo ? [base64Vehiculo] : [],
        firma_conductor: firma ? [firma] : [],
        foto_kilometraje: base64Kilometraje ? [base64Kilometraje] : [],
        foto_horometro: base64Horometro ? [base64Horometro] : [],
        ubicacion_carga: location
          ? `https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`
          : "",
        observaciones_ticket:
          control._formValues.observaciones + " >>" + obsAdicional || "",
        foto_observaciones: base64Obs ? [base64Obs] : [],
      },
    };

    try {
      setIsLoading(true);
      await api.post("/api/tickets", data);
      setIsLoading(false);

      await removeSalida();
      setPersona(null);
      setVehiculo(null);
      setFirma(null);
      setBase64Vehiculo("");
      setBase64Horometro("");
      setBase64Kilometraje("");
      setBase64Obs("");
      reset();
      setSalida(0);
      setCargaCombustible("000,00");
      setTotalizadorPicoInicial(0);
      setTotalizadorPicoFinal(0);
      setHuboInterrupcion(false);
      toastSuccess("Registro de Salida", "Salida registrada exitosamente.");
      navigation.navigate("home");
    } catch (error) {
      console.error("Error al guardar los datos:", error);
      toastError("Registro de Salida", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Iniciar carga ───────────────────────────────────────────────────────

  async function handleSalida({
    kilometraje,
    horometro,
    observaciones,
  }: FormData) {
    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un operador.");
      return;
    }
    if (!vehiculo) {
      Alert.alert("Vehículo requerido", "Debe seleccionar un vehículo.");
      return;
    }
    if (base64Vehiculo === "") {
      Alert.alert(
        "Foto requerida",
        "Debe capturar una foto de la chapa o el código del vehículo.",
      );
      return;
    }
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
      return;
    }
    if (kilometraje === "" && horometro === "") {
      Alert.alert(
        "Campos requeridos",
        "Debe completar al menos uno de los campos: Horómetro o Kilometraje.",
      );
      return;
    }
    if (horometro !== "" && base64Horometro === "") {
      Alert.alert("Foto requerida", "Debe capturar una foto del horómetro.");
      return;
    }
    if (kilometraje !== "" && base64Kilometraje === "") {
      Alert.alert("Foto requerida", "Debe capturar una foto del kilometraje.");
      return;
    }
    const picoSurtidor = picos.find(
      (pico) => pico.id_pico === Number(selectedPico),
    );
    if (!picoSurtidor) {
      Alert.alert(
        "ID Pico Surtidor",
        "El valor para el pico surtidor no fue encontrado.",
      );
      return;
    }

    try {
      setIsLoading(true);

      // Capturamos el totalizador ANTES de autorizar para tener referencia de recuperación
      let totalizadorAntes = 0;
      try {
        const resTot = await api.get<TotalizadorResponse>(
          `/api/totalizador/${picoSurtidor.id_pico_surtidor}`,
        );
        totalizadorAntes = resTot.data.totalizador;
      } catch (errTot) {
        console.warn("[Salida] No se pudo obtener totalizador previo:", errTot);
        // No bloqueamos la carga, el fallback de recuperación simplemente no tendrá referencia
      }

      setIdPicoSurtidor(Number(picoSurtidor.id_pico_surtidor));
      setTotalizadorPicoInicial(totalizadorAntes);

      const response = await api.post("/api/autorizar", {
        pico: Number(picoSurtidor.id_pico_surtidor),
      });

      if (response.data.respuesta === "NoCargo") {
        toastError(
          "Pico no Retirado",
          "El pico no se ha retirado del surtidor.",
        );
        return;
      } else if (response.data.respuesta !== "Cargando") {
        toastError(
          "Pico no disponible",
          "El pico no está disponible para la carga.",
        );
        return;
      }

      idAutorizado = response.data.idUltimaCarga;
      setSalida(1);
      setShouldContinue(true);
    } catch (error) {
      setSalida(0);
      setShouldContinue(false);
      console.log("Error al autorizar la carga:", error);
      toastError("Registro de Salida", "Intente nuevamente más tarde.");
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (sucursal) {
      fetchPicos();
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permiso de ubicación denegado");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  useEffect(() => {
    if (route.params?.onPersona) setPersona(route.params.onPersona);
    if (route.params?.onVehiculo) setVehiculo(route.params.onVehiculo);
    if (route.params?.onFirma) setFirma(route.params.onFirma);
  }, [
    route.params?.onPersona,
    route.params?.onVehiculo,
    route.params?.onFirma,
  ]);

  // ─── Polling de estado del surtidor ──────────────────────────────────────

  const fetchBox = useCallback(async () => {
    try {
      const response = await api.get(`/api/salida-control/${idPico_surtidor}`);

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
        setTotalizadorPicoInicial(response.data.taxiltroInicioDespacho);
        setTotalizadorPicoFinal(response.data.taxiltroFinDespacho);
        setCargaCombustible(response.data.volumenDespachado.toFixed(2));
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  }, [idPico_surtidor, setSalida, setShouldContinue, setCargaCombustible]);

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

  // ─── Bloquear botón físico de retroceso ──────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (salida === 1 || salida === 2) return true;
        return false;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [salida]),
  );

  // ─── Render: turno cerrado ────────────────────────────────────────────────

  if (turnoCerrado && !motivoConfirmado) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Salida Excepcional" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.overlay}>
              <View style={styles.modalContent}>
                <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
                  Importente!!!
                </Text>
                <Text className="font-medium text-justify text-xl mb-4">
                  Está intentando registrar una salida y el turno se encuentra
                  cerrado. Una vez finalizada la/s carga/s se deberá realizar el
                  cierre correspondiente en el apartado "Cierre Extra", para las
                  bodegas que hayan sufrido movimientos.
                </Text>
                <InputCard
                  className="min-h-40"
                  title="Indique el motivo"
                  required
                >
                  <Input
                    value={obsAdicional}
                    placeholder="Describa el motivo"
                    multiline
                    numberOfLines={4}
                    onChangeText={setObsAdicional}
                  />
                </InputCard>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    if (obsAdicional.trim() === "") {
                      Alert.alert(
                        "Motivo requerido",
                        "Por favor describa el motivo.",
                      );
                      return;
                    }
                    setMotivoConfirmado(true);
                    setTurnoCerrado(false);
                  }}
                >
                  <Text style={styles.buttonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ─── Render: flujo normal ─────────────────────────────────────────────────

  return (
    <View className="flex-1">
      <ScreenHeader
        title="Salida Combustible"
        disableBackButton={salida === 1 || salida === 2}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center p-4 gap-4">
            {/* Chofer/Operador */}
            <InputCard
              title="Chofer/Operador"
              required={true}
              locked={salida !== 0}
            >
              <TextSearch
                enabled={salida === 0}
                textValue={persona?.nombre_apellido}
                placeholder="Buscar persona"
                onPress={() =>
                  navigation.navigate("buscarpersona", {
                    enabledSelect: true,
                    fromScreen: "salida",
                  })
                }
              />
            </InputCard>

            {/* Equipo/Vehículo */}
            <InputCard
              title="Equipo/Vehículo"
              required={true}
              locked={salida !== 0}
            >
              <View className="flex-row items-center p-2 gap-2">
                <TextSearch
                  enabled={salida === 0}
                  textValue={vehiculo?.descripcion_vehiculo}
                  placeholder="Buscar vehículo"
                  onPress={() =>
                    navigation.navigate("buscarvehiculo", {
                      enabledSelect: true,
                      fromScreen: "salida",
                    })
                  }
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={
                    base64Vehiculo.length > 0
                      ? "#05a722"
                      : salida !== 0
                        ? "#756868eb"
                        : "#000"
                  }
                  setImage={handlePhotoVehiculo}
                  disabled={salida !== 0}
                />
              </View>
            </InputCard>

            {/* Pico expendedor */}
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

            {/* Horómetro */}
            <InputCard title="Horómetro" locked={salida !== 0}>
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="horometro"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      editable={salida === 0}
                      keyboardType="number-pad"
                      align="center"
                      placeholder="Informe el horómetro"
                      value={value ?? ""}
                      onChangeText={onChange}
                      errorMessage={errors.horometro?.message}
                    />
                  )}
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={
                    base64Horometro.length > 0
                      ? "#05a722"
                      : salida !== 0
                        ? "#756868eb"
                        : "#000"
                  }
                  setImage={handlePhotoHorometro}
                  disabled={salida !== 0}
                />
              </View>
            </InputCard>

            {/* Kilometraje */}
            <InputCard title="Kilometraje" locked={salida !== 0}>
              <View className="flex-row items-center p-2 gap-2">
                <Controller
                  control={control}
                  name="kilometraje"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      editable={salida === 0}
                      keyboardType="number-pad"
                      align="center"
                      placeholder="Informe el kilometraje"
                      value={value ?? ""}
                      onChangeText={onChange}
                      errorMessage={errors.kilometraje?.message}
                    />
                  )}
                />
                <Photo
                  form="icon"
                  iconSize="lg"
                  iconColor={
                    base64Kilometraje.length > 0
                      ? "#05a722"
                      : salida !== 0
                        ? "#756868eb"
                        : "#000"
                  }
                  setImage={handlePhotoKilometraje}
                  disabled={salida !== 0}
                />
              </View>
            </InputCard>

            {/* Panel de carga */}
            <InputCard title="" locked={salida !== 0}>
              <View className="flex-row p-2 gap-2">
                {/* Columna izquierda: acciones */}
                <View className="flex-1 justify-center items-center gap-2">
                  {salida === 0 && (
                    <>
                      <Text className="text-xl text-black font-bold">
                        Registrar carga
                      </Text>
                      <Button
                        title="Comenzar"
                        onPress={handleSubmit(handleSalida)}
                        isLoading={isLoading}
                        icon={Fuel}
                        iconSize="md"
                        iconColor="#000"
                      />

                      {/* ── NUEVO: botón Recuperar carga ────────────────────────
                          Visible cuando hay un totalizador inicial guardado
                          (indica que hubo una carga previa que no se completó).      */}
                      {/*totalizadorPicoInicial > 0 && idPico_surtidor > 0 && (
                        <Button
                          title="Recuperar carga"
                          onPress={handleRecuperarCarga}
                          isLoading={isRecuperando}
                          icon={RotateCcw}
                          iconSize="md"
                          iconColor="#c47d00"
                        />
                      )*/}
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
                        title="Recuperar Carga"
                        onPress={fetchBox}
                        isLoading={isRecuperando}
                        icon={RotateCcw}
                        iconSize="md"
                        iconColor="#ffffff"
                        style={{ width: 180, padding: 3 }}
                      />
                    </>
                  )}
                </View>

                {/* Columna derecha: litros */}
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

            {/* Observaciones y botones de firma/grabar (solo en estado 2) */}
            {salida === 2 && (
              <>
                <InputCard title="Observaciones">
                  <View className="flex-row items-center p-2 gap-2">
                    <Controller
                      control={control}
                      name="observaciones"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          multiline
                          numberOfLines={4}
                          placeholder="observaciones"
                          value={value}
                          onChangeText={onChange}
                        />
                      )}
                    />
                    <View className="flex-col gap-6">
                      <Photo
                        form="icon"
                        iconSize="lg"
                        iconColor={base64Obs.length > 0 ? "#05a722" : "#000"}
                        setImage={handlePhotoObs}
                        disabled={isLoading}
                      />
                    </View>
                  </View>
                </InputCard>
                <View className="flex-row gap-4">
                  <Button
                    title="Firmar"
                    onPress={() =>
                      navigation.navigate("firma", {
                        fromScreen: "salida",
                        persona: persona,
                      })
                    }
                    isLoading={isLoading}
                    icon={Pencil}
                    iconSize="md"
                    iconColor="#000"
                  />
                  {firma && (
                    <Button
                      title="Grabar"
                      onPress={() => handleSaveAll()}
                      isLoading={isLoading}
                      icon={SaveAll}
                      iconSize="md"
                      iconColor="#000"
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
  },
  modalContent: {
    marginTop: 100,
    width: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
