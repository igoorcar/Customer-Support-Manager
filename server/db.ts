import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
const isSupabasePooler = connectionString?.includes("pooler.supabase.com");

const pool = new pg.Pool({
  connectionString,
  ssl: isSupabasePooler ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
