import {
  type User, type InsertUser,
  type Attendant, type InsertAttendant,
  type Client, type InsertClient,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type QuickReply, type InsertQuickReply,
  type Product, type InsertProduct,
  type Activity, type InsertActivity,
  type ClientNote, type InsertClientNote,
  users, attendants, clients, conversations, messages, quickReplies, products, activities, clientNotes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, or, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAttendants(): Promise<Attendant[]>;
  getAttendant(id: string): Promise<Attendant | undefined>;
  createAttendant(data: InsertAttendant): Promise<Attendant>;
  getClients(params?: { search?: string; status?: string; vip?: boolean; tag?: string; sortBy?: string; sortDir?: string; page?: number; limit?: number }): Promise<{ data: Client[]; total: number }>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  getClientNotes(clientId: string): Promise<ClientNote[]>;
  createClientNote(data: InsertClientNote): Promise<ClientNote>;
  getClientConversations(clientId: string): Promise<any[]>;
  getConversations(statusFilter?: string): Promise<any[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<{ status: string; attendantId: string | null; endedAt: Date; duration: number; finishReason: string }>): Promise<Conversation | undefined>;
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  getQuickReplies(): Promise<QuickReply[]>;
  createQuickReply(data: InsertQuickReply): Promise<QuickReply>;
  updateQuickReply(id: string, data: Partial<InsertQuickReply>): Promise<QuickReply | undefined>;
  deleteQuickReply(id: string): Promise<void>;
  incrementQuickReplyUsage(id: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
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

  async getClients(params?: { search?: string; status?: string; vip?: boolean; tag?: string; sortBy?: string; sortDir?: string; page?: number; limit?: number }) {
    const conditions: any[] = [];

    if (params?.search) {
      const term = `%${params.search}%`;
      conditions.push(or(ilike(clients.name, term), ilike(clients.phone, term), ilike(clients.email, term)));
    }

    if (params?.status) {
      conditions.push(eq(clients.status, params.status));
    }

    if (params?.vip !== undefined) {
      conditions.push(eq(clients.vip, params.vip));
    }

    if (params?.tag) {
      conditions.push(sql`${params.tag} = ANY(${clients.tags})`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(clients).where(where);
    const total = countResult?.count ?? 0;

    const sortColumn = params?.sortBy === "name" ? clients.name
      : params?.sortBy === "totalSpend" ? clients.totalSpend
      : params?.sortBy === "lastPurchaseAt" ? clients.lastPurchaseAt
      : params?.sortBy === "createdAt" ? clients.createdAt
      : clients.lastContact;

    const sortDir = params?.sortDir === "asc" ? sql`ASC` : sql`DESC`;

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db.select().from(clients)
      .where(where)
      .orderBy(params?.sortDir === "asc" ? sortColumn : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async getClient(id: string) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: InsertClient) {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>) {
    const [client] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: string) {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getClientNotes(clientId: string) {
    return db.select().from(clientNotes).where(eq(clientNotes.clientId, clientId)).orderBy(desc(clientNotes.createdAt));
  }

  async createClientNote(data: InsertClientNote) {
    const [note] = await db.insert(clientNotes).values(data).returning();
    return note;
  }

  async getClientConversations(clientId: string) {
    const result = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        startedAt: conversations.startedAt,
        endedAt: conversations.endedAt,
        attendantName: sql<string>`COALESCE(${attendants.name}, '')`,
      })
      .from(conversations)
      .leftJoin(attendants, eq(conversations.attendantId, attendants.id))
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.startedAt));
    return result;
  }

  async getConversations(statusFilter?: string) {
    const lastMessageSubquery = db
      .select({
        conversationId: messages.conversationId,
        content: sql<string>`(array_agg(${messages.content} ORDER BY ${messages.sentAt} DESC))[1]`.as("content"),
        lastAt: sql<Date>`MAX(${messages.sentAt})`.as("last_at"),
      })
      .from(messages)
      .groupBy(messages.conversationId)
      .as("last_msg");

    const unreadSubquery = db
      .select({
        conversationId: messages.conversationId,
        count: sql<number>`count(*)::int`.as("unread_count"),
      })
      .from(messages)
      .where(and(eq(messages.sender, "client"), eq(messages.status, "sent")))
      .groupBy(messages.conversationId)
      .as("unread");

    const conditions: any[] = [];
    if (statusFilter && statusFilter !== "todas") {
      conditions.push(eq(conversations.status, statusFilter));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        id: conversations.id,
        clientId: conversations.clientId,
        attendantId: conversations.attendantId,
        status: conversations.status,
        startedAt: conversations.startedAt,
        endedAt: conversations.endedAt,
        duration: conversations.duration,
        channel: conversations.channel,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientAvatar: clients.avatar,
        attendantName: sql<string>`COALESCE(${attendants.name}, '')`,
        lastMessage: sql<string>`COALESCE(${lastMessageSubquery.content}, '')`,
        lastMessageAt: lastMessageSubquery.lastAt,
        unreadCount: sql<number>`COALESCE(${unreadSubquery.count}, 0)`,
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .leftJoin(attendants, eq(conversations.attendantId, attendants.id))
      .leftJoin(lastMessageSubquery, eq(conversations.id, lastMessageSubquery.conversationId))
      .leftJoin(unreadSubquery, eq(conversations.id, unreadSubquery.conversationId))
      .where(where)
      .orderBy(desc(conversations.startedAt));

    return result.map((r) => ({
      ...r,
      clientName: r.clientName || "Desconhecido",
      clientPhone: r.clientPhone || "",
      attendantName: r.attendantName || "",
      lastMessage: r.lastMessage || "",
      unreadCount: r.unreadCount || 0,
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

  async updateConversation(id: string, data: Partial<{ status: string; attendantId: string | null; endedAt: Date; duration: number; finishReason: string }>) {
    const [conv] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
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
    return db.select().from(quickReplies).orderBy(quickReplies.sortOrder);
  }

  async createQuickReply(data: InsertQuickReply) {
    const [reply] = await db.insert(quickReplies).values(data).returning();
    return reply;
  }

  async updateQuickReply(id: string, data: Partial<InsertQuickReply>) {
    const [reply] = await db.update(quickReplies).set(data).where(eq(quickReplies.id, id)).returning();
    return reply;
  }

  async deleteQuickReply(id: string) {
    await db.delete(quickReplies).where(eq(quickReplies.id, id));
  }

  async incrementQuickReplyUsage(id: string) {
    await db.update(quickReplies).set({ usageCount: sql`${quickReplies.usageCount} + 1` }).where(eq(quickReplies.id, id));
  }

  async getProducts() {
    return db.select().from(products).orderBy(products.name);
  }

  async createProduct(data: InsertProduct) {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>) {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
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

    const countsByHour = new Map(result.map((r: any) => [r.hour, r.count]));
    const hours: { hour: string; conversas: number }[] = [];
    for (let i = 8; i <= 20; i++) {
      hours.push({ hour: `${i}:00`, conversas: (countsByHour.get(i) ?? 0) as number });
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

    const allConvs: any[] = await db.select().from(conversations);
    const finished = allConvs.filter((c: any) => c.status === "finalizada").length;
    const total = allConvs.length;
    const rate = total > 0 ? Math.round((finished / total) * 100) : 0;

    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weeklyData = days.map((day, i) => {
      const dayConvs = allConvs.filter((c: any) => new Date(c.startedAt).getDay() === i);
      const dayFinished = dayConvs.filter((c: any) => c.status === "finalizada");
      return { day, conversas: dayConvs.length, finalizadas: dayFinished.length };
    });

    const statusCounts = {
      Nova: allConvs.filter((c: any) => c.status === "nova").length,
      "Em atendimento": allConvs.filter((c: any) => c.status === "em_atendimento").length,
      Pausada: allConvs.filter((c: any) => c.status === "pausada").length,
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
