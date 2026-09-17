/**
 * Módulo de autenticación local.
 * Gestiona login online/offline, almacenamiento del hash de contraseña
 * y seguimiento del último usuario autenticado online.
 *
 * @module Playero/Backend/DB/Modules/Auth
 * @category Database Modules
 */

import { db } from "@/backend/db/client";
import { usuariosApp, personas, syncs } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { sucursales } from "@/backend/db/schema";
import { LoginResponse } from "@/backend/api/authAPI";
import { savePersonas } from "./personaDB";
import { saveSucursales } from "./sucursalDB";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------
/** Datos básicos del usuario en sesión. */
export type SessionUser = {
  cedula: number; // ✅ Cambiado de string a number para alinearse con UserDTO
  name: string;
};

/**
 * Resultado de un intento de login.
 */
export type LoginResult =
  | {
      ok: true;
      user: SessionUser;
      token: string;
      refreshToken: string;
      offline: false;
      idSucursal: number;
    }
  | {
      ok: true;
      user: SessionUser;
      token: null;
      refreshToken: null;
      offline: true;
      idSucursal: number;
    }
  | {
      ok: false;
      reason: "wrong_password" | "not_last_user" | "no_local_user" | "error";
    };

// Clave en tabla syncs para recordar la última cédula autenticada online.
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
 * @returns Cédula como number, o `null` si nunca hubo login online.
 */ 
export async function getLastOnlineUser(): Promise<number | null> {
  try {
    const result = await db
      .select({ fecha: syncs.fecha })
      .from(syncs)
      .where(eq(syncs.tipo, LAST_USER_KEY))
      .limit(1);

    // ✅ Retorna directamente como número, asumiendo que syncs.fecha guarda datos numéricos válidos
    return result[0] ? Number(result[0].fecha) : null;
  } catch {
    return null;
  }
}

/**
 * Persiste los datos del usuario tras un login online exitoso.
 * @param loginData - Datos del usuario a guardar.
 * @param passwordClearText - La contraseña en texto plano ingresada en el formulario.
 */
export async function saveUserLocally(loginData: LoginResponse, passwordClearText: string): Promise<void> {
  const { persona, sucursal, usuarioApp } = loginData;
  
  await savePersonas([
    {
      cedula: persona.cedula,
      nombre_apellido: persona.nombreApellido,
    },
  ]);
      
  await saveSucursales([
    {
      id_sucursal: sucursal.idSucursal,
      descripcion_sucursal: sucursal.descripcionSucursal,
    },
  ]);
  
  // 🔐 Generamos un salt local y hasheamos la contraseña real del formulario
  const salt = await generateSalt();
  const claveHash = await hashPassword(passwordClearText, salt);
  
  await db
    .insert(usuariosApp)
    .values({
      cedula: usuarioApp.cedula,
      clave: claveHash, // Ahora sí se guarda tu contraseña real hasheada
      salt,
      refreshToken: usuarioApp.refreshToken,
      bloqueado: usuarioApp.bloqueado,
      idUser: usuarioApp.idUser,
      idSucursal: usuarioApp.idSucursal,
    })
    .onConflictDoUpdate({
      target: usuariosApp.cedula,
      set: {
        clave: claveHash,
        salt,
        refreshToken: usuarioApp.refreshToken,
        bloqueado: usuarioApp.bloqueado,
        idSucursal: usuarioApp.idSucursal,
      },
    });

  await db
    .insert(syncs)
    .values({ tipo: LAST_USER_KEY, fecha: usuarioApp.cedula })
    .onConflictDoUpdate({ 
      target: syncs.tipo, 
      set: { fecha: usuarioApp.cedula } 
    });
}

/**
 * Intenta autenticar al usuario sin conexión a internet.
 * @param cedula - Cédula ingresada por el usuario (recibida como number).
 */
