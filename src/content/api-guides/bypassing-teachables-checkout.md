---
title: "Bypassing Teachable's Checkout: Building a Custom Stripe Flow"
description: "Teachable's native checkout pages are notoriously rigid. Learn how to build a high-converting custom Stripe integration using Node.js and secure webhooks."
method: "POST /v1/enrollments"
pubDate: 2026-03-11
coverImage: "/images/cover/teachable-stripe.jpg"
articleImage: "/images/article/placeholder-image.jpg"
tags: ["security", "webhooks", "node.js"]
category: "architecture"
---

When a course creator is scaling past $1M/year, their marketing team inevitably asks for features that Teachable's native checkout simply cannot handle: complex 1-click upsells, bespoke A/B testing, and fully custom domain funnels.

The standard advice is to use Zapier to connect a third-party cart to Teachable. But during a high-volume launch with hundreds of concurrent buyers, Zapier tasks can get delayed or dropped entirely. The result? Furious customers who paid $1,000 but never received their login credentials.

To build an enterprise-grade sales funnel, you have to decouple the commerce layer from the fulfillment layer. You use **Stripe** to process the money, and the **Teachable API** to deliver the product.



Here is the exact architectural blueprint for a custom, bulletproof Stripe-to-Teachable bridge.

### 1. The Secret Sauce: Stripe Metadata
The biggest challenge in a custom integration is mapping the transaction. When a $500 payment hits your server, how do you know *which* Teachable course to unlock?

Do not hardcode product IDs in your server logic. Instead, use Stripe's `metadata` object. When creating your Payment Links or Stripe Checkout Sessions, inject the exact Teachable Course ID directly into the product's metadata.

```javascript
// Example: Creating a Stripe Checkout Session with Teachable Metadata
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: 'price_1N2b3c...', quantity: 1 }],
  mode: 'payment',
  success_url: 'https://your-domain.com/success',
  metadata: {
    teachable_course_id: '1234567' // The exact course ID to unlock
  }
});
```

### 2. The Secure Webhook Receiver
Unlike Teachable (which sends unsecured webhooks), Stripe cryptographically signs every payload. Your Node.js server must verify this signature before provisioning any intellectual property.

This Express.js middleware catches the `checkout.session.completed` event, proves it actually came from Stripe, and extracts the customer's email and the course ID we hid in the metadata.

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 1. Verify cryptographic authenticity
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Acknowledge receipt immediately
  res.json({received: true});

  // 3. Process successful checkouts
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const studentEmail = session.customer_details.email;
    const courseId = session.metadata.teachable_course_id;

    if (studentEmail && courseId) {
       await provisionTeachableCourse(studentEmail, courseId);
    }
  }
});
```

### 3. The Two-Step Fulfillment Architecture
Teachable's API does not allow you to blindly push an email into a course. You have to orchestrate a two-step identity mapping:
1. Create the user (or fetch their ID if they already exist in your school).
2. Enroll that specific `user_id` into the `course_id`.

```javascript
async function provisionTeachableCourse(email, courseId) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'apiKey': process.env.TEACHABLE_API_KEY // Kept secure on your server
  };

  try {
    let userId;
    
    // STEP 1: Provision the Identity
    const createRes = await fetch('https://developers.teachable.com/v1/users', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ email: email })
    });

    if (createRes.ok) {
      // New user created successfully
      const newUser = await createRes.json();
      userId = newUser.id; 
    } else if (createRes.status === 400) {
      // User already exists. Fetch their profile to get the user_id.
      const searchRes = await fetch(`https://developers.teachable.com/v1/users?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: headers
      });
      const searchData = await searchRes.json();
      userId = searchData.users[0].id; 
    } else {
      throw new Error(`User provisioning failed: ${createRes.status}`);
    }

    // STEP 2: Execute the Enrollment
    const enrollRes = await fetch('https://developers.teachable.com/v1/enroll', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId
      })
    });

    if (!enrollRes.ok) {
       throw new Error(`Enrollment payload failed: ${enrollRes.status}`);
    }
    
    console.log(`Successfully mapped User ${userId} to Course ${courseId}`);
  } catch (error) {
    // Implement standard retry logic or alert your engineering team here
    console.error('Fulfillment Pipeline Failed:', error);
  }
}
```

### Why this architecture is mandatory
By removing Zapier and placing a Node.js middleware between Stripe and Teachable, you achieve:
1. **Zero Data Loss:** If Teachable's API rate-limits you during a launch, your server can hold the data and retry the request automatically.
2. **Infinite Funnel Flexibility:** You can build upsells in React, use custom domains, or integrate with Auth0, all while perfectly controlling the enrollment timing.

If your marketing team's vision is currently blocked by Teachable's checkout limitations, you don't need a new platform—you need a custom pipeline.