import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertQuickReplySchema, insertProductSchema, insertClientNoteSchema, insertMessageSchema } from "@shared/schema";

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

  app.get("/api/conversations", async (req, res) => {
    const statusFilter = req.query.status as string | undefined;
    const convs = await storage.getConversations(statusFilter);
    res.json(convs);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const conv = await storage.getConversation(req.params.id);
    if (!conv) return res.status(404).json({ message: "Conversa não encontrada" });
    res.json(conv);
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    const { status, attendantId, finishReason } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (attendantId !== undefined) updateData.attendantId = attendantId;
    if (finishReason) updateData.finishReason = finishReason;
    if (status === "finalizada") {
      updateData.endedAt = new Date();
      const conv = await storage.getConversation(req.params.id);
      if (conv) {
        updateData.duration = Math.round((Date.now() - new Date(conv.startedAt).getTime()) / 60000);
      }
    }
    const conv = await storage.updateConversation(req.params.id, updateData);
    if (!conv) return res.status(404).json({ message: "Conversa não encontrada" });
    res.json(conv);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const msgs = await storage.getMessages(req.params.id);
    res.json(msgs);
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse({
      ...req.body,
      conversationId: req.params.id,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createMessage(parsed.data);
    res.status(201).json(msg);
  });

  app.get("/api/clients", async (req, res) => {
    const { search, status, vip, tag, sortBy, sortDir, page, limit } = req.query;
    const result = await storage.getClients({
      search: search as string,
      status: status as string,
      vip: vip === "true" ? true : vip === "false" ? false : undefined,
      tag: tag as string,
      sortBy: sortBy as string,
      sortDir: sortDir as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  });

  app.get("/api/clients/:id", async (req, res) => {
    const client = await storage.getClient(req.params.id);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
    res.json(client);
  });

  app.post("/api/clients", async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", async (req, res) => {
    const client = await storage.updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
    res.json(client);
  });

  app.delete("/api/clients/:id", async (req, res) => {
    await storage.deleteClient(req.params.id);
    res.status(204).send();
  });

  app.get("/api/clients/:id/notes", async (req, res) => {
    const notes = await storage.getClientNotes(req.params.id);
    res.json(notes);
  });

  app.post("/api/clients/:id/notes", async (req, res) => {
    const parsed = insertClientNoteSchema.safeParse({
      ...req.body,
      clientId: req.params.id,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.createClientNote(parsed.data);
    res.status(201).json(note);
  });

  app.get("/api/clients/:id/conversations", async (req, res) => {
    const convs = await storage.getClientConversations(req.params.id);
    res.json(convs);
  });

  app.get("/api/attendants", async (_req, res) => {
    const atts = await storage.getAttendants();
    res.json(atts);
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

  app.patch("/api/quick-replies/:id", async (req, res) => {
    const reply = await storage.updateQuickReply(req.params.id, req.body);
    if (!reply) return res.status(404).json({ message: "Resposta não encontrada" });
    res.json(reply);
  });

  app.delete("/api/quick-replies/:id", async (req, res) => {
    await storage.deleteQuickReply(req.params.id);
    res.status(204).send();
  });

  app.post("/api/quick-replies/:id/use", async (req, res) => {
    await storage.incrementQuickReplyUsage(req.params.id);
    res.status(200).json({ ok: true });
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

  app.patch("/api/products/:id", async (req, res) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Produto não encontrado" });
    res.json(product);
  });

  app.delete("/api/products/:id", async (req, res) => {
    await storage.deleteProduct(req.params.id);
    res.status(204).send();
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
