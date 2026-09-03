import crypto from "crypto";

export type ProdigiOrderPayload = {
  recipientName: string;
  recipientAddress: string;
  recipientPostalCode: string;
  recipientCity: string;
  country?: string;
  customerEmail?: string;
  imageUrl: string;
  backUrl?: string;
  message?: string;
  sku?: string;
};

export type ProdigiOrderResult = {
  id: string;
  status: string;
  raw: unknown;
};

export const DEFAULT_PRODIGI_SKU = "GLOBAL-POST-A6";
export const FALLBACK_PRODIGI_SKU = "POST-A6";

export function isPlaceholderSecret(value: string): boolean {
  return /^(REPLACE_WITH_|DUMMY_NOT_CONFIGURED)/i.test(value);
}

export function extractPostalCodeAndCity(postalCode?: string, city?: string) {
  const combinedCity = (city || "").trim();
  const postalFromCity = combinedCity.match(/^(\d{5})\s+(.*)$/);

  const resolvedPostalCode = (postalCode || postalFromCity?.[1] || "").trim();
  const resolvedCity = (postalFromCity?.[2] || combinedCity || "").trim();

  return {
    postalCode: resolvedPostalCode,
    city: resolvedCity,
  };
}

export function getProdigiConfig() {
  const apiKey = process.env.PRODIGI_API_KEY?.trim();
  const env = (process.env.PRODIGI_ENV || "").trim().toLowerCase();
  const isSandbox = env === "sandbox";
  const endpoint = isSandbox
    ? "https://api.sandbox.prodigi.com/v4.0/orders"
    : "https://api.prodigi.com/v4.0/orders";

  const sku = (process.env.PRODIGI_SKU || "").trim() || DEFAULT_PRODIGI_SKU;

  return {
    apiKey: apiKey && !isPlaceholderSecret(apiKey) ? apiKey : undefined,
    env,
    isSandbox,
    endpoint,
    sku,
  };
}

