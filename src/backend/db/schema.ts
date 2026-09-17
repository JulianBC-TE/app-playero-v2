/**
 * Definición del esquema SQLite local usando Drizzle ORM.
 * Cada tabla mapea una entidad del dominio y sigue la convención
 * `sync = 0` (pendiente) / `sync = 1` (sincronizado con el servidor).
 *
 * @module Playero/Backend/DB/Schema
 * @category Database
 * @category Schema
 */
import { sqliteTable, integer, text, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { CalibracionDetalleDTO } from "@/dto/CalibracionDTO";

/** Tabla de personas físicas identificadas por cédula. */
export const personas = sqliteTable("personas", {
  cedula: integer("cedula").primaryKey(),
  nombreApellido: text("nombre_apellido").notNull(),
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

/**
 * Tabla de usuarios de la app móvil.
 * Cada usuario está asociado a una persona (FK → personas.cedula)
 * y a una sucursal asignada (idSucursal).
 * El campo `bloqueado` impide el login cuando es `true`.
 */
export const usuariosApp = sqliteTable("usuarios_app", {
  cedula: integer("cedula").primaryKey(), // FK → personas.cedula
  clave: text("clave").notNull(),
  refreshToken: text("refresh_token"),
  salt: text("salt"),
  // nuevo: usuario bloqueado o no
  bloqueado: integer("bloqueado", { mode: "boolean" })
    .notNull()
    .default(false),
  idUser: integer("id_user").notNull(),
  idSucursal: integer("id_sucursal").notNull(),
});

/** Tabla de clientes identificados por RUC. */
export const clientes = sqliteTable("clientes", {
  ruc: text("ruc").primaryKey(),
  descripcionCliente: text("descripcion_cliente").notNull(),
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

/**
 * Tabla de vehículos asociados a un cliente (FK → clientes.ruc).
 * El ID de vehículo es un texto libre provisto por el servidor central.
 */
export const vehiculos = sqliteTable("vehiculos", {
  idVehiculo: text("id_vehiculo").primaryKey(),
  descripcionVehiculo: text("descripcion_vehiculo").notNull(),
  ruc: text("ruc").notNull(),              // FK → clientes.ruc
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

/** Tabla de sucursales del negocio. Catálogo de solo lectura. */
export const sucursales = sqliteTable("sucursales", {
  idSucursal: integer("id_sucursal").primaryKey(),
  descripcionSucursal: text("descripcion_sucursal").notNull(),
});

/**
 * Tabla de bodegas (depósitos de combustible).
 * Cada bodega pertenece a una sucursal y puede estar habilitada
 * como destino de traspaso (`trapaso = true`).
 */
export const bodegas = sqliteTable("bodegas", {
  idBodega: integer("id_bodega").primaryKey(),
  descripcionBodega: text("descripcion_bodega").notNull(),
  idSucursal: integer("id_sucursal").notNull(), // FK → sucursales.id_sucursal
  trapaso: integer("trapaso", { mode: "boolean" }).notNull().default(false),
});

/**
 * Tabla de picos (surtidores).
 * Cada pico pertenece a una bodega y tiene un número de surtidor físico
 * (`idPicoSurtidor`) usado por el hardware para identificar el despacho.
 */
export const picos = sqliteTable("picos", {
  idPico: integer("id_pico").primaryKey(),
  descripcionPico: text("descripcion_pico").notNull(),
  idBodega: integer("id_bodega").notNull(),     // FK → bodegas.id_bodega
  idPicoSurtidor: integer("id_pico_surtidor").notNull(),
});

/**
 * Tabla de tanques de almacenamiento.
 * Cada tanque pertenece a una bodega y tiene capacidad en litros.
 */
export const tanques = sqliteTable("tanques", {
  idTanque: integer("id_tanque").primaryKey(),
  descripcionTanque: text("descripcion_tanque").notNull(),
  idBodega: integer("id_bodega").notNull(),     // FK → bodegas.id_bodega
  capacidadLitros: real("capacidad_litros"),
});

/**
 * Tabla de turnos de trabajo.
 * El payload completo se serializa en el campo `json`.
 * `estado = 1` → activo, `estado = 0` → cerrado/anulado.
 */
export const turnos = sqliteTable("turnos", {
  idTurno: integer("id_turno").primaryKey({ autoIncrement: true }),
  idBodega: integer("id_bodega").notNull(),
  json: text("json").notNull(),
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),
  fecha: integer("fecha"),
  hora: integer("hora"),
  estado: integer("estado").notNull().default(1),
  observacionAnulacion: text("observacion_anulacion"),
});

/**
 * Tabla de tickets de operación.
 * El payload completo se serializa en el campo `json`.
 */
// En tu archivo de schema (ej: src/backend/db/schema.ts)

export const tickets = sqliteTable("tickets", {
  idTicket: integer("id_ticket").primaryKey({ autoIncrement: true }),
  id_suc: integer("id_suc").notNull(),
  id_bod: integer("id_bod").notNull(),
  id_pico: integer("id_pico").notNull(),
  fecha: text("fecha").notNull(),
  hora: text("hora").notNull(),
  ci_playero: integer("ci_playero").notNull(),
  id_operador: integer("id_operador").notNull(),
  litros: real("litros").notNull(),
  taxilitro_inicial: real("taxilitro_inicial").notNull(),
  taxilitro_final: real("taxilitro_final").notNull(),
  monto: real("monto").notNull(),
  ruc_cliente: text("ruc_cliente"),
  id_vehiculo: text("id_vehiculo"),
  tipo: text("tipo").notNull(),
  kilometraje: integer("kilometraje"),
  horometro: real("horometro"),
  obs: text("obs"),
  observaciones_ticket: text("observaciones_ticket"),
  ubicacion_carga: text("ubicacion_carga"),
  foto_chapa: text("foto_chapa", { mode: "json" }).$type<string[]>(),
  firma_conductor: text("firma_conductor", { mode: "json" }).$type<string[]>(),
  foto_kilometraje: text("foto_kilometraje", { mode: "json" }).$type<string[]>(),
  foto_horometro: text("foto_horometro", { mode: "json" }).$type<string[]>(),
  foto_observaciones: text("foto_observaciones", { mode: "json" }).$type<string[]>(),
  foto_taxilitro: text("foto_taxilitro", { mode: "json" }).$type<string[]>(),
  foto_taxilitro_fin: text("foto_taxilitro_fin", { mode: "json" }).$type<string[]>(),
  sync: integer("sync").notNull().default(0),
  estado: integer("estado").notNull().default(1),
  fecha_registro: integer("fecha_registro"),
  hora_registro: integer("hora_registro"),
});

/**
 * Tabla de traspasos de combustible entre bodegas.
 * Campos normalizados directamente de TraspasoDTO, sin JSON serializado.
 */
export const trapasos = sqliteTable("trapasos", {
  // Identificadores
  idTrapaso: integer("id_trapaso").primaryKey({ autoIncrement: true }),
  idTraspasoMongo: text("id_trapaso_mongo"), // id_trapaso de MongoDB (opcional)

  // Bodegas y tanques
  bodOrigen: integer("bod_origen").notNull(),
  bodDestino: integer("bod_destino").notNull(),
  idTanqueDestino: integer("id_tanque_destino").notNull(),

  // Mediciones de altura/volumen
  reglaAlturaInicial: text("regla_altura_inicial").notNull(),
  reglaAlturaFinal: text("regla_altura_final").notNull(),
  litrosTanqueInicial: real("litros_tanque_inicial").notNull(),
  litrosTanqueFinal: real("litros_tanque_final").notNull(),

  // Temperaturas
  tempInicial: real("temp_inicial").notNull(),
  tempFinal: real("temp_final").notNull(),

  // Pico y taxímetro
  idPico: integer("id_pico").notNull(),
  taxilitroInicial: real("taxilitro_inicial").notNull(),
  taxilitroFinal: real("taxilitro_final").notNull(),
  litrosPico: real("litros_pico").notNull(),

  // Observaciones
  obsTraspaso: text("obs_traspaso").notNull(),
  obsAdicional: text("obs_adicional"),

  // Fecha y hora
  fecha: text("fecha").notNull(), // YYYY-MM-DD
  hora: text("hora").notNull(),   // HH:MM:SS

  // Usuarios
  idPlayero: integer("id_playero").notNull(),
  idEncargadoReceptor: integer("id_encargado_receptor").notNull(),
  idAutorizado: integer("id_autorizado"),

  // Fotografías (JSON arrays)
  fotoMedicionInicial: text("foto_medicion_inicial"), // JSON stringified array
  fotoMedicionFinal: text("foto_medicion_final"),     // JSON stringified array
  firmaReceptor: text("firma_receptor"),              // JSON stringified array
  fotoObsTraspaso: text("foto_obs_traspaso"),         // JSON stringified array
  fotoTaxilitro: text("foto_taxilitro"),       // ◄ CAMBIO: Ahora guarda el JSON string de la foto inicial real
  fotoTaxilitroFin: text("foto_taxilitro_fin"),

  // Metadata
  corteId: integer("corte_id"),
  lastIdSalida: integer("last_id_salida"),
  estado: integer("estado").notNull().default(1),
  sync: integer("sync").notNull().default(0), // 0: pendiente, 1: sincronizado, -1: error
  fechaCreacion: integer("fecha_creacion"), // timestamp
  fechaSincronizacion: integer("fecha_sincronizacion"), // timestamp
});

export type Traspaso = typeof trapasos.$inferSelect;
export type TraspasoInsert = typeof trapasos.$inferInsert;

export const calibraciones = sqliteTable("calibraciones", {
  idCalibracion: integer("id_calibracion").primaryKey({ autoIncrement: true }),

  fechaHora: text("fecha_hora").notNull(),
  hora: text("hora").notNull(),
  bodega: integer("bodega").notNull(),
  ciEncargado: integer("ci_encargado").notNull(),
  nombreEncargado: text("nombre_encargado").notNull(),
  pico: integer("pico").notNull(),
  taxilitroInicial: integer("taxilitro_inicial").notNull(),
  taxilitroFinal: integer("taxilitro_final").notNull(),
  
  fotoPrecintoRetirado: text("foto_precinto_retirado").notNull(),
  fotoPrecintoColocado: text("foto_precinto_colocado").notNull(),
  firmaCalibrador: text("firma_calibrador").notNull(),

  // ◄ NUEVOS: Columnas para persistir localmente el Base64 de los taxilitros
  fotoInicialTaxilitro: text("foto_inicial_taxilitro"), 
  fotoFinalTaxilitro: text("foto_final_taxilitro"),

  obsGral: text("obs_gral"),
  nroPrecintoRetirado: text("nro_precinto_retirado"),
  nroPrecintoColocado: text("nro_precinto_colocado"),
  
  tipoOperacion: text("tipo_operacion")
    .$type<"VERIFICACION" | "CALIBRACION">()
    .notNull()
    .default("CALIBRACION"),

  // Al actualizar el tipo CalibracionDetalleDTO, Drizzle/TS exigirá foto_taxilitro_carga dentro del JSON
  detalles: text("detalles", { mode: "json" })
    .$type<CalibracionDetalleDTO[]>()
    .notNull(),

  sync: integer("sync").notNull().default(0),
});

/**
 * Tabla Principal: Abastecimientos
 * Mapeada 1:1 con los campos del DTO (aplanando el antiguo campo JSON)
 */
export const abastecimientos = sqliteTable("abastecimientos", {
  // Cambiado a text o integer según prefieras para UUIDs/IDs Mongo, pero mantenemos tu primaryKey
  idAbastecimiento: integer("id_abastecimiento").primaryKey({ autoIncrement: true }),
  
  // Control local del front
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),

  // Campos del DTO
  idSuc: integer("id_suc").notNull(),
  idBod: integer("id_bod").notNull(),
  fecha: text("fecha").notNull(), // El DTO envía string (ej: '2026-06-18')
  hora: text("hora").notNull(),   // El DTO envía string (ej: '14:30:00')
  nroOc: integer("nro_oc").notNull(),
  nroRemision: text("nro_remision").notNull(),
  litrosRemision: integer("litros_remision").notNull(),
  playero: integer("playero").notNull(),
  
  // SQLite no tiene Arrays, usamos text y le indicamos el tipo a Drizzle para que los serialice automáticamente
  fotoRevDocs: text("foto_rev_docs", { mode: "json" }).$type<string[]>().notNull(),  
  zetaNoLlega: integer("zeta_no_llega").notNull(), // Se guarda como 0 o 1
  idPicoParaZeta: integer("id_pico_para_zeta"), // Opcional (permite null si no llega)
  taxilitroInicial: integer("taxilitro_inicial").notNull(),
  taxilitroFinal: integer("taxilitro_final").notNull(),
  litrosZeta: integer("litros_zeta").notNull(),
  obsRepos: text("obs_repos").notNull(),
  
  fotoObsRepos: text("foto_obs_repos", { mode: "json" }).$type<string[]>().notNull(),  
  litrosTotalRepos: text("litros_total_repos").notNull(),
  fotoTaxilitro: text("foto_taxilitro").notNull().default(""),
  fotoTaxilitroFin: text("foto_taxilitro_fin").notNull().default(""),
});

/**
 * Tabla Secundaria: Mediciones de Tanque
 * Resuelve la relación de array de objetos del DTO
 */
export const medicionesTanque = sqliteTable("mediciones_tanque", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Llave foránea vinculada a la tabla de arriba
  abastecimientoId: integer("abastecimiento_id")
    .notNull()
    .references(() => abastecimientos.idAbastecimiento, { onDelete: "cascade" }),

  idTanque: integer("id_tanque").notNull(),

  // Datos de INICIO (Aplanados en la tabla para SQLite)
  inicioRegla: text("inicio_regla").notNull(),
  inicioTemperatura: real("inicio_temperatura").notNull(), // real = float en SQLite
  inicioLitros: real("inicio_litros").notNull(),
  inicioFotoMedicion: text("inicio_foto_medicion").notNull(),

  // Datos de FIN
  finRegla: text("fin_regla").notNull(),
  finTemperatura: real("fin_temperatura").notNull(),
  finLitros: real("fin_litros").notNull(),
  finFotoMedicion: text("fin_foto_medicion").notNull(),
});


/**
 * Tabla de despachos escritos directamente por el surtidor.
 * La app la lee en modo polling para detectar nuevos despachos.
 * Las unidades de volumen son mililitros; dividir por 1000 para obtener litros.
 */
export const despachos = sqliteTable("despachos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  idHrs: integer("id_hrs").notNull(),
  pico: integer("pico").notNull(),
  combustible: integer("combustible").notNull(),
  tanque: integer("tanque").notNull(),
  totalCtvs: integer("total_ctvs").notNull(),
  volumenMl: integer("volumen_ml").notNull(),
  precioCvl: integer("precio_cvl").notNull(),
  decTotal: integer("dec_total").notNull(),
  decVolumen: integer("dec_volumen").notNull(),
  decPrecio: integer("dec_precio").notNull(),
  tiempoSeg: integer("tiempo_seg"),
  fechaHora: integer("fecha_hora").notNull(),
  totalIni: integer("total_ini"),
  totalFin: integer("total_fin"),
  frentistaId: text("frentista_id"),
  clienteId: text("cliente_id"),
  volTanqueMl: integer("vol_tanque_ml"),
  creadoEn: integer("creado_en").notNull().$defaultFn(() => Date.now()),
  sync: integer("sync").notNull().default(0),
  proces: integer("proces", { mode: "boolean" }),
});

/**
 * Tabla key-value para registrar timestamps de última sincronización
 * y el último usuario autenticado online. Reutilizada por todos los módulos DB.
 */
export const syncs = sqliteTable("syncs", {
  idSync: integer("id_sync").primaryKey({ autoIncrement: true }),
  tipo: text("tipo").notNull().unique(),
  fecha: integer("fecha").notNull(),
});

/**
 * Tabla de permisos de traspaso por USUARIO y bodega.
 * Clave primaria compuesta: (cedula, idBodega).
 * Cambio: se reemplaza idSucursal por cedula para control por usuario.
 */
export const habilitadosTrapaso = sqliteTable(
  "habilitados_trapaso",
  {
    // cedula del usuario que realiza el traspaso
    cedula: integer("cedula").notNull(),

    // bodega relacionada
    idBodega: integer("id_bodega").notNull(),

  },
  (table) => ({
    pk: primaryKey({
      columns: [table.cedula, table.idBodega],
    }),
  })
);

/**
 * Tabla intermedia para la relación muchos a muchos entre usuarios y bodegas.
 * Define qué bodegas están bajo el control/mando de qué usuario de la app.
 */
export const usuariosBodegas = sqliteTable(
  "usuarios_bodegas",
  {
    cedula: integer("cedula")
      .notNull(), // FK -> usuariosApp.cedula
    idBodega: integer("id_bodega")
      .notNull(), // FK -> bodegas.id_bodega
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.cedula, table.idBodega],
    }),
  })
);

