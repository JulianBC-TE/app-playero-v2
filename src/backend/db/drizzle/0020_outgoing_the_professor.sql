PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_habilitados_trapaso` (
	`cedula` integer NOT NULL,
	`id_bodega` integer NOT NULL,
	PRIMARY KEY(`cedula`, `id_bodega`)
);
--> statement-breakpoint
INSERT INTO `__new_habilitados_trapaso`("cedula", "id_bodega") SELECT "cedula", "id_bodega" FROM `habilitados_trapaso`;--> statement-breakpoint
DROP TABLE `habilitados_trapaso`;--> statement-breakpoint
ALTER TABLE `__new_habilitados_trapaso` RENAME TO `habilitados_trapaso`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `trapasos` ADD `appte` text;