const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WebhookEvent = require('../models/webhookEvent');
const Project = require('../models/project');
const Invoice = require('../models/invoice');
const Charge = require('../models/charge');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const User = require('../models/user');
const AdminAudit = require('../models/adminAudit');
const Template = require('../models/template');
const Task = require('../models/task');
const TaskTemplate = require('../models/taskTemplate');
const { sendInviteEmail, sendResetEmail } = require('../utils/mailer');
// Project model already required above (used by webhook replay logic)

function auditAdminAction(actor, actionType, meta = {}) {
  try {
    const entry = new AdminAudit({
      actorUserId: actor && actor._id ? actor._id : null,
      actionType,
      meta,
    });
    return entry.save().catch(() => null);
  } catch (e) {
    return null;
  }
}

async function ensureStripeCustomerForUser(user) {
  if (!stripe) throw new Error('Stripe not configured');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

async function resolveProjectCustomerId(project) {
  // Prefer billing admin
  if (project.billingAdminUserId) {
    const user = await User.findById(project.billingAdminUserId);
    if (user) return user.stripeCustomerId || (await ensureStripeCustomerForUser(user));
  }
  // Fall back to subscription's customer
  if (project.stripeSubscriptionId && stripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
      if (sub && sub.customer) return sub.customer;
    } catch (e) {
      console.warn('[admin.backfill] failed to retrieve subscription', e && e.message);
    }
  }
  return null;
}

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
          const subRef = invoice.subscription;
          if (subRef) {
            // Support either an expanded subscription object (from stored payload)
            // or a subscription id string (in which case we call Stripe).
            let sub = null;
            if (typeof subRef === 'object' && subRef !== null && subRef.metadata) {
              sub = subRef;
            } else {
              try {
                sub = await stripe.subscriptions.retrieve(String(subRef));
              } catch (e) {
                // ignore retrieval errors
              }
            }
            const projectId = sub && sub.metadata && sub.metadata.projectId;
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
        case 'charge.succeeded':
        case 'charge.failed': {
          const charge = event.data.object;
          try {
            // Prefer DB lookup of Invoice for projectId, then fallback to charge metadata and Stripe invoice metadata
            let projectId = charge.metadata && charge.metadata.projectId ? String(charge.metadata.projectId) : null;
            if (!projectId && charge.invoice) {
              try {
                const invDoc = await Invoice.findOne({ invoiceId: String(charge.invoice) }).lean();
                if (invDoc && invDoc.projectId) projectId = String(invDoc.projectId);
              } catch (e) {
                // ignore DB lookup errors
              }
            }
            if (!projectId && charge.invoice) {
              try {
                const inv = await stripe.invoices.retrieve(String(charge.invoice));
                if (inv && inv.metadata && inv.metadata.projectId) projectId = String(inv.metadata.projectId);
              } catch (e) {
                // ignore
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

// POST /api/admin/billing/backfill/:projectId
// Fetch invoices and charges from Stripe for a project and persist to DB.
router.post('/billing/backfill/:projectId', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const customerId = await resolveProjectCustomerId(project);
    if (!customerId && !project.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No customer or subscription available for backfill' });
    }

    let invoiceCount = 0;
    let chargeCount = 0;

    // Invoices (prefer subscription when present)
    const invParams = {
      limit: 100,
    };
    if (project.stripeSubscriptionId) invParams.subscription = project.stripeSubscriptionId;
    else if (customerId) invParams.customer = customerId;
    const invResp = await stripe.invoices.list(invParams);
    const invoices = Array.isArray(invResp.data) ? invResp.data : [];
    for (const inv of invoices) {
      if (inv.metadata && inv.metadata.projectId && String(inv.metadata.projectId) !== String(projectId)) continue;
      const mapped = {
        invoiceId: inv.id,
        projectId: inv.metadata && inv.metadata.projectId ? String(inv.metadata.projectId) : String(projectId),
        subscriptionId: inv.subscription || null,
        customerId: inv.customer || null,
        amount_due: inv.amount_due != null ? (inv.amount_due / 100) : null,
        amount_paid: inv.amount_paid != null ? (inv.amount_paid / 100) : null,
        currency: inv.currency || null,
        status: inv.status || null,
        hosted_invoice_url: inv.hosted_invoice_url || null,
        description: inv.description || (inv.metadata && inv.metadata.description) || '',
        period_start: inv.period_start ? new Date(inv.period_start * 1000) : null,
        period_end: inv.period_end ? new Date(inv.period_end * 1000) : null,
        createdAt: inv.created ? new Date(inv.created * 1000) : null,
        metadata: inv.metadata || {},
        raw: inv,
      };
      await Invoice.findOneAndUpdate({ invoiceId: inv.id }, { $set: mapped }, { upsert: true });
      invoiceCount += 1;
    }

    // Charges (customer-scoped)
    if (customerId) {
      const chargeResp = await stripe.charges.list({ customer: customerId, limit: 100 });
      const charges = Array.isArray(chargeResp.data) ? chargeResp.data : [];
      for (const ch of charges) {
        let projId = ch.metadata && ch.metadata.projectId ? String(ch.metadata.projectId) : null;
        if (!projId && ch.invoice) {
          // Try to map using invoice in DB or invoice metadata
          const invDoc = await Invoice.findOne({ invoiceId: String(ch.invoice) }).lean();
          if (invDoc && invDoc.projectId) projId = String(invDoc.projectId);
          if (!projId) {
            try {
              const inv = await stripe.invoices.retrieve(String(ch.invoice));
              if (inv && inv.metadata && inv.metadata.projectId) projId = String(inv.metadata.projectId);
            } catch (e) {
              // ignore
            }
          }
        }
        if (projId && projId !== String(projectId)) continue;
        const mapped = {
          chargeId: ch.id,
          invoiceId: ch.invoice || null,
          projectId: projId || String(projectId),
          customerId: ch.customer || null,
          amount: ch.amount != null ? (ch.amount / 100) : null,
          currency: ch.currency || null,
          status: ch.status || null,
          payment_method_details: ch.payment_method_details || {},
          createdAt: ch.created ? new Date(ch.created * 1000) : null,
          metadata: ch.metadata || {},
          raw: ch,
        };
        await Charge.findOneAndUpdate({ chargeId: ch.id }, { $set: mapped }, { upsert: true });
        chargeCount += 1;
      }
    }

    await auditAdminAction(req.user, 'billing.backfill', { projectId, invoices: invoiceCount, charges: chargeCount });
    return res.json({ ok: true, invoices: invoiceCount, charges: chargeCount });
  } catch (err) {
    console.error('admin backfill error', err);
    return res.status(500).json({ error: err && err.message ? err.message : 'Backfill failed' });
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

// GET /api/admin/audit?targetUserId=...&limit=50&skip=0
router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const filter = {};
    if (req.query.targetUserId) filter.targetUserId = req.query.targetUserId;
    if (req.query.actionType) filter.actionType = req.query.actionType;

    const entries = await AdminAudit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await AdminAudit.countDocuments(filter);
    res.json({ entries, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

// POST /api/admin/send-test-email
// Sends a test email via configured mailer to verify production deliverability.
router.post('/send-test-email', async (req, res) => {
  try {
    const to = String(req.body.to || req.query.to || '').trim()
    if (!to) return res.status(400).json({ error: 'Missing recipient email' })
    const kind = String(req.body.kind || req.query.kind || 'invite')
    let info
    if (kind === 'reset') {
      info = await sendResetEmail({ to, name: 'Test User', resetUrl: 'https://app.cxma.io/reset' })
    } else {
      info = await sendInviteEmail({ to, inviterName: 'Admin', projectName: 'CXMngr', acceptUrl: 'https://app.cxma.io/accept' })
    }
    await auditAdminAction(req.user, 'email.test.send', { to, kind })
    return res.json({ ok: true, info })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to send test email' })
  }
})

// PATCH /api/admin/users/:id - update allowed fields (supports soft-delete/status)
router.patch('/users/:id', async (req, res) => {
  try {
    const allowed = ['firstName','lastName','email','role','contact','social_media','projects','stripeCustomerId','isActive'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (req.body.password) patch.password = req.body.password;

    // Support explicit deleted boolean or status string for soft-deletes
    if (req.body.deleted !== undefined) {
      patch.deleted = !!req.body.deleted;
      if (patch.deleted) patch.status = 'Deleted';
    }
    if (req.body.status !== undefined) {
      patch.status = String(req.body.status);
      if (patch.status === 'Deleted') patch.deleted = true;
    }

    // Fetch before state so we can include before/after in the audit log
    const before = await User.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'User not found' });

    const updated = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    try {
      // Prepare before/after for audit (redact sensitive fields)
      const beforeSanitized = Object.assign({}, before);
      const afterSanitized = (updated.toObject && typeof updated.toObject === 'function') ? updated.toObject() : JSON.parse(JSON.stringify(updated));
      if (beforeSanitized.password) delete beforeSanitized.password;
      if (afterSanitized.password) delete afterSanitized.password;

      const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null;
      const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null;

      await AdminAudit.create({
        actorId: actorId,
        actorEmail: actorEmail,
        targetUserId: updated._id,
        actionType: 'user.update',
        details: { patch, before: beforeSanitized, after: afterSanitized },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (logErr) { console.error('audit log error', logErr) }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

// POST /api/admin/users - create a new user as an admin (soft-create)
router.post('/users', async (req, res) => {
  try {
    const payload = req.body || {}
    // Basic uniqueness check
    if (!payload.email) return res.status(400).json({ error: 'email is required' })
    const existing = await User.findOne({ email: String(payload.email).trim().toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    // Build minimal user object
    const user = new User({
      avatar: payload.avatar || '',
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      email: payload.email,
      password: payload.password || (Math.random().toString(36).slice(2, 10)),
      role: payload.role || 'user',
      projects: Array.isArray(payload.projects) ? payload.projects : [],
      contact: payload.contact || {},
      social_media: payload.social_media || {},
      deleted: !!payload.deleted,
      status: payload.status || (payload.deleted ? 'Deleted' : 'Active'),
      stripeCustomerId: payload.stripeCustomerId || null,
    })

    // normalize embedded projects
    if (Array.isArray(user.projects)) {
      user.projects = user.projects.map((p) => {
        const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
        const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
        const isDefault = Boolean(typeof p === 'object' && p && p.default)
        return { _id: pid, role, default: isDefault }
      })
    }

    await user.save()
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user))
    if (userObj.password) delete userObj.password
    const hydrated = await hydrateUserProjects(userObj)
    try {
      const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null
      const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null
      await AdminAudit.create({
        actorId: actorId,
        actorEmail: actorEmail,
        targetUserId: user._id,
        actionType: 'user.create',
        details: { created: true, payload: { email: user.email, role: user.role } },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (logErr) { console.error('audit log error', logErr) }
    res.status(201).json({ user: hydrated })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create user' })
  }
})

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

    // Support explicit deleted boolean or status string for soft-deletes
    if (req.body.deleted !== undefined) {
      patch.deleted = !!req.body.deleted;
      if (patch.deleted) {
        patch.status = 'Deleted';
        patch.isActive = false;
      }
    }
    if (req.body.status !== undefined) {
      patch.status = String(req.body.status);
      if (patch.status === 'Deleted') patch.deleted = true;
      if (patch.status === 'Deleted') patch.isActive = false;
    }

    // Fetch before state so we can include before/after in the audit log
    const before = await Project.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Project not found' });

    const updated = await Project.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Project not found' });

    try {
      const beforeSanitized = Object.assign({}, before);
      const afterSanitized = (updated.toObject && typeof updated.toObject === 'function') ? updated.toObject() : JSON.parse(JSON.stringify(updated));

      const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null;
      const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null;

      await AdminAudit.create({
        actorId: actorId,
        actorEmail: actorEmail,
        targetUserId: updated._id,
        actionType: 'project.update',
        details: { patch, before: beforeSanitized, after: afterSanitized },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (logErr) { console.error('audit log error', logErr) }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update project' });
  }
});

    // -- Admin: Tasks CRUD ---------------------------------------------------
    // GET /api/admin/tasks?projectId=...&limit=50&skip=0&q=...&status=...
    router.get('/tasks', async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
        const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
        const q = String(req.query.q || '').trim();
        const filter = {};
        if (req.query.projectId) filter.projectId = req.query.projectId;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.deleted !== undefined) filter.deleted = (String(req.query.deleted) === 'true');
        if (q) {
          filter.$or = [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { notes: { $regex: q, $options: 'i' } },
          ];
        }

        const tasks = await Task.find(filter).sort({ start: -1 }).skip(skip).limit(limit).lean();
        const total = await Task.countDocuments(filter);
        res.json({ tasks, total, skip, limit });
      } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list tasks' });
      }
    });

    // GET /api/admin/tasks/:id - accepts ObjectId or taskId
    router.get('/tasks/:id', async (req, res) => {
      try {
        const id = req.params.id;
        let t = null;
        if (mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(id)) {
          t = await Task.findById(id).lean();
        }
        if (!t) t = await Task.findOne({ taskId: id }).lean();
        if (!t) return res.status(404).json({ error: 'Task not found' });
        res.json(t);
      } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch task' });
      }
    });

    // POST /api/admin/tasks - create a new task
    router.post('/tasks', async (req, res) => {
      try {
        const payload = req.body || {};
        const t = new Task(payload);
        await t.save();
        try {
          const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null;
          const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null;
          await AdminAudit.create({
            actorId,
            actorEmail,
            targetUserId: t._id,
            actionType: 'task.create',
            details: { created: true, payload: { taskId: t.taskId, name: t.name, projectId: t.projectId } },
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
          });
        } catch (logErr) { console.error('audit log error', logErr) }

        res.status(201).json(t);
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create task' });
      }
    });

    // PATCH /api/admin/tasks/:id - update allowed fields (supports soft-delete/status)
    router.patch('/tasks/:id', async (req, res) => {
      try {
        const allowed = ['taskId','wbs','name','description','notes','start','end','duration','percentComplete','status','cost','parentId','dependencies','assignee','tags','activityId','deleted'];
        const patch = {};
        for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

        if (req.body.deleted !== undefined) {
          patch.deleted = !!req.body.deleted;
          if (patch.deleted) patch.status = 'Deleted';
        }
        if (req.body.status !== undefined) {
          patch.status = String(req.body.status);
          if (patch.status === 'Deleted') patch.deleted = true;
        }

        // Fetch before state so we can include before/after in the audit log
        const before = await Task.findById(req.params.id).lean();
        if (!before) return res.status(404).json({ error: 'Task not found' });

        const updated = await Task.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Task not found' });

        try {
          const beforeSanitized = Object.assign({}, before);
          const afterSanitized = (updated.toObject && typeof updated.toObject === 'function') ? updated.toObject() : JSON.parse(JSON.stringify(updated));
          const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null;
          const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null;
          await AdminAudit.create({
            actorId,
            actorEmail,
            targetUserId: updated._id,
            actionType: 'task.update',
            details: { patch, before: beforeSanitized, after: afterSanitized },
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
          })
        } catch (logErr) { console.error('audit log error', logErr) }

        res.json(updated);
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update task' });
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

// -- Admin: Task Templates CRUD ------------------------------------------
// These are global templates used by Premium users to seed project tasks.

// GET /api/admin/task-templates?limit=50&skip=0&q=...&active=true|false
router.get('/task-templates', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500)
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0)
    const q = String(req.query.q || '').trim()
    const filter = {}
    if (req.query.active !== undefined && String(req.query.active).length) {
      filter.isActive = String(req.query.active) === 'true'
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { version: { $regex: q, $options: 'i' } },
      ]
    }
    const total = await TaskTemplate.countDocuments(filter)
    const items = await TaskTemplate.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    res.json({ templates: items, total, skip, limit })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list task templates' })
  }
})

// GET /api/admin/task-templates/:id
router.get('/task-templates/:id', async (req, res) => {
  try {
    const t = await TaskTemplate.findById(req.params.id).lean()
    if (!t) return res.status(404).json({ error: 'Task template not found' })
    res.json(t)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch task template' })
  }
})

// POST /api/admin/task-templates
router.post('/task-templates', async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.name) return res.status(400).json({ error: 'name is required' })
    if (!body.xml) return res.status(400).json({ error: 'xml is required' })
    const t = new TaskTemplate({
      ...body,
      createdByUserId: req.user && req.user._id ? req.user._id : null,
      updatedByUserId: req.user && req.user._id ? req.user._id : null,
    })
    await t.save()
    res.status(201).json(t)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create task template' })
  }
})

// PATCH /api/admin/task-templates/:id
router.patch('/task-templates/:id', async (req, res) => {
  try {
    const patch = { ...(req.body || {}) }
    patch.updatedByUserId = req.user && req.user._id ? req.user._id : null
    const updated = await TaskTemplate.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ error: 'Task template not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update task template' })
  }
})

// DELETE /api/admin/task-templates/:id
router.delete('/task-templates/:id', async (req, res) => {
  try {
    const t = await TaskTemplate.findByIdAndDelete(req.params.id)
    if (!t) return res.status(404).json({ error: 'Task template not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete task template' })
  }
})

// -- Admin: Coupons / Promotion Codes / Credits --------------------------

// GET /api/admin/billing/promotion-codes?limit=50&active=true
router.get('/billing/promotion-codes', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const active = req.query.active !== undefined ? String(req.query.active) === 'true' : undefined;
    const list = await stripe.promotionCodes.list({
      limit,
      active,
      expand: ['data.coupon']
    });
    const items = Array.isArray(list.data) ? list.data.map((pc) => ({
      id: pc.id,
      code: pc.code,
      active: pc.active,
      max_redemptions: pc.max_redemptions,
      times_redeemed: pc.times_redeemed,
      expires_at: pc.expires_at ? new Date(pc.expires_at * 1000) : null,
      coupon: pc.coupon ? {
        id: pc.coupon.id,
        name: pc.coupon.name,
        duration: pc.coupon.duration,
        amount_off: pc.coupon.amount_off != null ? pc.coupon.amount_off / 100 : null,
        percent_off: pc.coupon.percent_off || null,
        currency: pc.coupon.currency || null,
      } : null,
    })) : [];
    res.json({ items });
  } catch (err) {
    console.error('list promotion codes err', err && err.raw ? err.raw : err);
    res.status(500).json({ error: 'Failed to list promotion codes' });
  }
});

// POST /api/admin/billing/promotion-codes
// body: { code, name, amount_off (cents), percent_off, currency, duration='once'|'repeating'|'forever', duration_in_months, max_redemptions, expires_at, applies_to: { products, priceId }, metadata }
router.post('/billing/promotion-codes', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const {
      code,
      name,
      amount_off,
      percent_off,
      currency = 'usd',
      duration = 'once',
      duration_in_months,
      max_redemptions,
      expires_at,
      applies_to,
      metadata,
    } = req.body || {};

    if (!code) return res.status(400).json({ error: 'code is required' });
    if (!amount_off && !percent_off) return res.status(400).json({ error: 'amount_off or percent_off required' });

    const couponParams = {
      name: name || code,
      duration,
      ...(duration === 'repeating' && duration_in_months ? { duration_in_months } : {}),
      ...(amount_off ? { amount_off: Math.round(Number(amount_off)), currency } : {}),
      ...(percent_off ? { percent_off: Number(percent_off) } : {}),
      metadata: metadata || {},
    };
    const coupon = await stripe.coupons.create(couponParams);

    const promoParams = {
      coupon: coupon.id,
      code,
      max_redemptions: max_redemptions ? Number(max_redemptions) : undefined,
      expires_at: expires_at ? Math.floor(new Date(expires_at).getTime() / 1000) : undefined,
      metadata: { ...(metadata || {}), couponId: coupon.id },
    };
    if (applies_to && applies_to.priceId) promoParams['restrictions'] = { price_ids: [applies_to.priceId] };
    if (applies_to && applies_to.products) promoParams['restrictions'] = { products: applies_to.products };

    const promo = await stripe.promotionCodes.create(promoParams);

    try {
      await auditAdminAction(req.user, 'billing.promotion_code.create', { code, couponId: coupon.id, promotionCodeId: promo.id });
    } catch (e) {}

    res.status(201).json({ promotionCode: promo, coupon });
  } catch (err) {
    console.error('create promotion code err', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    res.status(500).json({ error: 'Failed to create promotion code' });
  }
});

// POST /api/admin/billing/credits
// body: { userId or email or customerId, amount (positive decimal dollars), currency='usd', description, metadata }
router.post('/billing/credits', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { userId, email, customerId, amount, currency = 'usd', description, metadata } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    let customer = customerId || null;
    let targetUser = null;

    if (!customer && (userId || email)) {
      if (userId) {
        targetUser = await User.findById(userId);
      } else if (email) {
        const normalizedEmail = String(email).trim().toLowerCase();
        targetUser = await User.findOne({ email: normalizedEmail });
      }
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      customer = await ensureStripeCustomerForUser(targetUser);
    }
    if (!customer) return res.status(400).json({ error: 'customerId or userId required' });

    // Stripe requires amount in cents; positive for credit balance
    const cents = Math.round(Number(amount) * 100);
    const tx = await stripe.customers.createBalanceTransaction(customer, {
      amount: cents,
      currency,
      description: description || 'Admin credit',
      metadata: metadata || {},
    });

    try {
      await auditAdminAction(req.user, 'billing.credit.create', { customerId: customer, amount: cents, currency, description, txId: tx.id });
    } catch (e) {}

    res.status(201).json({ balanceTransaction: tx });
  } catch (err) {
    console.error('create credit err', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    res.status(500).json({ error: 'Failed to create credit' });
  }
});

// PATCH /api/admin/billing/promotion-codes/:id - update promo code (e.g., active, max_redemptions, expires_at)
router.patch('/billing/promotion-codes/:id', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'promotion code id required' });

    const payload = {};
    if (req.body.active !== undefined) payload['active'] = !!req.body.active;
    if (req.body.max_redemptions !== undefined) payload['max_redemptions'] = Number(req.body.max_redemptions);
    if (req.body.expires_at) payload['expires_at'] = Math.floor(new Date(req.body.expires_at).getTime() / 1000);

    const updated = await stripe.promotionCodes.update(id, payload);

    try {
      await auditAdminAction(req.user, 'billing.promotion_code.update', { promotionCodeId: id, payload });
    } catch (e) { /* ignore audit errors */ }

    res.json({ promotionCode: updated });
  } catch (err) {
    console.error('update promotion code err', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    res.status(500).json({ error: 'Failed to update promotion code' });
  }
});

module.exports = router;
