// contexts/ThemeContext.tsx - Con sistema de listeners
import { useEffect, useState, useCallback } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from "nativewind";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "@app:theme_mode";

let currentThemeMode: ThemeMode = "system";

// 🔥 Sistema de listeners para que los componentes se enteres de cambios
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
}

export function getCurrentThemeMode() {
  return currentThemeMode;
}

// 🔥 Actualizar tema y notificar a los listeners
export async function setGlobalThemeMode(mode: ThemeMode, systemMode?: "light" | "dark") {
  currentThemeMode = mode;
  await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  
  // Actualizar colorScheme en el siguiente frame
  requestAnimationFrame(() => {
    const actualTheme = mode === "system" ? (systemMode ?? "light") : mode;
    colorScheme.set(actualTheme);
  });

  // 🔥 CRUCIAL: Notificar a los listeners
  notifyListeners(mode);
}

export function useTheme() {
  const systemColorScheme = useSystemColorScheme();
  const [displayTheme, setDisplayTheme] = useState<ThemeMode>(currentThemeMode);

  // 🔥 Suscribirse a cambios de tema
  useEffect(() => {
    const unsubscribe = subscribeToThemeChanges((newMode) => {
      setDisplayTheme(newMode);
    });

  }, []);

  const currentTheme: "light" | "dark" = 
    displayTheme === "system" 
      ? (systemColorScheme ?? "light") 
      : displayTheme;

  const changeTheme = useCallback((mode: ThemeMode) => {
    setGlobalThemeMode(mode, systemColorScheme ?? undefined);
  }, [systemColorScheme]);

  const activeTheme = currentTheme; // Alias para compatibilidad

  return { 
    themeMode: displayTheme,
    activeTheme,
    currentTheme,
    changeTheme, // 👈 Este es el que debes usar
  };
}