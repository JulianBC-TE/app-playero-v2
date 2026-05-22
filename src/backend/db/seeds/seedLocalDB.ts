/**
 * Seed de la base de datos local para desarrollo y pruebas.
 * Inserta datos de ejemplo en las tablas principales.
 *
 * @remarks Solo debe ejecutarse en entornos de desarrollo.
 *
 * @module Playero/Backend/DB/Seeds
 * @category Database Seeds
 */
// Pobla la BD local con datos de prueba que simulan haber hecho una
// sincronización exitosa con el servidor.
//
// USO:
//   Llamar a seedLocalDB() una sola vez, idealmente en un botón de
//   desarrollo en la pantalla Config o al arrancar la app en modo __DEV__.
//
// EJEMPLO en App.tsx o Config.tsx:
//   import { seedLocalDB } from "@/backend/db/seed/seedLocalDB";
//   if (__DEV__) await seedLocalDB();
//
// ──────────────────────────────────────────────────────────────────────────────
// DATOS INCLUIDOS
//   • 1 sucursal
//   • 2 bodegas (una con trapaso=true)
//   • 2 picos por bodega (4 total)
//   • 2 tanques por bodega (4 total)
//   • 3 clientes
//   • 3 personas
//   • 2 vehículos
//   • 1 usuario app (para login offline con cedula "12345678" / pass "1234")
//   • 1 turno de apertura del día de hoy (estado=iniciado)
//   • Registros en `syncs` para que la app no vuelva a pedir sync
// ──────────────────────────────────────────────────────────────────────────────

import { db } from "@/backend/db/client";
import {
  sucursales,
  bodegas,
  picos,
  tanques,
  clientes,
  personas,
  usuariosApp,
  vehiculos,
  turnos,
  syncs,
} from "@/backend/db/schema";
import * as Crypto from "expo-crypto";
import { saveSucursal } from "@/storage/storageSucursal";
import { saveUser } from "@/storage/storageUse";
import { saveAuthToken } from "@/storage/storageAuthToken";

// ── Constantes de las claves de sync (copiadas de cada módulo DB) ─────────────
const SYNC_KEYS = {
  lastUser:    "__last_online_user__",
  sucursales:  "__last_sync_sucursales__",
  bodegas:     "__last_sync_bodegas__",
  picos:       "__last_sync_picos__",
  tanques:     "__last_sync_tanques__",
  clientes:    "__last_sync_clientes__",
  personas:    "__last_sync_personas__",
  vehiculos:   "__last_sync_vehiculos__",
};

// ── Credenciales de prueba ────────────────────────────────────────────────────
const SEED_USER = {
  cedula:   12345678,
  name:     "Juan Perez",
  password: "1234",        // contraseña en texto plano → se hashea abajo
  idSucursal: 1,
};

// ── Helpers de hash (igual que authDB.ts) ────────────────────────────────────

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
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

// ── Upsert genérico en tabla syncs ────────────────────────────────────────────

async function upsertSync(tipo: string, fecha: number): Promise<void> {
  await db
    .insert(syncs)
    .values({ tipo, fecha })
    .onConflictDoUpdate({ target: syncs.tipo, set: { fecha } });
}

// ═════════════════════════════════════════════════════════════════════════════
// seedLocalDB
// ═════════════════════════════════════════════════════════════════════════════

