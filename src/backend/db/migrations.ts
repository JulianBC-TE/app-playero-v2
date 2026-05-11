import { db } from './client';

export async function runMigrations() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS playeros (
      cedula     INTEGER PRIMARY KEY,
      nombre     TEXT    NOT NULL,
      clave_hash TEXT    NOT NULL
    )
  `);
}