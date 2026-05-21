import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { StackRoutesProps } from "@/route/app.routes";

import { ScreenHeader } from "@/components/ScreenHeader";
import { InputCard } from "@/components/InputCard";
import { Button } from "@/components/Button";
import { toastError, toastSuccess } from "@/utils/toastMessage";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

import { BodegaDTO } from "@/dto/BodegaDTO";
import { MedicionDTO } from "@/dto/MedicionDTO";
import { TurnoDTO } from "@/dto/TurnoDTO";
import { PicoDTO } from "@/dto/PicosDTO";

import { RulerDimensionLine, CheckCheck } from "lucide-react-native";
import { AppError } from "@/utils/AppError";
import { StatusTurnoDTO } from "@/dto/statusTurnoDTO";
import { Photo } from "@/components/Photo";
import { crearTurnoLocal, getTurnoStatusLocal } from "@DBmodules/turnoBD";
import { getBodegasByIdSucursal, getBodegaById } from "@DBmodules/bodegaDB";
import { getPicosByBodega } from "@DBmodules/picoDB";
import { normalizarFecha } from "@/backend/db/services/turnoStatusService";
import { getSucursalUsuarioActivoLocal } from "@DBmodules/sucursalDB";

// Definimos la interfaz estricta de la sesión
interface SesionLocalType {
  cedula: number;
  id_sucursal: number;
  descripcion_sucursal: string;
}

export function Turno({ navigation, route }: StackRoutesProps<"turno">) {
  const [isLoading, setIsLoading] = useState(false);
  const [faltaAnterior, setFaltaAnterior] = useState(false);
  const [listaBodegasFaltaAnterior, setListaBodegasFaltaAnterior] = useState<
    BodegaDTO[]
  >([]);
  const [inicioTurno, setInicioTurno] = useState(false);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [obsAdicional, setObsAdicional] = useState("");
  const [selectedBodega, setSelectedBodega] = useState("");
  const [bodegas, setBodegas] = useState<BodegaDTO[]>([]);
  const [medicion, setMedicion] = useState<MedicionDTO[]>([]);
  const [picosList, setPicosList] = useState<PicoDTO[]>([]);

  const [blockHeader, setBlockHeader] = useState(false);
  const [taxilitros, setTaxilitros] = useState<Record<number, string>>({});

  // Estado de sesión tipado correctamente
  const [sesionLocal, setSesionLocal] = useState<SesionLocalType | null>(null);

  // ---------------------------------------------------------------------------
  // handlePhotoCapture y removerFoto
  // ---------------------------------------------------------------------------
  async function handlePhotoCapture(base64: string) {
    setBase64Images((prev) => [...prev, base64]);
  }

  const removerFoto = (indexParaRemover: number) => {
    Alert.alert("Apagar Foto", "Está seguro de que desea eliminar esta foto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        onPress: () => {
          setBase64Images((prev) =>
            prev.filter((_, index) => index !== indexParaRemover),
          );
        },
      },
    ]);
  };

  // ---------------------------------------------------------------------------
  // handleBodegaChange
  // ---------------------------------------------------------------------------
  // Reemplazá la función handleBodegaChange por esto:
