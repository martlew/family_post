const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '..', '.env') });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipientName, recipientAddress, postcardType, message, selectedPlan } = req.body || {};
  const apiKey = process.env.ECHTPOST_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ECHTPOST_API_KEY' });
  }

  const payload = {
    recipientName,
    recipientAddress,
    postcardType,
    message,
    selectedPlan,
    source: 'familypost-landingpage'
  };

  try {
    const response = await fetch('https://api.echtpost.example/postcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({ error: 'EchtPost submission failed', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit to EchtPost', details: error.message });
  }
};
