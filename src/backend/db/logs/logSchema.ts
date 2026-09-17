import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fecha: text("fecha").notNull(),
  tipo: text("tipo").notNull(),
  accion: text("accion").notNull(),
  registroId: integer("registro_id").notNull(),
  detalle: text("detalle"),
  payloadCifrado: text("payload_cifrado").notNull(),
  createdAt: text("created_at").default("(datetime('now'))"),
});

export type Log = typeof logs.$inferSelect;
export type LogInsert = typeof logs.$inferInsert;
