DROP TABLE IF EXISTS `habilitados_trapaso`;--> statement-breakpoint
CREATE TABLE `habilitados_trapaso` (
	`cedula` integer NOT NULL,
	`id_bodega` integer NOT NULL,
	PRIMARY KEY(`cedula`, `id_bodega`)
);