export async function seedLocalDB(): Promise<void> {
  console.log("🌱 Iniciando seed de BD local...");
  const now = Date.now();

  // ── 1. Sucursal ─────────────────────────────────────────────────────────────
  await db
    .insert(sucursales)
    .values({ idSucursal: 1, descripcionSucursal: "Sucursal Central" })
    .onConflictDoUpdate({
      target: sucursales.idSucursal,
      set: { descripcionSucursal: "Sucursal Central" },
    });

  await upsertSync(SYNC_KEYS.sucursales, now);
  console.log("  ✅ Sucursal insertada");

  // ── 2. Bodegas ──────────────────────────────────────────────────────────────
  //   bodega 1 → normal
  //   bodega 2 → habilitada para traspaso
  const bodegasData = [
    { idBodega: 1, descripcionBodega: "Bodega Principal",   idSucursal: 1, trapaso: false },
    { idBodega: 2, descripcionBodega: "Bodega Secundaria",  idSucursal: 1, trapaso: true  },
  ];

  for (const b of bodegasData) {
    await db
      .insert(bodegas)
      .values(b)
      .onConflictDoUpdate({
        target: bodegas.idBodega,
        set: {
          descripcionBodega: b.descripcionBodega,
          idSucursal: b.idSucursal,
          trapaso: b.trapaso,
        },
      });
  }

  await upsertSync(SYNC_KEYS.bodegas, now);
  console.log("  ✅ Bodegas insertadas");

  // ── 3. Picos ────────────────────────────────────────────────────────────────
  const picosData = [
    { idPico: 1, descripcionPico: "Pico 1 - Nafta",   idBodega: 1, idPicoSurtidor: 101 },
    { idPico: 2, descripcionPico: "Pico 2 - Diesel",  idBodega: 1, idPicoSurtidor: 102 },
    { idPico: 3, descripcionPico: "Pico 3 - Nafta",   idBodega: 2, idPicoSurtidor: 201 },
    { idPico: 4, descripcionPico: "Pico 4 - GNC",     idBodega: 2, idPicoSurtidor: 202 },
  ];

  for (const p of picosData) {
    await db
      .insert(picos)
      .values(p)
      .onConflictDoUpdate({
        target: picos.idPico,
        set: {
          descripcionPico: p.descripcionPico,
          idBodega: p.idBodega,
          idPicoSurtidor: p.idPicoSurtidor,
        },
      });
  }

  await upsertSync("__last_sync_picos__", now);
  console.log("  ✅ Picos insertados");

  // ── 4. Tanques ──────────────────────────────────────────────────────────────
  const tanquesData = [
    { idTanque: 1, descripcionTanque: "Tanque Nafta 95",  idBodega: 1, capacidadLitros: 20000 },
    { idTanque: 2, descripcionTanque: "Tanque Diesel",    idBodega: 1, capacidadLitros: 30000 },
    { idTanque: 3, descripcionTanque: "Tanque Nafta P",   idBodega: 2, capacidadLitros: 15000 },
    { idTanque: 4, descripcionTanque: "Tanque GNC",       idBodega: 2, capacidadLitros: 10000 },
  ];

  for (const t of tanquesData) {
    await db
      .insert(tanques)
      .values(t)
      .onConflictDoUpdate({
        target: tanques.idTanque,
        set: {
          descripcionTanque: t.descripcionTanque,
          idBodega: t.idBodega,
          capacidadLitros: t.capacidadLitros,
        },
      });
  }

  await upsertSync(SYNC_KEYS.tanques, now);
  console.log("  ✅ Tanques insertados");

  // ── 5. Clientes ─────────────────────────────────────────────────────────────
  const clientesData = [
    { ruc: "80012345-1", descripcionCliente: "Transportes García S.A." },
    { ruc: "80098765-2", descripcionCliente: "Logística del Sur S.R.L." },
    { ruc: "4567890-1",  descripcionCliente: "Juan Comerciante" },
  ];

  for (const c of clientesData) {
    await db
      .insert(clientes)
      .values({ ruc: c.ruc, descripcionCliente: c.descripcionCliente, timestamp: now, sync: 1 })
      .onConflictDoUpdate({
        target: clientes.ruc,
        set: { descripcionCliente: c.descripcionCliente, timestamp: now, sync: 1 },
      });
  }

  await upsertSync(SYNC_KEYS.clientes, now);
  console.log("  ✅ Clientes insertados");

  // ── 6. Personas ─────────────────────────────────────────────────────────────
  const personasData = [
    { cedula: SEED_USER.cedula, nombreApellido: SEED_USER.name },
    { cedula: 87654321,         nombreApellido: "Maria Lopez"  },
    { cedula: 11223344,         nombreApellido: "Carlos Rojas" },
  ];

  for (const p of personasData) {
    await db
      .insert(personas)
      .values({ cedula: p.cedula, nombreApellido: p.nombreApellido, timestamp: now, sync: 1 })
      .onConflictDoUpdate({
        target: personas.cedula,
        set: { nombreApellido: p.nombreApellido, timestamp: now, sync: 1 },
      });
  }

  await upsertSync(SYNC_KEYS.personas, now);
  console.log("  ✅ Personas insertadas");

// ── 7. Usuario app ──────────────────────────────────────────────────────────
try {
  const salt      = await generateSalt();
  const claveHash = await hashPassword(SEED_USER.password, salt);

  await db
    .insert(usuariosApp)
    .values({
      cedula:       SEED_USER.cedula,
      clave:        claveHash,
      salt,
      refreshToken: null,
      bloqueado:    false,
      idSucursal:   SEED_USER.idSucursal,
    })
    .onConflictDoUpdate({
      target: usuariosApp.cedula,
      set: { clave: claveHash, salt, idSucursal: SEED_USER.idSucursal },
    });

  await upsertSync(SYNC_KEYS.lastUser, SEED_USER.cedula);
  console.log(`  ✅ Usuario app creado  →  cédula: ${SEED_USER.cedula}  |  pass: "${SEED_USER.password}"`);
} catch (e) {
  console.error("  ❌ Error en usuario app:", e);
}
  // ── 8. Vehículos ─────────────────────────────────────────────────────────────
  const vehiculosData = [
    { idVehiculo: "ABC123", descripcionVehiculo: "Camión Ford F-4000",  ruc: "80012345-1" },
    { idVehiculo: "XYZ789", descripcionVehiculo: "Utilitario Toyota",   ruc: "80098765-2" },
  ];

  for (const v of vehiculosData) {
    await db
      .insert(vehiculos)
      .values({ idVehiculo: v.idVehiculo, descripcionVehiculo: v.descripcionVehiculo, ruc: v.ruc, timestamp: now, sync: 1 })
      .onConflictDoUpdate({
        target: vehiculos.idVehiculo,
        set: { descripcionVehiculo: v.descripcionVehiculo, ruc: v.ruc, timestamp: now, sync: 1 },
      });
  }

  await upsertSync(SYNC_KEYS.vehiculos, now);
  console.log("  ✅ Vehículos insertados");

  // ── 9. Turno de apertura de hoy ──────────────────────────────────────────────
  //   Simula que el operador ya abrió el turno de la bodega 1 hoy.
  //   estado=1 (ACTIVO), tipo="inicio" → la Home mostrará status "iniciado".
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaHoy = hoy.getTime();        // timestamp inicio del día
  const horaApertura = 800;             // 08:00

  const turnoJson = {
    id_bodega:       1,
    tipo:            "inicio",
    cedula_operador: SEED_USER.cedula,
    nombre_operador: SEED_USER.name,
    observacion:     "Apertura seed",
  };

  // Insertamos solo si no existe ya un turno de inicio para bodega 1 hoy
  const turnoExistente = await db
    .select({ idTurno: turnos.idTurno })
    .from(turnos)
    .where(
      // drizzle no importa and() aquí porque es TypeScript puro; lo hacemos manual:
      // WHERE id_bodega=1 AND tipo='inicio' AND fecha=fechaHoy AND estado=1
      // Para evitar importar `and` en el seed usamos un select amplio y filtramos
      undefined
    )
    .limit(100);

  const yaExiste = turnoExistente.some(
    (t: any) =>
      // La tabla no tiene campo tipo/fecha seleccionados en el select anterior;
      // re-hacemos la query completa:
      false // placeholder — ver nota abajo
  );

  // Nota: drizzle requiere `and()` para múltiples where. Para simplificar el seed
  // (sin importar helpers extra) usamos insert con onConflictDoNothing.
  // Como id_turno es autoincrement no hay conflicto garantizado, así que
  // verificamos por separado antes de insertar.
  const turnosHoy = await db
    .select()
    .from(turnos);

  const yaHayApertura = turnosHoy.some(
    (t) => t.idBodega === 1 && t.tipo === "inicio" && t.fecha === fechaHoy && t.estado === 1
  );

  if (!yaHayApertura) {
    await db.insert(turnos).values({
      idBodega: 1,
      json:     JSON.stringify(turnoJson),
      tipo:     "inicio",
      fecha:    fechaHoy,
      hora:     horaApertura,
      sync:     0,          // pendiente de enviar al servidor
      estado:   1,          // TurnoEstado.ACTIVO
    });
    console.log("  ✅ Turno apertura insertado (bodega 1, hoy, 08:00)");
  } else {
    console.log("  ⏭️  Turno apertura ya existía, se omitió");
  }

await saveSucursal({ id_sucursal: 1, descripcion_sucursal: "Sucursal Central" });
await saveUser({ cedula: String(SEED_USER.cedula), name: SEED_USER.name });
await saveAuthToken({ token: "dev_token_seed", refresh_token: "" });
console.log("  ✅ AsyncStorage poblado");

  console.log("🌱 Seed completado.");
  console.log("──────────────────────────────────────────");
  console.log("   Login offline disponible:");
  console.log(`   Cédula   : ${SEED_USER.cedula}`);
  console.log(`   Contraseña: ${SEED_USER.password}`);
  console.log("──────────────────────────────────────────");
}