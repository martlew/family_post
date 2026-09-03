import express from "express";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Pool } from "pg";
import Stripe from "stripe";
import { createProdigiOrder, renderPostcardBackSvg } from "./prodigi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env"), override: false });

// Persistent (bind-mounted in production, see deploy.sh) storage for uploaded photos so Prodigi
// gets a real https:// URL instead of a data:-URI, which its API rejects outright.
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DATA_URI_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i;

function persistDataUriImage(dataUri: string): string {
  const match = dataUri.match(DATA_URI_IMAGE_REGEX);
  if (!match) {
    throw new Error("Nicht unterstütztes Bildformat (nur PNG/JPEG/WEBP als data:-URI werden akzeptiert).");
  }
  const subtype = match[1].toLowerCase();
  const extension = subtype === "jpeg" ? "jpg" : subtype;
  const buffer = Buffer.from(match[2], "base64");
  const filename = `${crypto.randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

// Prodigi requires a publicly reachable https:// image URL; uploaded photos arrive as data:-URIs
// and must be persisted to disk first. Already-hosted URLs (e.g. the template images) pass through.
function resolveImageUrlForFulfillment(imageUrl: string, apiBaseUrl: string): string {
  const trimmed = (imageUrl || "").trim();
  if (trimmed.toLowerCase().startsWith("data:")) {
    const filename = persistDataUriImage(trimmed);
    return `${apiBaseUrl.replace(/\/$/, "")}/uploads/${filename}`;
  }
  return trimmed;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "365d", immutable: true }));

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

  type PaymentDraftStatus = "pending" | "paid";
  type PaymentPlanKey = "single" | "family-5" | "benefit-10";

  type PaymentPlanConfig = {
    key: PaymentPlanKey;
    credits: number;
    amountInCents: number;
    name: string;
    priceId: string | null;
  };

  type StoredPaymentDraft = PostcardDraft & {
    draftId: string;
    status: PaymentDraftStatus;
    selectedPlan: PaymentPlanKey;
    creditsGranted: number;
    creditsRecordedAt: string | null;
    stripeSessionId: string | null;
    fulfillmentOrderId: string | null;
    fulfillmentStatus: string | null;
    createdAt: string;
    updatedAt: string;
    paidAt: string | null;
  };

  type PaymentDraftRow = {
    draft_id: string;
    status: PaymentDraftStatus;
    selected_plan: PaymentPlanKey;
    credits_granted: number;
    credits_recorded_at: string | null;
    draft_data: Record<string, unknown> | string;
    stripe_session_id: string | null;
    // Production database column names kept as gelato_order_id/gelato_status
    // to avoid DB migration risks; mapped to fulfillmentOrderId/fulfillmentStatus in TypeScript.
    gelato_order_id: string | null;
    gelato_status: string | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
  };

  // deploy.sh/fix_env_and_rebuild.sh fall back to these literal strings when
  // the real secret was never exported, so treat them as "unset" instead of
  // letting them reach Postgres/Stripe and surface as a cryptic
  // failure deep inside a request.
  const isPlaceholderSecret = (value: string) => /^(REPLACE_WITH_|DUMMY_NOT_CONFIGURED)/i.test(value);

  const getDatabaseConfig = () => {
    const connectionString = process.env.DB_URL?.trim();
    if (connectionString) {
      if (isPlaceholderSecret(connectionString)) {
        console.error("[db] DB_URL is still set to a placeholder value; refusing to connect.");
        return null;
      }
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

    if (isPlaceholderSecret(password)) {
      console.error("[db] DB_PASSWORD is still set to a placeholder value; refusing to connect. Set the real Postgres password used by the familypost_db container.");
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

    const pool = new Pool(config);
    // Without this handler, a dropped/failed idle connection (e.g. auth
    // rejected mid-session) throws an unhandled 'error' event and crashes
    // the whole Node process instead of just failing the next query.
    pool.on("error", (err) => {
      console.error("[db] unexpected error on idle client", err?.message || err);
    });
    return pool;
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
          stripe_session_id TEXT,
          -- Kept as gelato_order_id / gelato_status to prevent DB migration risks;
          -- mapped to fulfillmentOrderId / fulfillmentStatus in TypeScript.
          gelato_order_id TEXT,
          gelato_status TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          paid_at TIMESTAMPTZ
        );

        -- payment_drafts predates Stripe and may still have the old lemon_order_id
        -- column on production DBs; left in place (unused) rather than dropped.
        ALTER TABLE payment_drafts ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
        ALTER TABLE payment_drafts ADD COLUMN IF NOT EXISTS gelato_order_id TEXT;
        ALTER TABLE payment_drafts ADD COLUMN IF NOT EXISTS gelato_status TEXT;

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
      stripeSessionId: row.stripe_session_id,
      fulfillmentOrderId: row.gelato_order_id,
      fulfillmentStatus: row.gelato_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
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
          stripe_session_id,
          gelato_order_id,
          gelato_status,
          created_at::text AS created_at,
          updated_at::text AS updated_at,
          paid_at::text AS paid_at
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

  // Fixed EUR prices, matching company/pricing.html; used as the Stripe
  // price_data fallback when no pre-created Stripe Price ID is configured.
  const STRIPE_PLAN_DEFAULTS: Record<PaymentPlanKey, { credits: number; amountInCents: number; name: string }> = {
    single: { credits: 1, amountInCents: 499, name: "Einzelticket (1 Postkarte)" },
    "family-5": { credits: 5, amountInCents: 2199, name: "Family-Paket (5 Postkarten)" },
    "benefit-10": { credits: 10, amountInCents: 3999, name: "Vorteils-Paket (10 Postkarten)" },
  };

  const getPlanConfig = (planKey: string): PaymentPlanConfig => {
    const normalizedPlan = normalizePlanKey(planKey);
    const defaults = STRIPE_PLAN_DEFAULTS[normalizedPlan];

    const priceIdEnvName =
      normalizedPlan === "family-5" ? "STRIPE_PRICE_ID_FAMILY_5" : normalizedPlan === "benefit-10" ? "STRIPE_PRICE_ID_BENEFIT_10" : "STRIPE_PRICE_ID_SINGLE";
    const rawPriceId = process.env[priceIdEnvName]?.trim();
    const priceId = rawPriceId && !isPlaceholderSecret(rawPriceId) ? rawPriceId : null;

    return { key: normalizedPlan, credits: defaults.credits, amountInCents: defaults.amountInCents, name: defaults.name, priceId };
  };

  const applySuccessfulPayment = async (draftId: string, stripeSessionId: string) => {
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
            stripe_session_id,
            gelato_order_id,
            gelato_status,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            paid_at::text AS paid_at
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
      if (row.status !== "paid" || row.stripe_session_id !== stripeSessionId || shouldCredit) {
        await client.query(
          `
            UPDATE payment_drafts
            SET status = 'paid',
                stripe_session_id = $2,
                paid_at = COALESCE(paid_at, NOW()),
                credits_recorded_at = COALESCE(credits_recorded_at, NOW()),
                updated_at = NOW()
            WHERE draft_id = $1
          `,
          [draftId, stripeSessionId],
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
            stripe_session_id,
            gelato_order_id,
            gelato_status,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            paid_at::text AS paid_at
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

  const markPaymentDraftPrintOrder = async (draftId: string, printOrderId: string, printOrderStatus: string) => {
    await ensurePaymentDraftSchema();
    const db = requirePaymentDraftsDb();
    await db.query(
      `
        UPDATE payment_drafts
        SET gelato_order_id = $2,
            gelato_status = $3,
            updated_at = NOW()
        WHERE draft_id = $1
      `,
      [draftId, printOrderId, printOrderStatus],
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

  const getStripeConfig = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!secretKey) {
      console.error("[stripe] STRIPE_SECRET_KEY is not set on this host/container.");
    } else if (isPlaceholderSecret(secretKey)) {
      console.error(`[stripe] STRIPE_SECRET_KEY is still set to a placeholder value ("${secretKey}"). The real value never made it from the host into the container's environment.`);
    }

    return {
      secretKey: secretKey && !isPlaceholderSecret(secretKey) ? secretKey : undefined,
      webhookSecret: webhookSecret && !isPlaceholderSecret(webhookSecret) ? webhookSecret : undefined,
    };
  };

  let stripeClient: Stripe | null = null;
  const getStripeClient = (): Stripe => {
    const config = getStripeConfig();
    if (!config.secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY.");
    }

    if (!stripeClient) {
      stripeClient = new Stripe(config.secretKey);
    }

    return stripeClient;
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

  const getPlanDisplayName = (planKey: PaymentPlanKey) => {
    if (planKey === "family-5") return "Familienpaket (5 Postkarten)";
    if (planKey === "benefit-10") return "Vorteilspaket (10 Postkarten)";
    return "Einzelkarte";
  };

  const createOrderConfirmationEmailHtml = (draft: StoredPaymentDraft) => {
    const planName = getPlanDisplayName(draft.selectedPlan);
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0E4B40">
        <h2 style="margin:0 0 12px">Danke für deine Bestellung bei Family Post!</h2>
        <p>Hallo${draft.customerName ? ` ${draft.customerName}` : ""},</p>
        <p>wir haben deine Zahlung erhalten und deine Postkarte wird jetzt für den Versand vorbereitet.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#4A635C">Paket</td><td>${planName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#4A635C">Empfänger</td><td>${draft.recipientName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#4A635C">Bestellnummer</td><td>${draft.draftId}</td></tr>
        </table>
        <p style="font-size:12px;color:#4A635C">Diese E-Mail ist deine Bestellbestätigung von Family Post. Die Zahlungsquittung erhältst du separat von unserem Zahlungsabwickler Stripe.</p>
      </div>
    `;
  };

  const sendOrderConfirmationMail = async (draft: StoredPaymentDraft, requestId: string) => {
    const recipientEmail = draft.customerEmail?.trim();
    if (!recipientEmail) {
      console.log(`[payments:${requestId}] skipping order confirmation mail, no customerEmail on draft`, { draftId: draft.draftId });
      return;
    }

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

    const sendResult = await transporter.sendMail({
      from: smtp.from,
      to: recipientEmail,
      subject: "Deine Family Post Bestellung ist bestätigt",
      text: `Danke für deine Bestellung bei Family Post! Paket: ${getPlanDisplayName(draft.selectedPlan)}. Bestellnummer: ${draft.draftId}.`,
      html: createOrderConfirmationEmailHtml(draft),
      replyTo: smtp.user,
      headers: {
        "X-Request-ID": requestId,
      },
    });
    console.log(`[payments:${requestId}] order confirmation mail sent`, {
      recipientEmail,
      response: sendResult.response,
      accepted: sendResult.accepted,
      rejected: sendResult.rejected,
      messageId: sendResult.messageId,
    });
  };

  // Shared fulfillment logic invoked both by the Stripe webhook (source of truth)
  // and, as a fallback, by the success_url redirect handler below - idempotent via
  // applySuccessfulPayment's credits_recorded_at/fulfillmentOrderId guards, so it's safe
  // to call twice for the same draft.
  const fulfillPaidDraft = async (draftId: string, stripeSessionId: string, requestId: string) => {
    const updatedDraft = await applySuccessfulPayment(draftId, stripeSessionId);
    if (!updatedDraft) {
      return null;
    }

    console.log(`[payments:${requestId}] payment applied`, {
      draftId,
      stripeSessionId,
      creditsGranted: updatedDraft.creditsGranted,
      selectedPlan: updatedDraft.selectedPlan,
      creditsRecordedAt: updatedDraft.creditsRecordedAt,
    });

    if (!updatedDraft.fulfillmentOrderId) {
      // The payment was already committed as "paid" by applySuccessfulPayment
      // above (its own DB transaction) before we ever call the print partner.
      // A Prodigi outage/bad-credentials failure must not undo that - it's
      // caught separately here and only logged.
      try {
        const apiBaseUrl = getApiBaseUrl();
        const backUrl = apiBaseUrl.startsWith("https://")
          ? `${apiBaseUrl}/api/postcards/${encodeURIComponent(draftId)}/back.svg`
          : undefined;

        const resolvedImageUrl = resolveImageUrlForFulfillment(updatedDraft.imageUrl, apiBaseUrl);
        const prodigiOrder = await createProdigiOrder({
          recipientName: updatedDraft.recipientName,
          recipientAddress: updatedDraft.recipientAddress,
          recipientPostalCode: updatedDraft.recipientPostalCode,
          recipientCity: updatedDraft.recipientCity,
          customerEmail: updatedDraft.customerEmail,
          imageUrl: resolvedImageUrl,
          message: updatedDraft.message,
          backUrl,
        });
        await markPaymentDraftPrintOrder(draftId, prodigiOrder.id, prodigiOrder.status);
        updatedDraft.fulfillmentOrderId = prodigiOrder.id;
        updatedDraft.fulfillmentStatus = prodigiOrder.status;
        console.log(`[payments:${requestId}] Prodigi order created`, { draftId, prodigiOrderId: prodigiOrder.id, prodigiStatus: prodigiOrder.status });
      } catch (prodigiError: any) {
        console.error(`[payments:${requestId}] Prodigi order creation failed after payment was already applied`, {
          draftId,
          error: prodigiError?.message || prodigiError,
          stack: prodigiError?.stack,
        });
      }
    }

    // The customer already paid at this point, so a confirmation mail failure
    // must not block fulfillment - only log it.
    try {
      await sendOrderConfirmationMail(updatedDraft, requestId);
    } catch (mailError: any) {
      console.error(`[payments:${requestId}] order confirmation mail failed`, {
        draftId,
        error: mailError?.message || mailError,
        stack: mailError?.stack,
      });
    }

    return updatedDraft;
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

  // Registered before the generic express.json() body parser below so the
  // raw request body is preserved for Stripe's webhook signature verification
  // (stripe.webhooks.constructEvent requires the exact unparsed bytes).
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripeConfig = getStripeConfig();
    if (!stripeConfig.secretKey || !stripeConfig.webhookSecret) {
      console.error("[payments:webhook] Stripe is not configured (missing STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET).");
      return res.status(500).send("Stripe webhook not configured.");
    }

    const signature = req.headers["stripe-signature"];
    let event: Stripe.Event;
    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(req.body, signature as string, stripeConfig.webhookSecret);
    } catch (error: any) {
      console.error("[payments:webhook] signature verification failed", error?.message || error);
      return res.status(400).send(`Webhook Error: ${error?.message || "invalid signature"}`);
    }

    console.log("[payments:webhook] received event", { type: event.type, id: event.id });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const draftId = session.metadata?.draftId || session.client_reference_id || "";

      if (!draftId) {
        console.error("[payments:webhook] checkout.session.completed is missing draftId metadata", { sessionId: session.id });
        return res.status(200).json({ received: true });
      }

      if (session.payment_status !== "paid") {
        console.log("[payments:webhook] session not paid yet, skipping fulfillment", {
          draftId,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });
        return res.status(200).json({ received: true });
      }

      try {
        const updatedDraft = await fulfillPaidDraft(draftId, session.id, `webhook-${event.id}`);
        if (!updatedDraft) {
          console.error("[payments:webhook] draft not found for session", { draftId, sessionId: session.id });
        }
      } catch (error: any) {
        console.error("[payments:webhook] fulfillment failed", { draftId, sessionId: session.id, error: error?.message || error });
        return res.status(500).json({ error: "Fulfillment failed" });
      }
    }

    return res.status(200).json({ received: true });
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

  app.get("/api/postcards", async (req, res) => {
    const customerEmail = normalizeEmail(String(req.query.customerEmail ?? ""));
    if (!customerEmail) {
      return res.status(400).json({ error: "customerEmail ist erforderlich." });
    }

    try {
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
            stripe_session_id,
            gelato_order_id,
            gelato_status,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            paid_at::text AS paid_at
          FROM payment_drafts
          WHERE status = 'paid' AND draft_data->>'customerEmail' = $1
          ORDER BY paid_at DESC NULLS LAST, updated_at DESC
        `,
        [customerEmail],
      );

      const postcards = result.rows.map((row) => {
        const draft = mapPaymentDraftRow(row);
        return {
          id: draft.draftId,
          imageUrl: draft.imageUrl,
          message: draft.message,
          recipientName: draft.recipientName,
          recipientAddress: draft.recipientAddress,
          recipientCity: `${draft.recipientPostalCode} ${draft.recipientCity}`.trim(),
          fulfillmentOrderId: draft.fulfillmentOrderId,
          fulfillmentStatus: draft.fulfillmentStatus,
          createdAt: draft.paidAt || draft.createdAt,
        };
      });

      return res.status(200).json({ success: true, postcards });
    } catch (error: any) {
      console.error("[postcards:list] failed", error?.message || error);
      return res.status(500).json({ error: "Postkarten konnten nicht geladen werden." });
    }
  });

  app.get("/api/postcards/:id", async (req, res) => {
    const id = String(req.params.id || "");

    try {
      const draft = await getPaymentDraft(id);
      if (draft && draft.status === "paid") {
        return res.status(200).json({
          success: true,
          postcard: {
            id: draft.draftId,
            imageUrl: draft.imageUrl,
            message: draft.message,
            recipientName: draft.recipientName,
            recipientAddress: draft.recipientAddress,
            recipientCity: `${draft.recipientPostalCode} ${draft.recipientCity}`.trim(),
            fulfillmentOrderId: draft.fulfillmentOrderId,
            fulfillmentStatus: draft.fulfillmentStatus,
            createdAt: draft.paidAt || draft.createdAt,
          },
        });
      }
    } catch (error: any) {
      console.error("[postcards:get] draft lookup failed", error?.message || error);
    }

    return res.status(404).json({ error: "Postkarte nicht gefunden." });
  });

  app.get("/api/postcards/:id/back.svg", async (req, res) => {
    const id = String(req.params.id || "").trim();
    try {
      const draft = await getPaymentDraft(id);
      if (draft) {
        const svg = renderPostcardBackSvg({
          message: draft.message,
          recipientName: draft.recipientName,
          recipientAddress: draft.recipientAddress,
          recipientPostalCode: draft.recipientPostalCode,
          recipientCity: draft.recipientCity,
        });
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.status(200).send(svg);
      }
    } catch (error: any) {
      console.error("[postcards:back-svg] generation failed", error?.message || error);
    }
    return res.status(404).send("Not found");
  });

  app.post("/api/checkout", async (req, res) => {
    const { recipientName, recipientAddress, recipientPostalCode, recipientCity, message, imageUrl, customerEmail, country } = req.body ?? {};
    if (!recipientName || !recipientAddress || !recipientPostalCode || !recipientCity || !message || !imageUrl) {
      return res.status(400).json({ error: "recipientName, recipientAddress, recipientPostalCode, recipientCity, imageUrl und message sind erforderlich." });
    }

    try {
      const resolvedImageUrl = resolveImageUrlForFulfillment(imageUrl, getApiBaseUrl());
      const prodigi = await createProdigiOrder({
        recipientName,
        recipientAddress,
        recipientPostalCode,
        recipientCity,
        country,
        customerEmail,
        imageUrl: resolvedImageUrl,
        message,
      });

      return res.status(200).json({
        success: true,
        prodigi: { id: prodigi.id, status: prodigi.status },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Failed to submit to Prodigi", details: error?.details || "Unknown error" });
    }
  });

  app.post("/api/payments/create-checkout", async (req, res) => {
    const stripeConfig = getStripeConfig();

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
      country,
    } = req.body ?? {};

    if (!imageUrl || !message || !recipientName || !recipientAddress || !recipientPostalCode || !recipientCity) {
      return res.status(400).json({ error: "Die Postkartendaten sind unvollständig." });
    }

    const planConfig = getPlanConfig(normalizedSelectedPlan);
    const draftId = crypto.randomUUID();
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

    // Dev-only bypass: skips Stripe AND payment_drafts/customer_credits persistence
    // entirely, and just creates the Prodigi order directly so the Prodigi flow
    // can be tested locally without a live Stripe secret key or a configured database.
    if (process.env.NODE_ENV !== "production" && !stripeConfig.secretKey) {
      console.warn("[payments:create-checkout] Stripe not configured - using dev bypass (Prodigi only, no DB persistence).");
      try {
        // Prodigi needs a publicly fetchable https image - a data:-URI from a local photo upload
        // isn't reachable by Prodigi, so fall back to a public placeholder for dev testing only.
        const DEV_PLACEHOLDER_IMAGE_URL = "https://picsum.photos/1200/800";
        let prodigiImageUrl = imageUrl;
        if (!/^https:\/\//i.test(String(imageUrl || "").trim())) {
          console.warn("[payments:create-checkout] dev bypass: imageUrl is not a public https URL, substituting placeholder", {
            received: String(imageUrl || "").slice(0, 40),
          });
          prodigiImageUrl = DEV_PLACEHOLDER_IMAGE_URL;
        }

        const prodigi = await createProdigiOrder({
          recipientName,
          recipientAddress,
          recipientPostalCode,
          recipientCity,
          country,
          customerEmail,
          imageUrl: prodigiImageUrl,
        });

        return res.status(200).json({
          success: true,
          dev: true,
          draftId,
          prodigi: { id: prodigi.id, status: prodigi.status },
          redirectUrl: `/order-success?draftId=${encodeURIComponent(draftId)}&status=complete&hasEmail=${customerEmail ? "1" : "0"}`,
        });
      } catch (error: any) {
        console.error("[payments:create-checkout] dev bypass failed", {
          message: error?.message || error,
          details: error?.details,
        });
        return res.status(500).json({ error: error?.message || "Dev-Checkout (Prodigi) fehlgeschlagen.", details: error?.details });
      }
    }

    if (!stripeConfig.secretKey) {
      return res.status(500).json({ error: "Missing Stripe configuration." });
    }

    const successUrl = `${getApiBaseUrl()}/api/payments/complete?draftId=${draftId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${getFrontendBaseUrl()}/editor?checkout=cancelled`;

    console.log("[payments:create-checkout] incoming body", {
      rawSelectedPlan,
      normalizedSelectedPlan,
      matchesMapping: rawSelectedPlan === normalizedSelectedPlan,
      recipientCity,
      recipientPostalCode,
      customerEmail: customerEmail || null,
    });

    console.log("[payments:create-checkout] resolved checkout config", {
      draftId,
      selectedPlan: planConfig.key,
      credits: planConfig.credits,
      priceId: planConfig.priceId,
      successUrl,
    });

    try {
      await createPaymentDraft(draftId, draft);

      const stripe = getStripeClient();
      const trimmedPromoCode = String(promoCode || "").trim();

      // Resolve a human-typed promo code to a real Stripe promotion code up front;
      // Stripe rejects setting both `discounts` and `allow_promotion_codes` on the
      // same session, so only fall back to the manual-entry field when no match is found.
      let discounts: Stripe.Checkout.SessionCreateParams["discounts"];
      if (trimmedPromoCode) {
        try {
          const promotionCodes = await stripe.promotionCodes.list({ code: trimmedPromoCode, active: true, limit: 1 });
          const promotionCode = promotionCodes.data[0];
          if (promotionCode) {
            discounts = [{ promotion_code: promotionCode.id }];
          } else {
            console.warn("[payments:create-checkout] promo code not found/active in Stripe, falling back to manual entry field", { promoCode: trimmedPromoCode });
          }
        } catch (promoError: any) {
          console.error("[payments:create-checkout] promo code lookup failed, falling back to manual entry field", promoError?.message || promoError);
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        locale: "de",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail || undefined,
        client_reference_id: draftId,
        metadata: {
          draftId,
          selectedPlan: planConfig.key,
          credits: String(planConfig.credits),
          recipientName: String(recipientName || ""),
          customerName: String(customerName || ""),
        },
        line_items: [
          planConfig.priceId
            ? { price: planConfig.priceId, quantity: 1 }
            : {
                price_data: {
                  currency: "eur",
                  unit_amount: planConfig.amountInCents,
                  product_data: { name: planConfig.name },
                },
                quantity: 1,
              },
        ],
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      });

      console.log("[payments:create-checkout] stripe session created", {
        draftId,
        sessionId: session.id,
        checkoutUrl: session.url,
      });

      return res.status(200).json({
        success: true,
        checkoutId: session.id,
        checkoutUrl: session.url,
        draftId,
      });
    } catch (error: any) {
      await requirePaymentDraftsDb().query("DELETE FROM payment_drafts WHERE draft_id = $1", [draftId]).catch(() => undefined);
      console.error("[payments:create-checkout] failed", error?.message || error);
      return res.status(500).json({ error: "Checkout konnte nicht erstellt werden." });
    }
  });

  app.get("/api/payments/complete", async (req, res) => {
    const stripeConfig = getStripeConfig();
    const draftId = String(req.query.draftId ?? "").trim();
    const sessionId = String(req.query.session_id ?? req.query.sessionId ?? "").trim();

    console.log("[payments:complete] incoming query", {
      query: req.query,
      draftId,
      sessionId,
      hasSecretKey: Boolean(stripeConfig.secretKey),
    });

    if (!draftId) {
      console.log("[payments:complete] missing draftId query param");
      return res.status(400).send("Zahlung konnte nicht verifiziert werden.");
    }

    const draft = await getPaymentDraft(draftId);
    if (!draft) {
      console.log("[payments:complete] draft not found", { draftId, sessionId });
      return res.status(404).send("Offene Sendung nicht gefunden.");
    }

    const redirectToSuccess = (status: "complete" | "processing") =>
      res.redirect(`/order-success?draftId=${encodeURIComponent(draftId)}&status=${status}&hasEmail=${draft.customerEmail ? "1" : "0"}`);

    console.log("[payments:complete] loaded draft", {
      draftId: draft.draftId,
      status: draft.status,
      selectedPlan: draft.selectedPlan,
      creditsGranted: draft.creditsGranted,
      creditsRecordedAt: draft.creditsRecordedAt,
      stripeSessionId: draft.stripeSessionId,
      fulfillmentOrderId: draft.fulfillmentOrderId,
      customerEmail: draft.customerEmail || null,
    });

    if (draft.status === "paid" && draft.fulfillmentOrderId) {
      console.log("[payments:complete] draft already completed", { draftId, fulfillmentOrderId: draft.fulfillmentOrderId });
      return redirectToSuccess("complete");
    }

    // The Stripe webhook (checkout.session.completed) is the source of truth for
    // fulfillment and may have already processed this draft by the time the
    // customer's browser lands here. If it hasn't (webhook delivery delay, no
    // webhook configured locally, etc.), fall back to verifying the session
    // directly via the Stripe API so the customer isn't stuck on "processing"
    // longer than necessary. fulfillPaidDraft is idempotent, so it's safe if
    // the webhook fires before or after this runs.
    if (!sessionId || !stripeConfig.secretKey) {
      console.log("[payments:complete] no session_id or Stripe not configured, waiting on webhook", { draftId, sessionId });
      return redirectToSuccess("processing");
    }

    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      console.log("[payments:complete] Stripe session response", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        sessionDraftId: session.metadata?.draftId ?? null,
      });

      if (session.metadata?.draftId && session.metadata.draftId !== draftId) {
        console.error("[payments:complete] session draftId does not match query draftId, refusing to fulfill", {
          draftId,
          sessionDraftId: session.metadata.draftId,
          sessionId,
        });
        return redirectToSuccess("processing");
      }

      if (session.payment_status !== "paid") {
        console.log("[payments:complete] session not paid yet, redirecting to processing", {
          draftId,
          sessionId,
          paymentStatus: session.payment_status,
        });
        return redirectToSuccess("processing");
      }

      const updatedDraft = await fulfillPaidDraft(draftId, session.id, `complete-${draftId}`);
      if (!updatedDraft) {
        console.log("[payments:complete] draft disappeared during payment application", { draftId, sessionId });
        return redirectToSuccess("processing");
      }

      console.log("[payments:complete] completed successfully", { draftId, sessionId });
      return redirectToSuccess("complete");
    } catch (error: any) {
      console.error("[payments:complete] verification or payment application failed", {
        draftId,
        sessionId,
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
