import type { Config } from "drizzle-kit";

export default {
  schema: "./src/backend/db/schema.ts",
  out: "./src/backend/db/drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;