DROP TABLE `usuarios_admin`;--> statement-breakpoint
ALTER TABLE `usuarios_app` ADD `id_user` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `habilitados_trapaso` DROP COLUMN `permitido`;