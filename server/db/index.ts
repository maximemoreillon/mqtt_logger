import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { DATABASE_URL } from "../lib/config";
import * as schema from "./schema";

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const db = drizzle({ client: pool, schema });

export const runMigrations = async (migrationsDir: string) => {
  const migrationsFolder = resolve(migrationsDir);
  await migrate(db, { migrationsFolder });
  console.log(`[DB] Migrations applied from ${migrationsFolder}`);
};
