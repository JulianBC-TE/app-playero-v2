// src/backend/db/modules/authDB.ts
//
// Módulo de base de datos para autenticación.
// Maneja login online y offline, sesión activa y último usuario.
//
// REGLAS DE NEGOCIO:
//   - Login online  → autentica contra API, guarda hash de clave localmente
//   - Login offline → solo si la cedula ingresada es el último usuario autenticado online
//   - Cambio de usuario offline → bloqueado (requiere conexión)
//   - Hash de contraseña → SHA-256 con salt aleatorio via expo-crypto

import { db } from "@/backend/db/client";
import { usuariosApp, personas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type SessionUser = {
  cedula: string;
  name: string;
};

export type LoginResult =
  | { ok: true;  user: SessionUser; token: string; refreshToken: string; offline: false }
  | { ok: true;  user: SessionUser; token: null;   refreshToken: null;   offline: true  }
  | { ok: false; reason: "wrong_password" | "not_last_user" | "no_local_user" | "error" };

// Clave en tabla syncs para recordar la última cédula autenticada online.
// Guardamos la cédula numérica en el campo `fecha` (reutilizamos la tabla key-value).
const LAST_USER_KEY = "__last_online_user__";

// ---------------------------------------------------------------------------
// Utilidades de hash
// ---------------------------------------------------------------------------

async function hashPassword(password: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + password
  );
}

async function generateSalt(): Promise<string> {
  const bytes = Crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// getLastOnlineUser
// Devuelve la cédula del último usuario que hizo login online en este dispositivo.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// saveUserLocally
// Persiste persona + hash de contraseña + refreshToken tras un login online exitoso.
// También marca esta cédula como el último usuario online del dispositivo.
// ---------------------------------------------------------------------------

export async function saveUserLocally({
  cedula,
  name,
  password,
  refreshToken,
}: {
  cedula: string;
  name: string;
  password: string;
  refreshToken: string;
}): Promise<void> {
  const salt = await generateSalt();
  const claveHash = await hashPassword(password, salt);
  const cedulaNum = Number(cedula);

  // Upsert persona
  await db
    .insert(personas)
    .values({ cedula: cedulaNum, nombreApellido: name, timestamp: Date.now(), sync: 0 })
    .onConflictDoUpdate({
      target: personas.cedula,
      set: { nombreApellido: name, timestamp: Date.now() },
    });

  // Upsert usuariosApp con hash nuevo
  await db
    .insert(usuariosApp)
    .values({ cedula: cedulaNum, clave: claveHash, salt, refreshToken })
    .onConflictDoUpdate({
      target: usuariosApp.cedula,
      set: { clave: claveHash, salt, refreshToken },
    });

  // Marcar como último usuario online (upsert en syncs)
  await db
    .insert(syncs)
    .values({ tipo: LAST_USER_KEY, fecha: cedulaNum })
    .onConflictDoUpdate({
      target: syncs.tipo,
      set: { fecha: cedulaNum },
    });
}

// ---------------------------------------------------------------------------
// loginOffline
// Intenta autenticar sin conexión a internet.
//
// Casos de fallo:
//   no_local_user → nunca hubo login online en el dispositivo
//   not_last_user → la cédula ingresada no es el último usuario online (cambio de usuario)
//   wrong_password → contraseña incorrecta
// ---------------------------------------------------------------------------

export async function loginOffline(
  cedula: string,
  password: string
): Promise<LoginResult> {
  try {
    // 1. Verificar que exista un último usuario online
    const lastCedula = await getLastOnlineUser();

    if (!lastCedula) {
      return { ok: false, reason: "no_local_user" };
    }

    // 2. Verificar que sea el mismo usuario (bloquear cambio de usuario offline)
    if (lastCedula !== cedula) {
      return { ok: false, reason: "not_last_user" };
    }

    // 3. Verificar contraseña contra hash local
    const localData = await db
      .select({ clave: usuariosApp.clave, salt: usuariosApp.salt })
      .from(usuariosApp)
      .where(eq(usuariosApp.cedula, Number(cedula)))
      .limit(1);

    if (!localData[0]?.salt) {
      return { ok: false, reason: "no_local_user" };
    }

    const hash = await hashPassword(password, localData[0].salt);
    if (hash !== localData[0].clave) {
      return { ok: false, reason: "wrong_password" };
    }

    // 4. Traer nombre del usuario
    const persona = await db
      .select({ cedula: personas.cedula, name: personas.nombreApellido })
      .from(personas)
      .where(eq(personas.cedula, Number(cedula)))
      .limit(1);

    if (!persona[0]) {
      return { ok: false, reason: "no_local_user" };
    }

    return {
      ok: true,
      user: { cedula: String(persona[0].cedula), name: persona[0].name },
      token: null,
      refreshToken: null,
      offline: true,
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---------------------------------------------------------------------------
// clearSession
// Limpia el refreshToken al cerrar sesión.
// NO borra el hash de contraseña para mantener la capacidad de login offline.
// ---------------------------------------------------------------------------

export async function clearSession(cedula: string): Promise<void> {
  await db
    .update(usuariosApp)
    .set({ refreshToken: null })
    .where(eq(usuariosApp.cedula, Number(cedula)));
}