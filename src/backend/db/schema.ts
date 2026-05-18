// src/backend/db/schema.ts
import { sqliteTable, integer, text, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";


export const personas = sqliteTable("personas", {
  cedula: integer("cedula").primaryKey(),
  nombreApellido: text("nombre_apellido").notNull(),
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

export const usuariosApp = sqliteTable("usuarios_app", {
  cedula: integer("cedula").primaryKey(), // FK → personas.cedula
  clave: text("clave").notNull(),
  refreshToken: text("refresh_token"),
  salt: text("salt"),
  // nuevo: usuario bloqueado o no
  bloqueado: integer("bloqueado", { mode: "boolean" })
    .notNull()
    .default(false),

  // nuevo: sucursal asignada
  idSucursal: integer("id_sucursal").notNull(),
});

export const clientes = sqliteTable("clientes", {
  ruc: text("ruc").primaryKey(),
  descripcionCliente: text("descripcion_cliente").notNull(),
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

export const vehiculos = sqliteTable("vehiculos", {
  idVehiculo: text("id_vehiculo").primaryKey(),
  descripcionVehiculo: text("descripcion_vehiculo").notNull(),
  ruc: text("ruc").notNull(),              // FK → clientes.ruc
  timestamp: integer("timestamp"),
  sync: integer("sync").notNull().default(0),
});

export const sucursales = sqliteTable("sucursales", {
  idSucursal: integer("id_sucursal").primaryKey(),
  descripcionSucursal: text("descripcion_sucursal").notNull(),
});

export const bodegas = sqliteTable("bodegas", {
  idBodega: integer("id_bodega").primaryKey(),
  descripcionBodega: text("descripcion_bodega").notNull(),
  idSucursal: integer("id_sucursal").notNull(), // FK → sucursales.id_sucursal
  trapaso: integer("trapaso", { mode: "boolean" }).notNull().default(false),
});

export const picos = sqliteTable("picos", {
  idPico: integer("id_pico").primaryKey(),
  descripcionPico: text("descripcion_pico").notNull(),
  idBodega: integer("id_bodega").notNull(),     // FK → bodegas.id_bodega
  idPicoSurtidor: integer("id_pico_surtidor").notNull(),
});

export const tanques = sqliteTable("tanques", {
  idTanque: integer("id_tanque").primaryKey(),
  descripcionTanque: text("descripcion_tanque").notNull(),
  idBodega: integer("id_bodega").notNull(),     // FK → bodegas.id_bodega
  capacidadLitros: real("capacidad_litros"),
});

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

export const tickets = sqliteTable("tickets", {
  idTicket: integer("id_ticket").primaryKey({ autoIncrement: true }),
  json: text("json").notNull(),
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),
  fecha: integer("fecha"),
  hora: integer("hora"),
  estado: integer("estado").notNull().default(1),
});

export const trapasos = sqliteTable("trapasos", {
  idTrapaso: integer("id_trapaso").primaryKey({ autoIncrement: true }),
  json: text("json").notNull(),
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),
  fecha: integer("fecha"),
  hora: integer("hora"),
  estado: integer("estado").notNull().default(1),
});

export const calibraciones = sqliteTable("calibraciones", {
  idCalibracion: integer("id_calibracion").primaryKey({ autoIncrement: true }),
  json: text("json").notNull(),
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),
  fecha: integer("fecha"),
  hora: integer("hora"),
});

export const abastecimientos = sqliteTable("abastecimientos", {
  idAbastecimiento: integer("id_abastecimiento").primaryKey({ autoIncrement: true }),
  json: text("json").notNull(),
  tipo: text("tipo").notNull(),
  sync: integer("sync").notNull().default(0),
  fecha: integer("fecha"),
  hora: integer("hora"),
});

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
  sync: integer("sync", { mode: "boolean" }),
  proces: integer("proces", { mode: "boolean" }),
});

export const syncs = sqliteTable("syncs", {
  idSync: integer("id_sync").primaryKey({ autoIncrement: true }),
  tipo: text("tipo").notNull().unique(),
  fecha: integer("fecha").notNull(),
});

export const usuariosAdmin = sqliteTable("usuarios_admin", {
  correo: text("correo").primaryKey(),
  nombre: text("nombre").notNull(),
  salt: text("salt").notNull(),
  clave: text("clave").notNull(),
  refreshToken: text("refresh_token"),
  timestamp: integer("timestamp"),
});

export const habilitadosTrapaso = sqliteTable(
  "habilitados_trapaso",
  {
    // sucursal que consulta / realiza el traspaso
    idSucursal: integer("id_sucursal").notNull(),

    // bodega relacionada
    idBodega: integer("id_bodega").notNull(),

    // permiso explícito
    permitido: integer("permitido", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.idSucursal, table.idBodega],
    }),
  })
);

// ==================== RELACIONES ====================

export const personasRelations = relations(personas, ({ one }) => ({
  usuarioApp: one(usuariosApp, {
    fields: [personas.cedula],
    references: [usuariosApp.cedula],
  }),
}));

export const vehiculosRelations = relations(vehiculos, ({ one }) => ({
  cliente: one(clientes, {
    fields: [vehiculos.ruc],
    references: [clientes.ruc],
  }),
}));

export const bodegasRelations = relations(bodegas, ({ one, many }) => ({
  sucursal: one(sucursales, {
    fields: [bodegas.idSucursal],
    references: [sucursales.idSucursal],
  }),
  picos: many(picos),
  tanques: many(tanques),
}));

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

export const usuariosAppRelations = relations(
  usuariosApp,
  ({ one }) => ({
    persona: one(personas, {
      fields: [usuariosApp.cedula],
      references: [personas.cedula],
    }),

    sucursal: one(sucursales, {
      fields: [usuariosApp.idSucursal],
      references: [sucursales.idSucursal],
    }),
  })
);