---
title: "Securing Teachable Webhooks: The Secret Token Gateway"
description: "Teachable doesn't cryptographically sign its webhooks. Learn how to protect your server from spoofed API payloads using a secret token gateway."
method: "POST /hooks"
pubDate: 2026-03-10
coverImage: "/placeholder-image.jpg"
category: "security"
---

When you build a custom webhook endpoint to listen for Teachable sales or enrollments, you are opening a door directly to your server.

With enterprise platforms like Shopify or Stripe, that door is guarded by cryptography. They sign every webhook using an HMAC-SHA256 hash, proving mathematically that the payload is authentic.

**Teachable does not do this.** Teachable sends "naked" webhooks. If an attacker discovers your Render or AWS endpoint URL, they can easily forge a POST request claiming they just bought your $5,000 course.



### The Trap: Checking the "Origin" Header
Many developers try to fix this by checking if the request's HTTP header says `Origin: https://teachable.com`.

This is the equivalent of trusting the return address on a forged letter. Anyone with a basic terminal or Postman can manually type that header into their fake request. If your server only checks the envelope, the hacker walks right in.

### The Solution: The Secret Token Gateway
Since Teachable won't give us a cryptographic signature, we use the next best industry standard: a cryptographically secure query parameter. We treat the webhook URL itself as a password.

1. **Generate a Secret:** Create a long, random string (e.g., `sk_live_9a8b7c6d5e4f`) and store it securely in your server's `.env` file.
2. **Configure Teachable:** In your Teachable admin dashboard, append this token to your webhook URL: `https://your-api.com/webhooks/teachable?token=sk_live_9a8b7c6d5e4f`.
3. **Build the Gateway:** Because the request travels over HTTPS, the URL parameters are fully encrypted in transit. Your Node.js server intercepts the request and checks the token before ever reading the payload.

### The Code: Express.js Authentication Middleware

Instead of writing this check inside every single route, we build it as Express middleware. This acts as a bouncer, instantly rejecting unauthorized traffic across your entire application.

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// 1. Define the Gateway Middleware
function requireTeachableToken(req, res, next) {
  const expectedToken = process.env.TEACHABLE_WEBHOOK_TOKEN;
  const providedToken = req.query.token;

  if (!expectedToken) {
    console.error('CRITICAL: Webhook token not configured in environment.');
    return res.status(500).send('Server configuration error');
  }

  // 2. Reject mismatched tokens instantly
  if (providedToken !== expectedToken) {
    console.warn(`Blocked unauthorized webhook attempt from IP: ${req.ip}`);
    return res.status(401).send('Unauthorized: Invalid security token');
  }

  // 3. Token is valid, proceed to the business logic
  next();
}

// Apply the middleware to your Teachable endpoints
app.post('/api/teachable-events', requireTeachableToken, (req, res) => {
  // Acknowledge receipt immediately
  res.status(200).send('Webhook verified and received safely');

  const payload = req.body;
  console.log(`Processing secure, verified event: ${payload.type}`);
  
  // Safe to execute Airtable, ActiveCampaign, or database sync logic here...
});

app.listen(3000, () => console.log('Secure Teachable gateway running'));
```

### Why this architecture is mandatory
* **Protects your Database:** Bad actors cannot corrupt your CRM or Airtable base with forged student data.
* **Saves Compute:** By rejecting bad requests at the middleware level, your server doesn't waste CPU cycles or database read/writes parsing malicious JSON.
* **Prevents Revenue Loss:** It completely locks down automated enrollment systems, ensuring no one gets access to your intellectual property without a verified Teachable transaction.

### Need an enterprise-grade integration?
If your current Teachable automations are relying on unprotected endpoints, **[let's talk architecture](https://purplehippo.io/#contact-form)** to lock down your data pipeline before it gets exploited.