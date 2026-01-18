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
const ProjectAddOnPurchase = require('../models/projectAddOnPurchase');
const WebhookEvent = require('../models/webhookEvent');
const Invoice = require('../models/invoice');
const Charge = require('../models/charge');
const plans = require('../config/plans');
const { isObjectId } = require('../middleware/validate');

function getValidProjectId(value) {
  if (!value) return null;
  const s = String(value);
  return isObjectId(s) ? s : null;
}

function getPlanByPriceId(priceId) {
  if (!priceId) return null;
  const list = Array.isArray(plans) ? plans : [];
  return list.find(p => p && p.priceId && String(p.priceId) === String(priceId)) || null;
}

async function markEventStatus(eventId, status, extra = {}) {
  try {
    await WebhookEvent.findOneAndUpdate({ eventId }, { $set: { status, ...extra } });
  } catch (e) {
    console.error(JSON.stringify({ ctx: 'webhook.markStatus', ok: false, eventId, status, message: e && e.message }));
  }
}

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
      {
        $setOnInsert: { eventId, type: event.type, receivedAt: new Date(), status: 'processing', meta: { raw: event } },
        $set: { type: event.type, meta: { raw: event } },
      },
      { upsert: true, new: true }
    );
    if (wevent && wevent.status === 'processed') {
      return res.json({ received: true, skipped: true });
    }
    if (wevent && !wevent.meta) {
      // Ensure raw payload is retained for replay/diagnostics
      try {
        await WebhookEvent.findOneAndUpdate({ eventId }, { $set: { meta: { raw: event } } });
      } catch (e) {
        console.error(JSON.stringify({ ctx: 'webhook.record.meta', ok: false, eventId, message: e && e.message }));
      }
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
          const projectId = getValidProjectId((session.metadata && session.metadata.projectId) || (sub.metadata && sub.metadata.projectId) || session.client_reference_id);
          if (projectId) {
            const proj = await Project.findById(projectId);
            const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null;
            const plan = getPlanByPriceId(priceId);
            const incomingTrialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
            let nextTrialEnd = proj && proj.trialEnd ? proj.trialEnd : null;
            if (incomingTrialEnd) {
              nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
            }
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              trialEnd: nextTrialEnd || (proj ? proj.trialEnd : null),
              trialStarted: (proj && (proj.trialStarted || Boolean(sub.trial_end))) ? true : (proj ? proj.trialStarted : false),
              isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
              ...(plan && plan.key ? { subscriptionTier: String(plan.key) } : {}),
              ...(plan && plan.features ? { subscriptionFeatures: plan.features } : {}),
            });
          }
        } else {
          // One-time payments for add-ons (no subscription).
          const meta = (session && session.metadata) ? session.metadata : {}
          const addonKey = meta && meta.addonKey ? String(meta.addonKey) : null
          const projectId = getValidProjectId(meta && meta.projectId)
          const userId = getValidProjectId(meta && meta.userId)

          if (projectId && addonKey === 'oprWorkshop' && String(session.payment_status || '').toLowerCase() === 'paid') {
            try {
              // Record purchase (idempotent upserts via sparse unique indexes).
              const purchase = {
                projectId,
                addonKey,
                stripeCheckoutSessionId: session.id || null,
                stripePaymentIntentId: session.payment_intent || null,
                amount: session.amount_total || null,
                currency: session.currency || null,
                status: 'paid',
                purchasedBy: userId || null,
                purchasedAt: session.created ? new Date(session.created * 1000) : new Date(),
                raw: session,
              }
              await ProjectAddOnPurchase.findOneAndUpdate(
                {
                  projectId,
                  addonKey,
                  ...(purchase.stripePaymentIntentId ? { stripePaymentIntentId: purchase.stripePaymentIntentId } : { stripeCheckoutSessionId: purchase.stripeCheckoutSessionId }),
                },
                { $set: purchase },
                { upsert: true, new: true }
              )

              // Enable add-on on project.
              await Project.findByIdAndUpdate(projectId, {
                $set: {
                  'addons.oprWorkshop.enabled': true,
                  'addons.oprWorkshop.purchasedAt': purchase.purchasedAt,
                  'addons.oprWorkshop.stripeCheckoutSessionId': purchase.stripeCheckoutSessionId,
                  'addons.oprWorkshop.stripePaymentIntentId': purchase.stripePaymentIntentId,
                },
              })
            } catch (e) {
              console.error(JSON.stringify({ ctx: 'webhook.addon.opr', ok: false, eventId, projectId, message: e && e.message }))
            }
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const projectId = getValidProjectId(sub.metadata && sub.metadata.projectId);
        if (projectId) {
          const proj = await Project.findById(projectId);
          const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null;
          const plan = getPlanByPriceId(priceId);
          const incomingTrialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
          let nextTrialEnd = proj && proj.trialEnd ? proj.trialEnd : null;
          if (incomingTrialEnd) {
            nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
          }
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            stripeSubscriptionStatus: sub.status,
            stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            trialEnd: nextTrialEnd || (proj ? proj.trialEnd : null),
            trialStarted: (proj && (proj.trialStarted || Boolean(sub.trial_end))) ? true : (proj ? proj.trialStarted : false),
            isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
            ...(plan && plan.key ? { subscriptionTier: String(plan.key) } : {}),
            ...(plan && plan.features ? { subscriptionFeatures: plan.features } : {}),
          });
        }
        break;
      }
      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.updated':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // Persist invoice to DB
        try {
          const projectIdFromMeta = getValidProjectId(invoice.metadata && invoice.metadata.projectId);
          const mapped = {
            invoiceId: invoice.id,
            projectId: projectIdFromMeta,
            subscriptionId: invoice.subscription || null,
            customerId: invoice.customer || null,
            amount_due: invoice.amount_due != null ? (invoice.amount_due / 100) : null,
            amount_paid: invoice.amount_paid != null ? (invoice.amount_paid / 100) : null,
            currency: invoice.currency || null,
            status: invoice.status || null,
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            description: invoice.description || (invoice.metadata && invoice.metadata.description) || '',
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
            createdAt: invoice.created ? new Date(invoice.created * 1000) : null,
            metadata: invoice.metadata || {},
            raw: invoice,
          };
          await Invoice.findOneAndUpdate({ invoiceId: invoice.id }, { $set: mapped }, { upsert: true, new: true });
        } catch (invErr) {
          console.error('persist invoice err', invErr);
        }

        // Update project subscription status when payment succeeded
        if (event.type === 'invoice.payment_succeeded') {
          const subId = invoice.subscription;
          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(String(subId));
              const projectId = getValidProjectId(sub.metadata && sub.metadata.projectId);
              if (projectId) {
                const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null;
                const plan = getPlanByPriceId(priceId);
                await Project.findByIdAndUpdate(projectId, {
                  stripeSubscriptionId: sub.id,
                  stripePriceId: priceId,
                  stripeSubscriptionStatus: sub.status,
                  stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                  stripeIsPastDue: false,
                  stripeLastPaymentStatus: 'succeeded',
                  stripeLastInvoiceId: invoice.id,
                  stripeLastInvoiceStatus: invoice.status || null,
                  isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
                  ...(plan && plan.key ? { subscriptionTier: String(plan.key) } : {}),
                  ...(plan && plan.features ? { subscriptionFeatures: plan.features } : {}),
                });
              }
            } catch (e) {
              console.warn('failed to update project from invoice payment_succeeded', e && e.message);
            }
          }
        }
        if (event.type === 'invoice.payment_failed') {
          const subId = invoice.subscription;
          if (subId) {
            try {
              const sub = await stripe.subscriptions.retrieve(String(subId));
              const projectId = getValidProjectId(sub.metadata && sub.metadata.projectId);
              if (projectId) {
                const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null;
                const plan = getPlanByPriceId(priceId);
                await Project.findByIdAndUpdate(projectId, {
                  stripeSubscriptionId: sub.id,
                  stripePriceId: priceId,
                  stripeSubscriptionStatus: sub.status,
                  stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                  stripeIsPastDue: true,
                  stripeLastPaymentStatus: 'failed',
                  stripeLastInvoiceId: invoice.id,
                  stripeLastInvoiceStatus: invoice.status || null,
                  isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
                  ...(plan && plan.key ? { subscriptionTier: String(plan.key) } : {}),
                  ...(plan && plan.features ? { subscriptionFeatures: plan.features } : {}),
                });
              }
            } catch (e) {
              console.warn('failed to update project from invoice payment_failed', e && e.message);
            }
          }
        }
        break;
      }
      case 'charge.succeeded':
      case 'charge.failed': {
        const charge = event.data.object;
        try {
          // Try to determine projectId from charge metadata or linked invoice.
          // Prefer a lookup in our Invoice DB first (cheaper, avoids Stripe API calls),
          // then fall back to checking the Charge metadata and finally Stripe invoice metadata.
          let projectId = getValidProjectId(charge.metadata && charge.metadata.projectId);
          if (!projectId && charge.invoice) {
            try {
              const invDoc = await Invoice.findOne({ invoiceId: String(charge.invoice) }).lean();
              if (invDoc && invDoc.projectId) {
                projectId = getValidProjectId(invDoc.projectId);
              }
            } catch (e) {
              // ignore DB lookup errors and continue to fallback
            }
          }

          if (!projectId && charge.invoice) {
            // fallback to Stripe invoice metadata if DB didn't have it
            try {
              const inv = await stripe.invoices.retrieve(String(charge.invoice));
              if (inv && inv.metadata && inv.metadata.projectId) projectId = getValidProjectId(inv.metadata.projectId);
            } catch (e) {
              // ignore invoice retrieval errors
            }
          }

          const mapped = {
            chargeId: charge.id,
            invoiceId: charge.invoice || null,
            projectId: projectId,
            customerId: charge.customer || null,
            amount: charge.amount != null ? (charge.amount / 100) : null,
            currency: charge.currency || null,
            status: charge.status || null,
            payment_method_details: charge.payment_method_details || {},
            createdAt: charge.created ? new Date(charge.created * 1000) : null,
            metadata: charge.metadata || {},
            raw: charge,
          };
          await Charge.findOneAndUpdate({ chargeId: charge.id }, { $set: mapped }, { upsert: true, new: true });
        } catch (chErr) {
          console.error('persist charge err', chErr);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const projectId = getValidProjectId(sub.metadata && sub.metadata.projectId);
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
      await WebhookEvent.findOneAndUpdate({ eventId }, { status: 'processed', processedAt: new Date(), errorMessage: null });
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markProcessed', ok: false, eventId, message: markErr && markErr.message }));
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.handler', ok: false, eventId, message: err && err.message }));
    try {
      await WebhookEvent.findOneAndUpdate(
        { eventId },
        {
          status: 'failed',
          errorMessage: err && err.message ? String(err.message).slice(0, 500) : 'error',
          lastError: { message: err && err.message, stack: err && err.stack },
          processedAt: new Date(),
        }
      );
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markFailed', ok: false, eventId, message: markErr && markErr.message }));
    }
    return res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
