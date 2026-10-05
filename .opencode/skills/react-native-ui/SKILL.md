---
name: react-native-ui
description: Use when designing or refactoring UI/UX in the PlayeroTE Expo React Native app, especially screens, components, dark mode, NativeWind classes, forms, cards, modals, lists, navigation headers, and visual polish.
---

# Documento de colores — mobile-playero

Fecha: 2026-10-01

Estado: propuesta para implementación. Basado en `playero-web-v2/frontend/app/globals.css`, `docs/DESIGN_SYSTEM.md` y revisión estática de `ecosistema/mobile-playero`.

## 1. Objetivo

Definir una paleta clara y oscura para la app móvil `mobile-playero`, manteniendo coherencia con el frontend web v2 y con el uso operativo real de la app: login, menú principal, headers, formularios, cards de búsqueda, carga de combustible, mediciones, calibraciones, traspasos, abastecimientos y estados de turno.

La paleta prioriza:

- legibilidad en exterior;
- contraste suficiente para texto y botones;
- diferenciación clara de estados operativos;
- soporte real para modo claro y modo oscuro;
- continuidad visual con el azul/gris del frontend v2;
- cambios graduales sobre los componentes actuales de NativeWind.

## 2. Hallazgos actuales en mobile-playero

La app ya usa una paleta en `tailwind.config.js`:

```js
teColorPrincipal: "#307FE2"
teColorPrincipalMedio: "#6BA4EA"
teColorPrincipalClaro: "#AED2FF"
teColorSecundario: "#A7A8A9"
teColorSecundarioMedio: "#DADCDD"
teColorSecundarioClaro: "#E2E2E2"
```

Uso detectado:

- `HomeHeader` y `ScreenHeader`: `bg-teColorPrincipal` con texto blanco.
- `Button`: `bg-teColorPrincipal`.
- `InputCard` y algunas cards operativas: `bg-teColorPrincipalClaro`.
- `ClienteCard`, `VehiculoCard`, login y firma: `bg-teColorSecundarioMedio`.
- `Input`, `Select`, `TextSearch`: fondos blancos y textos negros hardcodeados.
- `MenuCard`: colores de turno sobre `teColorTurno*`.

Inconsistencias a corregir al implementar la paleta:

- `teColorTurnoPendiente`, `teColorTurnoCierreEspecial`, `teColorTurnoCerrado` y `teColorTurnoAbrir` tienen doble `##`, valor inválido.
- Hay muchos `text-black`, `bg-white`, `color="#000"`, `color="#fff"` hardcodeados, lo que dificulta modo oscuro.
- `Input` usa borde verde para foco; conviene usar el color `ring/focus` de la paleta para no mezclar foco con estado exitoso.
- Estados importantes no deben depender solo de color: siempre acompañar con texto o icono.

## 3. Principio de tokens

No se recomienda que las pantallas usen colores directos como `#307FE2`, `text-black` o `bg-white`. Las pantallas deberían usar tokens semánticos:

```text
background, surface, surfaceElevated, text, textMuted, border,
primary, primarySoft, success, warning, danger, info, disabled
```

Así el componente decide el color según el tema actual.

Ejemplo esperado:

```tsx
<View className="bg-surface border-border">
  <Text className="text-text">Salida de combustible</Text>
  <Text className="text-textMuted">Bodega 15</Text>
</View>
```

En lugar de:

```tsx
<View className="bg-white border-gray-300">
  <Text className="text-black">Salida de combustible</Text>
  <Text className="text-gray-500">Bodega 15</Text>
</View>
```

## 4. Paleta recomendada

### 4.1 Modo claro

