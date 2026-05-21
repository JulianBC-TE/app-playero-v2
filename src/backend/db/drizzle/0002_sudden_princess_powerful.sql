CREATE TABLE `habilitados_trapaso` (
	`id_sucursal` integer NOT NULL,
	`id_bodega` integer NOT NULL,
	`permitido` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`id_sucursal`, `id_bodega`)
);
--> statement-breakpoint
ALTER TABLE `usuarios_app` ADD `bloqueado` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `usuarios_app` ADD `id_sucursal` integer NOT NULL;