/*
  Test script to construct a signed Stripe-like webhook event and POST it to the local webhook endpoint.
  Requires STRIPE_WEBHOOK_SECRET to be set in the environment so the signature header matches what's expected by the server.

  Usage:
    node scripts/send_test_webhook.js

  This script will attempt to POST a simple `checkout.session.completed` event payload to
  http://localhost:4242/api/stripe/webhook using the local STRIPE_WEBHOOK_SECRET to sign it.
*/

const crypto = require('crypto');
const http = require('http');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('Please set STRIPE_WEBHOOK_SECRET in the environment to sign the test payload.');
  process.exit(2);
}

const payload = {
  id: `evt_test_${Date.now()}`,
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: `cs_test_${Date.now()}`,
      object: 'checkout.session',
      subscription: null,
      metadata: {
        projectId: 'test-project-id',
      },
      client_reference_id: 'test-project-id'
    }
  }
};

const text = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${text}`;
const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
const header = `t=${timestamp},v1=${signature}`;

const options = {
  hostname: 'localhost',
  port: 4242,
  path: '/api/stripe/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Stripe-Signature': header,
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY:', chunk);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
});

req.write(text);
req.end();