| Token | Hex | Uso |
|---|---:|---|
| `background` | `#F3F5F9` | Fondo general de pantallas |
| `surface` | `#FFFFFF` | Inputs, selects, cards principales |
| `surfaceElevated` | `#F8FAFC` | Cards secundarias, bloques informativos |
| `surfaceSoft` | `#E9EEF6` | Fondo suave para grupos de campos |
| `text` | `#1D293D` | Texto principal |
| `textMuted` | `#64748B` | Texto secundario, placeholders, metadatos |
| `textInverse` | `#FFFFFF` | Texto sobre header/botón primario |
| `border` | `#CBD5E1` | Bordes normales |
| `borderStrong` | `#94A3B8` | Bordes destacados o separadores fuertes |
| `primary` | `#5B79C7` | Header, botón primario, foco principal |
| `primaryPressed` | `#4869B8` | Estado presionado del primario |
| `primarySoft` | `#E5ECFA` | Fondo de cards activas no críticas |
| `primarySoftText` | `#243D79` | Texto sobre `primarySoft` |
| `secondary` | `#A7A8A9` | Elementos neutros secundarios |
| `secondarySoft` | `#E2E8F0` | Cards neutras, filas de listas |
| `focus` | `#5B79C7` | Borde de input enfocado |
| `disabledBg` | `#E5E7EB` | Botón/card deshabilitada |
| `disabledText` | `#9CA3AF` | Texto/icono deshabilitado |
| `shadow` | `#0F172A` | Sombras, usar con opacidad baja |

### 4.2 Modo oscuro

| Token | Hex | Uso |
|---|---:|---|
| `background` | `#121A2A` | Fondo general de pantallas |
| `surface` | `#1A2436` | Inputs, selects, cards principales |
| `surfaceElevated` | `#202B40` | Cards elevadas, menú, modales |
| `surfaceSoft` | `#26334A` | Fondo suave para grupos de campos |
| `text` | `#EEF4FF` | Texto principal |
| `textMuted` | `#B6C2D5` | Texto secundario, placeholders, metadatos |
| `textInverse` | `#0F172A` | Texto sobre primario claro si aplica |
| `border` | `#3A4961` | Bordes normales |
| `borderStrong` | `#596A84` | Bordes destacados o separadores fuertes |
| `primary` | `#86A2E8` | Header, botón primario, foco principal |
| `primaryPressed` | `#6F8DDA` | Estado presionado del primario |
| `primarySoft` | `#273B63` | Fondo de cards activas no críticas |
| `primarySoftText` | `#DCE7FF` | Texto sobre `primarySoft` |
| `secondary` | `#8C96A8` | Elementos neutros secundarios |
| `secondarySoft` | `#2A3548` | Cards neutras, filas de listas |
| `focus` | `#86A2E8` | Borde de input enfocado |
| `disabledBg` | `#263041` | Botón/card deshabilitada |
| `disabledText` | `#78869A` | Texto/icono deshabilitado |
| `shadow` | `#000000` | Sombras, usar con opacidad baja |

## 5. Estados operativos

Estos colores deben ser consistentes en claro y oscuro. No usar solo color: combinar con texto e icono.

### 5.1 Modo claro

| Estado | Token | Hex | Uso |
|---|---|---:|---|
| Correcto / abierto / sincronizado | `success` | `#16A34A` | Turno abierto, verificado, guardado |
| Correcto suave | `successSoft` | `#DCFCE7` | Fondo de badge/card de éxito |
| Advertencia / pendiente | `warning` | `#D97706` | Pendiente, falta cerrar, requiere atención |
| Advertencia suave | `warningSoft` | `#FEF3C7` | Fondo de badge/card pendiente |
| Error / bloqueo / destructivo | `danger` | `#DC2626` | Error, cancelar, eliminar, bloqueo |
| Error suave | `dangerSoft` | `#FEE2E2` | Fondo de badge/card de error |
| Información / cerrado / estado neutro | `info` | `#2563EB` | Turno cerrado, información operativa |
| Información suave | `infoSoft` | `#DBEAFE` | Fondo de badge/card informativa |

### 5.2 Modo oscuro

