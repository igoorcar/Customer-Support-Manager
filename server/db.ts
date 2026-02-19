import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[db] WARNING: DATABASE_URL is not set! Database operations will fail.");
  console.error("[db] Please set DATABASE_URL in your environment variables.");
  console.error("[db] Example: DATABASE_URL=postgresql://user:password@hostname:5432/dbname");
}

const isSupabasePooler = connectionString?.includes("pooler.supabase.com");
const needsSSL = connectionString?.includes("pooler.supabase.com") ||
                 connectionString?.includes("supabase.com") ||
                 connectionString?.includes("neon.tech");

const pool = new pg.Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
