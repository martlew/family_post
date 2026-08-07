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

  const { recipientName, recipientAddress, recipientPostalCode, recipientCity, message, imageUrl } = req.body || {};
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

    // job_data must be sent as a JSON *string* field, not individual fields (see MyPostcard Postman collection).
    const jobData = {
      job_details: {
        fontName: 'StoneHandwriting',
        text: message,
        textColor: 'blue',
        fontSize: 'L'
      },
      recipients: [{
        recipientName,
        addressLine1: recipientAddress,
        city: recipientCity,
        zip: recipientPostalCode,
        country: 'Deutschland',
        countryiso: 'DE'
      }]
    };

    // MyPostcard's Postman collection expects the postcard image as a real uploaded
    // file field ("photo"), not a URL string, plus a separate "image_type" field.
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download postcard image for MyPostcard upload (${imageResponse.status})`);
    }
    const imageContentType = imageResponse.headers.get('content-type') || '';
    const imageType = imageContentType.includes('png') || imageUrl.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const photoBlob = await imageResponse.blob();

    const formData = new FormData();
    formData.append('api_key', apiKey);
    formData.append('auth_token', authToken);
    formData.append('product_code', MYPOSTCARD_PRODUCT_CODE);
    formData.append('job_data', JSON.stringify(jobData));
    formData.append('photo', photoBlob, `postcard.${imageType}`);
    formData.append('image_type', imageType);
    if (campaignId) {
      formData.append('campaign_id', campaignId);
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