| Estado | Token | Hex | Uso |
|---|---|---:|---|
| Correcto / abierto / sincronizado | `success` | `#4ADE80` | Turno abierto, verificado, guardado |
| Correcto suave | `successSoft` | `#12351F` | Fondo de badge/card de éxito |
| Advertencia / pendiente | `warning` | `#FBBF24` | Pendiente, falta cerrar, requiere atención |
| Advertencia suave | `warningSoft` | `#3A2A0A` | Fondo de badge/card pendiente |
| Error / bloqueo / destructivo | `danger` | `#F87171` | Error, cancelar, eliminar, bloqueo |
| Error suave | `dangerSoft` | `#3B1618` | Fondo de badge/card de error |
| Información / cerrado / estado neutro | `info` | `#60A5FA` | Turno cerrado, información operativa |
| Información suave | `infoSoft` | `#142B4D` | Fondo de badge/card informativa |

## 6. Mapeo con nombres actuales

Para una migración gradual, el desarrollador puede mantener los nombres actuales y sumar tokens nuevos. Recomendación de mapeo:

| Nombre actual | Claro | Oscuro | Recomendación |
|---|---:|---:|---|
| `teColorPrincipal` | `#5B79C7` | `#86A2E8` | Mantener como alias de `primary` |
| `teColorPrincipalMedio` | `#8EA7E5` | `#6F8DDA` | Alias de `primaryPressed` o escala primaria |
| `teColorPrincipalClaro` | `#E5ECFA` | `#273B63` | Alias de `primarySoft` |
| `teColorSecundario` | `#A7A8A9` | `#8C96A8` | Alias de `secondary` |
| `teColorSecundarioMedio` | `#E2E8F0` | `#2A3548` | Alias de `secondarySoft` |
| `teColorSecundarioClaro` | `#F8FAFC` | `#202B40` | Alias de `surfaceElevated` |
| `teColorTurnoAbierto` | `#16A34A` | `#4ADE80` | Alias de `success` |
| `teColorTurnoPendiente` | `#D97706` | `#FBBF24` | Alias de `warning`, corregir doble `##` |
| `teColorTurnoCierreEspecial` | `#DC2626` | `#F87171` | Alias de `danger`, corregir doble `##` |
| `teColorTurnoCerrado` | `#2563EB` | `#60A5FA` | Alias de `info`, corregir doble `##` |
| `teColorTurnoAbrir` | `#E5ECFA` | `#273B63` | Alias de `primarySoft`, corregir doble `##` |

## 7. Uso por componente

### 7.1 Headers

Componentes: `HomeHeader`, `ScreenHeader`.

| Elemento | Claro | Oscuro |
|---|---|---|
| Fondo | `primary` | `surfaceElevated` o `primary` |
| Título | `textInverse` | `text` si fondo oscuro neutro, `#0F172A` si fondo `primary` claro |
| Iconos | igual que título | igual que título |

Recomendación: en modo oscuro usar header `surfaceElevated` con borde inferior `border`, porque un azul muy luminoso como fondo permanente puede cansar en uso nocturno.

### 7.2 Botón primario

Componente: `Button`.

| Estado | Fondo | Texto/Icono |
|---|---|---|
| Normal claro | `primary` | `textInverse` |
| Presionado claro | `primaryPressed` | `textInverse` |
| Normal oscuro | `primary` | `#0F172A` |
| Presionado oscuro | `primaryPressed` | `#0F172A` |
| Deshabilitado | `disabledBg` | `disabledText` |

No usar `iconColor="#000"` fijo en botones primarios. El color del icono debe salir del variante del botón.

### 7.3 Inputs, Select y búsqueda

Componentes: `Input`, `Select`, `TextSearch`.

| Elemento | Claro | Oscuro |
|---|---|---|
| Fondo | `surface` | `surface` |
| Texto | `text` | `text` |
| Placeholder | `textMuted` | `textMuted` |
| Borde normal | `border` | `border` |
| Borde foco | `focus` | `focus` |
| Borde error | `danger` | `danger` |
| Fondo readonly | `surfaceSoft` | `surfaceSoft` |

