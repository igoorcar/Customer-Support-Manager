import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertQuickReplySchema, insertProductSchema, insertClientNoteSchema, insertMessageSchema, insertQuoteSchema } from "@shared/schema";
import { requireAuth } from "./auth";
import { spawn } from "child_process";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServer = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (supabaseServer) {
  console.log("[upload] Supabase Storage client initialized - uploads will persist to Supabase");
} else {
  console.warn("[upload] Supabase credentials missing - uploads will use local storage only (ephemeral in production!)");
}

const tmpDir = os.tmpdir();

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function uploadToSupabase(filePath: string, storagePath: string, contentType: string): Promise<string | null> {
  if (!supabaseServer) return null;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { error } = await supabaseServer.storage
      .from("midias")
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      console.warn("[upload] Supabase upload error:", error.message);
      return null;
    }
    const { data } = supabaseServer.storage.from("midias").getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn("[upload] Supabase upload failed:", err.message);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  app.use("/api/stats", requireAuth);
  app.use("/api/conversations", requireAuth);
  app.use("/api/clients", requireAuth);
  app.use("/api/attendants", requireAuth);
  app.use("/api/quick-replies", requireAuth);
  app.use("/api/products", requireAuth);
  app.use("/api/activities", requireAuth);
  app.use("/api/reports", requireAuth);
  app.use("/api/upload", requireAuth);

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const mime = req.file.mimetype;
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "video/mp4": "mp4", "video/3gpp": "3gp",
        "application/pdf": "pdf",
      };
      const ext = extMap[mime] || req.file.originalname.split(".").pop() || "bin";
      const folder = mime.startsWith("image") ? "imagens"
        : mime.startsWith("video") ? "videos"
        : "documentos";
      const storagePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const publicUrl = await uploadToSupabase(req.file.path, storagePath, mime);

      if (publicUrl) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.json({
          url: publicUrl,
          path: storagePath,
          mimeType: mime,
          tamanho: req.file.size,
          nomeArquivo: req.file.originalname,
        });
      }

      const localDest = path.join(uploadDir, req.file.filename);
      fs.copyFileSync(req.file.path, localDest);
      try { fs.unlinkSync(req.file.path); } catch {}

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      res.json({
        url: fileUrl,
        path: req.file.filename,
        mimeType: mime,
        tamanho: req.file.size,
        nomeArquivo: req.file.originalname,
      });
    } catch (err: any) {
      console.error("[upload] Error:", err);
      res.status(500).json({ error: "Erro no upload" });
    }
  });

  app.post("/api/upload/audio", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio enviado" });
    }

    const inputPath = req.file.path;
    const oggFilename = `${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`;
    const outputPath = path.join(tmpDir, oggFilename);

    console.log(`[audio] Converting: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes) -> ${oggFilename}`);

    const args = [
      "-i", inputPath,
      "-acodec", "libopus",
      "-b:a", "64k",
      "-ar", "48000",
      "-ac", "1",
      "-vn",
      "-y",
      outputPath
    ];

    const ffmpegProcess = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stderr = "";
    let responded = false;
    ffmpegProcess.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

    const ffmpegTimeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.error("[audio] FFmpeg timed out after 30s");
        try { ffmpegProcess.kill("SIGKILL"); } catch {}
        try { fs.unlinkSync(inputPath); } catch {}
        try { fs.unlinkSync(outputPath); } catch {}
        if (!res.headersSent) {
          res.status(504).json({ error: "Timeout na conversão de áudio" });
        }
      }
    }, 30000);

    ffmpegProcess.on("close", (code: number) => {
      clearTimeout(ffmpegTimeout);
      if (responded) return;
      try { fs.unlinkSync(inputPath); } catch {}

      if (code !== 0) {
        responded = true;
        console.error(`[audio] FFmpeg exit code ${code}:`, stderr);
        try { fs.unlinkSync(outputPath); } catch {}
        if (!res.headersSent) {
          return res.status(500).json({ error: "Erro ao converter áudio para OGG", details: stderr.slice(-500) });
        }
        return;
      }

      (async () => {
        try {
          const stats = fs.statSync(outputPath);
          console.log(`[audio] Converted successfully: ${stats.size} bytes`);

          const storagePath = `audios/${oggFilename}`;
          const publicUrl = await uploadToSupabase(outputPath, storagePath, "audio/ogg");

          responded = true;
          if (publicUrl) {
            try { fs.unlinkSync(outputPath); } catch {}
            return res.json({
              url: publicUrl,
              path: storagePath,
              mimeType: "audio/ogg",
              tamanho: stats.size,
              nomeArquivo: oggFilename,
            });
          }

          const localDest = path.join(uploadDir, oggFilename);
          try { fs.copyFileSync(outputPath, localDest); } catch {}
          try { fs.unlinkSync(outputPath); } catch {}
          const protocol = req.headers["x-forwarded-proto"] || req.protocol;
          const host = req.headers["x-forwarded-host"] || req.headers.host;
          const fileUrl = `${protocol}://${host}/uploads/${oggFilename}`;

          res.json({
            url: fileUrl,
            path: oggFilename,
            mimeType: "audio/ogg",
            tamanho: stats.size,
            nomeArquivo: oggFilename,
          });
        } catch (err: any) {
          console.error("[audio] Error processing converted audio:", err);
          responded = true;
          if (!res.headersSent) {
            res.status(500).json({ error: "Erro ao processar áudio convertido" });
          }
        }
      })();
    });

    ffmpegProcess.on("error", (err: Error) => {
      clearTimeout(ffmpegTimeout);
      if (responded) return;
      responded = true;
      try { fs.unlinkSync(inputPath); } catch {}
      console.error("[audio] FFmpeg spawn error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "FFmpeg não disponível" });
      }
    });
  });

  const ALLOWED_MEDIA_DOMAINS = [
    "lookaside.fbsbx.com",
    "scontent.whatsapp.net",
    "mmg.whatsapp.net",
    "media.fna.whatsapp.net",
    "media.fgru",
    "pps.whatsapp.net",
    "web.whatsapp.com",
  ];

  app.get("/api/media-proxy", requireAuth, async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "URL obrigatória" });

    try {
      const parsed = new URL(url);
      const isAllowed = ALLOWED_MEDIA_DOMAINS.some(d => parsed.hostname.includes(d));
      if (!isAllowed) {
        return res.status(403).json({ error: "Domínio não permitido" });
      }

      const headers: Record<string, string> = {};
      const isFacebookMedia = parsed.hostname.includes("fbsbx.com") || parsed.hostname.includes("facebook.com") || parsed.hostname.includes("whatsapp.com");
      if (isFacebookMedia && process.env.WHATSAPP_ACCESS_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        const isExpired = response.status === 401 || response.status === 403 || response.status === 404;
        const statusMsg = isExpired
          ? "Mídia expirada ou indisponível"
          : "Erro ao acessar mídia";
        return res.status(response.status).json({ error: statusMsg, expired: isExpired });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ error: "Timeout ao buscar mídia", expired: true });
      }
      console.error("Media proxy error:", error);
      res.status(500).json({ error: "Erro ao buscar mídia" });
    }
  });

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

  app.get("/api/quotes", requireAuth, async (req, res) => {
    const conversaId = String(req.query.conversaId || "");
    if (!conversaId) return res.status(400).json({ message: "conversaId obrigatório" });
    const result = await storage.getQuotesByConversa(conversaId);
    res.json(result);
  });

  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    const quote = await storage.getQuote(req.params.id as string);
    if (!quote) return res.status(404).json({ message: "Orçamento não encontrado" });
    res.json(quote);
  });

  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      const { items, ...quoteData } = req.body;
      const parsed = insertQuoteSchema.safeParse(quoteData);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Itens obrigatórios" });
      }
      const quote = await storage.createQuote(parsed.data, items);
      res.status(201).json(quote);
    } catch (error: any) {
      console.error("Create quote error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/quotes/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status obrigatório" });
    const quote = await storage.updateQuoteStatus(req.params.id as string, status);
    if (!quote) return res.status(404).json({ message: "Orçamento não encontrado" });
    res.json(quote);
  });

  app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    await storage.deleteQuote(req.params.id as string);
    res.status(204).send();
  });

  app.post("/api/webhook/salvar-mensagem-ia", async (req, res) => {
    try {
      const { conversa_id, conteudo, tipo, midia_url, midia_mime_type, whatsapp_message_id } = req.body;

      if (!conversa_id) {
        return res.status(400).json({ error: "conversa_id é obrigatório" });
      }

      if (!supabaseServer) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      const now = new Date().toISOString();

      const insertData: Record<string, any> = {
        conversa_id,
        direcao: 'enviada',
        tipo: tipo || 'text',
        conteudo: conteudo || null,
        midia_url: midia_url || null,
        midia_mime_type: midia_mime_type || null,
        whatsapp_message_id: whatsapp_message_id || null,
        status: 'enviada',
        enviada_em: now,
        enviada_por: null,
        metadata: JSON.stringify({ remetente: 'ia' }),
      };

      const { data, error } = await supabaseServer
        .from('mensagens')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("[webhook] Erro ao salvar mensagem IA:", error.message);
        return res.status(500).json({ error: error.message });
      }

      const { data: conversaData } = await supabaseServer
        .from('conversas')
        .select('atendente_id')
        .eq('id', conversa_id)
        .single();

      const conversaUpdate: Record<string, any> = { 
        ultima_mensagem_em: now, 
        updated_at: now 
      };
      if (conversaData?.atendente_id) {
        conversaUpdate.atendente_id = conversaData.atendente_id;
      }

      await supabaseServer
        .from('conversas')
        .update(conversaUpdate)
        .eq('id', conversa_id);

      console.log(`[webhook] Mensagem IA salva: conversa=${conversa_id}, tipo=${tipo || 'text'}, atendente preservado: ${conversaData?.atendente_id || 'null'}`);
      res.json({ success: true, mensagem: data });
    } catch (error: any) {
      console.error("[webhook] Erro:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webhook/salvar-mensagem-recebida", async (req, res) => {
    try {
      const { conversa_id, conteudo, tipo, midia_url, midia_mime_type, whatsapp_message_id } = req.body;

      if (!conversa_id) {
        return res.status(400).json({ error: "conversa_id é obrigatório" });
      }

      if (!supabaseServer) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      const now = new Date().toISOString();

      const { data, error } = await supabaseServer
        .from('mensagens')
        .insert({
          conversa_id,
          direcao: 'recebida',
          tipo: tipo || 'text',
          conteudo: conteudo || null,
          midia_url: midia_url || null,
          midia_mime_type: midia_mime_type || null,
          whatsapp_message_id: whatsapp_message_id || null,
          status: 'enviada',
          enviada_em: now,
          enviada_por: null,
        })
        .select()
        .single();

      if (error) {
        console.error("[webhook] Erro ao salvar mensagem recebida:", error.message);
        return res.status(500).json({ error: error.message });
      }

      const { data: conversaData } = await supabaseServer
        .from('conversas')
        .select('atendente_id')
        .eq('id', conversa_id)
        .single();

      const conversaUpdate: Record<string, any> = { 
        ultima_mensagem_em: now, 
        updated_at: now 
      };
      if (conversaData?.atendente_id) {
        conversaUpdate.atendente_id = conversaData.atendente_id;
      }

      await supabaseServer
        .from('conversas')
        .update(conversaUpdate)
        .eq('id', conversa_id);

      console.log(`[webhook] Mensagem recebida salva: conversa=${conversa_id}, atendente preservado: ${conversaData?.atendente_id || 'null'}`);
      res.json({ success: true, mensagem: data });
    } catch (error: any) {
      console.error("[webhook] Erro:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
