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

  type PostcardDraft = {
    imageUrl: string;
    message: string;
    recipientName: string;
    recipientAddress: string;
    recipientPostalCode: string;
    recipientCity: string;
    selectedPlan: string;
    promoCode?: string;
    customerEmail?: string;
    customerName?: string;
  };

  type ForwardedPostcard = {
    recipientName: string;
    recipientAddress: string;
    postcardType: string;
    message: string;
    selectedPlan: string;
    source: string;
    customerEmail?: string;
    customerName?: string;
    recipientCity?: string;
    imageUrl?: string;
  };

  const pendingLemonDrafts = new Map<string, PostcardDraft>();
  const sentPostcards = new Map<string, ForwardedPostcard & { id: string; createdAt: string; recipientCity: string }>();

  const getPublicBaseUrl = () => (process.env.PUBLIC_BASE_URL || "https://foto-post-weltweit.de").replace(/\/$/, "");

  const getLemonConfig = () => {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim();
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
    const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID?.trim();

    return {
      apiKey,
      storeId,
      variantId,
      testMode: String(process.env.LEMON_SQUEEZY_TEST_MODE || "false").toLowerCase() === "true",
    };
  };

  const forwardToEchtpost = async (payload: ForwardedPostcard) => {
    const apiKey = process.env.ECHTPOST_API_KEY;
    const endpoint = process.env.ECHTPOST_API_URL || "https://api.echtpost.example/postcards";

    if (!apiKey) {
      throw new Error("Missing ECHTPOST_API_KEY");
    }

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const error = new Error("EchtPost submission failed");
      (error as Error & { details?: unknown }).details = data;
      throw error;
    }

    return data;
  };

  const rawFrontendOrigin = process.env.FRONTEND_ORIGIN || "*";
  const allowedOrigins = rawFrontendOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowsAnyOrigin = allowedOrigins.includes("*");
  const matchesAllowedOrigin = (requestOrigin: string) => {
    if (!requestOrigin) {
      return false;
    }

    return allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin === requestOrigin) {
        return true;
      }

      if (!allowedOrigin.includes("*")) {
        return false;
      }

      const escapedPattern = allowedOrigin
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp(`^${escapedPattern}$`).test(requestOrigin);
    });
  };
  app.use((req, res, next) => {
    const requestOrigin = String(req.headers.origin || "").trim();
    const isAllowedOrigin = allowsAnyOrigin || matchesAllowedOrigin(requestOrigin);

    if (allowsAnyOrigin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (isAllowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }

    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    return next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

  app.get("/api/postcards/:id", (req, res) => {
    const postcard = sentPostcards.get(String(req.params.id || ""));
    if (!postcard) {
      return res.status(404).json({ error: "Postkarte nicht gefunden." });
    }

    return res.status(200).json({ success: true, postcard });
  });

  app.post("/api/checkout", async (req, res) => {
    const { recipientName, recipientAddress, postcardType, message, selectedPlan } = req.body ?? {};
    if (!recipientName || !recipientAddress || !message) {
      return res.status(400).json({ error: "recipientName, recipientAddress und message sind erforderlich." });
    }

    try {
      const data = await forwardToEchtpost({
        recipientName,
        recipientAddress,
        postcardType: postcardType || "standard",
        message,
        selectedPlan: selectedPlan || "single",
        source: "familypost-do-backend",
      });

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Failed to submit to EchtPost", details: error?.details || "Unknown error" });
    }
  });

  app.post("/api/payments/create-checkout", async (req, res) => {
    const config = getLemonConfig();
    if (!config.apiKey || !config.storeId || !config.variantId) {
      return res.status(500).json({ error: "Missing Lemon Squeezy configuration." });
    }

    const {
      imageUrl,
      message,
      recipientName,
      recipientAddress,
      recipientPostalCode,
      recipientCity,
      selectedPlan,
      promoCode,
      customerEmail,
      customerName,
    } = req.body ?? {};

    if (!imageUrl || !message || !recipientName || !recipientAddress || !recipientPostalCode || !recipientCity) {
      return res.status(400).json({ error: "Die Postkartendaten sind unvollständig." });
    }

    const draftId = crypto.randomUUID();
    pendingLemonDrafts.set(draftId, {
      imageUrl,
      message,
      recipientName,
      recipientAddress,
      recipientPostalCode,
      recipientCity,
      selectedPlan: selectedPlan || "single",
      promoCode,
      customerEmail,
      customerName,
    });

    try {
      const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          data: {
            type: "checkouts",
            attributes: {
              checkout_data: {
                email: customerEmail || undefined,
                name: customerName || recipientName,
                discount_code: promoCode || undefined,
                custom: {
                  draft_id: draftId,
                  selected_plan: selectedPlan || "single",
                },
              },
              product_options: {
                redirect_url: `${getPublicBaseUrl()}/api/payments/complete?draftId=${draftId}`,
              },
              checkout_options: {
                locale: "de",
                logo: false,
                media: true,
                desc: true,
                discount: true,
                subscription_preview: false,
              },
              test_mode: config.testMode,
            },
            relationships: {
              store: {
                data: { type: "stores", id: String(config.storeId) },
              },
              variant: {
                data: { type: "variants", id: String(config.variantId) },
              },
            },
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        pendingLemonDrafts.delete(draftId);
        return res.status(response.status).json({ error: "Checkout konnte nicht erstellt werden.", details: payload });
      }

      return res.status(200).json({
        success: true,
        checkoutId: payload?.data?.id,
        checkoutUrl: payload?.data?.attributes?.url,
        draftId,
      });
    } catch (error: any) {
      pendingLemonDrafts.delete(draftId);
      return res.status(500).json({ error: error?.message || "Checkout konnte nicht erstellt werden." });
    }
  });

  app.get("/api/payments/complete", async (req, res) => {
    const config = getLemonConfig();
    const draftId = String(req.query.draftId ?? "").trim();
    const orderId = String(req.query.order_id ?? req.query.orderId ?? "").trim();

    if (!draftId || !orderId) {
      return res.status(400).send("Zahlung konnte nicht verifiziert werden.");
    }

    const draft = pendingLemonDrafts.get(draftId);
    if (!draft) {
      return res.status(404).send("Offene Sendung nicht gefunden.");
    }

    if (!config.apiKey) {
      return res.status(500).send("Lemon Squeezy API Key fehlt.");
    }

    try {
      const response = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}`, {
        method: "GET",
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      const status = String(payload?.data?.attributes?.status || "").toLowerCase();
      if (!response.ok || status !== "paid") {
        return res.status(402).send("Die Zahlung wurde noch nicht bestätigt.");
      }

      const forwarded = await forwardToEchtpost({
        recipientName: draft.recipientName,
        recipientAddress: draft.recipientAddress,
        postcardType: "standard",
        message: draft.message,
        selectedPlan: draft.selectedPlan,
        source: "familypost-lemonsqueezy",
        customerEmail: draft.customerEmail,
        customerName: draft.customerName,
        recipientCity: `${draft.recipientPostalCode} ${draft.recipientCity}`.trim(),
        imageUrl: draft.imageUrl,
      });

      pendingLemonDrafts.delete(draftId);
      const forwardedId = String(forwarded?.id || forwarded?.data?.id || draftId);
      sentPostcards.set(forwardedId, {
        id: forwardedId,
        recipientName: draft.recipientName,
        recipientAddress: draft.recipientAddress,
        postcardType: "standard",
        message: draft.message,
        selectedPlan: draft.selectedPlan,
        source: "familypost-lemonsqueezy",
        customerEmail: draft.customerEmail,
        customerName: draft.customerName,
        recipientCity: `${draft.recipientPostalCode} ${draft.recipientCity}`.trim(),
        imageUrl: draft.imageUrl,
        createdAt: new Date().toISOString(),
      });
      return res.redirect(302, `/shipping-status/${forwardedId}`);
    } catch (error: any) {
      return res.status(500).send(error?.message || "Die Zahlung konnte nicht abgeschlossen werden.");
    }
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
