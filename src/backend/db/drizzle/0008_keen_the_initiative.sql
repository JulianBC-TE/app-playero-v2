CREATE TABLE `mediciones_tanque` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`abastecimiento_id` integer NOT NULL,
	`id_tanque` integer NOT NULL,
	`inicio_regla` text NOT NULL,
	`inicio_temperatura` real NOT NULL,
	`inicio_litros` real NOT NULL,
	`inicio_foto_medicion` text NOT NULL,
	`fin_regla` text NOT NULL,
	`fin_temperatura` real NOT NULL,
	`fin_litros` real NOT NULL,
	`fin_foto_medicion` text NOT NULL,
	FOREIGN KEY (`abastecimiento_id`) REFERENCES `abastecimientos`(`id_abastecimiento`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_abastecimientos` (
	`id_abastecimiento` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer DEFAULT 0 NOT NULL,
	`id_suc` integer NOT NULL,
	`id_bod` integer NOT NULL,
	`fecha` text NOT NULL,
	`hora` text NOT NULL,
	`nro_oc` integer NOT NULL,
	`nro_remision` text NOT NULL,
	`litros_remision` integer NOT NULL,
	`playero` integer NOT NULL,
	`foto_rev_docs` text NOT NULL,
	`zeta_no_llega` integer NOT NULL,
	`id_pico_para_zeta` integer,
	`taxilitro_inicial` integer NOT NULL,
	`taxilitro_final` integer NOT NULL,
	`litros_zeta` integer NOT NULL,
	`obs_repos` text NOT NULL,
	`foto_obs_repos` text NOT NULL,
	`litros_total_repos` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_abastecimientos`("id_abastecimiento", "tipo", "sync", "id_suc", "id_bod", "fecha", "hora", "nro_oc", "nro_remision", "litros_remision", "playero", "foto_rev_docs", "zeta_no_llega", "id_pico_para_zeta", "taxilitro_inicial", "taxilitro_final", "litros_zeta", "obs_repos", "foto_obs_repos", "litros_total_repos") SELECT "id_abastecimiento", "tipo", "sync", "id_suc", "id_bod", "fecha", "hora", "nro_oc", "nro_remision", "litros_remision", "playero", "foto_rev_docs", "zeta_no_llega", "id_pico_para_zeta", "taxilitro_inicial", "taxilitro_final", "litros_zeta", "obs_repos", "foto_obs_repos", "litros_total_repos" FROM `abastecimientos`;--> statement-breakpoint
DROP TABLE `abastecimientos`;--> statement-breakpoint
ALTER TABLE `__new_abastecimientos` RENAME TO `abastecimientos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;