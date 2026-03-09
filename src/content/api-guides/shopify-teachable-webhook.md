---
title: "Bypass Zapier: Connect Shopify Orders to Teachable via Webhooks"
description: "Stop paying for Zapier Premium. Learn how to build a custom Node.js webhook to automatically enroll Shopify customers into Teachable courses."
method: "POST /webhooks/shopify"
pubDate: 2026-03-09
coverImage: "/placeholder.jpg"
---

Selling physical products alongside digital courses is a massive revenue driver, but connecting Shopify to Teachable usually forces you into Zapier's expensive "Premium" tier.

When you rely on Zapier, you introduce a fragile middleman. If a Shopify order payload changes, or if you want to bundle three courses with one physical product, the Zap breaks or becomes impossibly complex.

The developer solution is to build a direct, serverless webhook bridge.



### The Architecture Breakdown
Instead of polling for new orders, we let Shopify push the data to us the second a checkout completes.

1. **Shopify Webhook:** Fires a payload to our custom endpoint on `orders/create`.
2. **Security Verification:** Our server validates the Shopify HMAC signature to prevent spoofing.
3. **Data Transformation:** We extract the customer's email and the SKU they purchased.
4. **Teachable API:** We hit Teachable's `/users` endpoint to create the account, and the `/enrollments` endpoint to grant access to the matching course.

### The Code: Express.js Webhook Handler

This Node.js snippet demonstrates how to securely catch the Shopify order and push the customer into a Teachable course.

```javascript
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const TEACHABLE_API_KEY = process.env.TEACHABLE_API_KEY;

// We need the raw body to verify Shopify's HMAC signature
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/webhooks/shopify', async (req, res) => {
  const hmac = req.header('X-Shopify-Hmac-Sha256');
  
  // 1. Verify the request actually came from Shopify
  const hash = crypto
    .createHmac('sha256', SHOPIFY_SECRET)
    .update(req.rawBody, 'utf8', 'hex')
    .digest('base64');

  if (hash !== hmac) {
    console.error('Webhook signature verification failed.');
    return res.status(401).send('Unauthorized');
  }

  // 2. Respond to Shopify immediately (they expect a 200 OK within 5 seconds)
  res.status(200).send('Webhook received');

  // 3. Process the order asynchronously
  const order = req.body;
  const customerEmail = order.customer.email;
  const customerName = order.customer.first_name;
  
  // Example logic: Map a Shopify SKU to a Teachable Course ID
  const skuToCourseMap = {
    'PRO-CAMERA-BUNDLE': 123456, 
  };

  try {
    for (const item of order.line_items) {
      const courseId = skuToCourseMap[item.sku];
      
      if (courseId) {
        // Step 4: Call the Teachable API to enroll the user
        await axios.post(`https://developers.teachable.com/v1/courses/${courseId}/enrollments`, {
          email: customerEmail,
          name: customerName
        }, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apiKey': TEACHABLE_API_KEY
          }
        });
        
        console.log(`Successfully enrolled ${customerEmail} in course ${courseId}`);
      }
    }
  } catch (error) {
    console.error('Failed to sync with Teachable API:', error.response?.data || error.message);
  }
});

app.listen(3000, () => console.log('Shopify-Teachable bridge running on port 3000'));
```

### Why this beats No-Code
By controlling the raw code, you gain total flexibility. You can easily add logic to check if a customer already exists, assign specific Teachable pricing plans, or trigger an internal Slack alert if the API call fails—things that would cost hundreds of dollars a month to run on enterprise automation platforms.

### Need a Custom Integration?
If you are scaling a Shopify store and need bulletproof sync logic between your physical inventory and Teachable courses, [let's talk architecture](https://purplehippo.io/#contact-form).