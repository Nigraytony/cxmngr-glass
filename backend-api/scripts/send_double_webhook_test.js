/*
  Double-send webhook test harness.
  Sends the same signed event twice and validates the second request is skipped by the server (idempotency).

  Usage:
    STRIPE_WEBHOOK_SECRET=<secret> node scripts/send_double_webhook_test.js

  The script prints both responses and exits with code 0 on success, non-zero otherwise.
*/

const crypto = require('crypto');
const http = require('http');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('Please set STRIPE_WEBHOOK_SECRET in the environment to sign the test payload.');
  process.exit(2);
}

const host = process.env.WEBHOOK_HOST || 'localhost';
const port = parseInt(process.env.WEBHOOK_PORT || '4242', 10);
const path = process.env.WEBHOOK_PATH || '/api/stripe/webhook';

function makePayload(idSuffix) {
  return {
    id: `evt_test_double_${idSuffix}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${idSuffix}`,
        object: 'checkout.session',
        subscription: null,
        metadata: {
          projectId: 'test-project-id',
        },
        client_reference_id: 'test-project-id'
      }
    }
  };
}

function signPayload(text) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${text}`;
  const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;
  return header;
}

function postEvent(payload) {
  return new Promise((resolve, reject) => {
    const text = JSON.stringify(payload);
    const header = signPayload(text);

    const options = {
      hostname: host,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': header,
        'Content-Length': Buffer.byteLength(text),
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(text);
    req.end();
  });
}

(async () => {
  try {
    const idSuffix = Date.now();
    const payload = makePayload(idSuffix);

    console.log('Sending first event...');
    const first = await postEvent(payload);
    console.log('First response:', first.statusCode, first.body);

    // small delay to allow server to finish processing and mark processed
    await new Promise(r => setTimeout(r, 500));

    console.log('Sending second (duplicate) event...');
    const second = await postEvent(payload);
    console.log('Second response:', second.statusCode, second.body);

    const skipped = second.body && (second.body.skipped === true || second.body.skipped === 'true');

    if (!skipped) {
      console.error('Double-send test failed: second request was not skipped as expected.');
      process.exit(3);
    }

    console.log('Double-send test succeeded: duplicate event was skipped.');
    process.exit(0);
  } catch (err) {
    console.error('Error running double-send test', err);
    process.exit(4);
  }
})();
