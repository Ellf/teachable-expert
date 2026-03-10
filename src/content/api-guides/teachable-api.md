---
title: "The Teachable API: Architecture, Limits, and Webhooks"
description: "Everything you need to know about building custom integrations with Teachable. A senior developer's guide to REST endpoints, rate limits, and event-driven data."
method: "GET /v1/users"
pubDate: 2026-03-10
coverImage: "/placeholder.jpg"
category: "architecture"
---

When a course creator outgrows Zapier, they inevitably start asking about the "Teachable API." They want to automatically provision user accounts, sync complex CRM data, and build bespoke dashboards.

However, treating the Teachable API like a traditional SaaS API can lead to brittle architecture and dropped data. To build an enterprise-grade integration, you have to understand the hard limits of their REST endpoints, and when to abandon them entirely in favor of an event-driven webhook gateway.



Here are the technical realities of building on top of Teachable.

### 1. REST API vs. Webhooks (The Architectural Divide)
The biggest mistake developers make is trying to use the REST API to track student progress or sales.

* **The REST API (Pull):** Teachable's API is primarily designed for CRUD (Create, Read, Update, Delete) operations. It is excellent for tasks like querying a specific user's email address, enrolling a student in a course from an external checkout, or fetching a list of active pricing plans.
* **Webhooks (Push):** If you want to know *when* something happens (a refund, a course completion, a failed payment), you must use Webhooks. Polling the REST API every 5 minutes to check for new sales will quickly exhaust your rate limits and result in missed data.

*If you are building an Airtable or CRM sync, read our guide on [Building a Resilient Teachable to Airtable Sync](/api-guides/teachable-airtable-sync) using event-driven webhooks.*

### 2. Authentication: The API Key
Unlike modern OAuth2 flows, Teachable uses a static API key tied to the school owner's account. This key has administrative privileges, meaning it must be treated with absolute zero-trust security.

Never embed this key in front-end code (like React or Vue). All requests to the Teachable API must be routed through a secure, server-side environment (like a Node.js Express server or an AWS Lambda function) where the key is safely stored as an environment variable.

```javascript
// Example: Safely fetching a user from a Node.js backend
const axios = require('axios');

async function getTeachableUser(email) {
  try {
    const response = await axios.get(`https://developers.teachable.com/v1/users?email=${email}`, {
      headers: {
        'Accept': 'application/json',
        'apiKey': process.env.TEACHABLE_API_KEY // Kept secure on the server
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response.status);
  }
}
```

### 3. Rate Limits and Pagination
Teachable strictly enforces rate limits. If your custom application tries to bulk-enroll 1,000 students at once using a basic `for` loop, the API will throw `429 Too Many Requests` errors, and half of your students will be locked out.

Production scripts must implement retry logic with exponential backoff. Furthermore, any endpoint that returns a list (like fetching all users) is paginated. Your architecture must recursively handle `meta.next_page` tokens to ensure complete data retrieval.

### 4. The Webhook Security Flaw
If you choose the event-driven route, you must be aware of Teachable's biggest architectural blind spot: **They do not sign their webhooks.** While platforms like Shopify use HMAC-SHA256 signatures to prove payload authenticity, Teachable webhooks are sent completely "naked." Exposing a public URL to accept Teachable data is a massive security risk.

*To learn how to protect your endpoints from spoofing attacks, read our technical breakdown on [Securing Teachable Webhooks with a Secret Token Gateway](/api-guides/teachable-webhook-security).*

---

### Need a Custom Architecture?
Building a reliable data pipeline for a high-volume Teachable school requires handling rate limits, securing endpoints, and knowing exactly when to use REST vs. Webhooks.

If your team doesn't have the bandwidth to build and maintain this infrastructure, **[let's talk architecture](https://purplehippo.io/contact)**.