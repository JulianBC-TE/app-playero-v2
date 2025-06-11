// {
//     "Fin_turno":
//     {
//         "falta": [1016, 1017],
//         "ok": false
//     },
//     "Inicio_turno":
//     {
//         "falta": [1016, 1017],
//         "ok": false
//     }
// }

export type StatusTurnoDTO = {
	status: string;
	Inicio_turno: {
		ok: boolean;
		falta: number[];
	};
	Fin_turno: {
		ok: boolean;
		falta: number[];
	};
	Fin_turno_anterior: {
		ok: boolean;
		falta: number[];
	};
};
