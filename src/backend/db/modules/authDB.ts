/**
 * Módulo de autenticación local.
 * Gestiona login online/offline, almacenamiento del hash de contraseña
 * y seguimiento del último usuario autenticado online.
 *
 * @remarks
 * - Login **online**: autentica contra la API y persiste el hash SHA-256 + salt.
 * - Login **offline**: solo permitido si la cédula coincide con el último usuario online.
 * - Cambio de usuario en modo offline está bloqueado (requiere conexión).
 *
 * @module Playero/Backend/DB/Modules/Auth
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { usuariosApp, personas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { sucursales } from "@/backend/db/schema";


// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------
/** Datos básicos del usuario en sesión. */
export type SessionUser = {
  cedula: string;
  name: string;
};

/**
 * Resultado de un intento de login.
 * - Éxito online: incluye `token`, `refreshToken` e `idSucursal`.
 * - Éxito offline: `token` y `refreshToken` son `null`.
 * - Fallo: incluye el motivo en `reason`.
 */
export type LoginResult =
  | {
      ok: true;
      user: SessionUser;
      token: string;
      refreshToken: string;
      offline: false;
      idSucursal: number;        // ← agregar
    }
  | {
      ok: true;
      user: SessionUser;
      token: null;
      refreshToken: null;
      offline: true;
      idSucursal: number;        // ← agregar
    }
  | {
      ok: false;
      reason: "wrong_password" | "not_last_user" | "no_local_user" | "error";
    };

// Clave en tabla syncs para recordar la última cédula autenticada online.
// Guardamos la cédula numérica en el campo `fecha` (reutilizamos la tabla key-value).
const LAST_USER_KEY = "__last_online_user__";

// ---------------------------------------------------------------------------
// Utilidades de hash
// ---------------------------------------------------------------------------

async function hashPassword(password: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + password,
  );
}

async function generateSalt(): Promise<string> {
  const bytes = Crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Devuelve la cédula del último usuario que realizó login online en este dispositivo.
 * La cédula se guarda en la tabla `syncs` bajo la clave `__last_online_user__`.
 *
 * @returns Cédula como string, o `null` si nunca hubo login online.
 */ 
export async function getLastOnlineUser(): Promise<string | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, LAST_USER_KEY))
      .limit(1);

    return result[0] ? String(result[0].fecha) : null;
  } catch {
    return null;
  }
}

/**
 * Datos necesarios para guardar el usuario localmente.
 */
export type SaveUserLocallyParams = {
  /** Cédula del usuario. */
  cedula: string;
  /** Nombre completo. */
  name: string;
  /** Contraseña en texto plano (se hashea internamente). */
  password: string;
  /** Token de refresco emitido por el servidor. */
  refreshToken: string;
  /** ID de la sucursal asignada al usuario. */
  idSucursal: number;
};

/**
 * Persiste los datos del usuario tras un login online exitoso:
 * crea/actualiza `personas` y `usuariosApp` con el hash de contraseña,
 * y registra la cédula como último usuario online.
 *
 * @param params - Datos del usuario a guardar.
 */
export async function saveUserLocally(params: SaveUserLocallyParams): Promise<void> {
  const { cedula, name, password, refreshToken, idSucursal } = params;
  const salt      = await generateSalt();
  const claveHash = await hashPassword(password, salt);
  const cedulaNum = Number(cedula);

  await db.insert(personas)
    .values({ cedula: cedulaNum, nombreApellido: name, timestamp: Date.now(), sync: 0 })
    .onConflictDoUpdate({
      target: personas.cedula,
      set: { nombreApellido: name, timestamp: Date.now() },
    });

  await db.insert(usuariosApp)
    .values({ cedula: cedulaNum, clave: claveHash, salt, refreshToken, idSucursal })  // ← agregar
    .onConflictDoUpdate({
      target: usuariosApp.cedula,
      set: { clave: claveHash, salt, refreshToken, idSucursal },  // ← agregar
    });

  await db.insert(syncs)
    .values({ tipo: LAST_USER_KEY, fecha: cedulaNum })
    .onConflictDoUpdate({ target: syncs.tipo, set: { fecha: cedulaNum } });
}

/**
 * Intenta autenticar al usuario sin conexión a internet.
 *
 * @param cedula - Cédula ingresada por el usuario.
 * @param password - Contraseña ingresada por el usuario.
 * @returns `LoginResult` con `ok: true` en éxito offline, o `ok: false` con `reason`:
 *   - `"no_local_user"` → nunca hubo login online en el dispositivo.
 *   - `"not_last_user"` → la cédula no coincide con el último usuario online.
 *   - `"wrong_password"` → contraseña incorrecta.
 *   - `"error"` → error inesperado de BD.
 */
export async function loginOffline(cedula: string, password: string): Promise<LoginResult> {
  try {
    const lastCedula = await getLastOnlineUser();
    if (!lastCedula) return { ok: false, reason: "no_local_user" };
    if (lastCedula !== cedula) return { ok: false, reason: "not_last_user" };

    // Traer clave, salt e idSucursal juntos
    const localData = await db
      .select({
        clave:      usuariosApp.clave,
        salt:       usuariosApp.salt,
        idSucursal: usuariosApp.idSucursal,   // ← agregar
      })
      .from(usuariosApp)
      .where(eq(usuariosApp.cedula, Number(cedula)))
      .limit(1);

    if (!localData[0]?.salt) return { ok: false, reason: "no_local_user" };

    const hash = await hashPassword(password, localData[0].salt);
    if (hash !== localData[0].clave) return { ok: false, reason: "wrong_password" };

    const persona = await db
      .select({ cedula: personas.cedula, name: personas.nombreApellido })
      .from(personas)
      .where(eq(personas.cedula, Number(cedula)))
      .limit(1);

    if (!persona[0]) return { ok: false, reason: "no_local_user" };

    return {
      ok:           true,
      user:         { cedula: String(persona[0].cedula), name: persona[0].name },
      token:        null,
      refreshToken: null,
      offline:      true,
      idSucursal:   localData[0].idSucursal,   // ← agregar
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Limpia el `refreshToken` al cerrar sesión.
 * No elimina el hash de contraseña para mantener la capacidad de login offline.
 *
 * @param cedula - Cédula del usuario a cerrar sesión.
 */
export async function clearSession(cedula: string): Promise<void> {
  await db
    .update(usuariosApp)
    .set({ refreshToken: null })
    .where(eq(usuariosApp.cedula, Number(cedula)));
}

/**
 * Devuelve la sucursal asignada al usuario mediante un JOIN entre
 * `usuariosApp` y `sucursales`.
 *
 * @param cedula - Cédula del usuario.
 * @returns DTO con `id_sucursal` y `descripcion_sucursal`, o `null` si no existe.
 */
export async function getSucursalByUsuario(cedula: string): Promise<{ id_sucursal: number; descripcion_sucursal: string } | null> {
  const rows = await db
    .select({
      idSucursal:          sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(usuariosApp)
    .innerJoin(sucursales, eq(usuariosApp.idSucursal, sucursales.idSucursal))
    .where(eq(usuariosApp.cedula, Number(cedula)))
    .limit(1);

  if (!rows[0]) return null;
  return {
    id_sucursal:          rows[0].idSucursal,
    descripcion_sucursal: rows[0].descripcionSucursal,
  };
}
