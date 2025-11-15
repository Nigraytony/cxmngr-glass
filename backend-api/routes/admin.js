const express = require('express');
const router = express.Router();
const WebhookEvent = require('../models/webhookEvent');
const Project = require('../models/project');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const User = require('../models/user');
const Template = require('../models/template');
// Project model already required above (used by webhook replay logic)

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

// -- Admin: Users CRUD ----------------------------------------------------
// GET /api/admin/users?limit=50&skip=0&query=email|name
router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const q = String(req.query.q || '').trim().toLowerCase();
    const filter = {};
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean();
    const total = await User.countDocuments(filter);
    res.json({ users, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list users' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

// PATCH /api/admin/users/:id - update allowed fields
router.patch('/users/:id', async (req, res) => {
  try {
    const allowed = ['firstName','lastName','email','role','contact','social_media','projects','stripeCustomerId'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (req.body.password) patch.password = req.body.password;
    const updated = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

// -- Admin: Projects list & edit -----------------------------------------
// GET /api/admin/projects?limit=50&skip=0&q=...
router.get('/projects', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { name: { $regex: q, $options: 'i' } }];
    const list = await Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Project.countDocuments(filter);
    res.json({ projects: list, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list projects' });
  }
});

// GET /api/admin/projects/:id
router.get('/projects/:id', async (req, res) => {
  try {
    const p = await Project.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Project not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch project' });
  }
});

// PATCH /api/admin/projects/:id
router.patch('/projects/:id', async (req, res) => {
  try {
    const allowed = ['title','name','isActive','settings','stripeSubscriptionStatus','stripeCurrentPeriodEnd'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const updated = await Project.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update project' });
  }
});

// -- Admin: Templates CRUD -----------------------------------------------
// GET /api/admin/templates?projectId=...&limit=50
router.get('/templates', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 2000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    const list = await Template.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Template.countDocuments(filter);
    res.json({ templates: list, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list templates' });
  }
});

// POST /api/admin/templates
router.post('/templates', async (req, res) => {
  try {
    const t = new Template(req.body);
    await t.save();
    res.status(201).json(t);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create template' });
  }
});

// PATCH /api/admin/templates/:id
router.patch('/templates/:id', async (req, res) => {
  try {
    const updated = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Template not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update template' });
  }
});

// DELETE /api/admin/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const t = await Template.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete template' });
  }
});

module.exports = router;


