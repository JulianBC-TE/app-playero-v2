import { Text as RNText, TextProps, useColorScheme, TextStyle } from "react-native";

// Tokens de Tailwind que ocupan el prefijo `text-` pero NO son colores
// (tamaños de fuente y alineación). Todo lo demás que sigue a `text-`
// se considera un color explícito (text-white, text-gray-500, text-teColorPrincipal...).
const NO_COLOR_TOKENS = new Set([
  "xs", "sm", "md", "lg", "xl", "base",
  "left", "center", "right", "justify",
  "wrap", "nowrap", "clip", "ellipsis", "balance", "pretty",
]);

/** true si el className trae un color de texto explícito (ej. "text-white"). */
function classNameTieneColor(className?: string): boolean {
  if (!className) return false;
  return className.split(/\s+/).some((token) => {
    if (!token.startsWith("text-")) return false;
    // Quita el modificador de opacidad (text-white/80 → text-white)
    const resto = token.slice(5).replace(/\/\d+$/, "");
    // text-[11px] = tamaño arbitrario; text-[#fff] = color arbitrario
    if (resto.startsWith("[")) return resto.includes("#");
    // 2xl…9xl son tamaños
    if (/^\d+xl$/.test(resto)) return false;
    return !NO_COLOR_TOKENS.has(resto);
  });
}

/** true si el style (objeto o array anidado) define un color explícito. */
function styleTieneColor(style: unknown): boolean {
  if (!style) return false;
  if (Array.isArray(style)) return style.some(styleTieneColor);
  return typeof style === "object" && "color" in style && (style as TextStyle).color != null;
}

/**
 * Texto con color por defecto según el tema activo: negro en claro,
 * gris claro en oscuro. Si el componente llamador ya define un color
 * (className `text-*` de color o `style.color`), se respeta ese y no
 * se aplica el default.
 */
export function Text({ className, style, ...props }: TextProps) {
  const colorScheme = useColorScheme();
  const tieneColorExplicito = classNameTieneColor(className) || styleTieneColor(style);
  const colorPorDefecto = colorScheme === "dark" ? "text-textDark" : "text-text";

  return (
    <RNText
      {...props}
      className={tieneColorExplicito ? className : `${colorPorDefecto} ${className ?? ""}`}
      style={style}
      allowFontScaling={false}
    />
  );
}
