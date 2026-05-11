// src/backend/db/prisma-compat.ts
import { db } from "./client";
import * as schema from "./schema";
import { eq, and, like, or, asc, desc } from "drizzle-orm";

// Mapeo de nombre Prisma → tabla Drizzle
const tableMap = {
  sucursales:   schema.sucursales,
  bodegas:      schema.bodegas,
  usuariosApp:  schema.usuariosApp,
  picos:        schema.picos,
  vehiculos:    schema.vehiculos,
  clientes:     schema.clientes,
  turnos:       schema.turnos,
  tickets:      schema.tickets,
  trapasos:     schema.trapasos,
  calibraciones: schema.calibraciones,
  abastecimientos: schema.abastecimientos,
  despachos:    schema.despachos,
  personas:     schema.personas,
  syncs:        schema.syncs,
  usuariosAdmin: schema.usuariosAdmin,
} as const;

type TableName = keyof typeof tableMap;

// Construye la condición WHERE a partir del objeto { campo: valor } de Prisma
function buildWhere(table: any, where: Record<string, any>) {
  const conditions = Object.entries(where).map(([col, val]) => {
    const tableCol = table[col];
    if (!tableCol) throw new Error(`Columna '${col}' no existe en la tabla`);
    return eq(tableCol, val);
  });
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

// Construye ORDER BY a partir de { campo: 'asc' | 'desc' }
function buildOrderBy(table: any, orderBy: Record<string, string>) {
  return Object.entries(orderBy).map(([col, dir]) =>
    dir === "desc" ? desc(table[col]) : asc(table[col])
  );
}

function makeTableProxy(tableName: TableName) {
  const table = tableMap[tableName] as any;

  return {
    async findUnique({ where, select }: { where: Record<string, any>; select?: any }) {
      const result = await db.select().from(table).where(buildWhere(table, where)).limit(1);
      return result[0] ?? null;
    },

    async findFirst({ where, select, orderBy }: { where?: Record<string, any>; select?: any; orderBy?: any }) {
      let q = db.select().from(table) as any;
      if (where) q = q.where(buildWhere(table, where));
      if (orderBy) q = q.orderBy(...buildOrderBy(table, orderBy));
      const result = await q.limit(1);
      return result[0] ?? null;
    },

    async findMany({ where, select, orderBy, take, skip }: {
      where?: Record<string, any>;
      select?: any;
      orderBy?: Record<string, string>;
      take?: number;
      skip?: number;
    } = {}) {
      let q = db.select().from(table) as any;
      if (where) q = q.where(buildWhere(table, where));
      if (orderBy) q = q.orderBy(...buildOrderBy(table, orderBy));
      if (take)   q = q.limit(take);
      if (skip)   q = q.offset(skip);
      return q;
    },

    async create({ data }: { data: Record<string, any> }) {
      const result = await db.insert(table).values(data).returning();
      return result[0];
    },

    async update({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
      const result = await db.update(table).set(data).where(buildWhere(table, where)).returning();
      return result[0];
    },

    async upsert({ where, create, update }: {
      where: Record<string, any>;
      create: Record<string, any>;
      update: Record<string, any>;
    }) {
      const existing = await db.select().from(table).where(buildWhere(table, where)).limit(1);
      if (existing[0]) {
        const result = await db.update(table).set(update).where(buildWhere(table, where)).returning();
        return result[0];
      } else {
        const result = await db.insert(table).values(create).returning();
        return result[0];
      }
    },

    async delete({ where }: { where: Record<string, any> }) {
      const result = await db.delete(table).where(buildWhere(table, where)).returning();
      return result[0];
    },

    async count({ where }: { where?: Record<string, any> } = {}) {
      // Drizzle no tiene .count() directo en expo-sqlite, usamos select + length
      let q = db.select().from(table) as any;
      if (where) q = q.where(buildWhere(table, where));
      const result = await q;
      return result.length;
    },
  };
}

// Raw SQL — equivalente a $queryRawUnsafe de Prisma
async function $queryRawUnsafe(sql: string, ...params: any[]) {
  return db.run({ sql, args: params } as any);
}

// El objeto que reemplaza a PrismaService
export const prismaService = {
  sucursales:      makeTableProxy("sucursales"),
  bodegas:         makeTableProxy("bodegas"),
  usuariosApp:     makeTableProxy("usuariosApp"),
  picos:           makeTableProxy("picos"),
  vehiculos:       makeTableProxy("vehiculos"),
  clientes:        makeTableProxy("clientes"),
  turnos:          makeTableProxy("turnos"),
  tickets:         makeTableProxy("tickets"),
  trapasos:        makeTableProxy("trapasos"),
  calibraciones:   makeTableProxy("calibraciones"),
  abastecimientos: makeTableProxy("abastecimientos"),
  despachos:       makeTableProxy("despachos"),
  personas:        makeTableProxy("personas"),
  syncs:           makeTableProxy("syncs"),
  usuariosAdmin:   makeTableProxy("usuariosAdmin"),
  $queryRawUnsafe,
};

export type PrismaCompatService = typeof prismaService;