Recomendación: reemplazar el foco verde actual por `focus`. El verde debe quedar reservado para éxito/verificado.

### 7.4 InputCard y bloques de formulario

Componente: `InputCard`.

| Elemento | Claro | Oscuro |
|---|---|---|
| Fondo | `primarySoft` o `surfaceElevated` | `surfaceElevated` |
| Título | `text` | `text` |
| Requerido `*` | `danger` | `danger` |
| Verificado | `success` | `success` |
| Bloqueado | `warning` o `danger` según caso | `warning` o `danger` según caso |

Para formularios largos, preferir `surfaceElevated` como fondo y usar `primarySoft` solo para secciones destacadas.

### 7.5 Cards de listas

Componentes: `ClienteCard`, `VehiculoCard`, `PersonaCard`, `MedicionesCard`.

| Elemento | Claro | Oscuro |
|---|---|---|
| Fondo normal | `surfaceElevated` | `surfaceElevated` |
| Fondo seleccionado/activo | `primarySoft` | `primarySoft` |
| Texto principal | `text` | `text` |
| Texto secundario | `textMuted` | `textMuted` |
| Chevron/Icono | `textMuted` | `textMuted` |
| Borde | `border` | `border` |

Recomendación: agregar borde sutil. En modo oscuro, la separación por borde es más estable que sombras fuertes.

### 7.6 MenuCard

Componente: `MenuCard`.

| Caso | Fondo claro | Fondo oscuro | Texto/Icono |
|---|---|---|---|
| Menú habilitado | `primarySoft` | `primarySoft` | `primarySoftText` |
| Menú deshabilitado | `disabledBg` | `disabledBg` | `disabledText` |
| Turno abierto | `successSoft` | `successSoft` | `success` o texto contrastado |
| Turno pendiente/falta cerrar | `warningSoft` | `warningSoft` | `warning` o texto contrastado |
| Turno cerrado | `infoSoft` | `infoSoft` | `info` o texto contrastado |
| Cierre especial/error | `dangerSoft` | `dangerSoft` | `danger` o texto contrastado |

Importante: la tarjeta de turno debe incluir texto visible del estado, no solo color.

### 7.7 Toasts y alertas

Componentes: `toastConfig`, `toastMessage`, `Alert` nativo.

| Tipo | Fondo claro | Fondo oscuro | Acento |
|---|---|---|---|
| Éxito | `successSoft` | `successSoft` | `success` |
| Error | `dangerSoft` | `dangerSoft` | `danger` |
| Advertencia | `warningSoft` | `warningSoft` | `warning` |
| Info | `infoSoft` | `infoSoft` | `info` |

No usar `text-red-600` como color de título para todos los toasts. El color debe depender del tipo.

## 8. Ejemplo de configuración NativeWind

