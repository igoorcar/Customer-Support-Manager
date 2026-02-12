import {
  type User, type InsertUser,
  type Attendant, type InsertAttendant,
  type Client, type InsertClient,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type QuickReply, type InsertQuickReply,
  type Product, type InsertProduct,
  type Activity, type InsertActivity,
  users, attendants, clients, conversations, messages, quickReplies, products, activities,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAttendants(): Promise<Attendant[]>;
  getAttendant(id: string): Promise<Attendant | undefined>;
  createAttendant(data: InsertAttendant): Promise<Attendant>;
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  getConversations(): Promise<(Conversation & { clientName: string; attendantName: string; clientPhone: string; lastMessage: string })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  getQuickReplies(): Promise<QuickReply[]>;
  createQuickReply(data: InsertQuickReply): Promise<QuickReply>;
  deleteQuickReply(id: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  createProduct(data: InsertProduct): Promise<Product>;
  getActivities(): Promise<Activity[]>;
  createActivity(data: InsertActivity): Promise<Activity>;
  getStats(): Promise<{
    waiting: number;
    active: number;
    finishedToday: number;
    avgTime: number;
    waitingTrend: number;
    finishedTrend: number;
  }>;
  getChartData(): Promise<{ hour: string; conversas: number }[]>;
  getReports(): Promise<{
    totalConversations: number;
    totalClients: number;
    avgResponseTime: number;
    satisfactionRate: number;
    weeklyData: { day: string; conversas: number; finalizadas: number }[];
    statusDistribution: { name: string; value: number; color: string }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: InsertUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getAttendants() {
    return db.select().from(attendants);
  }

  async getAttendant(id: string) {
    const [att] = await db.select().from(attendants).where(eq(attendants.id, id));
    return att;
  }

  async createAttendant(data: InsertAttendant) {
    const [att] = await db.insert(attendants).values(data).returning();
    return att;
  }

  async getClients() {
    return db.select().from(clients).orderBy(desc(clients.lastContact));
  }

  async getClient(id: string) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: InsertClient) {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async getConversations() {
    const lastMessageSubquery = db
      .select({
        conversationId: messages.conversationId,
        content: sql<string>`(array_agg(${messages.content} ORDER BY ${messages.sentAt} DESC))[1]`.as("content"),
      })
      .from(messages)
      .groupBy(messages.conversationId)
      .as("last_msg");

    const result = await db
      .select({
        id: conversations.id,
        clientId: conversations.clientId,
        attendantId: conversations.attendantId,
        status: conversations.status,
        startedAt: conversations.startedAt,
        endedAt: conversations.endedAt,
        duration: conversations.duration,
        clientName: clients.name,
        clientPhone: clients.phone,
        attendantName: sql<string>`COALESCE(${attendants.name}, '')`,
        lastMessage: sql<string>`COALESCE(${lastMessageSubquery.content}, '')`,
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .leftJoin(attendants, eq(conversations.attendantId, attendants.id))
      .leftJoin(lastMessageSubquery, eq(conversations.id, lastMessageSubquery.conversationId))
      .orderBy(desc(conversations.startedAt));

    return result.map((r) => ({
      ...r,
      clientName: r.clientName || "Desconhecido",
      clientPhone: r.clientPhone || "",
      attendantName: r.attendantName || "",
      lastMessage: r.lastMessage || "",
    }));
  }

  async getConversation(id: string) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(data: InsertConversation) {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async getMessages(conversationId: string) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.sentAt);
  }

  async createMessage(data: InsertMessage) {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  async getQuickReplies() {
    return db.select().from(quickReplies).orderBy(quickReplies.title);
  }

  async createQuickReply(data: InsertQuickReply) {
    const [reply] = await db.insert(quickReplies).values(data).returning();
    return reply;
  }

  async deleteQuickReply(id: string) {
    await db.delete(quickReplies).where(eq(quickReplies.id, id));
  }

  async getProducts() {
    return db.select().from(products).orderBy(products.name);
  }

  async createProduct(data: InsertProduct) {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async getActivities() {
    return db.select().from(activities).orderBy(desc(activities.timestamp)).limit(20);
  }

  async createActivity(data: InsertActivity) {
    const [activity] = await db.insert(activities).values(data).returning();
    return activity;
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [waitingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.status, "nova"));

    const [activeResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.status, "em_atendimento"));

    const [finishedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(eq(conversations.status, "finalizada"), gte(conversations.endedAt, today)));

    const [avgResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${conversations.duration}), 0)::int` })
      .from(conversations)
      .where(eq(conversations.status, "finalizada"));

    return {
      waiting: waitingResult?.count ?? 0,
      active: activeResult?.count ?? 0,
      finishedToday: finishedResult?.count ?? 0,
      avgTime: avgResult?.avg ?? 0,
      waitingTrend: 12,
      finishedTrend: 8,
    };
  }

  async getChartData() {
    const result = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${conversations.startedAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(conversations)
      .groupBy(sql`EXTRACT(HOUR FROM ${conversations.startedAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${conversations.startedAt})`);

    const countsByHour = new Map(result.map((r) => [r.hour, r.count]));
    const hours = [];
    for (let i = 8; i <= 20; i++) {
      hours.push({ hour: `${i}:00`, conversas: countsByHour.get(i) ?? 0 });
    }
    return hours;
  }

  async getReports() {
    const [totalConvs] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations);
    const [totalCli] = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
    const [avgTime] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${conversations.duration}), 0)::int` })
      .from(conversations)
      .where(eq(conversations.status, "finalizada"));

    const allConvs = await db.select().from(conversations);
    const finished = allConvs.filter((c) => c.status === "finalizada").length;
    const total = allConvs.length;
    const rate = total > 0 ? Math.round((finished / total) * 100) : 0;

    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weeklyData = days.map((day, i) => {
      const dayConvs = allConvs.filter((c) => new Date(c.startedAt).getDay() === i);
      const dayFinished = dayConvs.filter((c) => c.status === "finalizada");
      return { day, conversas: dayConvs.length, finalizadas: dayFinished.length };
    });

    const statusCounts = {
      Nova: allConvs.filter((c) => c.status === "nova").length,
      "Em atendimento": allConvs.filter((c) => c.status === "em_atendimento").length,
      Pausada: allConvs.filter((c) => c.status === "pausada").length,
      Finalizada: finished,
    };

    const colors = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(220, 13%, 69%)"];
    const statusDistribution = Object.entries(statusCounts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i],
    }));

    return {
      totalConversations: totalConvs?.count ?? 0,
      totalClients: totalCli?.count ?? 0,
      avgResponseTime: avgTime?.avg ?? 0,
      satisfactionRate: rate,
      weeklyData,
      statusDistribution,
    };
  }
}

export const storage = new DatabaseStorage();
