# Playero mobile — Reglas para agentes

App móvil con Expo SDK 53 / React Native + TypeScript (`mobile-playero/`).

> Existe además una regla general en `../AGENTS.md` (estructura del monorepo y
> convenciones compartidas). Si trabajás acá, este archivo manda; leé el otro
> cuando necesites contexto de los proyectos hermanos (`sistema-playero/`,
> `playero-api-0.1.3/`).

---

## Versionado obligatorio

Si el cambio toca esta carpeta (`mobile-playero/`):

1. Incrementar `expo.version` en `app.json` **antes** de compilar con EAS
   (`2.0.0` → `2.0.1` o el bump que corresponda, según la tabla de abajo).
2. El número registrado en **Sistema Playero → Versiones App** debe ser **EXACTAMENTE**
   ese valor. Registrar uno mayor al real deja a los teléfonos en bucle: siempre les
   avisa que hay actualización aunque ya la instalaron.
3. `versionCode` (Android) lo autoincrementa EAS (`eas.json` → `appVersionSource: "local"`);
   no se toca a mano. Nunca decrementar.

Cambios hechos solo en `sistema-playero/` o `playero-api-0.1.3/` **no** requieren
bump de esta app.

---

## Estándar de versionado: SemVer (`MAJOR.MINOR.PATCH`)

| Componente | Cuándo sube | Ejemplo desde 2.0.0 |
|---|---|---|
| **MAJOR** (2→3) | Cambios **incompatibles**: rompen compatibilidad con lo que ya está en uso | Cambio en el esquema de la BD local sin migración, cambio en la API que rompe a los clientes viejos, quitar o renombrar funciones/pantallas |
| **MINOR** (0→1) | Funcionalidades **nuevas**, retrocompatibles | Nueva pantalla, nuevo módulo, nuevo endpoint; nada de lo existente se rompe |
| **PATCH** (0→1) | **Correcciones** sin cambiar la funcionalidad | Bugs, textos, ajustes visuales, fixes de sincronización |

Reglas duras:

1. El número **siempre crece**; nunca se repite ni retrocede.
2. Desde **1.0.0** la compatibilidad no se rompe salvo subir el MAJOR.
3. **0.x.y** = desarrollo inicial: todo puede romperse. Si ya hay usuarios
   distribuidos, estabilizar en 1.0.0 y dejar de romper.
4. Pre-releases con sufijo (`2.1.0-beta.1`) y metadatos con `+` (`2.1.0+build.5`).

En Android hay **dos números** y no son lo mismo:

- `versionName` = `expo.version` en `app.json` → el SemVer que ve el usuario y el que
  compara la app contra el servidor en el chequeo de actualización
  (`src/backend/api/versionAPI.ts`).
- `versionCode` = entero que **siempre** debe subir; lo usa el instalador.

Mapa práctico de cambios:

| Cambio | Bump |
|---|---|
| Fix de bug, UI, texto | `2.0.0 → 2.0.1` |
| Nueva función / pantalla | `2.0.0 → 2.1.0` |
| Cambio de BD local, API o comportamiento que obliga a migrar | `2.0.0 → 3.0.0` |

---

## Sistema de actualizaciones internas (contexto)

- En cada sincronización la app envía su versión al servidor
  (`POST /api/app/version/check`) y, si no es la última publicada, el Home muestra
  la card verde "Actualizar".
- La comparación usa `getVersionInstalada()` (leído de `app.json`/`expoConfig`),
  por eso el número publicado en Sistema Playero debe ser idéntico al de `app.json`.
- `expo-intent-launcher` y `expo-file-system` son **nativos**: cualquier cambio que
  los use requiere rebuild (`npx expo run:android` o EAS), no basta con recargar Metro.

---

## Pendientes de tema oscuro

- `src/components/Photo.tsx`: el estado "sin foto" se recibe desde pantallas como
  `iconColor="#000"` en varios módulos. Resolver en la iteración de pantallas de
  módulos para no tocar call sites operativos en un cambio solo de componentes.
- `src/components/HeaderResumen.tsx`: `DatePickerModal` de
  `react-native-paper-dates` sigue con tema claro porque la app todavía no monta
  `PaperProvider`. Para completarlo, envolver la navegación con
  `Provider`/`MD3DarkTheme` de `react-native-paper`.

---

## Al terminar un cambio

- [ ] ¿Hubo cambios de código? → bump en `app.json`.
- [ ] Recordar registrar ese mismo número en Sistema Playero → Versiones App al
      publicar el APK.
- [ ] Verificar con `npx tsc --noEmit` (ignorar el error preexistente de
      `syncService.ts` "sync_duplicado"; `npm run lint` está roto por un conflicto
      de `overrides` en `package.json`).
- [ ] Si el cambio agregó uso de paquetes nativos → rebuild obligatorio.
