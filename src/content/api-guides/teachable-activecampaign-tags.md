---
title: "Advanced Teachable Email Syncing: Handling Refunds & Progress Tags"
description: "Why your Zapier email integration is failing your marketing team, and how to build a robust ActiveCampaign or Mailchimp webhook bridge."
method: "POST /webhooks/teachable"
pubDate: 2026-03-09
coverImage: "/placeholder.jpg"
---

Connecting Teachable to ActiveCampaign or Mailchimp via standard automation tools usually works on day one. A student buys a course, and they get added to a list.

But as your course scales, the cracks start to show.

What happens when a student requests a refund? With a basic integration, they stay on your buyer's email list, meaning you might accidentally pitch them an upsell for a product they just returned. What if they complete 50% of the course and you want to trigger a check-in sequence? Standard tools charge premium tier prices to handle this complex, multi-step logic—if they can handle it at all.

### The Developer Solution: Event-Driven Architecture
Teachable's webhooks don't just broadcast new sales; they broadcast *everything*. By building a custom Node.js endpoint, we can listen for specific lifecycle events and map them directly to ActiveCampaign tags.



### The Code: A Smart Webhook Listener

This Express.js snippet demonstrates how to catch Teachable webhooks, verify their authenticity, and apply complex tagging logic to an ActiveCampaign contact based on exactly what the student did.

```javascript
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const TEACHABLE_SECRET = process.env.TEACHABLE_WEBHOOK_SECRET;
const AC_API_URL = process.env.ACTIVECAMPAIGN_URL;
const AC_API_KEY = process.env.ACTIVECAMPAIGN_KEY;

// Middleware to capture the raw body for HMAC validation
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.post('/webhooks/teachable', async (req, res) => {
  const signature = req.headers['teachable-signature'];
  
  // 1. Validate the Teachable Webhook
  const hash = crypto
    .createHmac('sha256', TEACHABLE_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== hash) {
    return res.status(401).send('Invalid signature');
  }

  // Acknowledge receipt immediately to prevent timeouts
  res.status(200).send('Webhook received');

  const eventType = req.body.type;
  const payload = req.body.object;
  const userEmail = payload.user ? payload.user.email : payload.email;

  try {
    // 2. Route the logic based on the Teachable Event
    switch (eventType) {
      case 'Transaction.Created':
        // Student bought a course: Add "Buyer" tag
        await updateActiveCampaignContact(userEmail, { tagId: 101, action: 'add' });
        break;

      case 'Transaction.Refunded':
        // Student refunded: Remove "Buyer" tag, Add "Refunded" tag
        await updateActiveCampaignContact(userEmail, { tagId: 101, action: 'remove' });
        await updateActiveCampaignContact(userEmail, { tagId: 105, action: 'add' });
        break;

      case 'Enrollment.Completed':
        // Student finished the course: Trigger graduation sequence
        await updateActiveCampaignContact(userEmail, { tagId: 202, action: 'add' });
        break;
        
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error('ActiveCampaign sync failed:', error.message);
  }
});

// Helper function to interact with the ActiveCampaign API
async function updateActiveCampaignContact(email, tagData) {
  // Logic to find contact ID by email, then apply/remove the specific tag
  // using standard ActiveCampaign REST API endpoints...
}

app.listen(3000, () => console.log('Teachable-to-ActiveCampaign bridge running'));
```

### Why this architecture wins
Data Integrity: Your email lists stay perfectly in sync with your actual Teachable revenue. If someone refunds, your marketing automation knows instantly.

Granular Targeting: By listening to Enrollment.Percent or Lecture.Completed webhooks, you can build highly specific retargeting campaigns for students who get stuck in week 2 of your cohort.

Cost Efficiency: Running a serverless function costs pennies a month, completely eliminating the need for expensive Zapier paths or Make.com operations.

### Outgrowing your current automation?
If your marketing team is struggling with inaccurate Teachable data in your CRM, [let's talk architecture](https://purplehippo.io/#contact-form) and build a custom sync that actually works.