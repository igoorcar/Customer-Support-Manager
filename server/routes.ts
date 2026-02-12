import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertQuickReplySchema, insertProductSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/stats/chart", async (_req, res) => {
    const data = await storage.getChartData();
    res.json(data);
  });

  app.get("/api/conversations", async (_req, res) => {
    const convs = await storage.getConversations();
    res.json(convs);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const conv = await storage.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ message: "Conversa não encontrada" });
    res.json(conv);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const msgs = await storage.getMessages(req.params.id);
    res.json(msgs);
  });

  app.get("/api/clients", async (_req, res) => {
    const cls = await storage.getClients();
    res.json(cls);
  });

  app.post("/api/clients", async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    res.status(201).json(client);
  });

  app.get("/api/quick-replies", async (_req, res) => {
    const replies = await storage.getQuickReplies();
    res.json(replies);
  });

  app.post("/api/quick-replies", async (req, res) => {
    const parsed = insertQuickReplySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const reply = await storage.createQuickReply(parsed.data);
    res.status(201).json(reply);
  });

  app.delete("/api/quick-replies/:id", async (req, res) => {
    await storage.deleteQuickReply(req.params.id);
    res.status(204).send();
  });

  app.get("/api/products", async (_req, res) => {
    const prods = await storage.getProducts();
    res.json(prods);
  });

  app.post("/api/products", async (req, res) => {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const product = await storage.createProduct(parsed.data);
    res.status(201).json(product);
  });

  app.get("/api/activities", async (_req, res) => {
    const acts = await storage.getActivities();
    res.json(acts);
  });

  app.get("/api/reports", async (_req, res) => {
    const reports = await storage.getReports();
    res.json(reports);
  });

  return httpServer;
}
