PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_calibraciones` (
	`id_calibracion` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha_hora` text NOT NULL,
	`hora` text NOT NULL,
	`bodega` integer NOT NULL,
	`ci_encargado` integer NOT NULL,
	`nombre_encargado` text NOT NULL,
	`pico` integer NOT NULL,
	`taxilitro_inicial` integer NOT NULL,
	`taxilitro_final` integer NOT NULL,
	`foto_precinto_retirado` text NOT NULL,
	`foto_precinto_colocado` text NOT NULL,
	`firma_calibrador` text NOT NULL,
	`foto_inicial_taxilitro` text,
	`foto_final_taxilitro` text,
	`obs_gral` text,
	`nro_precinto_retirado` text,
	`nro_precinto_colocado` text,
	`tipo_operacion` text DEFAULT 'CALIBRACION' NOT NULL,
	`detalles` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_calibraciones`("id_calibracion", "fecha_hora", "hora", "bodega", "ci_encargado", "nombre_encargado", "pico", "taxilitro_inicial", "taxilitro_final", "foto_precinto_retirado", "foto_precinto_colocado", "firma_calibrador", "foto_inicial_taxilitro", "foto_final_taxilitro", "obs_gral", "nro_precinto_retirado", "nro_precinto_colocado", "tipo_operacion", "detalles", "sync") SELECT "id_calibracion", "fecha_hora", "hora", "bodega", "ci_encargado", "nombre_encargado", "pico", "taxilitro_inicial", "taxilitro_final", "foto_precinto_retirado", "foto_precinto_colocado", "firma_calibrador", "foto_inicial_taxilitro", "foto_final_taxilitro", "obs_gral", "nro_precinto_retirado", "nro_precinto_colocado", "tipo_operacion", "detalles", "sync" FROM `calibraciones`;--> statement-breakpoint
DROP TABLE `calibraciones`;--> statement-breakpoint
ALTER TABLE `__new_calibraciones` RENAME TO `calibraciones`;--> statement-breakpoint
PRAGMA foreign_keys=ON;