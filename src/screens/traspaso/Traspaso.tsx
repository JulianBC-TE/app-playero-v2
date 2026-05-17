import { Input } from "@/components/Input";
import { InputCard } from "@/components/InputCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextSearch } from "@/components/TextSearch";
import { PersonaDTO } from "@/dto/PersonaDTO";
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
import {
  CheckCheck,
  Fuel,
  Pencil,
  RulerDimensionLine,
  SaveAll,
} from "lucide-react-native";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { useAppContext } from "@/hooks/useAppContext";
import { PicoDTO } from "@/dto/PicosDTO";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { BodegaDTO } from "@/dto/BodegaDTO";
import { TraspasoDTO } from "@/dto/TraspasoDTO";
import {
  getStorageTraspaso,
  removeTraspaso,
  saveTraspaso,
} from "@/storage/storageTraspaso";
import {
  getStoragePersona,
  removePersona,
  savePersona,
} from "@/storage/storagePersona";
import { Photo } from "@/components/Photo";
// BD — reemplaza api
import {
  getBodegasByIdSucursal,
  getBodegasTraspaso,
} from "@DBmodules/bodegaDB";
import { getPicosByBodega } from "@DBmodules/picoDB";
import { getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { saveTraspasoLocal } from "@DBmodules/traspasoDB";
import { getNuevoDespachoByPico } from "@DBmodules/despachoDB";

//let idAutorizado = 0;
//let continuarCarga = false;

export function Traspaso({ navigation, route }: StackRoutesProps<"traspaso">) {
  const idAutorizadoRef = useRef<number>(0);
  const continuarCargaRef = useRef<boolean>(false);
  const lastIdProcesadoRef = useRef<number>(0);
  const timestampReferenciaRef = useRef<number>(0);
  const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const [selectedBodegaOrigem, setSelectedBodegaOrigem] = useState<string>("");
  const [selectedBodegaDestino, setSelectedBodegaDestino] =
    useState<string>("");
  const [bodegaOrigem, setBodegaOrigem] = useState<BodegaDTO[]>([]);
  const [bodegaDestino, setBodegaDestino] = useState<BodegaDTO[]>([]);
  const { sucursal, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [turnoCerrado, setTurnoCerrado] = useState(false);
  const [medicionInicial, setMedicionInicial] = useState<MedicionDTO[]>([]);
  const [medicionFinal, setMedicionFinal] = useState<MedicionDTO[]>([]);
  const [picos, setPicos] = useState<PicoDTO[]>([]);
  const [persona, setPersona] = useState<PersonaDTO | null>(null);
  const [firma, setFirma] = useState<string | null>(null);
  const [salida, setSalida] = useState<number>(0);

  const [motivoConfirmado, setMotivoConfirmado] = useState(false);
  //const [cargaCombustible, setCargaCombustible] = useState<number>(0.0);
  const [cargaCombustible, setCargaCombustible] = useState<string>("000,00");
  const [selectedPico, setSelectedPico] = useState<string>("");
  const [idPico_surtidor, setIdPicoSurtidor] = useState<number>(0);
  const [totalizadorPicoInicial, setTotalizadorPicoInicial] =
    useState<number>(0);
  const [totalizadorPicoFinal, setTotalizadorPicoFinal] = useState<number>(0);

  const [base64Obs, setBase64Obs] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [obsAdicional, setObsAdicional] = useState<string>("");
  const [shouldContinue, setShouldContinue] = useState(false);
  const shouldContinueRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [estadoRestaurado, setEstadoRestaurado] = useState(false);
  const [litrosCarga, setLitrosCarga] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<{
    persona: PersonaDTO | null;
    selectedBodegaOrigem: string;
    selectedBodegaDestino: string;
    selectedPico: string;
    obs: string;
    obsAdicional: string;
  } | null>(null);

  const setAndRefShouldContinue = (val: boolean) => {
    shouldContinueRef.current = val;
    setShouldContinue(val);
  };

  // helper para converter string "1.234,56" ou "1234.56" em número
  const toNumber = (v: unknown) => {
    if (typeof v === "number") return v;
    const s = String(v ?? "").trim();
    if (!s) return 0;
    // remove separador de milhar e normaliza vírgula para ponto
    return Number(s.replace(/\./g, "").replace(",", "."));
  };

  async function fetchPicos() {
    setIsLoading(true);
    try {
      const turnoStatus = await getTurnoStatusLocal(sucursal.id_sucursal);
      if (
        turnoStatus.status === "cerrado" ||
        turnoStatus.status === "falta_cerrar"
      ) {
        setTurnoCerrado(true);
      }
      const picosDB = await getPicosByBodega(Number(selectedBodegaOrigem));
      setPicos(picosDB);
      setSelectedPico(picosDB[0]?.id_pico.toString() || "");
      setEstadoRestaurado(true);
    } catch (error) {
      toastError("Error al buscar picos", "Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBodegas() {
    try {
      setIsLoading(true);
      const bodegasOrigen = await getBodegasByIdSucursal(sucursal.id_sucursal);
      setBodegaOrigem(bodegasOrigen);
      if (bodegasOrigen.length === 1) {
        setSelectedBodegaOrigem(bodegasOrigen[0].id_bodega);
      }
      const bodegasDestino = await getBodegasTraspaso(sucursal.id_sucursal);
      setBodegaDestino(bodegasDestino);
    } catch (error) {
      toastError("Error al buscar bodega", "Intente nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveState() {
    if (continuarCargaRef.current) return;

    const now = new Date();

    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    // Leer lo que ya hay en storage para no pisar litros ni totalizadores
    const existing = await getStorageTraspaso();

    const data: TraspasoDTO = {
      json: {
        bod_origen: Number(selectedBodegaOrigem),
        bod_destino: Number(selectedBodegaDestino),
        id_tanque_destino: Number(medicionInicial[0]?.id_tanque ?? 0),
        regla_altura_inicial: medicionInicial[0]?.regla.toString() ?? "",
        litros_tanque_inicial: medicionInicial[0]?.litros ?? 0,
        temp_inicial: medicionInicial[0]?.temperatura ?? 0,
        regla_altura_final: existing?.json?.regla_altura_final ?? "",
        litros_tanque_final: existing?.json?.litros_tanque_final ?? 0,
        temp_final: existing?.json?.temp_final ?? 0,
        foto_medicion_final: existing?.json?.foto_medicion_final ?? [],
        id_pico: Number(selectedPico),
        taxilitro_inicial:
          existing?.json?.taxilitro_inicial ?? totalizadorPicoInicial,
        taxilitro_final:
          existing?.json?.taxilitro_final ?? totalizadorPicoFinal,
        litros_pico: existing?.json?.litros_pico ?? 0, // ← preserva lo que fetchBox guardó
        last_id_salida: existing?.json?.last_id_salida ?? 0,
        obs_traspaso: obs,
        obs_adicional: obsAdicional,
        foto_obs_traspaso: base64Obs ? [base64Obs] : [],
        foto_medicion_inicial: medicionInicial[0]?.foto_tanque
          ? [medicionInicial[0].foto_tanque]
          : [],
        fecha: existing?.json?.fecha ?? fecha,
        hora: existing?.json?.hora ?? hora,
        firma_receptor: existing?.json?.firma_receptor ?? [],
        id_playero: Number(user.cedula),
        id_encargado_receptor: Number(persona?.cedula) || 0,
      },
    };

    await saveTraspaso(data);
    await savePersona(persona);
    return data;
  }

  const huboCambios = useCallback(() => {
    if (!estadoInicial || !estadoRestaurado) return false;
    const actual = {
      persona,
      selectedBodegaOrigem,
      selectedBodegaDestino,
      selectedPico,
      obs,
      obsAdicional,
    };
    return JSON.stringify(actual) !== JSON.stringify(estadoInicial);
  }, [
    estadoInicial,
    estadoRestaurado,
    persona,
    selectedBodegaOrigem,
    selectedBodegaDestino,
    selectedPico,
    obs,
    obsAdicional,
  ]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isLoading || !estadoRestaurado) return;
      // Bloquear completamente si hay carga activa
      if (salida === 1) {
        e.preventDefault();
        return;
      }
      //if (!huboCambios()) return;

      e.preventDefault();

      Alert.alert(
        "Salir de traspaso",
        "Hay cambios sin confirmar. ¿Qué desea hacer?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "¿Estás seguro?",
                "Se perderán todos los datos de este Traspaso. Esta acción no se puede deshacer.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sí, salir sin guardar",
                    style: "destructive",
                    onPress: async () => {
                      await removeTraspaso();
                      await removePersona();
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
              // En traspaso el estado ya se guarda explícitamente con saveState()
              // Solo navegamos — el storage ya tiene lo último guardado
              //saveState();
              if (medicionInicial?.length > 0) {
                console.log("guardando medicion inicial");
                saveState();
              }
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [
    navigation,
    huboCambios,
    isLoading,
    estadoRestaurado,
    salida,
    removeTraspaso,
    removePersona,
  ]);

  async function handleSaveAll() {
    if (medicionFinal.length === 0) {
      Alert.alert(
        "Medición final es requerida",
        "Debe registrar la medición final del tanque receptor.",
      );
      return;
    }
    if (!firma) {
      Alert.alert("Firma requerida", "Debe registrar la firma del receptor.");
      return;
    }

    try {
      const data: TraspasoDTO = await getStorageTraspaso();

      data.json.firma_receptor = firma ? [firma] : [];
      data.json.regla_altura_final = medicionFinal[0].regla.toString();
      data.json.litros_tanque_final = medicionFinal[0].litros;
      data.json.temp_final = medicionFinal[0].temperatura;
      data.json.foto_medicion_final = medicionFinal[0].foto_tanque
        ? [medicionFinal[0].foto_tanque]
        : [];
      data.json.obs_traspaso = [data.json.obs_traspaso, obsAdicional]
        .filter((s) => s?.trim())
        .join(" >> ");
      data.json.litros_pico = Number(cargaCombustible.replace(",", "."));
      data.json.taxilitro_inicial = totalizadorPicoInicial;
      data.json.taxilitro_final = totalizadorPicoFinal;

      // Clonar y limpiar campos internos
      const payload = { ...data.json };
      delete (payload as any).last_id_salida;
      delete (payload as any).obs_adicional;

      setIsLoading(true);

      // Guardar en BD local (pendiente de sync con el servidor)
      await saveTraspasoLocal(payload);

      toastSuccess("Traspaso", "Traspaso guardado exitosamente.");
      await removeTraspaso();
      await removePersona();
      navigation.navigate("home");
    } catch (error) {
      console.log(error);
      toastError("Traspaso", "Ocurrió un error al guardar el traspaso.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTraspaso() {
    if (!persona) {
      Alert.alert("Persona requerida", "Debe seleccionar un chofer/operador.");
      return;
    }
    if (!selectedBodegaOrigem) {
      Alert.alert(
        "Bodega de origen requerida",
        "Debe seleccionar una bodega origen.",
      );
      return;
    }
    if (!selectedBodegaDestino) {
      Alert.alert(
        "Bodega de destino requerida",
        "Debe seleccionar una bodega destino.",
      );
      return;
    }
    if (!selectedPico) {
      Alert.alert("Pico requerido", "Debe seleccionar un pico expedidor.");
      return;
    }

    const picoSurtidor = picos.find(
      (pico) => pico.id_pico === Number(selectedPico),
    );
    setIdPicoSurtidor(Number(picoSurtidor?.id_pico_surtidor));

    if (!picoSurtidor || picoSurtidor.id_pico_surtidor === 0) {
      Alert.alert(
        "ID Pico Surtidor",
        "El valor para el pico surtidor no fue encontrado.",
      );
      return;
    }
    if (medicionInicial.length === 0) {
      Alert.alert(
        "Medición Inicial requerida",
        "Debe registrar la medición inicial del tanque receptor.",
      );
      return;
    }

    // Guardar estado antes de iniciar la espera
    if (!continuarCargaRef.current) saveState();

    // Marca el momento de inicio del despacho
    timestampReferenciaRef.current = Date.now();

    setSalida(1);
    setAndRefShouldContinue(true);
  }

  const promptStartIfNeeded = (stored: TraspasoDTO) => {
    const litros = Number(stored?.json?.litros_pico) || 0;
    // Si no hay litros y hay datos básicos, ofrece iniciar
    if (litros === 0) {
      Alert.alert(
        "Traspaso pendiente",
        "Aún no se despachó combustible. ¿Desea iniciar la carga ahora?",
        [
          {
            text: "Sí",
            onPress: () => {
              continuarCargaRef.current = false; // es una 1ª tanda
              setSalida(1);
              setIsLoading(true);
              setAndRefShouldContinue(true);
              handleTraspaso(); // reautoriza y entra al loop
            },
          },
          {
            text: "No",
            onPress: () => {
              // Permite seguir editando cabecera / volver cuando quieras
              setSalida(0);
              setIsLoading(false);
              setAndRefShouldContinue(false);
            },
            style: "cancel",
          },
        ],
      );
    }
  };

  const promptResumeIfNeeded = (stored: TraspasoDTO) => {
    const litros = Number(stored?.json?.litros_pico) || 0;
    const lastId = Number(stored?.json?.last_id_salida) || 0;
    if (litros > 0 && lastId > 0) {
      Alert.alert(
        "Traspaso pendiente",
        `Tiene ${litros.toFixed(2)} L registrados. ¿Desea continuar con otra tanda?`,
        [
          {
            text: "Sí",
            onPress: () => {
              continuarCargaRef.current = true;
              // Preparar e iniciar nueva tanda
              setSalida(1);
              setIsLoading(true);
              setAndRefShouldContinue(true);
              handleTraspaso();
            },
          },
          {
            text: "No",
            onPress: () => {
              // Mantener pendiente sin polling
              continuarCargaRef.current = false;
              setSalida(2);
              setIsLoading(false);
              setAndRefShouldContinue(false);
            },
            style: "cancel",
          },
        ],
      );
    }
  };

  useEffect(() => {
    if (sucursal) {
      fetchBodegas();

      (async () => {
        //await removeTraspaso();
        //await removePersona();
        const storedTraspaso = await getStorageTraspaso();

        if (storedTraspaso && storedTraspaso.json) {
          const { json } = storedTraspaso;
          const personaStorage = await getStoragePersona();

          setSelectedBodegaOrigem(json.bod_origen.toString());
          setSelectedBodegaDestino(json.bod_destino.toString());
          setSelectedPico(json.id_pico.toString());
          setTotalizadorPicoInicial(json.taxilitro_inicial);
          setCargaCombustible(
            (storedTraspaso.json.litros_pico ?? 0).toFixed(2),
          );
          setTotalizadorPicoFinal(json.taxilitro_final);
          setBase64Obs(json.foto_obs_traspaso[0] || "");
          setObs(json.obs_traspaso ?? "");
          setObsAdicional(json.obs_adicional ?? "");
          setMotivoConfirmado(!!json.obs_adicional?.trim());
          if (json.id_tanque_destino /*&& json.litros_tanque_inicial > 0*/) {
            console.log("restaurandomedicion inicial");
            setMedicionInicial([
              {
                id_tanque: json.id_tanque_destino.toString(),
                regla: Number(json.regla_altura_inicial),
                litros: json.litros_tanque_inicial,
                temperatura: json.temp_inicial,
                foto_tanque: json.foto_medicion_inicial[0] || "",
              },
            ]);
          }
          // Después de setMedicionInicial(...)
          if (json.regla_altura_final && json.litros_tanque_final > 0) {
            setMedicionFinal([
              {
                id_tanque: json.id_tanque_destino.toString(),
                regla: Number(json.regla_altura_final),
                litros: json.litros_tanque_final,
                temperatura: json.temp_final,
                foto_tanque: json.foto_medicion_final?.[0] || "",
              },
            ]);
          }

          setPersona(personaStorage);

          // NO inicies polling aquí
          setIsLoading(false);
          setAndRefShouldContinue(false);

          setEstadoInicial({
            persona: personaStorage,
            selectedBodegaOrigem: json.bod_origen.toString(),
            selectedBodegaDestino: json.bod_destino.toString(),
            selectedPico: json.id_pico.toString(),
            obs: json.obs_traspaso ?? "", // ← antes era ""
            obsAdicional: json.obs_adicional ?? "", // ← antes era ""
          });

          // 2do cinturón ante re-procesos:
          idAutorizadoRef.current = json.last_id_salida || 0;

          const litros = Number(json.litros_pico) || 0;

          if (litros > 0) {
            // Traspaso parcial con litros: mostrar "Finalizado" (pendiente) y ofrecer reanudar
            setSalida(2);
            promptResumeIfNeeded(storedTraspaso); // <-- ya lo tienes
          } else {
            // Traspaso aún no cargó nada: volver a estado inicial y ofrecer comenzar
            setSalida(0);
            promptStartIfNeeded(storedTraspaso); // <-- ver función abajo
          }
        } else {
          setEstadoInicial({
            persona: null,
            selectedBodegaOrigem: "",
            selectedBodegaDestino: "",
            selectedPico: "",
            obs: "",
            obsAdicional: "",
          });
          setSelectedBodegaOrigem("");
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (route.params?.onPersona) {
      setPersona(route.params.onPersona);
    }

    if (route.params?.onFirma) {
      setFirma(route.params.onFirma);
    }
    if (route?.params?.onMedicion) {
      if (medicionInicial.length === 0) {
        setMedicionInicial(route.params.onMedicion);
      } else {
        setMedicionFinal(route.params.onMedicion);
      }
    }
  }, [
    route.params?.onPersona,
    route.params?.onMedicion,
    route.params?.onFirma,
  ]);

  // Agregá este nuevo useEffect para guardar cuando medicionInicial cambia:
  useEffect(() => {
    if (medicionInicial.length > 0) {
      saveState();
    }
  }, [medicionInicial]);

  useEffect(() => {
    if (medicionFinal.length > 0) {
      // ← sacar estadoRestaurado
      (async () => {
        const stored = await getStorageTraspaso();
        if (stored?.json) {
          stored.json.regla_altura_final = medicionFinal[0].regla.toString();
          stored.json.litros_tanque_final = medicionFinal[0].litros;
          stored.json.temp_final = medicionFinal[0].temperatura;
          stored.json.foto_medicion_final = medicionFinal[0].foto_tanque
            ? [medicionFinal[0].foto_tanque]
            : [];
          await saveTraspaso(stored);
        }
      })();
    }
  }, [medicionFinal]);

  useEffect(() => {
    if (selectedBodegaOrigem) {
      fetchPicos();
    }
  }, [selectedBodegaOrigem]);

  const fetchBox = useCallback(async () => {
    try {
      const despacho = await getNuevoDespachoByPico(
        idPico_surtidor,
        timestampReferenciaRef.current,
      );

      if (!despacho) {
        // No hay despacho nuevo todavía → seguir esperando
        return;
      }

      // Llegó un despacho nuevo → la carga finalizó
      const litros = despacho.litros;
      const taxIni = despacho.taxilitroInicial;
      const taxFin = despacho.taxilitroFinal;

      // Actualizar acumulados (soporte para múltiples tandas)
      const nuevosCargados =
        litros + (continuarCargaRef.current ? toNumber(cargaCombustible) : 0);
      const nuevoTaxIni = continuarCargaRef.current
        ? totalizadorPicoInicial
        : taxIni;

      setTotalizadorPicoInicial(nuevoTaxIni);
      setTotalizadorPicoFinal(taxFin);
      setCargaCombustible(
        nuevosCargados.toLocaleString("es-PY", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );

      // Guardar en storage incluyendo los totalizadores actualizados
      const existing = await getStorageTraspaso();
      if (existing?.json) {
        existing.json.taxilitro_inicial = nuevoTaxIni;
        existing.json.taxilitro_final = taxFin;
        existing.json.litros_pico = nuevosCargados;
        existing.json.last_id_salida = despacho.id;
        await saveTraspaso(existing);
      }

      setAndRefShouldContinue(false);
      setSalida(2);
      setIsLoading(false);
      setLitrosCarga(true);
      continuarCargaRef.current = false;
    } catch (error) {
      console.error("Error al consultar despacho en BD:", error);
    }
  }, [idPico_surtidor, cargaCombustible, totalizadorPicoInicial]);

  // DESPUÉS:
  const fetchLoop = useCallback(async () => {
    if (estadoRestaurado && shouldContinueRef.current) {
      await fetchBox();
    }

    // ← Leyendo la ref DESPUÉS de que fetchBox terminó (puede haber cambiado)
    if (shouldContinueRef.current) {
      intervalRef.current = setTimeout(() => {
        fetchLoop();
      }, 3000);
    }
  }, [estadoRestaurado, fetchBox]);

  useEffect(() => {
    if (estadoRestaurado && shouldContinue) {
      fetchLoop();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [estadoRestaurado, shouldContinue, fetchLoop]);

  return turnoCerrado && !motivoConfirmado ? (
    <View className="flex-1">
      <ScreenHeader
        title="Traspaso Excepcional"
        disableBackButton={salida === 2}
      />

      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
            Importente!!!
          </Text>
          <Text className="font-medium text-justify text-xl mb-4">
            Está intentando registrar un traspaso y el turno se encuentra
            cerrado. Una vez finalizada se deberá realizar el cierre
            correspondiente en el apartado “Cierre Extra”, para las bodegas que
            hayan sufrido movimientos.
          </Text>
          <InputCard className="min-h-40" title="Indique el motivo" required>
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
            onPress={async () => {
              if (obsAdicional.trim() === "") {
                Alert.alert(
                  "Motivo requerido",
                  "Por favor describa el motivo.",
                );
                return;
              }
              // Guardar el motivo explícitamente antes de cerrar el modal
              let stored = await getStorageTraspaso();
              if (stored?.json) {
                // Ya existe un traspaso guardado — solo actualizar los campos de motivo
                stored.json.obs_traspaso = obs;
                stored.json.obs_adicional = obsAdicional;
                await saveTraspaso(stored);
              } else {
                // Aún no hay nada en storage (medicionInicial vacía, saveState no corrió)
                // Guardamos un estado mínimo para no perder el motivo
                const now = new Date();
                const fecha = now.toISOString().slice(0, 10);
                const hora = now.toTimeString().slice(0, 8);

                // En el else del handler del modal:
                const minimalData: TraspasoDTO = {
                  json: {
                    bod_origen: Number(selectedBodegaOrigem),
                    bod_destino: Number(selectedBodegaDestino),
                    id_tanque_destino: 0,
                    regla_altura_inicial: "",
                    litros_tanque_inicial: 0,
                    temp_inicial: 0,
                    regla_altura_final: "",
                    litros_tanque_final: 0,
                    temp_final: 0,
                    foto_medicion_final: [],
                    id_pico: Number(selectedPico),
                    taxilitro_inicial: 0,
                    taxilitro_final: 0,
                    litros_pico: 0,
                    last_id_salida: 0,
                    obs_traspaso: obs,
                    obs_adicional: obsAdicional,
                    foto_obs_traspaso: base64Obs ? [base64Obs] : [],
                    foto_medicion_inicial: [],
                    fecha,
                    hora,
                    firma_receptor: [],
                    id_playero: Number(user.cedula),
                    id_encargado_receptor: Number(persona?.cedula) || 0,
                  },
                };
                await saveTraspaso(minimalData);
                await savePersona(persona);
              }

              setMotivoConfirmado(true);
              setTurnoCerrado(false);
            }}
          >
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : (
    <View className="flex-1">
      <ScreenHeader title="Traspaso" disableBackButton={salida === 1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center p-4 gap-4">
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
                    fromScreen: "traspaso",
                  })
                }
              />
            </InputCard>
            {bodegaOrigem.length > 1 && (
              <InputCard
                title="Bodega de Origen"
                required={true}
                locked={salida !== 0}
              >
                <View className="flex-row items-center p-2 gap-2">
                  <Select
                    enabled={salida === 0}
                    data={bodegaOrigem}
                    isLoading={isLoading}
                    selectedValue={selectedBodegaOrigem}
                    setSelectedValue={setSelectedBodegaOrigem}
                    labelField="descripcion_bodega"
                    valueField="id_bodega"
                  />
                </View>
              </InputCard>
            )}
            <InputCard
              title="Bodega receptora"
              required={true}
              locked={salida !== 0}
            >
              <View className="flex-row items-center p-2 gap-2">
                <Select
                  enabled={salida === 0}
                  data={bodegaDestino}
                  isLoading={isLoading}
                  selectedValue={selectedBodegaDestino}
                  setSelectedValue={setSelectedBodegaDestino}
                  labelField="descripcion_bodega"
                  valueField="id_bodega"
                />
              </View>
            </InputCard>
            <InputCard
              title="Pico expendedor:"
              required={true}
              locked={salida !== 0}
            >
              {salida === 0 && (
                <Select
                  enabled={salida === 0}
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
            <InputCard title="Medición Inicial del Tanque Receptor" required>
              <Button
                disabled={selectedBodegaDestino === "" || salida === 2}
                title="Medir"
                icon={
                  medicionInicial?.length > 0 ? CheckCheck : RulerDimensionLine
                }
                iconColor={medicionInicial?.length > 0 ? "#0af706" : "#000"}
                iconSize="md"
                onPress={() => {
                  if (medicionInicial?.length > 0) {
                    // Gere um alerta com as opções de continuar ou não
                    Alert.alert(
                      "Medición existente",
                      "Ya existe una medición para esta bodega. ¿Desea continuar?",
                      [
                        {
                          text: "Cancelar",
                          style: "cancel",
                        },
                        {
                          text: "Continuar",
                          onPress: () => {
                            navigation.navigate("medicion", {
                              fromScreen: "traspaso",
                              idBodega: selectedBodegaDestino,
                            });
                          },
                        },
                      ],
                    );
                  } else {
                    navigation.navigate("medicion", {
                      fromScreen: "traspaso",
                      idBodega: selectedBodegaDestino,
                    });
                  }
                }}
              />
            </InputCard>

            <InputCard title="" locked={salida !== 0}>
              <View className="flex-row p-2 gap-2">
                <View className="flex-1 justify-center items-center gap-2">
                  {salida === 0 && (
                    <>
                      <Text className="text-xl text-black font-bold">
                        Registrar carga
                      </Text>
                      <Button
                        title="Comenzar"
                        onPress={handleTraspaso}
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
            {salida === 2 && (
              <>
                <InputCard title="Medición Final del Tanque Receptor" required>
                  <Button
                    disabled={selectedBodegaDestino === ""}
                    title="Medir"
                    icon={
                      medicionFinal?.length > 0
                        ? CheckCheck
                        : RulerDimensionLine
                    }
                    iconColor={medicionFinal?.length > 0 ? "#0af706" : "#000"}
                    iconSize="md"
                    onPress={() => {
                      if (medicionFinal?.length > 0) {
                        // Gere um alerta com as opções de continuar ou não
                        Alert.alert(
                          "Medición existente",
                          "Ya existe una medición para esta bodega. ¿Desea continuar?",
                          [
                            {
                              text: "Cancelar",
                              style: "cancel",
                            },
                            {
                              text: "Continuar",
                              onPress: () => {
                                navigation.navigate("medicion", {
                                  fromScreen: "traspaso",
                                  idBodega: selectedBodegaDestino,
                                });
                              },
                            },
                          ],
                        );
                      } else {
                        navigation.navigate("medicion", {
                          fromScreen: "traspaso",
                          idBodega: selectedBodegaDestino,
                        });
                      }
                    }}
                  />
                </InputCard>
                <InputCard title="Observaciones">
                  <View className="flex-row items-center p-2 gap-2">
                    <Input
                      multiline
                      numberOfLines={4}
                      placeholder="observaciones"
                      value={obs}
                      onChangeText={setObs}
                    />
                    <View className="flex-col gap-6">
                      <Photo
                        form="icon"
                        iconSize="lg"
                        iconColor={base64Obs.length > 0 ? "#05a722" : "#000"}
                        setImage={(base64) => setBase64Obs(base64)}
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
                        fromScreen: "traspaso",
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
          {/* <View className='flex-row items-center p-4'>
						<View>
							<Button
								title='Remover Estado'
								onPress={async () => {
									await removeTraspaso();
									await removePersona();
								}}
								isLoading={isLoading}
								icon={SaveAll}
								iconSize='md'
								iconColor='#000'
							/>
						</View>
						<View>
							<Text className='text-black font-bold'>
								Pico Selecionado:{selectedPico}
							</Text>
							<Text className='text-black font-bold'>
								IdPicoSelecionado:{idPico_surtidor}
							</Text>
							<Text className='text-black font-bold'>
								Estado Inicial:
								{estadoRestaurado ? "Restaurado" : "No restaurado"}
							</Text>
							<Text className='text-black font-bold'>
								ShouldContinue:
								{shouldContinue ? "True" : "False"}
							</Text>
							<Text className='text-black font-bold'>
								Salida:
								{salida}
							</Text>
						</View>
					</View> */}
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
    //justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    marginTop: 100,
    width: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 5, // Android shadow
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
