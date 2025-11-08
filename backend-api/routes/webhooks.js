const express = require('express');
const router = express.Router();
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('[startup] Failed to init Stripe (webhooks):', e && e.message);
  }
} else {
  console.warn('[startup] STRIPE_SECRET_KEY not set; webhook processing disabled.');
}
const Project = require('../models/project');
const WebhookEvent = require('../models/webhookEvent');

// Stripe webhook endpoint mounted at /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (!sig) return res.status(400).send('Missing stripe signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).send('Webhook secret not configured');

    const payload = req.rawBody || (req.body ? Buffer.from(JSON.stringify(req.body)) : null);
    if (!payload) return res.status(400).send('Webhook Error: raw body not available');

    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.verify', ok: false, message: err && err.message }));
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : String(err)}`);
  }

  const eventId = event && event.id;
  if (!eventId) {
    console.error(JSON.stringify({ ctx: 'webhook', ok: false, message: 'Event missing id' }));
    return res.status(400).send('Event missing id');
  }

  let wevent = null;
  try {
    wevent = await WebhookEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, type: event.type, receivedAt: new Date(), status: 'processing', meta: { raw: event } } },
      { upsert: true, new: true }
    );
    if (wevent && wevent.status === 'processed') {
      return res.json({ received: true, skipped: true });
    }
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.record', ok: false, message: err && err.message }));
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          const projectId = (session.metadata && session.metadata.projectId) || (sub.metadata && sub.metadata.projectId) || session.client_reference_id;
          if (projectId) {
            const proj = await Project.findById(projectId);
            const incomingTrialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
            let nextTrialEnd = proj && proj.trialEnd ? proj.trialEnd : null;
            if (incomingTrialEnd) {
              nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
            }
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              trialEnd: nextTrialEnd || (proj ? proj.trialEnd : null),
              trialStarted: (proj && (proj.trialStarted || Boolean(sub.trial_end))) ? true : (proj ? proj.trialStarted : false),
              isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const projectId = sub.metadata && sub.metadata.projectId;
        if (projectId) {
          const proj = await Project.findById(projectId);
          const incomingTrialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
          let nextTrialEnd = proj && proj.trialEnd ? proj.trialEnd : null;
          if (incomingTrialEnd) {
            nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
          }
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
            stripeSubscriptionStatus: sub.status,
            stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            trialEnd: nextTrialEnd || (proj ? proj.trialEnd : null),
            trialStarted: (proj && (proj.trialStarted || Boolean(sub.trial_end))) ? true : (proj ? proj.trialStarted : false),
            isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
          });
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(String(subId));
          const projectId = sub.metadata && sub.metadata.projectId;
          if (projectId) {
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const projectId = sub.metadata && sub.metadata.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionStatus: 'canceled',
            isActive: false,
          });
        }
        break;
      }
      default:
        break;
    }

    try {
      await WebhookEvent.findOneAndUpdate({ eventId }, { status: 'processed', processedAt: new Date() });
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markProcessed', ok: false, eventId, message: markErr && markErr.message }));
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.handler', ok: false, eventId, message: err && err.message }));
    try {
      await WebhookEvent.findOneAndUpdate({ eventId }, { status: 'failed', errorMessage: err && err.message });
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markFailed', ok: false, eventId, message: markErr && markErr.message }));
    }
    return res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
