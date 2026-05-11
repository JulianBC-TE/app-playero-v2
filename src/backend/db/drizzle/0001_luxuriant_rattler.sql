PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_abastecimientos` (
	`id_abastecimiento` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha` integer,
	`hora` integer
);
--> statement-breakpoint
INSERT INTO `__new_abastecimientos`("id_abastecimiento", "json", "tipo", "sync", "fecha", "hora") SELECT "id_abastecimiento", "json", "tipo", "sync", "fecha", "hora" FROM `abastecimientos`;--> statement-breakpoint
DROP TABLE `abastecimientos`;--> statement-breakpoint
ALTER TABLE `__new_abastecimientos` RENAME TO `abastecimientos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_calibraciones` (
	`id_calibracion` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha` integer,
	`hora` integer
);
--> statement-breakpoint
INSERT INTO `__new_calibraciones`("id_calibracion", "json", "tipo", "sync", "fecha", "hora") SELECT "id_calibracion", "json", "tipo", "sync", "fecha", "hora" FROM `calibraciones`;--> statement-breakpoint
DROP TABLE `calibraciones`;--> statement-breakpoint
ALTER TABLE `__new_calibraciones` RENAME TO `calibraciones`;--> statement-breakpoint
CREATE TABLE `__new_despachos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_hrs` integer NOT NULL,
	`pico` integer NOT NULL,
	`combustible` integer NOT NULL,
	`tanque` integer NOT NULL,
	`total_ctvs` integer NOT NULL,
	`volumen_ml` integer NOT NULL,
	`precio_cvl` integer NOT NULL,
	`dec_total` integer NOT NULL,
	`dec_volumen` integer NOT NULL,
	`dec_precio` integer NOT NULL,
	`tiempo_seg` integer,
	`fecha_hora` integer NOT NULL,
	`total_ini` integer,
	`total_fin` integer,
	`frentista_id` text,
	`cliente_id` text,
	`vol_tanque_ml` integer,
	`creado_en` integer NOT NULL,
	`sync` integer,
	`proces` integer
);
--> statement-breakpoint
INSERT INTO `__new_despachos`("id", "id_hrs", "pico", "combustible", "tanque", "total_ctvs", "volumen_ml", "precio_cvl", "dec_total", "dec_volumen", "dec_precio", "tiempo_seg", "fecha_hora", "total_ini", "total_fin", "frentista_id", "cliente_id", "vol_tanque_ml", "creado_en", "sync", "proces") SELECT "id", "id_hrs", "pico", "combustible", "tanque", "total_ctvs", "volumen_ml", "precio_cvl", "dec_total", "dec_volumen", "dec_precio", "tiempo_seg", "fecha_hora", "total_ini", "total_fin", "frentista_id", "cliente_id", "vol_tanque_ml", "creado_en", "sync", "proces" FROM `despachos`;--> statement-breakpoint
DROP TABLE `despachos`;--> statement-breakpoint
ALTER TABLE `__new_despachos` RENAME TO `despachos`;--> statement-breakpoint
CREATE TABLE `__new_tickets` (
	`id_ticket` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_tickets`("id_ticket", "json", "tipo", "sync", "fecha", "hora", "estado") SELECT "id_ticket", "json", "tipo", "sync", "fecha", "hora", "estado" FROM `tickets`;--> statement-breakpoint
DROP TABLE `tickets`;--> statement-breakpoint
ALTER TABLE `__new_tickets` RENAME TO `tickets`;--> statement-breakpoint
CREATE TABLE `__new_trapasos` (
	`id_trapaso` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_trapasos`("id_trapaso", "json", "tipo", "sync", "fecha", "hora", "estado") SELECT "id_trapaso", "json", "tipo", "sync", "fecha", "hora", "estado" FROM `trapasos`;--> statement-breakpoint
DROP TABLE `trapasos`;--> statement-breakpoint
ALTER TABLE `__new_trapasos` RENAME TO `trapasos`;--> statement-breakpoint
CREATE TABLE `__new_turnos` (
	`id_turno` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_bodega` integer NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL,
	`observacion_anulacion` text
);
--> statement-breakpoint
INSERT INTO `__new_turnos`("id_turno", "id_bodega", "json", "tipo", "sync", "fecha", "hora", "estado", "observacion_anulacion") SELECT "id_turno", "id_bodega", "json", "tipo", "sync", "fecha", "hora", "estado", "observacion_anulacion" FROM `turnos`;--> statement-breakpoint
DROP TABLE `turnos`;--> statement-breakpoint
ALTER TABLE `__new_turnos` RENAME TO `turnos`;