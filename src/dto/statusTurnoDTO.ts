import { TurnoStatus } from "@/backend/db/services/turnoStatusService";

export type StatusTurnoDTO = {
	status: TurnoStatus;
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
