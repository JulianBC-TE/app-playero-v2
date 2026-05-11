import React from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import migrations from "./drizzle/migrations";

const expoDb = SQLite.openDatabaseSync("playero.db", { 
  enableChangeListener: true 
});

export const db = drizzle(expoDb);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  useDrizzleStudio(expoDb);

  const { success, error } = useMigrations(db, migrations);

  if (error) {
    console.error("❌ Migration error:", error);
    return null;
  }

  if (!success) {
    console.log("⏳ Aplicando migraciones...");
    return null;
  }

  return <>{children}</>;
}