export async function loginOffline(cedula: number, password: string): Promise<LoginResult> {
  
  try {
    const cedulaNumerica = Number(cedula);
    const lastCedula = await getLastOnlineUser();
    if (!lastCedula) return { ok: false, reason: "no_local_user" };
    if (lastCedula !== cedulaNumerica) return { ok: false, reason: "not_last_user" }; // ✅ Comparación numérica directa

    // Traer clave, salt e idSucursal juntos
    const localData = await db
      .select({
        clave:      usuariosApp.clave,
        salt:       usuariosApp.salt,
        idSucursal: usuariosApp.idSucursal,
      })
      .from(usuariosApp)
      .where(eq(usuariosApp.cedula, cedula)) // ✅ Removido el casteo Number() innecesario
      .limit(1);

    if (!localData[0]?.salt) return { ok: false, reason: "no_local_user" };

    const hash = await hashPassword(password, localData[0].salt);
    console.log(localData[0].clave);
    console.log(hash);
    if (hash !== localData[0].clave) return { ok: false, reason: "wrong_password" };

    const persona = await db
      .select({ cedula: personas.cedula, name: personas.nombreApellido })
      .from(personas)
      .where(eq(personas.cedula, cedula)) // ✅ Removido el casteo Number() innecesario
      .limit(1);

    if (!persona[0]) return { ok: false, reason: "no_local_user" };

    return {
      ok:           true,
      user:         { cedula: persona[0].cedula, name: persona[0].name }, // ✅ Ya guarda un number nativo
      token:        null,
      refreshToken: null,
      offline:      true,
      idSucursal:   localData[0].idSucursal,
    };
  } catch {
    console.log("error desconocido");
    return { ok: false, reason: "error" };
  }
}

/**
 * Limpia el `refreshToken` al cerrar sesión.
 */
export async function clearSession(cedula: number): Promise<void> { // ✅ Cambiado parámetro a number
  await db
    .update(usuariosApp)
    .set({ refreshToken: null })
    .where(eq(usuariosApp.cedula, cedula)); // ✅ Removido el casteo Number() innecesario
}

/**
 * Devuelve la sucursal asignada al usuario mediante un JOIN.
 */
export async function getSucursalByUsuario(cedula: number): Promise<{ id_sucursal: number; descripcion_sucursal: string } | null> { // ✅ Cambiado parámetro a number
  const rows = await db
    .select({
      idSucursal:          sucursales.idSucursal,
      descripcionSucursal: sucursales.descripcionSucursal,
    })
    .from(usuariosApp)
    .innerJoin(sucursales, eq(usuariosApp.idSucursal, sucursales.idSucursal))
    .where(eq(usuariosApp.cedula, cedula)) // ✅ Removido el casteo Number() innecesario
    .limit(1);

  if (!rows[0]) return null;
  return {
    id_sucursal:          rows[0].idSucursal,
    descripcion_sucursal: rows[0].descripcionSucursal,
  };
}

// Al final de tu archivo src/backend/db/modules/authDB.ts

/**
 * Actualiza el estado de bloqueo de un usuario directamente en la base de datos local.
 * Útil para impactar los cambios devueltos por el servidor durante la sincronización.
 * * @param cedula - Cédula del usuario
 * @param bloqueado - Nuevo estado de bloqueo (true / false)
 */
export async function updateLocalUserBlockStatus(cedula: number, bloqueado: boolean): Promise<void> {
  await db
    .update(usuariosApp)
    .set({ bloqueado: bloqueado })
    .where(eq(usuariosApp.idUser, cedula));
}

/**
 * Actualiza la sucursal asignada al usuario en la BD local.
 * Útil cuando el servidor cambia la sucursal del usuario durante la sincronización.
 *
 * @param cedula - Cédula del usuario
 * @param idSucursal - Nuevo ID de sucursal
 */
export async function updateLocalUserSucursal(cedula: number, idSucursal: number): Promise<void> {
  await db
    .update(usuariosApp)
    .set({ idSucursal })
    .where(eq(usuariosApp.cedula, cedula));
}