const express = require('express');
const router = express.Router();
const WebhookEvent = require('../models/webhookEvent');
const Project = require('../models/project');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// GET /api/admin/webhook-events?limit=50&status=processed&skip=0&date_from=2025-10-01&date_to=2025-10-21&projectId=...
router.get('/webhook-events', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.projectId) filter['meta.raw.data.object.metadata.projectId'] = req.query.projectId;
    if (req.query.date_from || req.query.date_to) {
      filter.receivedAt = {};
      if (req.query.date_from) filter.receivedAt.$gte = new Date(req.query.date_from);
      if (req.query.date_to) filter.receivedAt.$lte = new Date(req.query.date_to);
    }

    const events = await WebhookEvent.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean();
    const total = await WebhookEvent.countDocuments(filter);
    res.json({ events, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch events' });
  }
});

// POST /api/admin/webhook-events/:eventId/replay
// Replays a stored webhook event by re-processing its raw payload. Protected by admin middleware at mount point.
router.post('/webhook-events/:eventId/replay', async (req, res) => {
  try {
    const evt = await WebhookEvent.findOne({ eventId: req.params.eventId });
    if (!evt) return res.status(404).json({ error: 'Event not found' });

    if (!evt.meta || !evt.meta.raw) return res.status(400).json({ error: 'No raw payload available to replay' });

    // Mark processing
    await WebhookEvent.findOneAndUpdate({ eventId: evt.eventId }, { status: 'processing' });

    const event = evt.meta.raw;

    // Re-run the same logic as webhook handler
    const run = async () => {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(String(session.subscription));
            const projectId = (session.metadata && session.metadata.projectId) || (sub.metadata && sub.metadata.projectId) || session.client_reference_id;
            if (projectId) {
              await Project.findByIdAndUpdate(projectId, {
                stripeSubscriptionId: sub.id,
                stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
                stripeSubscriptionStatus: sub.status,
                stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
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
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
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
    };

    try {
      await run();
      await WebhookEvent.findOneAndUpdate({ eventId: evt.eventId }, { status: 'processed', processedAt: new Date(), errorMessage: '' });
      return res.json({ ok: true });
    } catch (procErr) {
      await WebhookEvent.findOneAndUpdate({ eventId: evt.eventId }, { status: 'failed', errorMessage: procErr && procErr.message });
      return res.status(500).json({ error: procErr.message || 'Failed to replay event' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to replay event' });
  }
});

module.exports = router;
