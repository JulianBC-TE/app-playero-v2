PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_trapasos` (
	`id_trapaso` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_trapaso_mongo` text,
	`bod_origen` integer NOT NULL,
	`bod_destino` integer NOT NULL,
	`id_tanque_destino` integer NOT NULL,
	`regla_altura_inicial` text NOT NULL,
	`regla_altura_final` text NOT NULL,
	`litros_tanque_inicial` real NOT NULL,
	`litros_tanque_final` real NOT NULL,
	`temp_inicial` real NOT NULL,
	`temp_final` real NOT NULL,
	`id_pico` integer NOT NULL,
	`taxilitro_inicial` real NOT NULL,
	`taxilitro_final` real NOT NULL,
	`litros_pico` real NOT NULL,
	`obs_traspaso` text NOT NULL,
	`obs_adicional` text,
	`fecha` text NOT NULL,
	`hora` text NOT NULL,
	`id_playero` integer NOT NULL,
	`id_encargado_receptor` integer NOT NULL,
	`id_autorizado` integer,
	`foto_medicion_inicial` text,
	`foto_medicion_final` text,
	`firma_receptor` text,
	`foto_obs_traspaso` text,
	`corte_id` integer,
	`last_id_salida` integer,
	`estado` integer DEFAULT 1 NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha_creacion` integer,
	`fecha_sincronizacion` integer
);
--> statement-breakpoint
INSERT INTO `__new_trapasos`("id_trapaso", "id_trapaso_mongo", "bod_origen", "bod_destino", "id_tanque_destino", "regla_altura_inicial", "regla_altura_final", "litros_tanque_inicial", "litros_tanque_final", "temp_inicial", "temp_final", "id_pico", "taxilitro_inicial", "taxilitro_final", "litros_pico", "obs_traspaso", "obs_adicional", "fecha", "hora", "id_playero", "id_encargado_receptor", "id_autorizado", "foto_medicion_inicial", "foto_medicion_final", "firma_receptor", "foto_obs_traspaso", "corte_id", "last_id_salida", "estado", "sync", "fecha_creacion", "fecha_sincronizacion") SELECT "id_trapaso", "id_trapaso_mongo", "bod_origen", "bod_destino", "id_tanque_destino", "regla_altura_inicial", "regla_altura_final", "litros_tanque_inicial", "litros_tanque_final", "temp_inicial", "temp_final", "id_pico", "taxilitro_inicial", "taxilitro_final", "litros_pico", "obs_traspaso", "obs_adicional", "fecha", "hora", "id_playero", "id_encargado_receptor", "id_autorizado", "foto_medicion_inicial", "foto_medicion_final", "firma_receptor", "foto_obs_traspaso", "corte_id", "last_id_salida", "estado", "sync", "fecha_creacion", "fecha_sincronizacion" FROM `trapasos`;--> statement-breakpoint
DROP TABLE `trapasos`;--> statement-breakpoint
ALTER TABLE `__new_trapasos` RENAME TO `trapasos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;