Si se mantiene NativeWind v2 con `darkMode: "class"`, una base posible para `tailwind.config.js` sería:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.{js,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: { DEFAULT: "#F3F5F9", dark: "#121A2A" },
        surface: { DEFAULT: "#FFFFFF", dark: "#1A2436" },
        surfaceElevated: { DEFAULT: "#F8FAFC", dark: "#202B40" },
        surfaceSoft: { DEFAULT: "#E9EEF6", dark: "#26334A" },
        text: { DEFAULT: "#1D293D", muted: "#64748B", inverse: "#FFFFFF", dark: "#EEF4FF", mutedDark: "#B6C2D5" },
        border: { DEFAULT: "#CBD5E1", strong: "#94A3B8", dark: "#3A4961", strongDark: "#596A84" },
        primary: { DEFAULT: "#5B79C7", pressed: "#4869B8", soft: "#E5ECFA", softText: "#243D79", dark: "#86A2E8", pressedDark: "#6F8DDA", softDark: "#273B63", softTextDark: "#DCE7FF" },
        success: { DEFAULT: "#16A34A", soft: "#DCFCE7", dark: "#4ADE80", softDark: "#12351F" },
        warning: { DEFAULT: "#D97706", soft: "#FEF3C7", dark: "#FBBF24", softDark: "#3A2A0A" },
        danger: { DEFAULT: "#DC2626", soft: "#FEE2E2", dark: "#F87171", softDark: "#3B1618" },
        info: { DEFAULT: "#2563EB", soft: "#DBEAFE", dark: "#60A5FA", softDark: "#142B4D" },
        disabled: { bg: "#E5E7EB", text: "#9CA3AF", bgDark: "#263041", textDark: "#78869A" },

        teColorPrincipal: "#5B79C7",
        teColorPrincipalMedio: "#8EA7E5",
        teColorPrincipalClaro: "#E5ECFA",
        teColorSecundario: "#A7A8A9",
        teColorSecundarioMedio: "#E2E8F0",
        teColorSecundarioClaro: "#F8FAFC",
        teColorTurnoAbierto: "#16A34A",
        teColorTurnoPendiente: "#D97706",
        teColorTurnoCierreEspecial: "#DC2626",
        teColorTurnoCerrado: "#2563EB",
        teColorTurnoAbrir: "#E5ECFA",
      },
    },
  },
  plugins: [],
};
```

Nota: Tailwind/NativeWind no resuelve automáticamente `DEFAULT/dark` como tema activo si se usan nombres custom. Para una implementación robusta, conviene crear un objeto `theme/colors.ts` y consumir colores desde componentes cuando haya lógica de tema.

## 9. Ejemplo recomendado con objeto de tema

Crear un archivo similar a:

```ts
export const colors = {
  light: {
    background: "#F3F5F9",
    surface: "#FFFFFF",
    surfaceElevated: "#F8FAFC",
    surfaceSoft: "#E9EEF6",
    text: "#1D293D",
    textMuted: "#64748B",
    textInverse: "#FFFFFF",
    border: "#CBD5E1",
    primary: "#5B79C7",
    primaryPressed: "#4869B8",
    primarySoft: "#E5ECFA",
    primarySoftText: "#243D79",
    success: "#16A34A",
    successSoft: "#DCFCE7",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    info: "#2563EB",
    infoSoft: "#DBEAFE",
    disabledBg: "#E5E7EB",
    disabledText: "#9CA3AF",
  },
  dark: {
    background: "#121A2A",
    surface: "#1A2436",
    surfaceElevated: "#202B40",
    surfaceSoft: "#26334A",
    text: "#EEF4FF",
    textMuted: "#B6C2D5",
    textInverse: "#0F172A",
    border: "#3A4961",
    primary: "#86A2E8",
    primaryPressed: "#6F8DDA",
    primarySoft: "#273B63",
    primarySoftText: "#DCE7FF",
    success: "#4ADE80",
    successSoft: "#12351F",
    warning: "#FBBF24",
    warningSoft: "#3A2A0A",
    danger: "#F87171",
    dangerSoft: "#3B1618",
    info: "#60A5FA",
    infoSoft: "#142B4D",
    disabledBg: "#263041",
    disabledText: "#78869A",
  },
};
```

Luego, cada componente puede obtener el tema con `useColorScheme()` o con el mecanismo de tema que defina la app:

```tsx
import { useColorScheme } from "react-native";
import { colors } from "@/theme/colors";

export function useAppColors() {
  const scheme = useColorScheme();
  return colors[scheme === "dark" ? "dark" : "light"];
}
```

Ejemplo en un botón:

```tsx
const c = useAppColors();

<TouchableOpacity style={{ backgroundColor: disabled ? c.disabledBg : c.primary }}>
  <Text style={{ color: disabled ? c.disabledText : c.textInverse }}>{title}</Text>
