import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

// 1. Recreamos las variables de entorno necesarias para la compatibilidad
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

export default [
  // 2. Usamos 'compat.extends' para traducir la configuración vieja de Expo al formato Flat Config automáticamente
  ...compat.extends("eslint-config-expo"),
  
  {
    rules: {
      // Tus reglas personalizadas o excepciones pueden ir aquí abajo
    },
  },
];