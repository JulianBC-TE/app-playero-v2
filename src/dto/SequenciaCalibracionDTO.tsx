export type SequenciaCalibracionDTO = {
	taxilitroInicial: number;
	taxilitroFinal: number;
	totalMediciones: number;
	sequencias: {
		valor_medicion: string;
		foto_medicion: string;
		taxilitro: number;
	}[];
};
