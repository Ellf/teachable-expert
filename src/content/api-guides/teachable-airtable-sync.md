---
title: "Building a Resilient Teachable to Airtable Sync (Why Zapier Breaks)"
description: "Google Sheets and Zapier are too fragile for production revenue data. Learn how to build a bulletproof webhook bridge to Airtable."
method: "POST /webhooks/database"
pubDate: 2026-03-09
coverImage: "/placeholder.jpg"
---

If you run a high-volume Teachable school, you need a database. Most creators start with a Zapier integration that pushes new sales into a Google Sheet.

It works perfectly—until someone on your team renames the "Email" column to "Student Email." Zapier immediately loses the mapping, the integration silently fails, and you lose three days of revenue data before anyone notices.

Google Sheets is a spreadsheet, not a relational database. When you outgrow it, you need to upgrade to Airtable. But instead of relying on fragile no-code mappings, the enterprise solution is to build a direct, schema-validated API bridge.



### The Architecture: Bulletproof Data Flow
By controlling the webhook receiver in Node.js, we can intercept the Teachable payload, format it exactly how our database expects it, and handle API rate limits gracefully.

1. **Catch the Webhook:** Listen for `Transaction.Created` from Teachable.
2. **Transform the Data:** Map Teachable's nested JSON array into a flat Airtable record.
3. **Error Handling:** If Airtable rejects the payload, our server catches the error and triggers a Slack alert, rather than failing silently.

### The Code: Node.js to Airtable API

This snippet demonstrates how to securely catch the Teachable transaction and write it directly to an Airtable base using their official SDK.

```javascript
const express = require('express');
const crypto = require('crypto');
const Airtable = require('airtable');

const app = express();
const TEACHABLE_SECRET = process.env.TEACHABLE_WEBHOOK_SECRET;

// Initialize Airtable Base
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.post('/webhooks/database', async (req, res) => {
  const signature = req.headers['teachable-signature'];
  
  // 1. Validate the Teachable HMAC Signature
  const hash = crypto
    .createHmac('sha256', TEACHABLE_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== hash) {
    return res.status(401).send('Unauthorized webhook payload');
  }

  // Acknowledge receipt immediately
  res.status(200).send('Webhook received');

  const eventType = req.body.type;
  const payload = req.body.object;

  if (eventType === 'Transaction.Created') {
    try {
      // 2. Map Teachable payload to your Airtable Schema
      await base('Student Transactions').create([
        {
          "fields": {
            "Transaction ID": payload.id.toString(),
            "Student Name": payload.user.name,
            "Student Email": payload.user.email,
            "Course Name": payload.course.name,
            "Revenue (USD)": (payload.total / 100), // Convert cents to dollars
            "Purchase Date": payload.created_at
          }
        }
      ]);
      console.log(`Successfully synced transaction ${payload.id} to Airtable`);
      
    } catch (error) {
      // 3. Robust Error Logging (Send to Slack/Sentry in production)
      console.error('Airtable sync failed:', error.message);
    }
  }
});

app.listen(3000, () => console.log('Teachable-Airtable sync running'));
```

### Why this architecture wins
* **Schema Validation:** The API enforces strict field types. If someone tries to put text in your Revenue column, the API rejects it cleanly instead of corrupting your database.
* **Relational Power:** Once the data is in Airtable, you can easily link student records to specific cohorts, automatically calculate Lifetime Value (LTV), and trigger advanced marketing sequences.
* **Total Stability:** No more waking up to broken Zapier paths.

### Ready to build a real database?
If you are tired of patching broken spreadsheets and want a rock-solid data pipeline for your Teachable school, **[let's talk architecture](https://purplehippo.io/#contact-form)**.