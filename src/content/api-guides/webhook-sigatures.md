---
title: "Verifying Webhook Signatures"
description: "How to validate Teachable HMAC signatures in Node.js to secure your endpoints."
method: "POST /hooks"
pubDate: 2026-03-09
---
# Catching Webhooks Safely
When Teachable sends a webhook, you need to ensure it actually came from Teachable. Here is how you validate the HMAC signature in your backend:

```javascript
const crypto = require('crypto');

function verifyTeachableWebhook(req, secret) {
  const signature = req.headers['teachable-signature'];
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  return signature === hash;
}