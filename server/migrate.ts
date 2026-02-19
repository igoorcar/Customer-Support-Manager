import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  console.log("[migrate] Checking and creating tables if needed...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'atendente'
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attendants (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'online'
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      avatar TEXT,
      notes TEXT,
      cpf TEXT,
      birthday TEXT,
      gender TEXT,
      tags TEXT[] DEFAULT '{}'::text[],
      vip BOOLEAN DEFAULT false,
      status TEXT NOT NULL DEFAULT 'ativo',
      total_spend INTEGER DEFAULT 0,
      purchase_count INTEGER DEFAULT 0,
      last_purchase_at TIMESTAMP,
      channel TEXT DEFAULT 'whatsapp',
      city TEXT,
      state TEXT,
      address TEXT,
      last_contact TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id VARCHAR NOT NULL,
      attendant_id VARCHAR,
      status TEXT NOT NULL DEFAULT 'nova',
      channel TEXT DEFAULT 'whatsapp',
      started_at TIMESTAMP NOT NULL DEFAULT now(),
      ended_at TIMESTAMP,
      duration INTEGER,
      finish_reason TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id VARCHAR NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      media_url TEXT,
      media_mime_type TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      sent_at TIMESTAMP NOT NULL DEFAULT now(),
      delivered_at TIMESTAMP,
      read_at TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quick_replies (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'geral',
      shortcut TEXT,
      active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT,
      brand TEXT,
      price INTEGER NOT NULL,
      promo_price INTEGER,
      cost_price INTEGER,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      stock_alert INTEGER DEFAULT 10,
      sold_count INTEGER DEFAULT 0,
      image TEXT,
      format TEXT,
      material TEXT,
      color TEXT,
      gender TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activities (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT now(),
      conversation_id VARCHAR,
      attendant_name TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS client_notes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id VARCHAR NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      conversa_id VARCHAR NOT NULL,
      cliente_id VARCHAR NOT NULL,
      cliente_nome TEXT,
      status TEXT NOT NULL DEFAULT 'rascunho',
      desconto INTEGER DEFAULT 0,
      observacoes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quote_items (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_id VARCHAR NOT NULL,
      product_id VARCHAR,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL,
      discount INTEGER DEFAULT 0
    )
  `);

  console.log("[migrate] All tables ready.");
}
