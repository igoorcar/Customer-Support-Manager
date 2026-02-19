import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      password: string;
      role: string;
    }
  }
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const PgStore = ConnectPgSimple(session);

  const sessionMiddleware = session({
    store: new PgStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: (process.env.DATABASE_URL?.includes("supabase.com") || process.env.DATABASE_URL?.includes("neon.tech")) ? { rejectUnauthorized: false } : undefined,
      },
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "otica-suellen-secret-key-dev",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Usuário não encontrado" });
        const valid = await comparePasswords(password, user.password);
        if (!valid) return done(null, false, { message: "Senha incorreta" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Este nome de usuário já está em uso" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashedPassword });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Erro ao criar sessão" });
        res.status(201).json({ id: user.id, username: user.username, role: user.role });
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return res.status(500).json({ message: "Erro interno" });
      if (!user) return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Erro ao criar sessão" });
        res.json({ id: user.id, username: user.username, role: user.role });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Erro ao encerrar sessão" });
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = req.user!;
    res.json({ id: user.id, username: user.username, role: user.role });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      if (newPassword.length < 4) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 4 caracteres" });
      }
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      const valid = await comparePasswords(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashed);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }
  next();
};
