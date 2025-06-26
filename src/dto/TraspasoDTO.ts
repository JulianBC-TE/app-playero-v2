// const data = {
// 	json: {
// 		bod_origem: Number(selectedBodegaOrigem),
// 		bod_destino: Number(selectedBodegaDestino),
// 		id_tamque_destino: Number(medicionInicial[0].id_tanque),
// 		regla_altura_inicial: medicionInicial[0].regla.toString(),
// 		regla_altura_final: medicionFinal[0].regla.toString(),
// 		litros_tanque_inicial: medicionInicial[0].litros,
// 		litros_tanque_final: medicionFinal[0].litros,
// 		temp_inicial: medicionInicial[0].temperatura,
// 		temp_final: medicionFinal[0].temperatura,
// 		id_pico: Number(selectedPico),
// 		taxilitro_inicial: totalizadorPicoInicial, // Este valor debe ser calculado o enviado
// 		taxilitro_final: totalizadorPicoFinal, // Este valor debe ser calculado o enviado
// 		litros_pico: Number(cargaCombustible),
// 		obs_traspaso: obs + " >>" + obsAdicional || "",
// 		foto_obs: base64Obs ? [base64Obs] : [],
// 		foto_medicion_inicial: medicionInicial[0].foto_tanque || [],
// 		foto_medicion_final: medicionFinal[0].foto_tanque || [],
// 		fecha: fecha,
// 		hora: hora,
// 		firma_receptor: firma ? [firma] : [],
// 		id_playero: user.cedula,
// 		id_encargado_receptor: Number(persona?.cedula),
// 	},
// };

import { PersonaDTO } from "./PersonaDTO";

export type TraspasoDTO = {
	json: {
		statusSalida: number;
		bod_origem: number;
		bod_destino: number;
		id_tamque_destino: number;
		regla_altura_inicial: string;
		regla_altura_final: string;
		litros_tanque_inicial: number;
		litros_tanque_final: number;
		temp_inicial: number;
		temp_final: number;
		id_pico: number;
		taxilitro_inicial: number;
		taxilitro_final: number;
		litros_pico: number;
		obs_traspaso: string;
		foto_obs: string[];
		foto_medicion_inicial: string[] | [];
		foto_medicion_final: string[] | [];
		fecha: string;
		hora: string;
		firma_receptor: string[];
		id_playero: number;
		persona: PersonaDTO | null;
	};
};