/**
 * Tabla de módulos habilitados por usuario de la app móvil.
 * Controla el acceso a las funciones de la interfaz.
 * En la BD se guarda como 0 (deshabilitado) / 1 (habilitado).
 */
export const modulosUsuarios = sqliteTable("modulos_usuarios", {
  // Clave primaria y foránea que conecta directamente con el usuario
  cedula: integer("cedula").primaryKey(), // FK → usuariosApp.cedula

  // Campos de módulos (en BD: 0 o 1 / en TS: false o true)
  abastecimiento: integer("abastecimiento", { mode: "boolean" })
    .notNull()
    .default(false),
    
  calibracion: integer("calibracion", { mode: "boolean" })
    .notNull()
    .default(false),
    
  traspaso: integer("traspaso", { mode: "boolean" })
    .notNull()
    .default(false),
    
  salida: integer("salida", { mode: "boolean" })
    .notNull()
    .default(false),
    
  vehiculo: integer("vehiculo", { mode: "boolean" })
    .notNull()
    .default(false),
    
  persona: integer("persona", { mode: "boolean" })
    .notNull()
    .default(false),
});

/**
 * Tabla de cubicación de tanques (relación altura en regla vs litros).
 * Permite calcular el volumen contenido localmente en la app sin conexión.
 */
