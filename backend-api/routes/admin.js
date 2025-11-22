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

module.exports = router;