export function renderPostcardBackSvg(data: {
  message?: string;
  recipientName: string;
  recipientAddress: string;
  recipientPostalCode: string;
  recipientCity: string;
}): string {
  const escapeXml = (unsafe?: string) =>
    (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const messageLines = (data.message || "")
    .split("\n")
    .slice(0, 18)
    .map((line, idx) => {
      const y = 200 + idx * 38;
      return `<tspan x="100" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const name = escapeXml(data.recipientName);
  const street = escapeXml(data.recipientAddress);
  const cityLine = escapeXml(`${data.recipientPostalCode} ${data.recipientCity}`.trim());

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1748 1240" width="1748" height="1240">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .divider { stroke: #cbd5e1; stroke-width: 3; stroke-dasharray: 8 6; }
      .line { stroke: #cbd5e1; stroke-width: 2; }
      .stamp-box { fill: #ecfdf5; stroke: #0f766e; stroke-width: 2; stroke-dasharray: 6 4; rx: 8; }
      .stamp-title { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: bold; fill: #0f766e; text-anchor: middle; }
      .stamp-sub { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; fill: #115e59; text-anchor: middle; }
      .msg-text { font-family: 'Georgia', serif; font-size: 26px; fill: #334155; line-height: 1.5; }
      .addr-text { font-family: 'Georgia', serif; font-size: 30px; fill: #1e293b; font-weight: 500; }
      .addr-label { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; fill: #94a3b8; }
    </style>
  </defs>

  <!-- Background -->
  <rect class="bg" width="1748" height="1240" />

  <!-- Center dashed divider -->
  <line class="divider" x1="874" y1="120" x2="874" y2="1120" />

  <!-- Left: Message Area -->
  <text class="msg-text">
    ${messageLines || '<tspan x="100" y="220" fill="#94a3b8">Deine Nachricht von Family Post</tspan>'}
  </text>

  <!-- Right Top: Stamp -->
  <g transform="translate(1420, 120)">
    <rect class="stamp-box" width="220" height="260" />
    <text class="stamp-title" x="110" y="125">FAMILY POST</text>
    <text class="stamp-sub" x="110" y="160">Porto bezahlt</text>
    <text class="stamp-sub" x="110" y="190">Weltweit</text>
  </g>

  <!-- Right Bottom: Recipient Address Lines -->
  <!-- Name -->
  <line class="line" x1="970" y1="620" x2="1640" y2="620" />
  <text class="addr-label" x="970" y="570">Empfänger</text>
  <text class="addr-text" x="970" y="610">${name}</text>

  <!-- Street -->
  <line class="line" x1="970" y1="740" x2="1640" y2="740" />
  <text class="addr-label" x="970" y="690">Straße &amp; Hausnummer</text>
  <text class="addr-text" x="970" y="730">${street}</text>

  <!-- PLZ & Ort -->
  <line class="line" x1="970" y1="860" x2="1640" y2="860" />
  <text class="addr-label" x="970" y="810">PLZ &amp; Ort</text>
  <text class="addr-text" x="970" y="850">${cityLine}</text>
</svg>`;
}

export async function createProdigiOrder(payload: ProdigiOrderPayload): Promise<ProdigiOrderResult> {
  const config = getProdigiConfig();
  if (!config.apiKey) {
    throw new Error("Missing PRODIGI_API_KEY");
  }

  const imageUrl = (payload.imageUrl || "").trim();
  if (!imageUrl) {
    throw new Error("Missing imageUrl for Prodigi order");
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error(
      imageUrl.startsWith("data:")
        ? "Prodigi benötigt eine öffentlich erreichbare Bild-URL (https://...). Data-URIs werden nicht direkt unterstützt."
        : `Prodigi benötigt eine öffentlich erreichbare Bild-URL, erhalten: "${imageUrl.slice(0, 80)}"`,
    );
  }

  const resolvedLocation = extractPostalCodeAndCity(payload.recipientPostalCode, payload.recipientCity);
  if (!payload.recipientAddress?.trim() || !resolvedLocation.city || !resolvedLocation.postalCode) {
    throw new Error("Unvollständige Empfängeradresse für Prodigi (Straße, PLZ und Stadt sind Pflichtfelder).");
  }

  const rawCountry = (payload.country || "").trim();
  let countryCode = "DE";
  if (rawCountry) {
    if (/^[a-z]{2}$/i.test(rawCountry)) {
      countryCode = rawCountry.toUpperCase();
    } else {
      console.warn("[prodigi] country is not a valid ISO-2 code, falling back to DE", { received: rawCountry });
    }
  }

  const merchantReference = `familypost-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const sku = payload.sku || config.sku || DEFAULT_PRODIGI_SKU;

  const assets: Array<{ printArea: string; url: string }> = [
    { printArea: "front", url: imageUrl },
  ];

  if (payload.backUrl && /^https?:\/\//i.test(payload.backUrl)) {
    assets.push({ printArea: "back", url: payload.backUrl });
  }

  const requestBody = {
    merchantReference,
    shippingMethod: "Standard",
    recipient: {
      name: (payload.recipientName || "").trim(),
      ...(payload.customerEmail?.trim() ? { email: payload.customerEmail.trim() } : {}),
      address: {
        line1: payload.recipientAddress.trim(),
        town: resolvedLocation.city,
        postcode: resolvedLocation.postalCode,
        countryCode,
      },
    },
    items: [
      {
        merchantReference: "item-001",
        sku,
        copies: 1,
        sizing: "fillPrintArea",
        assets,
      },
    ],
  };

  console.log("[prodigi] creating order", {
    endpoint: config.endpoint,
    merchantReference,
    sandbox: config.isSandbox,
    sku,
    assetCount: assets.length,
  });

  let upstreamResponse: Response;
  let rawBody = "";

  try {
    upstreamResponse = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
        "User-Agent": "FamilyPost/1.0",
      },
      body: JSON.stringify(requestBody),
    });
    rawBody = await upstreamResponse.text();
  } catch (error: any) {
    console.error("[prodigi] fetch failed", {
      endpoint: config.endpoint,
      merchantReference,
      error: error?.message || error,
      stack: error?.stack,
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
    console.error("[prodigi] upstream rejected order", {
      endpoint: config.endpoint,
      merchantReference,
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      requestBody,
      responseBody: data,
    });
    const detailMessage =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.title === "string" && data.title) ||
      (typeof data?.message === "string" && data.message) ||
      (Array.isArray(data?.errors) && data.errors.map((e: any) => e?.message || e).join("; ")) ||
      rawBody ||
      upstreamResponse.statusText;
    const error = new Error(`Prodigi order creation failed (${upstreamResponse.status}): ${detailMessage}`);
    (error as Error & { details?: unknown }).details = data;
    throw error;
  }

  const orderId = String(data?.order?.id || data?.id || "");
  const status = String(data?.order?.status?.stage || data?.outcome || "unknown");

  console.log("[prodigi] order created", { merchantReference, orderId, status, sandbox: config.isSandbox });

  return { id: orderId, status, raw: data };
}
