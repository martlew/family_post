import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json());

  type UserRecord = {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
  };

  const users = new Map<string, UserRecord>();

  const hashPassword = (password: string, salt: string) => {
    return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  app.post("/api/auth/register", (req, res) => {
    const fullName = String(req.body?.fullName ?? "").trim();
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const password = String(req.body?.password ?? "");

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Bitte Name, E-Mail und Passwort angeben." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." });
    }

    if (users.has(email)) {
      return res.status(409).json({ error: "Diese E-Mail ist bereits registriert." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const user: UserRecord = {
      id: crypto.randomUUID(),
      fullName,
      email,
      passwordHash: hashPassword(password, salt),
      salt,
      createdAt: new Date().toISOString(),
    };
    users.set(email, user);

    const token = crypto.randomBytes(24).toString("hex");
    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ error: "Bitte E-Mail und Passwort angeben." });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email },
    });
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    if (!email) {
      return res.status(400).json({ error: "Bitte eine E-Mail-Adresse eingeben." });
    }

    return res.status(200).json({
      success: true,
      message: "Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Reset-Link gesendet.",
    });
  });

  app.get("/api/auth/health", (_req, res) => {
    return res.status(200).json({ ok: true });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
