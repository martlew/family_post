import express from "express";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env"), override: false });

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
    selectedPlan: PaymentPlanKey;
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
    recipientPostalCode?: string;
    recipientCity?: string;
    imageUrl?: string;
  };

  type EchtpostRecipientInput = {
    first_name?: string;
    last_name: string;
    street: string;
    zip: string;
    city: string;
    country_code: string;
  };

  type EchtpostCardRequest = {
    motive_id: number;
    content: string;
    deliver_at: string;
    recipients: EchtpostRecipientInput[];
  };

  const sentPostcards = new Map<string, ForwardedPostcard & { id: string; createdAt: string; recipientCity: string }>();

  type PaymentDraftStatus = "pending" | "paid";
  type PaymentPlanKey = "single" | "family-5" | "benefit-10";

  type PaymentPlanConfig = {
    key: PaymentPlanKey;
    credits: number;
    variantId: string | null;
  };

  type StoredPaymentDraft = PostcardDraft & {
    draftId: string;
    status: PaymentDraftStatus;
    selectedPlan: PaymentPlanKey;
    creditsGranted: number;
    creditsRecordedAt: string | null;
    lemonOrderId: string | null;
    forwardedPostcardId: string | null;
    createdAt: string;
    updatedAt: string;
    paidAt: string | null;
    forwardedAt: string | null;
  };

  type PaymentDraftRow = {
    draft_id: string;
    status: PaymentDraftStatus;
    selected_plan: PaymentPlanKey;
    credits_granted: number;
    credits_recorded_at: string | null;
    draft_data: Record<string, unknown> | string;
    lemon_order_id: string | null;
    forwarded_postcard_id: string | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
    forwarded_at: string | null;
  };

  const getDatabaseConfig = () => {
    const connectionString = process.env.DB_URL?.trim();
    if (connectionString) {
      return {
        connectionString,
        ssl: String(process.env.DB_SSL || "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
      };
    }

    const host = process.env.DB_HOST?.trim() || (process.env.NODE_ENV === "production" ? "familypost_db" : "localhost");
    const port = Number.parseInt(process.env.DB_PORT?.trim() || "5432", 10);
    const database = process.env.DB_NAME?.trim() || "familypost";
    const user = process.env.DB_USER?.trim() || "postgres";
    const password = process.env.DB_PASSWORD?.trim();
    const ssl = String(process.env.DB_SSL || "false").toLowerCase() === "true";

    if (!host || !Number.isFinite(port) || !database || !user || !password) {
      return null;
    }

    return {
      host,
      port,
      database,
      user,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
    };
  };

  const getDbPool = () => {
    const config = getDatabaseConfig();
    if (!config) {
      return null;
    }

    return new Pool(config);
  };

  const paymentDraftsDb = getDbPool();
  let paymentDraftSchemaReady: Promise<void> | null = null;
  let customerCreditsSchemaReady: Promise<void> | null = null;

  const requirePaymentDraftsDb = () => {
    if (!paymentDraftsDb) {
      throw new Error("Missing database configuration.");
    }

    return paymentDraftsDb;
  };

  const ensurePaymentDraftSchema = () => {
    if (!paymentDraftSchemaReady) {
      const db = requirePaymentDraftsDb();
      paymentDraftSchemaReady = db.query(`
        CREATE TABLE IF NOT EXISTS payment_drafts (
          draft_id TEXT PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'pending',
          selected_plan TEXT NOT NULL DEFAULT 'single',
          credits_granted INTEGER NOT NULL DEFAULT 0,
          credits_recorded_at TIMESTAMPTZ,
          draft_data JSONB NOT NULL,
          lemon_order_id TEXT,
          forwarded_postcard_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          paid_at TIMESTAMPTZ,
          forwarded_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS payment_drafts_status_idx ON payment_drafts(status);
      `).then(() => undefined);
    }

    return paymentDraftSchemaReady;
  };

  const ensureCustomerCreditsSchema = () => {
    if (!customerCreditsSchemaReady) {
      const db = requirePaymentDraftsDb();
      customerCreditsSchemaReady = db.query(`
        CREATE TABLE IF NOT EXISTS customer_credits (
          customer_email TEXT PRIMARY KEY,
          credits INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `).then(() => undefined);
    }

    return customerCreditsSchemaReady;
  };

  let usersSchemaReady: Promise<void> | null = null;

  const ensureUsersSchema = () => {
    if (!usersSchemaReady) {
      const db = requirePaymentDraftsDb();
      usersSchemaReady = db.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `).then(() => undefined);
    }

    return usersSchemaReady;
  };

  const mapPaymentDraftRow = (row: PaymentDraftRow): StoredPaymentDraft => {
    const draftData = typeof row.draft_data === "string" ? JSON.parse(row.draft_data) : row.draft_data;

    return {
      ...(draftData as PostcardDraft),
      draftId: row.draft_id,
      status: row.status,
      selectedPlan: row.selected_plan,
      creditsGranted: row.credits_granted,
      creditsRecordedAt: row.credits_recorded_at,
      lemonOrderId: row.lemon_order_id,
      forwardedPostcardId: row.forwarded_postcard_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
      forwardedAt: row.forwarded_at,
    };
  };

  const getPaymentDraft = async (draftId: string) => {
    await ensurePaymentDraftSchema();
    const db = requirePaymentDraftsDb();
    const result = await db.query<PaymentDraftRow>(
      `
        SELECT
          draft_id,
          status,
          selected_plan,
          credits_granted,
          credits_recorded_at,
          draft_data,
          lemon_order_id,
          forwarded_postcard_id,
          created_at::text AS created_at,
          updated_at::text AS updated_at,
          paid_at::text AS paid_at,
          forwarded_at::text AS forwarded_at
        FROM payment_drafts
        WHERE draft_id = $1
        LIMIT 1
      `,
      [draftId],
    );

    const row = result.rows[0];
    return row ? mapPaymentDraftRow(row) : null;
  };

  const createPaymentDraft = async (draftId: string, draft: PostcardDraft) => {
    await ensurePaymentDraftSchema();
    const db = requirePaymentDraftsDb();
    await db.query(
      `
        INSERT INTO payment_drafts (draft_id, status, selected_plan, credits_granted, draft_data, created_at, updated_at)
        VALUES ($1, 'pending', $2, $3, $4::jsonb, NOW(), NOW())
      `,
      [draftId, draft.selectedPlan, getCreditsForPlan(draft.selectedPlan), JSON.stringify(draft)],
    );
  };

  const getCreditsForPlan = (planKey: string) => {
    const normalizedPlan = normalizePlanKey(planKey);
    if (normalizedPlan === "family-5") {
      return 5;
    }

    if (normalizedPlan === "benefit-10") {
      return 10;
    }

    return 1;
  };

  const normalizePlanKey = (planKey: string) => {
    if (planKey === "family-5" || planKey === "benefit-10") {
      return planKey;
    }

    return "single";
  };

  const getPlanConfig = (planKey: string): PaymentPlanConfig => {
    const normalizedPlan = normalizePlanKey(planKey);
    const baseVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID?.trim() || process.env.VITE_LEMON_SQUEEZY_VARIANT_ID?.trim() || null;
    const singleVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID_SINGLE?.trim() || baseVariantId;
    const familyVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID_FAMILY_5?.trim() || baseVariantId;
    const benefitVariantId = process.env.LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10?.trim() || baseVariantId;

    if (normalizedPlan === "family-5") {
      return { key: normalizedPlan, credits: 5, variantId: familyVariantId };
    }

    if (normalizedPlan === "benefit-10") {
      return { key: normalizedPlan, credits: 10, variantId: benefitVariantId };
    }

    return { key: "single", credits: 1, variantId: singleVariantId };
  };

  const applySuccessfulPayment = async (draftId: string, orderId: string) => {
    await ensurePaymentDraftSchema();
    await ensureCustomerCreditsSchema();
    const db = requirePaymentDraftsDb();
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      const draftResult = await client.query<PaymentDraftRow>(
        `
          SELECT
            draft_id,
            status,
            selected_plan,
            credits_granted,
            credits_recorded_at,
            draft_data,
            lemon_order_id,
            forwarded_postcard_id,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            paid_at::text AS paid_at,
            forwarded_at::text AS forwarded_at
          FROM payment_drafts
          WHERE draft_id = $1
          FOR UPDATE
        `,
        [draftId],
      );

      const row = draftResult.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      const shouldCredit = !row.credits_recorded_at;
      if (row.status !== "paid" || row.lemon_order_id !== orderId || shouldCredit) {
        await client.query(
          `
            UPDATE payment_drafts
            SET status = 'paid',
                lemon_order_id = $2,
                paid_at = COALESCE(paid_at, NOW()),
                credits_recorded_at = COALESCE(credits_recorded_at, NOW()),
                updated_at = NOW()
            WHERE draft_id = $1
          `,
          [draftId, orderId],
        );
      }

      if (shouldCredit) {
        const draftData = typeof row.draft_data === "string" ? JSON.parse(row.draft_data) : row.draft_data;
        const customerEmail = String((draftData as PostcardDraft).customerEmail || "").trim().toLowerCase();
        const creditsToAdd = row.credits_granted || getCreditsForPlan(row.selected_plan);

        if (customerEmail) {
          await client.query(
            `
              INSERT INTO customer_credits (customer_email, credits, updated_at)
              VALUES ($1, $2, NOW())
              ON CONFLICT (customer_email)
              DO UPDATE SET
                credits = customer_credits.credits + EXCLUDED.credits,
                updated_at = NOW()
            `,
            [customerEmail, creditsToAdd],
          );
        }
      }

      const updatedResult = await client.query<PaymentDraftRow>(
        `
          SELECT
            draft_id,
            status,
            selected_plan,
            credits_granted,
            credits_recorded_at,
            draft_data,
            lemon_order_id,
            forwarded_postcard_id,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            paid_at::text AS paid_at,
            forwarded_at::text AS forwarded_at
          FROM payment_drafts
          WHERE draft_id = $1
        `,
        [draftId],
      );

      await client.query("COMMIT");
      return updatedResult.rows[0] ? mapPaymentDraftRow(updatedResult.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

  const markPaymentDraftForwarded = async (draftId: string, forwardedPostcardId: string) => {
    await ensurePaymentDraftSchema();
    const db = requirePaymentDraftsDb();
    await db.query(
      `
        UPDATE payment_drafts
        SET forwarded_postcard_id = $2,
            forwarded_at = COALESCE(forwarded_at, NOW()),
            updated_at = NOW()
        WHERE draft_id = $1
      `,
      [draftId, forwardedPostcardId],
    );
  };

  const getApiBaseUrl = () => {
    const configured = (process.env.API_BASE_URL || process.env.PUBLIC_BASE_URL || "").trim();
    if (configured) {
      return configured.replace(/\/$/, "");
    }

    return process.env.NODE_ENV === "production"
      ? "https://api.foto-post-weltweit.de"
      : "http://localhost:3000";
  };

  const getFrontendBaseUrl = () => {
    const configured = (process.env.FRONTEND_BASE_URL || "").trim();
    if (configured) {
      return configured.replace(/\/$/, "");
    }

    return process.env.NODE_ENV === "production"
      ? "https://foto-post-weltweit.de"
      : "http://localhost:3001";
  };

  const getLemonConfig = () => {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY?.trim() || process.env.VITE_LEMON_SQUEEZY_API_KEY?.trim();
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID?.trim() || process.env.VITE_LEMON_SQUEEZY_STORE_ID?.trim();
    const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID?.trim() || process.env.VITE_LEMON_SQUEEZY_VARIANT_ID?.trim();

    return {
      apiKey,
      storeId,
      variantId,
      testMode: String(process.env.LEMON_SQUEEZY_TEST_MODE || "false").toLowerCase() === "true",
    };
  };

  const getEchtpostConfig = () => {
    const apiKey = process.env.ECHTPOST_API_KEY?.trim();
    const endpoint = (process.env.ECHTPOST_API_URL || "https://api.echtpost.de/v2/cards").trim();
    const motiveId = Number.parseInt(process.env.ECHTPOST_MOTIVE_ID?.trim() || "", 10);

    return {
      apiKey,
      endpoint,
      motiveId: Number.isFinite(motiveId) ? motiveId : null,
    };
  };

  const splitRecipientName = (recipientName: string) => {
    const compactName = recipientName.trim().replace(/\s+/g, " ");
    if (!compactName) {
      return { lastName: "" };
    }

    const nameParts = compactName.split(" ");
    if (nameParts.length < 2) {
      return { lastName: compactName };
    }

    const lastName = nameParts.pop() || compactName;
    const firstName = nameParts.join(" ").trim();
    return { firstName, lastName };
  };

  const extractPostalCodeAndCity = (postalCode?: string, city?: string) => {
    const combinedCity = (city || "").trim();
    const postalFromCity = combinedCity.match(/^(\d{5})\s+(.*)$/);

    const resolvedPostalCode = (postalCode || postalFromCity?.[1] || "").trim();
    const resolvedCity = (postalFromCity?.[2] || combinedCity || "").trim();

    return {
      postalCode: resolvedPostalCode,
      city: resolvedCity,
    };
  };

  const getSmtpConfig = () => {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "587", 10);
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
    const from = process.env.SMTP_FROM?.trim() || user;
    const secure = String(process.env.SMTP_SECURE || (port === 465 ? "true" : "false")).toLowerCase() === "true";

    if (!host || !Number.isFinite(port) || !user || !password || !from) {
      throw new Error("Missing SMTP configuration.");
    }

    return { host, port, user, password, from, secure };
  };

  const resetEmailTemplatePath = path.resolve(process.cwd(), "server/templates/reset-password.html");

  const createResetEmailHtml = (resetLink: string) => {
    try {
      const template = fs.readFileSync(resetEmailTemplatePath, "utf8");
      return template.replaceAll("{{RESET_LINK}}", resetLink);
    } catch {
      return `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0E4B40">
          <h2 style="margin:0 0 12px">Passwort zurücksetzen</h2>
          <p>Du hast ein neues Passwort für Family Post angefordert.</p>
          <p><a href="${resetLink}">Passwort jetzt zurücksetzen</a></p>
          <p style="font-size:12px;color:#4A635C">Falls du das nicht warst, kannst du diese Mail ignorieren.</p>
        </div>
      `;
    }
  };

  const sendPasswordResetMail = async (recipientEmail: string, resetLink: string, requestId: string) => {
    const smtp = getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure,
      authMethod: "LOGIN",
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log(`[auth:${requestId}] SMTP start`, {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      recipientEmail,
    });
    const verification = await transporter.verify();
    console.log(`[auth:${requestId}] SMTP verify ok (${smtp.host}:${smtp.port})`, verification);
    const sendResult = await transporter.sendMail({
      from: smtp.from,
      to: recipientEmail,
      subject: "Family Post Passwort zurücksetzen",
      text: `Du hast ein neues Passwort angefordert. Öffne diesen Link: ${resetLink}`,
      html: createResetEmailHtml(resetLink),
      replyTo: smtp.user,
      headers: {
        "X-Request-ID": requestId,
      },
    });
    console.log(`[auth:${requestId}] SMTP send response`, {
      response: sendResult.response,
      accepted: sendResult.accepted,
      rejected: sendResult.rejected,
      envelope: sendResult.envelope,
      messageId: sendResult.messageId,
    });
  };

  const forwardToEchtpost = async (payload: ForwardedPostcard) => {
    const { apiKey, endpoint, motiveId } = getEchtpostConfig();

    if (!apiKey) {
      throw new Error("Missing ECHTPOST_API_KEY");
    }

    if (!motiveId) {
      throw new Error("Missing ECHTPOST_MOTIVE_ID");
    }

    const { firstName, lastName } = splitRecipientName(payload.recipientName);
    const resolvedLocation = extractPostalCodeAndCity(payload.recipientPostalCode, payload.recipientCity);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const deliverAt = dayOfWeek === 0 || dayOfWeek === 6
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + (dayOfWeek === 6 ? 2 : 1)).toISOString().slice(0, 10)
      : "today";
    const requestBody: EchtpostCardRequest = {
      motive_id: motiveId,
      content: payload.message.replace(/\r\n/g, "\n").trim(),
      deliver_at: deliverAt,
      recipients: [
        {
          ...(firstName ? { first_name: firstName } : {}),
          last_name: lastName || payload.recipientName.trim(),
          street: payload.recipientAddress.trim(),
          zip: resolvedLocation.postalCode,
          city: resolvedLocation.city,
          country_code: "de",
        },
      ],
    };

    console.log("[echtpost] Sending payload:", JSON.stringify(requestBody));

    let upstreamResponse: Response;
    let rawBody = "";

    try {
      upstreamResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      rawBody = await upstreamResponse.text();
    } catch (error: any) {
      console.error("[echtpost] fetch failed", {
        endpoint,
        error: error?.message || error,
        stack: error?.stack,
        requestBody,
      });
      throw error;
    }

    let data: any = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { raw: rawBody };
    }

    if (!upstreamResponse.ok) {
      console.error("[echtpost] upstream rejected submission", {
        endpoint,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        contentType: upstreamResponse.headers.get("content-type"),
        rawBody,
        requestBody,
      });
      const error = new Error(`EchtPost submission failed with status ${upstreamResponse.status}`);
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

  type UserRow = {
    id: string;
    full_name: string;
    email: string;
    password_hash: string;
    salt: string;
    created_at: string;
  };

  const mapUserRow = (row: UserRow): UserRecord => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.salt,
    createdAt: row.created_at,
  });

  const hashPassword = (password: string, salt: string) => {
    return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  };

  const normalizeEmail = (email: string) => email.trim().toLowerCase();

  const getUserByEmail = async (email: string): Promise<UserRecord | null> => {
    await ensureUsersSchema();
    const db = requirePaymentDraftsDb();
    const result = await db.query<UserRow>(
      `SELECT id, full_name, email, password_hash, salt, created_at::text AS created_at FROM app_users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    return row ? mapUserRow(row) : null;
  };

  const createUser = async (fullName: string, email: string, password: string): Promise<UserRecord> => {
    await ensureUsersSchema();
    const db = requirePaymentDraftsDb();
    const salt = crypto.randomBytes(16).toString("hex");
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password, salt);
    await db.query(
      `INSERT INTO app_users (id, full_name, email, password_hash, salt) VALUES ($1, $2, $3, $4, $5)`,
      [id, fullName, email, passwordHash, salt],
    );
    return { id, fullName, email, passwordHash, salt, createdAt: new Date().toISOString() };
  };

  const updateUserPassword = async (email: string, password: string) => {
    await ensureUsersSchema();
    const db = requirePaymentDraftsDb();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    await db.query(`UPDATE app_users SET password_hash = $2, salt = $3 WHERE email = $1`, [email, passwordHash, salt]);
  };

  const createPasswordResetToken = async (email: string) => {
    await ensureUsersSchema();
    const db = requirePaymentDraftsDb();
    const token = crypto.randomUUID();
    await db.query(
      `INSERT INTO password_reset_tokens (token, email, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [token, email],
    );
    return token;
  };

  const consumePasswordResetToken = async (token: string): Promise<{ email: string } | null> => {
    await ensureUsersSchema();
    const db = requirePaymentDraftsDb();
    const result = await db.query<{ email: string; expires_at: string }>(
      `DELETE FROM password_reset_tokens WHERE token = $1 RETURNING email, expires_at::text AS expires_at`,
      [token],
    );
    const row = result.rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return null;
    }
    return { email: row.email };
  };

  app.post("/api/auth/register", async (req, res) => {
    const fullName = String(req.body?.fullName ?? "").trim();
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const password = String(req.body?.password ?? "");

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Bitte Name, E-Mail und Passwort angeben." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." });
    }

    try {
      if (await getUserByEmail(email)) {
        return res.status(409).json({ error: "Diese E-Mail ist bereits registriert." });
      }

      const user = await createUser(fullName, email, password);
      const token = crypto.randomBytes(24).toString("hex");
      return res.status(201).json({
        success: true,
        token,
        user: { id: user.id, fullName: user.fullName, email: user.email },
      });
    } catch (error: any) {
      console.error("[auth:register] failed", error);
      return res.status(500).json({ error: error?.message || "Die Registrierung ist fehlgeschlagen." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ error: "Bitte E-Mail und Passwort angeben." });
    }

    try {
      const user = await getUserByEmail(email);
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
    } catch (error: any) {
      console.error("[auth:login] failed", error);
      return res.status(500).json({ error: error?.message || "Die Anmeldung ist fehlgeschlagen." });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const requestId = String(req.body?.requestId ?? req.header("x-request-id") ?? crypto.randomUUID()).trim();
    if (!email) {
      return res.status(400).json({ error: "Bitte eine E-Mail-Adresse eingeben." });
    }

    console.log(`[auth:${requestId}] forgot-password requested`, { email });

    try {
      const user = await getUserByEmail(email);
      if (!user) {
        console.log(`[auth:${requestId}] forgot-password no user found`);
        return res.status(200).json({
          success: true,
          message: "Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Reset-Link gesendet.",
        });
      }

      const token = await createPasswordResetToken(email);
      const resetLink = `${getFrontendBaseUrl()}/reset-password?token=${token}`;

      await sendPasswordResetMail(email, resetLink, requestId);
      console.log(`[auth:${requestId}] password reset mail sent to ${email}`);
      return res.status(200).json({
        success: true,
        message: "Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Reset-Link gesendet.",
      });
    } catch (error: any) {
      console.error(`[auth:${requestId}] password reset mail failed`, error);
      return res.status(500).json({
        error: error?.message || "Der Reset-Mailversand ist fehlgeschlagen.",
      });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const token = String(req.body?.token ?? "").trim();
    const password = String(req.body?.password ?? "");

    if (!token || !password) {
      return res.status(400).json({ error: "token und password sind erforderlich." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." });
    }

    try {
      const tokenRecord = await consumePasswordResetToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ error: "Der Reset-Link ist ungültig oder abgelaufen." });
      }

      const user = await getUserByEmail(tokenRecord.email);
      if (!user) {
        return res.status(404).json({ error: "Das Konto konnte nicht gefunden werden." });
      }

      await updateUserPassword(tokenRecord.email, password);

      return res.status(200).json({
        success: true,
        message: "Das Passwort wurde erfolgreich zurückgesetzt.",
      });
    } catch (error: any) {
      console.error("[auth:reset-password] failed", error);
      return res.status(500).json({ error: error?.message || "Das Zuruecksetzen ist fehlgeschlagen." });
    }
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
    const { recipientName, recipientAddress, recipientPostalCode, recipientCity, postcardType, message, selectedPlan } = req.body ?? {};
    if (!recipientName || !recipientAddress || !recipientPostalCode || !recipientCity || !message) {
      return res.status(400).json({ error: "recipientName, recipientAddress, recipientPostalCode, recipientCity und message sind erforderlich." });
    }

    try {
      const data = await forwardToEchtpost({
        recipientName,
        recipientAddress,
        recipientPostalCode,
        recipientCity,
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
    if (!config.apiKey || !config.storeId) {
      return res.status(500).json({ error: "Missing Lemon Squeezy configuration." });
    }

    const rawSelectedPlan = String(req.body?.selectedPlan ?? "").trim();
    const normalizedSelectedPlan = normalizePlanKey(rawSelectedPlan || "single");

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

    const planConfig = getPlanConfig(normalizedSelectedPlan);
    if (!planConfig.variantId) {
      return res.status(500).json({ error: `Missing Lemon Squeezy variant configuration for ${normalizedSelectedPlan}.` });
    }

    const draftId = crypto.randomUUID();

    const checkoutRedirectUrl = `${getApiBaseUrl()}/api/payments/complete?draftId=${draftId}&selectedPlan=${encodeURIComponent(planConfig.key)}&order_id=[order_id]&order_key=${draftId}`;

    console.log("[payments:create-checkout] incoming body", {
      rawSelectedPlan,
      normalizedSelectedPlan,
      matchesMapping: rawSelectedPlan === normalizedSelectedPlan,
      recipientCity,
      recipientPostalCode,
      customerEmail: customerEmail || null,
      testMode: config.testMode,
    });

    const draft = {
      imageUrl,
      message,
      recipientName,
      recipientAddress,
      recipientPostalCode,
      recipientCity,
      selectedPlan: planConfig.key,
      promoCode,
      customerEmail,
      customerName,
    };

    console.log("[payments:create-checkout] resolved checkout config", {
      draftId,
      selectedPlan: planConfig.key,
      credits: planConfig.credits,
      variantId: planConfig.variantId,
      redirectUrl: checkoutRedirectUrl,
    });

    try {
      await createPaymentDraft(draftId, draft);

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
                  selected_plan: planConfig.key,
                  credits: String(planConfig.credits),
                },
              },
              product_options: {
                redirect_url: checkoutRedirectUrl,
                enabled_variants: [Number.parseInt(planConfig.variantId, 10)].filter(Number.isFinite),
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
                data: { type: "variants", id: String(planConfig.variantId) },
              },
            },
          },
        }),
      });

      const responseText = await response.text();
      let payload: any = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        payload = { raw: responseText };
      }
      console.log("[payments:create-checkout] lemon response", {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        checkoutId: payload?.data?.id || null,
        checkoutUrl: payload?.data?.attributes?.url || null,
        rawBody: responseText,
      });
      if (!response.ok) {
        await requirePaymentDraftsDb().query("DELETE FROM payment_drafts WHERE draft_id = $1", [draftId]).catch(() => undefined);
        return res.status(response.status).json({ error: "Checkout konnte nicht erstellt werden.", details: payload });
      }

      return res.status(200).json({
        success: true,
        checkoutId: payload?.data?.id,
        checkoutUrl: payload?.data?.attributes?.url,
        draftId,
      });
    } catch (error: any) {
      await requirePaymentDraftsDb().query("DELETE FROM payment_drafts WHERE draft_id = $1", [draftId]).catch(() => undefined);
      return res.status(500).json({ error: error?.message || "Checkout konnte nicht erstellt werden." });
    }
  });

  app.get("/api/payments/complete", async (req, res) => {
    const config = getLemonConfig();
    const draftId = String(req.query.draftId ?? "").trim();
    const orderId = String(req.query.order_id ?? req.query.orderId ?? "").trim();
    const orderKey = String(req.query.order_key ?? req.query.orderKey ?? "").trim();
    const selectedPlanFromQuery = String(req.query.selectedPlan ?? req.query.selected_plan ?? "").trim();

    console.log("[payments:complete] incoming query", {
      query: req.query,
      draftId,
      orderId,
      orderKey,
      selectedPlanFromQuery,
      testMode: config.testMode,
      hasApiKey: Boolean(config.apiKey),
    });

    const redirectToSuccess = (status: "complete" | "processing") =>
      res.redirect(`/order-success?draftId=${encodeURIComponent(draftId)}&status=${status}`);

    if (!draftId || !orderId) {
      console.log("[payments:complete] missing required query params", {
        draftIdPresent: Boolean(draftId),
        orderIdPresent: Boolean(orderId),
        orderKeyPresent: Boolean(orderKey),
      });
      return res.status(400).send("Zahlung konnte nicht verifiziert werden.");
    }

    const draft = await getPaymentDraft(draftId);
    if (!draft) {
      console.log("[payments:complete] draft not found", { draftId, orderId, orderKey });
      return res.status(404).send("Offene Sendung nicht gefunden.");
    }

    console.log("[payments:complete] loaded draft", {
      draftId: draft.draftId,
      status: draft.status,
      selectedPlan: draft.selectedPlan,
      creditsGranted: draft.creditsGranted,
      creditsRecordedAt: draft.creditsRecordedAt,
      lemonOrderId: draft.lemonOrderId,
      forwardedPostcardId: draft.forwardedPostcardId,
      customerEmail: draft.customerEmail || null,
    });

    if (draft.status === "paid" && draft.forwardedPostcardId) {
      console.log("[payments:complete] draft already completed", { draftId, forwardedPostcardId: draft.forwardedPostcardId });
      return redirectToSuccess("complete");
    }

    if (!config.apiKey) {
      console.log("[payments:complete] missing Lemon API key, falling back to processing", { draftId, orderId, orderKey });
      return redirectToSuccess("processing");
    }

    try {
      const lemonOrderUrl = `https://api.lemonsqueezy.com/v1/orders/${orderId}`;
      console.log("[payments:complete] verifying Lemon order", {
        lemonOrderUrl,
        draftId,
        orderId,
        orderKey,
        testMode: config.testMode,
      });

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
      console.log("[payments:complete] Lemon order response", {
        ok: response.ok,
        statusCode: response.status,
        lemonStatus: status,
        testMode: payload?.data?.attributes?.test_mode ?? null,
        orderIdentifier: payload?.data?.attributes?.identifier ?? null,
        firstOrderItemVariantId: payload?.data?.attributes?.first_order_item?.variant_id ?? null,
        firstOrderItemName: payload?.data?.attributes?.first_order_item?.variant_name ?? null,
        responsePayload: payload,
      });
      if (!response.ok || status !== "paid") {
        console.log("[payments:complete] verification failed, redirecting to processing", {
          draftId,
          orderId,
          orderKey,
          responseOk: response.ok,
          lemonStatus: status,
        });
        return redirectToSuccess("processing");
      }

      const updatedDraft = await applySuccessfulPayment(draftId, orderId);
      if (!updatedDraft) {
        console.log("[payments:complete] draft disappeared during payment application", { draftId, orderId, orderKey });
        return redirectToSuccess("processing");
      }

      console.log("[payments:complete] payment applied", {
        draftId,
        orderId,
        orderKey,
        creditsGranted: updatedDraft.creditsGranted,
        selectedPlan: updatedDraft.selectedPlan,
        creditsRecordedAt: updatedDraft.creditsRecordedAt,
        lemonOrderId: updatedDraft.lemonOrderId,
      });

      if (updatedDraft.forwardedPostcardId) {
        console.log("[payments:complete] postcard already forwarded", {
          draftId,
          forwardedPostcardId: updatedDraft.forwardedPostcardId,
        });
        return redirectToSuccess("complete");
      }

      const forwarded = await forwardToEchtpost({
        recipientName: updatedDraft.recipientName,
        recipientAddress: updatedDraft.recipientAddress,
        recipientPostalCode: updatedDraft.recipientPostalCode,
        postcardType: "standard",
        message: updatedDraft.message,
        selectedPlan: updatedDraft.selectedPlan,
        source: "familypost-lemonsqueezy",
        customerEmail: updatedDraft.customerEmail,
        customerName: updatedDraft.customerName,
        recipientCity: `${updatedDraft.recipientPostalCode} ${updatedDraft.recipientCity}`.trim(),
        imageUrl: updatedDraft.imageUrl,
      });

      const forwardedId = String(forwarded?.id || forwarded?.data?.id || draftId);
      await markPaymentDraftForwarded(draftId, forwardedId);
      console.log("[payments:complete] forwarded postcard", {
        draftId,
        forwardedId,
        orderId,
        orderKey,
      });
      sentPostcards.set(forwardedId, {
        id: forwardedId,
        recipientName: updatedDraft.recipientName,
        recipientAddress: updatedDraft.recipientAddress,
        postcardType: "standard",
        message: updatedDraft.message,
        selectedPlan: updatedDraft.selectedPlan,
        source: "familypost-lemonsqueezy",
        customerEmail: updatedDraft.customerEmail,
        customerName: updatedDraft.customerName,
        recipientCity: `${updatedDraft.recipientPostalCode} ${updatedDraft.recipientCity}`.trim(),
        imageUrl: updatedDraft.imageUrl,
        createdAt: new Date().toISOString(),
      });
      console.log("[payments:complete] completed successfully", {
        draftId,
        orderId,
        orderKey,
        forwardedId,
      });
      return redirectToSuccess("complete");
    } catch (error: any) {
      console.error("[payments:complete] verification or forwarding failed", {
        draftId,
        orderId,
        orderKey,
        error: error?.message || error,
        stack: error?.stack,
      });
      return redirectToSuccess("processing");
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  const staticIndexPath = path.join(staticPath, "index.html");
  if (fs.existsSync(staticIndexPath)) {
    app.use(express.static(staticPath));

    // Handle client-side routing - serve index.html for all routes
    app.get("*", (_req, res) => {
      res.sendFile(staticIndexPath);
    });
  }

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
