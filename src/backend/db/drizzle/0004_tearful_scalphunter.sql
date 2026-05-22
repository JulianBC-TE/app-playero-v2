CREATE TABLE `modulos_usuarios` (
	`cedula` integer PRIMARY KEY NOT NULL,
	`abastecimiento` integer DEFAULT false NOT NULL,
	`calibracion` integer DEFAULT false NOT NULL,
	`traspaso` integer DEFAULT false NOT NULL,
	`salida` integer DEFAULT false NOT NULL,
	`vehiculo` integer DEFAULT false NOT NULL,
	`persona` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`sync` integer DEFAULT 0 NOT NULL,
	`proces` integer
);
--> statement-breakpoint
INSERT INTO `__new_despachos`("id", "id_hrs", "pico", "combustible", "tanque", "total_ctvs", "volumen_ml", "precio_cvl", "dec_total", "dec_volumen", "dec_precio", "tiempo_seg", "fecha_hora", "total_ini", "total_fin", "frentista_id", "cliente_id", "vol_tanque_ml", "creado_en", "sync", "proces") SELECT "id", "id_hrs", "pico", "combustible", "tanque", "total_ctvs", "volumen_ml", "precio_cvl", "dec_total", "dec_volumen", "dec_precio", "tiempo_seg", "fecha_hora", "total_ini", "total_fin", "frentista_id", "cliente_id", "vol_tanque_ml", "creado_en", "sync", "proces" FROM `despachos`;--> statement-breakpoint
DROP TABLE `despachos`;--> statement-breakpoint
ALTER TABLE `__new_despachos` RENAME TO `despachos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;