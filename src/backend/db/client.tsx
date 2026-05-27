/**
 * Configura y expone la instancia global de la base de datos SQLite
 * mediante Drizzle ORM para Expo.
 *
 * @module Playero/Backend/DB/Client
 * @category Database
 * @category client
 */
import React from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import migrations from "./drizzle/migrations";
import { View, Text } from "react-native";
import { Loading } from "@/components/Loading";

/** Instancia SQLite subyacente abierta con soporte de change listener. */
const expoDb = SQLite.openDatabaseSync("playero.db", { 
  enableChangeListener: true 
});

/**
 * Instancia global de Drizzle ORM vinculada a la BD SQLite local.
 * Usar esta constante en todos los módulos de acceso a datos.
 */
export const db = drizzle(expoDb);

/**
 * Proveedor React que aplica las migraciones pendientes al montar la app.
 * Mientras las migraciones no terminen, no renderiza los hijos.
 * En caso de error de migración, retorna `null` y registra el error en consola.
 *
 * @param children - Árbol de componentes a renderizar una vez migradas las tablas.
 * @returns El árbol de hijos o `null` durante la migración / en caso de error.
 *
 * @example
 * ```tsx
 * <DatabaseProvider>
 *   <App />
 * </DatabaseProvider>
 * ```
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  useDrizzleStudio(expoDb);

  const { success, error } = useMigrations(db, migrations);

  if (error) {
    console.error("❌ Migration error:", error);
    // Mostrá algo en vez de pantalla negra
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Error al inicializar la base de datos.</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return <Loading />;  // ← en vez de null
  }

  return <>{children}</>;
}