/*
Interface Turno
{
  "json": {
    "id_suc": 1070,
    "id_bod": 1016,
    "fecha": "2025-05-22",
    "hora": "12:30:00",
    "ci_playero": 4147891,
    "litros": 20500,
    "observacion": "prueba",
    "fotos_observacion": [
      "base64",
      "base64"
    ],
    "med_tanques": [
      {
        "id_tanque": 1,
        "regla": 83.75,
        "temperatura": 20,
        "litros": 16750,
        "foto_tanque": [
          "base64"
        ]
      }
    ],
    "med_picos": [
      {
        "id_pico": 1,
        "taxilitro": 1845011
      }
    ]
  }
}
*/

export type TurnoDTO = {
	id_suc: number;
	id_bod: number;
	fecha: string;
	hora: string;
	ci_playero: number;
	litros: number;
	observacion: string;
	fotos_observacion: string[];
	med_tanques: {
		id_tanque: number;
		regla: number;
		temperatura: number;
		litros: number;
		foto_tanque: string[];
	}[];
	med_picos: {
		id_pico: number;
		taxilitro: number;
	}[];
};