export const cubicacionTanque = sqliteTable(
  "cubicacion_tanque",
  {
    idTanque: integer("id_tanque")
      .notNull()
      .references(() => tanques.idTanque, { onDelete: "cascade" }),
    altura: real("altura").notNull(),
    litros: real("litros").notNull(),
    sync: integer("sync").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.idTanque, table.altura],
    }),
  })
);

export type CubicacionTanque = typeof cubicacionTanque.$inferSelect;
export type CubicacionTanqueInsert = typeof cubicacionTanque.$inferInsert;

// ==================== RELACIONES ====================
/** Relación 1-a-1 personas → usuariosApp. */
export const personasRelations = relations(personas, ({ one }) => ({
  usuarioApp: one(usuariosApp, {
    fields: [personas.cedula],
    references: [usuariosApp.cedula],
  }),
}));

/** Relación N-a-1 vehículos → clientes. */
export const vehiculosRelations = relations(vehiculos, ({ one }) => ({
  cliente: one(clientes, {
    fields: [vehiculos.ruc],
    references: [clientes.ruc],
  }),
}));


/**
 * Relaciones de bodegas:
 * - N-a-1 con sucursales
 * - 1-a-N con picos
 * - 1-a-N con tanques
 */
export const bodegasRelations = relations(bodegas, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [bodegas.idSucursal],
    references: [sucursales.idSucursal],
  }),
  picos: many(picos),
  tanques: many(tanques),
  // Nueva relación: una bodega puede estar controlada por muchos usuarios (vía intermedia)
  usuariosControladores: many(usuariosBodegas), 
}));

