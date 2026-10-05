// contexts/ThemeContext.tsx - Con sistema de listeners
import { useEffect, useState, useCallback } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from "nativewind";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@app:theme_mode";

let currentThemeMode: ThemeMode = "system";

// 🔥 Sistema de listeners para que los componentes se enteren de cambios
const listeners: Set<(mode: ThemeMode) => void> = new Set();

function notifyListeners(mode: ThemeMode) {
  listeners.forEach(listener => listener(mode));
}

export function subscribeToThemeChanges(callback: (mode: ThemeMode) => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function initTheme() {
  const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    currentThemeMode = stored as ThemeMode;
  }
  // Notifica a los componentes ya montados (ej. App) para que apliquen
  // el modo guardado tan pronto como se lee del storage.
  notifyListeners(currentThemeMode);
}

export function getCurrentThemeMode() {
  return currentThemeMode;
}

/**
 * Aplica y persiste el modo de tema.
 *
 * `colorScheme.set("system")` resetea el override de apariencia de React
 * Native (`Appearance.setColorScheme(null)`) para que la app vuelva a seguir
 * el esquema real del sistema operativo; "light"/"dark" fuerzan el override.
 */
export async function setGlobalThemeMode(mode: ThemeMode) {
  currentThemeMode = mode;
  await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

  colorScheme.set(mode);

  // 🔥 CRUCIAL: Notificar a los listeners
  notifyListeners(mode);
}

export function useTheme() {
  const systemColorScheme = useSystemColorScheme();
  const [displayTheme, setDisplayTheme] = useState<ThemeMode>(currentThemeMode);

  // 🔥 Suscribirse a cambios de tema (y desuscribirse al desmontar)
  useEffect(() => {
    const unsubscribe = subscribeToThemeChanges(setDisplayTheme);
    return () => {
      unsubscribe();
    };
  }, []);

  const currentTheme: "light" | "dark" =
    displayTheme === "system"
      ? (systemColorScheme ?? "light")
      : displayTheme;

  const changeTheme = useCallback((mode: ThemeMode) => {
    setGlobalThemeMode(mode);
  }, []);

  const activeTheme = currentTheme; // Alias para compatibilidad

  return {
    themeMode: displayTheme,
    activeTheme,
    currentTheme,
    changeTheme, // 👈 Este es el que debes usar
  };
}
