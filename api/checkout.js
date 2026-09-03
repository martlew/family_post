const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '..', '.env') });

// Prodigi A6 postcard SKU (global shipping).
const PRODIGI_SKU = 'GLOBAL-POST-A6';

function extractPostalCodeAndCity(postalCode, city) {
  const combinedCity = (city || '').trim();
  const postalFromCity = combinedCity.match(/^(\d{5})\s+(.*)$/);

  const resolvedPostalCode = (postalCode || postalFromCity?.[1] || '').trim();
  const resolvedCity = (postalFromCity?.[2] || combinedCity || '').trim();

  return { postalCode: resolvedPostalCode, city: resolvedCity };
}

async function createProdigiOrder({ recipientName, recipientAddress, recipientPostalCode, recipientCity, country, customerEmail, imageUrl }) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing PRODIGI_API_KEY');
  }
  if (!imageUrl) {
    throw new Error('Missing imageUrl for Prodigi order');
  }

  const resolvedLocation = extractPostalCodeAndCity(recipientPostalCode, recipientCity);

  const rawCountry = (country || '').trim();
  let countryCode = 'DE';
  if (rawCountry && /^[a-z]{2}$/i.test(rawCountry)) {
    countryCode = rawCountry.toUpperCase();
  }

  const merchantReference = `familypost-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Prodigi endpoint: sandbox when PRODIGI_ENV=sandbox, otherwise production.
  const isSandbox = (process.env.PRODIGI_ENV || '').trim().toLowerCase() === 'sandbox';
  const endpoint = isSandbox
    ? 'https://api.sandbox.prodigi.com/v4.0/orders'
    : 'https://api.prodigi.com/v4.0/orders';

  const requestBody = {
    merchantReference,
    shippingMethod: 'Standard',
    recipient: {
      name: (recipientName || '').trim(),
      ...(customerEmail ? { email: customerEmail.trim() } : {}),
      address: {
        line1: (recipientAddress || '').trim(),
        town: resolvedLocation.city,
        postcode: resolvedLocation.postalCode,
        countryCode,
      },
    },
    items: [
      {
        merchantReference: 'item-001',
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: 'fillPrintArea',
        assets: [
          { printArea: 'front', url: imageUrl },
        ],
      },
    ],
  };

  console.log('[prodigi] creating order:', { endpoint, merchantReference, sandbox: isSandbox });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'User-Agent': 'FamilyPost/1.0',
    },
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.text();
  let data = {};
  try {
    data = responseBody ? JSON.parse(responseBody) : {};
  } catch {
    data = { raw: responseBody };
  }

  if (!response.ok) {
    console.error('[prodigi] order error:', { status: response.status, body: responseBody });
    const error = new Error(`Prodigi order creation failed with status ${response.status}`);
    error.details = data;
    throw error;
  }

  // Prodigi response: { outcome: "Created", order: { id: "ord_...", status: { stage: "..." } } }
  const orderId = String(data?.order?.id || data?.id || '');
  const status = String(data?.order?.status?.stage || data?.outcome || 'unknown');
  console.log('[prodigi] order created:', { merchantReference, orderId, status, sandbox: isSandbox });

  return { id: orderId, status, raw: data };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientName, recipientAddress, recipientPostalCode, recipientCity, imageUrl, country, customerEmail } = req.body || {};

  if (!recipientName || !recipientAddress || !recipientPostalCode || !recipientCity || !imageUrl) {
    return res.status(400).json({ error: 'recipientName, recipientAddress, recipientPostalCode, recipientCity und imageUrl sind erforderlich.' });
  }

  try {
    const prodigi = await createProdigiOrder({
      recipientName,
      recipientAddress,
      recipientPostalCode,
      recipientCity,
      country,
      customerEmail,
      imageUrl,
    });

    return res.status(200).json({
      success: true,
      prodigi: { id: prodigi.id, status: prodigi.status },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit to Prodigi', details: error.message });
  }
};

