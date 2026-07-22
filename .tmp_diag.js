console.log('length:', process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.length : 'undefined');
const crypto = require('crypto');
console.log('md5:', crypto.createHash('md5').update(process.env.SMTP_PASSWORD || '').digest('hex'));
console.log('SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'undefined');
