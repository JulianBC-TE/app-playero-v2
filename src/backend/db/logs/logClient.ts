import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { logs } from "./logSchema";

const expoDb = SQLite.openDatabaseSync("logs.db", {
  enableChangeListener: true,
});

export const logsDb = drizzle(expoDb);

export async function initLogsDb() {
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL,
      accion TEXT NOT NULL,
      registro_id INTEGER NOT NULL,
      detalle TEXT,
      payload_cifrado TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
