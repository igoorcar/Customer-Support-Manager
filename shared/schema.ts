import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const attendants = pgTable("attendants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatar: text("avatar"),
  status: text("status").notNull().default("online"),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  notes: text("notes"),
  lastContact: timestamp("last_contact"),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  attendantId: varchar("attendant_id"),
  status: text("status").notNull().default("nova"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const quickReplies = pgTable("quick_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("geral"),
  shortcut: text("shortcut"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  image: text("image"),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  conversationId: varchar("conversation_id"),
  attendantName: text("attendant_name"),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertAttendantSchema = createInsertSchema(attendants).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, startedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, sentAt: true });
export const insertQuickReplySchema = createInsertSchema(quickReplies).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, timestamp: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAttendant = z.infer<typeof insertAttendantSchema>;
export type Attendant = typeof attendants.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertQuickReply = z.infer<typeof insertQuickReplySchema>;
export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
