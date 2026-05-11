CREATE TABLE `abastecimientos` (
	`id_abastecimiento` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer NOT NULL,
	`fecha` integer,
	`hora` integer
);
--> statement-breakpoint
CREATE TABLE `bodegas` (
	`id_bodega` integer PRIMARY KEY NOT NULL,
	`descripcion_bodega` text NOT NULL,
	`id_sucursal` integer NOT NULL,
	`trapaso` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calibraciones` (
	`id_calibracion` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer NOT NULL,
	`fecha` integer,
	`hora` integer
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`ruc` text PRIMARY KEY NOT NULL,
	`descripcion_cliente` text NOT NULL,
	`timestamp` integer,
	`sync` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `despachos` (
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
	`frentista_id` text(16),
	`cliente_id` text(16),
	`vol_tanque_ml` integer,
	`creado_en` integer DEFAULT 1778503970827 NOT NULL,
	`sync` integer,
	`proces` integer
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`cedula` integer PRIMARY KEY NOT NULL,
	`nombre_apellido` text NOT NULL,
	`timestamp` integer,
	`sync` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `picos` (
	`id_pico` integer PRIMARY KEY NOT NULL,
	`descripcion_pico` text NOT NULL,
	`id_bodega` integer NOT NULL,
	`id_pico_surtidor` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sucursales` (
	`id_sucursal` integer PRIMARY KEY NOT NULL,
	`descripcion_sucursal` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `syncs` (
	`id_sync` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`fecha` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `syncs_tipo_unique` ON `syncs` (`tipo`);--> statement-breakpoint
CREATE TABLE `tanques` (
	`id_tanque` integer PRIMARY KEY NOT NULL,
	`descripcion_tanque` text NOT NULL,
	`id_bodega` integer NOT NULL,
	`capacidad_litros` real
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id_ticket` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trapasos` (
	`id_trapaso` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `turnos` (
	`id_turno` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_bodega` integer NOT NULL,
	`json` text NOT NULL,
	`tipo` text NOT NULL,
	`sync` integer NOT NULL,
	`fecha` integer,
	`hora` integer,
	`estado` integer DEFAULT 1 NOT NULL,
	`observacion_anulacion` text
);
--> statement-breakpoint
CREATE TABLE `usuarios_admin` (
	`correo` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`salt` text NOT NULL,
	`clave` text NOT NULL,
	`refresh_token` text,
	`timestamp` integer
);
--> statement-breakpoint
CREATE TABLE `usuarios_app` (
	`cedula` integer PRIMARY KEY NOT NULL,
	`clave` text NOT NULL,
	`refresh_token` text,
	`salt` text
);
--> statement-breakpoint
CREATE TABLE `vehiculos` (
	`id_vehiculo` text PRIMARY KEY NOT NULL,
	`descripcion_vehiculo` text NOT NULL,
	`ruc` text NOT NULL,
	`timestamp` integer,
	`sync` integer DEFAULT 0 NOT NULL
);