const handleBodegaChange = useCallback(async (idBodega: string) => {
  setSelectedBodega(idBodega);
  setTaxilitros({});
  if (idBodega) {
    const picos = await getPicosByBodega(Number(idBodega));
    setPicosList(picos);
  } else {
    setPicosList([]);
  }
}, []); // sin dependencias porque solo usa setters y funciones externas estables

  // ---------------------------------------------------------------------------
  // procesarTurno
  // ---------------------------------------------------------------------------
  async function procesarTurno() {
    if (!sesionLocal) {
      Alert.alert(
        "Error de sesión",
        "No se encontró información del usuario activo localmente.",
      );
      return;
    }

    if (medicion.length === 0) {
      Alert.alert(
        "Medición requerida",
        "Debe realizar las mediciones de tanque antes de procesar el turno.",
      );
      return;
    }

    const taxilitrosFaltantes = picosList.filter(
      (p) => !taxilitros[p.id_pico] || taxilitros[p.id_pico].trim() === "",
    );
    if (taxilitrosFaltantes.length > 0) {
      Alert.alert(
        "Taxilitros requeridos",
        `Faltan taxilitros para: ${taxilitrosFaltantes.map((p) => p.descripcion_pico).join(", ")}`,
      );
      return;
    }

    try {
      setIsLoading(true);

      const resultadosTotalizadores = picosList.map((pico) => ({
        pico: pico.id_pico,
        totalizador: Number(taxilitros[pico.id_pico]),
      }));

      const now = new Date();
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8);

      const totalizadorLitros = medicion.reduce(
        (acc, cur) => acc + (cur.litros ?? 0),
        0,
      );

      const nuevoTurno: TurnoDTO = {
        id_suc: Number(sesionLocal.id_sucursal),
        id_bod: Number(selectedBodega),
        fecha,
        hora,
        ci_playero: Number(sesionLocal.cedula),
        litros: totalizadorLitros,
        observacion: obs + "|" + obsAdicional,
        fotos_observacion: base64Images,
        med_tanques: medicion.map((med) => ({
          id_tanque: Number(med.id_tanque),
          regla: med.regla,
          temperatura: med.temperatura,
          litros: med.litros,
          foto_tanque: med.foto_tanque ? [med.foto_tanque] : [],
        })),
        med_picos: resultadosTotalizadores.map((result) => ({
          id_pico: result.pico,
          taxilitro: result.totalizador,
        })),
      };

      await crearTurnoLocal({
        idBodega: Number(selectedBodega),
        json: nuevoTurno,
        tipo: inicioTurno ? "inicio" : "fin",
        fecha: normalizarFecha(new Date()),
        hora: Date.now(),
      });

      toastSuccess(
        "Turno procesado",
        `El turno ha sido ${inicioTurno ? "iniciado" : "cerrado"} con éxito.`,
      );

      const remainBodegas = bodegas.filter(
        (bodega) => Number(bodega.id_bodega) !== Number(selectedBodega),
      );
      setBodegas(remainBodegas);

      setBlockHeader(true);
      setSelectedBodega("");
      setPicosList([]);
      setTaxilitros({});
      setObs("");
      setBase64Images([]);
      setMedicion([]);

      if (remainBodegas.length === 0) {
        toastSuccess(
          "Abertura de Turnos",
          "Todos los turnos han sido procesados.",
        );
        navigation.navigate("home");
      }
    } catch (error) {
      console.log("Error al procesar turno:", error);
      const isAppError = error instanceof AppError;
      const message = isAppError
        ? error.message
        : "No se pudo procesar el turno";
      toastError("Error al procesar turno", message);
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Captura parámetros de navegación de forma segura sin reactividad infinita
  const medicionFromParamsApplied = useRef(false);

  useEffect(() => {
    if (route.params?.onMedicion && !medicionFromParamsApplied.current) {
      medicionFromParamsApplied.current = true;
      setMedicion(route.params.onMedicion);
    }
  }, [route.params?.onMedicion]);

  // UN SOLO EFECTO AL MONTAR: Inicializa la sesión de la DB local UNA VEZ
  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current) return; // 🛑 corta si ya corrió
    inicializado.current = true;
    async function inicializarPantalla() {
      try {
        setIsLoading(true);
        const datosSesion = await getSucursalUsuarioActivoLocal();

        if (!datosSesion || !datosSesion.id_sucursal) {
          toastError(
            "Error de sesión",
            "No se encontró el usuario o sucursal activa localmente.",
          );
          setIsLoading(false);
          return;
        }

        // Estructuramos el objeto forzando el tipado completo requerido
        const sesionFormateada: SesionLocalType = {
          cedula: Number((datosSesion as any).cedula ?? 0),
          id_sucursal: Number(datosSesion.id_sucursal),
          descripcion_sucursal: datosSesion.descripcion_sucursal,
        };

        setSesionLocal(sesionFormateada);

        // Ejecutamos la carga del turno usando directamente los datos frescos obtenidos
        await cargarDatosTurno(sesionFormateada.id_sucursal);
      } catch (error) {
        console.error("Error inicializando turno:", error);
        toastError("Error", "No se pudieron inicializar los datos locales.");
      } finally {
        setIsLoading(false);
      }
    }

    inicializarPantalla();
  }, []); // Array de dependencias vacío para que corra EXACTAMENTE UNA VEZ

  // ---------------------------------------------------------------------------
  // cargarDatosTurno (Función pura aislada de estados intermedios)
  // ---------------------------------------------------------------------------
  async function cargarDatosTurno(idSucursal: number) {
    const data = await getTurnoStatusLocal(idSucursal);
    const turnoData: StatusTurnoDTO = {
      status: data.status,
      Inicio_turno: data.Inicio_turno,
      Fin_turno: data.Fin_turno,
      Fin_turno_anterior: data.Fin_turno_anterior,
    };

    if (turnoData.status === "falta_anterior") {
      setListaBodegasFaltaAnterior([]);
      const bodegasFaltantes: BodegaDTO[] = [];
      for (const idBodega of turnoData.Fin_turno_anterior.falta) {
        const bodegaData = await getBodegaById(idBodega);
        if (bodegaData) {
          bodegasFaltantes.push(bodegaData);
        }
      }
      setListaBodegasFaltaAnterior(bodegasFaltantes); // UN solo setState
      setFaltaAnterior(true);
    }

    let statusTurnoEstado = false;
    if (
      turnoData.status === "iniciado" ||
      turnoData.status === "falta_cerrar"
    ) {
      statusTurnoEstado = false;
      setInicioTurno(false);
    } else {
      statusTurnoEstado = true;
      setInicioTurno(true);
    }

    const todasBodegas = await getBodegasByIdSucursal(idSucursal);
    if (todasBodegas) {
      const bodegasFiltradas: BodegaDTO[] = [];
      todasBodegas.forEach((bodega: BodegaDTO) => {
        if (statusTurnoEstado) {
          if (
            bodega.id_bodega &&
            turnoData.Inicio_turno.falta.includes(Number(bodega.id_bodega))
          ) {
            bodegasFiltradas.push(bodega);
          }
        } else {
          if (
            bodega.id_bodega &&
            turnoData.Fin_turno.falta.includes(Number(bodega.id_bodega))
          ) {
            bodegasFiltradas.push(bodega);
          }
        }
      });
      setBodegas(bodegasFiltradas);
    }
  }

  // ---------------------------------------------------------------------------
  // Render (Se mantiene intacto)
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return faltaAnterior ? (
    // Pantalla de advertencia: turno anterior sin cerrar
    <View className="flex-1">
      <ScreenHeader title="Turno no Cerrado" />
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text className="font-bold text-red-500 text-center text-2xl underline mb-4">
            Importante!!!
          </Text>
          <Text className="font-medium text-justify text-xl mb-4">
            En la fecha anterior no se registró el cierre de turno. Favor
            indique el motivo por el cual no se realizó el cierre de:
          </Text>
          
          {/* CORRECCIÓN: Eliminado el contenedor <Text> externo duplicado que envolvía al map */}
          {listaBodegasFaltaAnterior.map((bodega) => (
            <Text
              key={bodega.id_bodega}
              className="font-medium text-justify text-xl mb-2 ml-2"
            >
              - {bodega.descripcion_bodega}
            </Text>
          ))}

          <InputCard className="min-h-40 mt-4" title="Indique el motivo" required>
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
                setFaltaAnterior(false);
            }}
          >
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : (
    // SOLUCIÓN: Pantalla principal envuelta en ScrollView para evitar que el contenido y el botón se corten abajo
    <View className="flex-1">
      <ScreenHeader
        title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
        disableBackButton={blockHeader}
      />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Selección de bodega */}
        <InputCard title="Bodega" required>
          <Select
            data={bodegas}
            isLoading={isLoading}
            setSelectedValue={handleBodegaChange}
            labelField="descripcion_bodega"
            valueField="id_bodega"
          />
        </InputCard>

        {/* Medición de tanque */}
        <InputCard title="Medición de Tanque" required>
          <Button
            disabled={selectedBodega === ""}
            title="Medir"
            icon={medicion?.length > 0 ? CheckCheck : RulerDimensionLine}
            iconColor={medicion?.length > 0 ? "#0af706" : "#000"}
            iconSize="md"
            onPress={() => {
              if (medicion?.length > 0) {
                Alert.alert(
                  "Medición existente",
                  "Ya hay una medición inicial cargada. ¿Desea continuar?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Continuar",
                      onPress: () => {
                        navigation.navigate("medicion", {
                          fromScreen: "turno",
                          idBodega: selectedBodega,
                        });
                      },
                    },
                  ],
                );
              } else {
                navigation.navigate("medicion", {
                  idBodega: selectedBodega,
                });
              }
            }}
          />
        </InputCard>

        {/* Taxilitros por pico — ingreso manual */}
        {picosList.length > 0 && (
          <InputCard title="Taxilitros por Pico" required>
            {picosList.map((pico) => (
              <InputCard
                key={pico.id_pico}
                title={pico.descripcion_pico}
                className="mb-2"
              >
                <Input
                  placeholder="Ingrese taxilitro"
                  keyboardType="numeric"
                  value={taxilitros[pico.id_pico] ?? ""}
                  onChangeText={(val) =>
                    setTaxilitros((prev) => ({
                      ...prev,
                      [pico.id_pico]: val,
                    }))
                  }
                />
              </InputCard>
            ))}
          </InputCard>
        )}

        {/* Observaciones */}
        <InputCard title="Observaciones" className="min-h-40">
          <Input
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="ml-2"
            value={obs}
            onChangeText={setObs}
            placeholder="Observaciones de la medicion"
          />
        </InputCard>

        {/* Fotos */}
        <InputCard title="Fotos" className="min-h-64">
          <View className="w-full items-center p-4 gap-2">
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {base64Images.map((img, index) => (
                <Pressable key={index} onPress={() => removerFoto(index)}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${img}` }}
                    className="mr-4 w-56 h-36 rounded-lg border border-gray-300"
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
            <Photo
              form="button"
              iconSize="lg"
              setImage={handlePhotoCapture}
              isLoading={isLoading}
            />
          </View>
        </InputCard>

        {/* Botón principal (Ahora siempre será accesible escroleando) */}
        <Button
          isLoading={isLoading}
          onPress={procesarTurno}
          title={`${inicioTurno === true ? "Iniciar Turno" : "Cerrar Turno"}`}
        />
      </ScrollView>
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
  title: { fontSize: 18, marginBottom: 20, textAlign: "center" },
  button: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});