</TouchableOpacity>
```

## 10. Guía de aplicación por pantalla

### Login

- Fondo general: `background`.
- Card de credenciales: `surfaceElevated` con borde `border`.
- Inputs: `surface`, texto `text`, placeholder `textMuted`.
- Botón conectar: `primary`.
- Logo sin filtros; si el logo no funciona visualmente en modo oscuro, usar variante específica del asset.

### Home / Menú

- Header: ver §7.1.
- Fondo: `background`.
- MenuCard normal: `surfaceElevated` o `primarySoft` si está habilitado.
- MenuCard deshabilitada: `disabledBg` + `disabledText`.
- Card de turno: colores de estado con texto visible.
- Sucursal/servidor al pie: `text` para sucursal, `textMuted` para servidor.

### Búsquedas de clientes, personas y vehículos

- Fondo pantalla: `background`.
- Campo búsqueda: `surface`, borde `border`, foco `focus`.
- Resultados: cards `surfaceElevated`, texto principal `text`, secundario `textMuted`.
- Empty state: icono `textMuted`, texto `textMuted`, acción primaria si aplica.

### Operaciones críticas

Aplica a salida, carga de combustible, traspaso, abastecimiento, calibración y mediciones.

- Encabezado o bloque superior debe mostrar contexto operativo con `surfaceElevated`.
- Datos críticos como litros, equipo, pico, bodega y turno deben usar `text` y peso alto.
- Acciones principales: `primary`.
- Acciones destructivas/cancelación: `danger`, siempre con confirmación.
- Errores de validación: `danger` + mensaje específico.
- Verificado/foto cargada/firma capturada: `success` + icono/texto.
- Pendiente/falta cerrar: `warning` + texto.

## 11. Reglas de contraste y accesibilidad

- Texto normal debe cumplir contraste mínimo aproximado 4.5:1.
- Texto grande/bold debe cumplir contraste mínimo aproximado 3:1.
- No usar texto negro puro sobre fondos oscuros ni texto blanco sobre fondos claros.
- No transmitir estado solo con color; agregar texto o icono.
- Tamaño táctil mínimo recomendado: 44 px de alto/ancho.
- En exterior, evitar grises demasiado claros para texto secundario.
- En modo oscuro, evitar sombras fuertes como único separador; preferir bordes.

## 12. Prioridad de implementación sugerida

1. Corregir valores inválidos `##` en `tailwind.config.js`.
2. Crear `src/theme/colors.ts` con la paleta claro/oscuro.
3. Crear `useAppColors()` o integrarlo al contexto de tema existente.
4. Migrar primero componentes base: `Button`, `Input`, `Select`, `TextSearch`, `InputCard`, `HomeHeader`, `ScreenHeader`, `MenuCard`.
5. Reemplazar gradualmente `text-black`, `bg-white`, `color="#000"`, `color="#fff"` por tokens.
6. Migrar cards de listados: `ClienteCard`, `VehiculoCard`, `PersonaCard`, `MedicionesCard`.
7. Revisar pantallas operativas y validar en dispositivo real con brillo medio y alto.

## 13. Checklist para el desarrollador

- [ ] Modo claro legible en login, home, búsqueda y operación crítica.
- [ ] Modo oscuro legible en login, home, búsqueda y operación crítica.
- [ ] Header, botones, inputs y cards usan tokens, no colores hardcodeados.
- [ ] Estados de turno se diferencian por color, texto e icono.
- [ ] Inputs enfocados usan `focus`, no `success`.
- [ ] Errores usan `danger` + mensaje visible.
- [ ] Botones deshabilitados se ven deshabilitados y no parecen primarios.
- [ ] No hay `##` ni hex inválidos en configuración.
- [ ] No hay overflow visual por contraste bajo en dispositivo Android real.
- [ ] Las acciones críticas siguen teniendo confirmación cuando corresponda.

## 14. Decisión visual recomendada

Usar como base el azul operativo del frontend v2, no el azul saturado original `#307FE2`. La propuesta `#5B79C7` en claro y `#86A2E8` en oscuro mantiene identidad azul, reduce fatiga visual y mejora coherencia con la web v2.

Para mobile, el diseño debe sentirse operativo y rápido: fondos neutros, cards simples, bordes claros, estados semánticos y una sola acción primaria visible por paso.
