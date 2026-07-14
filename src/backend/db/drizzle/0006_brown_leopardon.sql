PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id_ticket` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_suc` integer NOT NULL,
	`id_bod` integer NOT NULL,
	`id_pico` integer NOT NULL,
	`fecha` text NOT NULL,
	`hora` text NOT NULL,
	`ci_playero` integer NOT NULL,
	`id_operador` integer NOT NULL,
	`litros` real NOT NULL,
	`taxilitro_inicial` real NOT NULL,
	`taxilitro_final` real NOT NULL,
	`monto` real NOT NULL,
	`ruc_cliente` text,
	`id_vehiculo` text,
	`tipo` text NOT NULL,
	`kilometraje` integer,
	`horometro` real,
	`obs` text,
	`observaciones_ticket` text,
	`ubicacion_carga` text,
	`foto_chapa` text,
	`firma_conductor` text,
	`foto_kilometraje` text,
	`foto_horometro` text,
	`foto_observaciones` text,
	`sync` integer DEFAULT 0 NOT NULL,
	`estado` integer DEFAULT 1 NOT NULL,
	`fecha_registro` integer,
	`hora_registro` integer
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id_ticket", "id_suc", "id_bod", "id_pico", "fecha", "hora", "ci_playero", "id_operador", "litros", "taxilitro_inicial", "taxilitro_final", "monto", "ruc_cliente", "id_vehiculo", "tipo", "kilometraje", "horometro", "obs", "observaciones_ticket", "ubicacion_carga", "foto_chapa", "firma_conductor", "foto_kilometraje", "foto_horometro", "foto_observaciones", "sync", "estado", "fecha_registro", "hora_registro") SELECT "id_ticket", "id_suc", "id_bod", "id_pico", "fecha", "hora", "ci_playero", "id_operador", "litros", "taxilitro_inicial", "taxilitro_final", "monto", "ruc_cliente", "id_vehiculo", "tipo", "kilometraje", "horometro", "obs", "observaciones_ticket", "ubicacion_carga", "foto_chapa", "firma_conductor", "foto_kilometraje", "foto_horometro", "foto_observaciones", "sync", "estado", "fecha_registro", "hora_registro" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;