/** Relaciones de habilitadosTrapaso → sucursales y bodegas. */
export const habilitadosTrapasoRelations = relations(
  habilitadosTrapaso,
  ({ one }) => ({
    sucursal: one(sucursales, {
      fields: [habilitadosTrapaso.idSucursal],
      references: [sucursales.idSucursal],
    }),

    bodega: one(bodegas, {
      fields: [habilitadosTrapaso.idBodega],
      references: [bodegas.idBodega],
    }),
  })
);

/** Relaciones de usuariosApp → personas y sucursales. */
export const usuariosAppRelations = relations(usuariosApp, ({ one, many }) => ({
  persona: one(personas, {
    fields: [usuariosApp.cedula],
    references: [personas.cedula],
  }),
  sucursal: one(sucursales, {
    fields: [usuariosApp.idSucursal],
    references: [sucursales.idSucursal],
  }),
  bodegasControladas: many(usuariosBodegas), 
  
  // Nueva relación 1 a 1: El usuario tiene un único perfil de módulos
  modulos: one(modulosUsuarios, {
    fields: [usuariosApp.cedula],
    references: [modulosUsuarios.cedula],
  }),
}));

/** Relaciones de la tabla intermedia usuariosBodegas */
export const usuariosBodegasRelations = relations(usuariosBodegas, ({ one }) => ({
  usuario: one(usuariosApp, {
    fields: [usuariosBodegas.cedula],
    references: [usuariosApp.cedula],
  }),
  bodega: one(bodegas, {
    fields: [usuariosBodegas.idBodega],
    references: [bodegas.idBodega],
  }),
}));

