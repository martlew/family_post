const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '..', '.env') });

const MYPOSTCARD_PRODUCT_CODE = 'J9GCU';

async function getMyPostcardAuthToken(baseUrl, apiKey, username, password) {
  const response = await fetch(`${baseUrl}/api/v1/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: apiKey, username, password })
  });

  const responseBody = await response.text();
  let data = {};

  try {
    data = responseBody ? JSON.parse(responseBody) : {};
  } catch {
    data = { raw: responseBody };
  }

  if (!response.ok || !data.auth_token) {
    console.error('MyPostcard auth error:', {
      status: response.status,
      body: responseBody
    });
    throw new Error(`MyPostcard-Authentifizierung fehlgeschlagen (${response.status}): ${JSON.stringify(data)}`);
  }

  return data.auth_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientName, recipientAddress, message, imageUrl } = req.body || {};
  const apiKey = process.env.MYPOSTCARD_API_KEY;
  const username = process.env.MYPOSTCARD_USERNAME;
  const password = process.env.MYPOSTCARD_PASSWORD;
  const campaignId = process.env.MYPOSTCARD_CAMPAIGN_ID;
  const baseUrl = process.env.MYPOSTCARD_API_BASE_URL || 'https://www.mypostcard.com';

  if (!apiKey || !username || !password) {
    return res.status(500).json({ error: 'Missing MYPOSTCARD_API_KEY, MYPOSTCARD_USERNAME or MYPOSTCARD_PASSWORD' });
  }

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl' });
  }

  try {
    const authToken = await getMyPostcardAuthToken(baseUrl, apiKey, username, password);

    // place_order requires api_key + auth_token in the body, not just the Bearer header (see MyPostcard Postman collection).
    const payload = {
      api_key: apiKey,
      auth_token: authToken,
      product_code: MYPOSTCARD_PRODUCT_CODE,
      message,
      image_url: imageUrl,
      recipient: {
        last_name: recipientName,
        street: recipientAddress
      },
      ...(campaignId ? { campaign_id: campaignId } : {})
    };

    // MyPostcard's Postman collection expects place_order as multipart/form-data,
    // not JSON - nested recipient fields use PHP-style bracket notation.
    const formData = new FormData();
    formData.append('api_key', payload.api_key);
    formData.append('auth_token', payload.auth_token);
    formData.append('product_code', payload.product_code);
    formData.append('message', payload.message);
    formData.append('image_url', payload.image_url);
    Object.entries(payload.recipient).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(`recipient[${key}]`, String(value));
      }
    });
    if (payload.campaign_id) {
      formData.append('campaign_id', payload.campaign_id);
    }

    const response = await fetch(`${baseUrl}/api/v1/place_order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const responseBody = await response.text();
    let data = {};

    try {
      data = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      data = { raw: responseBody };
    }

    if (!response.ok || data.success === false) {
      console.error('MyPostcard submission error:', {
        status: response.status,
        body: responseBody
      });
      return res.status(response.status).json({ error: 'MyPostcard submission failed', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit to MyPostcard', details: error.message });
  }
};
