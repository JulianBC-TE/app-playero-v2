import { MedicionDTO } from "./MedicionDTO";
export type TurnoDTO = {
	id_suc: number;
	clave?: string;
	id_bod: number;
	fecha: string;
	hora: string;
	tipo?: string;
	estado?: Number;
	ci_playero: number;
	litros: number;
	observacion: string;
	fotos_observacion: string[];
	med_tanques: MedicionDTO[];
	med_picos: {
		id_pico: number;
		taxilitro: number;
		foto_taxilitro: string[];
	}[];
};