/** Relación 1-a-1 modulosUsuarios → usuariosApp. */
export const modulosUsuariosRelations = relations(modulosUsuarios, ({ one }) => ({
  usuario: one(usuariosApp, {
    fields: [modulosUsuarios.cedula],
    references: [usuariosApp.cedula],
  }),
}));

/**
 * Definición de relaciones (Drizzle Relations)
 * Esto te facilitará hacer queries del tipo `with: { medicionesTanque: true }` 
 * para armar tu DTO exacto antes de mandarlo al backend.
 */
export const abastecimientosRelations = relations(abastecimientos, ({ many }) => ({
  medicionesTanque: many(medicionesTanque),
}));

export const medicionesTanqueRelations = relations(medicionesTanque, ({ one }) => ({
  abastecimiento: one(abastecimientos, {
    fields: [medicionesTanque.abastecimientoId],
    references: [abastecimientos.idAbastecimiento],
  }),
}));

/** Relación N-a-1 tanques → bodegas y 1-a-N tanques → cubicaciones */
export const tanquesRelations = relations(tanques, ({ one, many }) => ({
  bodega: one(bodegas, {
    fields: [tanques.idBodega],
    references: [bodegas.idBodega],
  }),
  cubicaciones: many(cubicacionTanque),
}));

/** Relación N-a-1 cubicacionTanque → tanques */
export const cubicacionTanqueRelations = relations(cubicacionTanque, ({ one }) => ({
  tanque: one(tanques, {
    fields: [cubicacionTanque.idTanque],
    references: [tanques.idTanque],
  }),
}));