CREATE TABLE `cubicacion_tanque` (
	`id_tanque` integer NOT NULL,
	`altura` real NOT NULL,
	`litros` real NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`id_tanque`, `altura`),
	FOREIGN KEY (`id_tanque`) REFERENCES `tanques`(`id_tanque`) ON UPDATE no action ON DELETE cascade
);
