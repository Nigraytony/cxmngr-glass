const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WebhookEvent = require('../models/webhookEvent');
const Project = require('../models/project');
const Invoice = require('../models/invoice');
const Charge = require('../models/charge');
const Stripe = require('stripe');

let stripe = null;
// In tests we stub Stripe via require cache; allow initialization with a dummy key so
// admin webhook replay endpoints don't hard-fail with 503 in CI.
const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  (String(process.env.NODE_ENV || '').toLowerCase() === 'test' ? 'test' : null);
if (stripeKey) {
  try {
    stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.error('[startup] Failed to init Stripe (admin):', e && e.message);
  }
} else {
  console.warn('[startup] STRIPE_SECRET_KEY not set; admin billing tools disabled.');
}

const User = require('../models/user');
const AdminAudit = require('../models/adminAudit');
const Template = require('../models/template');
const Task = require('../models/task');
const TaskTemplate = require('../models/taskTemplate');
const { sendInviteEmail, sendResetEmail, sendSupportAccessPinEmail } = require('../utils/mailer');
const { requireObjectIdParam } = require('../middleware/validate')
const { buildSafeRegex } = require('../utils/search')
const { rateLimit } = require('../middleware/rateLimit')
const crypto = require('crypto')
// Project model already required above (used by webhook replay logic)
const sanitizeHtml = require('sanitize-html')
const adminAssistantArticlesRoutes = require('./adminAssistantArticles')

function normalizeShortString(value, { maxLen = 256 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function isProdEnv() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production'
}

function safeErrorMessage(err, fallback) {
  const fb = fallback || 'Server error'
  if (isProdEnv()) return fb
  const msg = err && (err.message || err.error || (typeof err === 'string' ? err : null))
  return msg ? String(msg) : fb
}

function parseDateParam(value) {
  if (value === undefined || value === null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

function normalizeObjectIdOrNull(value) {
  const s = normalizeShortString(value, { maxLen: 64 })
  if (!s) return null
  return mongoose.Types.ObjectId.isValid(s) ? s : null
}

function isStripeIdLike(value, prefix) {
  const s = normalizeShortString(value, { maxLen: 128 })
  if (!s) return false
  if (prefix && !s.startsWith(prefix)) return false
  if (!/^[a-zA-Z0-9_]+$/.test(s)) return false
  return true
}

function isValidEmail(value) {
  const s = normalizeShortString(value, { maxLen: 254 })
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function pickTemplatePayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'number',
    'tag',
    'title',
    'type',
    'system',
    'responsible',
    'template',
    'status',
    'attributes',
    'description',
    'spaceId',
    'orderDate',
    'installationDate',
    'balanceDate',
    'testDate',
    'projectId',
    'issues',
    'checklists',
    'functionalTests',
    'components',
    'photos',
    'images',
    'attachments',
    'history',
    'labels',
    'tags',
    'metadata',
  ]
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k]
  return out
}

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

function getSupportAccessSecret() {
  const raw = process.env.SUPPORT_ACCESS_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-support-access-secret'
  return String(raw)
}
function hashSupportPin(pin) {
  const secret = getSupportAccessSecret()
  return crypto.createHash('sha256').update(`${String(pin)}:${secret}`).digest('hex')
}
function generateSupportPin() {
  const n = Math.floor(100000 + Math.random() * 900000)
  return String(n)
}
function getAdminId(req) {
  return String((req.user && (req.user._id || req.user.id)) || '')
}
function hasValidSupportGrant(userDoc, adminId) {
  try {
    if (!userDoc || !userDoc.supportAccess) return false
    const grantedAdminId = userDoc.supportAccess.grantedAdminId ? String(userDoc.supportAccess.grantedAdminId) : ''
    const until = userDoc.supportAccess.grantedUntil ? new Date(userDoc.supportAccess.grantedUntil) : null
    if (!grantedAdminId || !until) return false
    if (adminId && grantedAdminId !== String(adminId)) return false
    return until.getTime() > Date.now()
  } catch (_) {
    return false
  }
}

function timingSafeEqualHex(a, b) {
  try {
    const ab = Buffer.from(String(a || ''), 'hex')
    const bb = Buffer.from(String(b || ''), 'hex')
    if (ab.length !== bb.length) return false
    return crypto.timingSafeEqual(ab, bb)
  } catch (_) {
    return false
  }
}

const supportAccessRequestLimiter = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'support_access_request' })
const supportAccessVerifyLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'support_access_verify' })
const adminSendResetLimiter = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'admin_send_reset' })
async function requireSupportAccessGrant(req, res, next) {
  try {
    const adminId = getAdminId(req)
    if (!adminId) return res.status(401).json({ error: 'Please authenticate.' })
    const userDoc = await User.findById(req.params.id)
    if (!userDoc) return res.status(404).json({ error: 'User not found' })
    if (!hasValidSupportGrant(userDoc, adminId)) return res.status(403).json({ error: 'Support access not granted' })
    req.supportTargetUser = userDoc
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to verify support access' })
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
router.use('/assistant-articles', adminAssistantArticlesRoutes)

router.get('/webhook-events', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.projectId) {
      const pid = String(req.query.projectId);
      if (!mongoose.Types.ObjectId.isValid(pid)) return res.status(400).json({ error: 'Invalid projectId' });
      filter['meta.raw.data.object.metadata.projectId'] = pid;
    }
    if (req.query.date_from || req.query.date_to) {
      filter.receivedAt = {};
      if (req.query.date_from) {
        const dt = parseDateParam(req.query.date_from)
        if (dt === undefined) return res.status(400).json({ error: 'Invalid date_from' })
        if (dt) filter.receivedAt.$gte = dt
      }
      if (req.query.date_to) {
        const dt = parseDateParam(req.query.date_to)
        if (dt === undefined) return res.status(400).json({ error: 'Invalid date_to' })
        if (dt) filter.receivedAt.$lte = dt
      }
    }

    const events = await WebhookEvent.find(filter).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean();
    const total = await WebhookEvent.countDocuments(filter);
    res.json({ events, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch events') });
  }
});

// POST /api/admin/webhook-events/:eventId/replay
// Replays a stored webhook event by re-processing its raw payload. Protected by admin middleware at mount point.
router.post('/webhook-events/:eventId/replay', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const eventId = String(req.params.eventId || '').trim()
    if (!eventId) return res.status(400).json({ error: 'eventId is required' })
    const evt = await WebhookEvent.findOne({ eventId });
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
            const pid = normalizeObjectIdOrNull(projectId)
            if (pid) {
              await Project.findByIdAndUpdate(pid, {
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
          const pid = normalizeObjectIdOrNull(projectId)
          if (pid) {
            await Project.findByIdAndUpdate(pid, {
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
            const pid = normalizeObjectIdOrNull(projectId)
            if (pid) {
              await Project.findByIdAndUpdate(pid, {
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
          const pid = normalizeObjectIdOrNull(projectId)
          if (pid) {
            await Project.findByIdAndUpdate(pid, {
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
      return res.status(500).json({ error: safeErrorMessage(procErr, 'Failed to replay event') });
    }
  } catch (err) {
    return res.status(500).json({ error: safeErrorMessage(err, 'Failed to replay event') });
  }
});

// POST /api/admin/billing/backfill/:projectId
// Fetch invoices and charges from Stripe for a project and persist to DB.
router.post('/billing/backfill/:projectId', requireObjectIdParam('projectId'), async (req, res) => {
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
    return res.status(500).json({ error: safeErrorMessage(err, 'Backfill failed') });
  }
});

// -- Admin: Users CRUD ----------------------------------------------------
// GET /api/admin/users?limit=50&skip=0&query=email|name
router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const q = normalizeShortString(req.query.q, { maxLen: 128 }) || '';
    const filter = {};
    if (q) {
      const rx = buildSafeRegex(q, { maxLen: 128 })
      filter.$or = [
        { email: { $regex: rx } },
        { firstName: { $regex: rx } },
        { lastName: { $regex: rx } },
      ];
    }
    const users = await User.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean();
    const total = await User.countDocuments(filter);
    res.json({ users, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to list users') });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch user') });
  }
});

// -- Admin support access (PIN-gated) ------------------------------------
// POST /api/admin/users/:id/support-access/request
router.post('/users/:id/support-access/request', supportAccessRequestLimiter, requireObjectIdParam('id'), async (req, res) => {
  try {
    const adminId = getAdminId(req)
    if (!adminId) return res.status(401).json({ error: 'Please authenticate.' })
    const u = await User.findById(req.params.id)
    if (!u) return res.status(404).json({ error: 'User not found' })
    if (!u.email) return res.status(400).json({ error: 'User email is missing' })

    const pin = generateSupportPin()
    const expiresMinutes = 10
    const pinExpiresAt = new Date(Date.now() + expiresMinutes * 60_000)

    u.supportAccess = {
      requestedByAdminId: adminId,
      requestedAt: new Date(),
      pinHash: hashSupportPin(pin),
      pinExpiresAt,
      grantedAdminId: null,
      grantedUntil: null,
      grantedAt: null,
    }
    await u.save()

    const requesterEmail = (req.user && req.user.email) ? String(req.user.email) : ''
    await sendSupportAccessPinEmail({
      to: String(u.email || ''),
      requesterEmail,
      pin,
      expiresMinutes,
    })

    try {
      await AdminAudit.create({
        actorId: req.user?._id || req.user?.id || null,
        actorEmail: req.user?.email || null,
        targetUserId: u._id,
        actionType: 'support_access.request',
        details: { requestedAt: u.supportAccess.requestedAt, pinExpiresAt },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (_) { /* ignore audit failures */ }

    return res.json({ ok: true, pinExpiresAt })
  } catch (err) {
    console.error('[admin.support-access.request] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to request support access' })
  }
})

// POST /api/admin/users/:id/support-access/verify { pin }
router.post('/users/:id/support-access/verify', supportAccessVerifyLimiter, requireObjectIdParam('id'), async (req, res) => {
  try {
    const adminId = getAdminId(req)
    if (!adminId) return res.status(401).json({ error: 'Please authenticate.' })
    const pin = String(req.body && req.body.pin ? req.body.pin : '').trim()
    if (!pin) return res.status(400).json({ error: 'pin is required' })
    if (!/^[0-9]{6}$/.test(pin)) return res.status(400).json({ error: 'Invalid PIN' })

    const u = await User.findById(req.params.id)
    if (!u) return res.status(404).json({ error: 'User not found' })
    const sa = u.supportAccess || {}
    const exp = sa.pinExpiresAt ? new Date(sa.pinExpiresAt) : null
    if (!sa.pinHash || !exp || exp.getTime() <= Date.now()) return res.status(400).json({ error: 'PIN expired. Request a new one.' })

    const expected = String(sa.pinHash)
    const actual = hashSupportPin(pin)
    if (!timingSafeEqualHex(expected, actual)) return res.status(400).json({ error: 'Invalid PIN' })

    const grantedMinutes = 30
    const grantedUntil = new Date(Date.now() + grantedMinutes * 60_000)
    u.supportAccess.grantedAdminId = adminId
    u.supportAccess.grantedUntil = grantedUntil
    u.supportAccess.grantedAt = new Date()
    // Clear PIN after success to prevent replay
    u.supportAccess.pinHash = null
    u.supportAccess.pinExpiresAt = null
    await u.save()

    try {
      await AdminAudit.create({
        actorId: req.user?._id || req.user?.id || null,
        actorEmail: req.user?.email || null,
        targetUserId: u._id,
        actionType: 'support_access.grant',
        details: { grantedUntil, grantedMinutes },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (_) { /* ignore */ }

    return res.json({ ok: true, grantedUntil })
  } catch (err) {
    console.error('[admin.support-access.verify] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to verify PIN' })
  }
})

// GET /api/admin/users/:id/support-access/status
router.get('/users/:id/support-access/status', requireObjectIdParam('id'), async (req, res) => {
  try {
    const adminId = getAdminId(req)
    if (!adminId) return res.status(401).json({ error: 'Please authenticate.' })
    const u = await User.findById(req.params.id).lean()
    if (!u) return res.status(404).json({ error: 'User not found' })
    const sa = u.supportAccess || {}
    const pinExpiresAt = sa.pinExpiresAt || null
    const grantedUntil = sa.grantedUntil || null
    const requestedByAdminId = sa.requestedByAdminId || null
    const isGranted = hasValidSupportGrant(u, adminId)
    return res.json({ ok: true, isGranted, grantedUntil, pinExpiresAt, requestedByAdminId })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read support access status' })
  }
})

// GET /api/admin/users/:id/profile (requires support access)
router.get('/users/:id/profile', requireObjectIdParam('id'), requireSupportAccessGrant, async (req, res) => {
  try {
    const u = req.supportTargetUser
    const obj = u.toObject ? u.toObject() : JSON.parse(JSON.stringify(u))
    if (obj.password) delete obj.password
    if (obj.supportAccess) delete obj.supportAccess
    return res.json(obj)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

function pickUserProfilePayload(source) {
  const body = source || {}
  const out = {}
  const allowed = ['firstName', 'lastName', 'email', 'role', 'projects', 'contact', 'social_media', 'avatar', 'status', 'deleted']
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k]
  return out
}

function clampString(value, maxLen) {
  if (value === undefined || value === null) return undefined
  const s = String(value).trim()
  if (!s) return ''
  if (s.length > maxLen) return s.slice(0, maxLen)
  return s
}

function sanitizePlainText(value, maxLen) {
  if (value === undefined || value === null) return undefined
  const s = sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} }).trim()
  if (!s) return ''
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

function sanitizeUserProfilePatch(patch) {
  const out = { ...(patch || {}) }

  // Basic strings
  if (out.firstName !== undefined) out.firstName = sanitizePlainText(out.firstName, 80)
  if (out.lastName !== undefined) out.lastName = sanitizePlainText(out.lastName, 80)

  if (out.email !== undefined) {
    const em = clampString(out.email, 254).toLowerCase()
    if (!isValidEmail(em)) throw new Error('Invalid email')
    out.email = em
  }

  // Role/status enums
  if (out.role !== undefined) {
    const r = String(out.role || '').trim().toLowerCase()
    const allowedRoles = new Set(['globaladmin', 'superadmin', 'admin', 'user'])
    if (!allowedRoles.has(r)) throw new Error('Invalid role')
    out.role = r
  }
  if (out.status !== undefined) {
    const s = String(out.status || '').trim()
    const allowedStatuses = new Set(['Active', 'Deleted', 'Inactive', 'Invited', 'Pending'])
    if (!allowedStatuses.has(s)) throw new Error('Invalid status')
    out.status = s
  }
  if (out.deleted !== undefined) out.deleted = !!out.deleted

  // Avatar/signature data URL caps to prevent huge payloads (413) and DB bloat.
  if (out.avatar !== undefined) {
    const av = String(out.avatar || '')
    if (av && av.length > 600_000) throw new Error('avatar is too large')
    out.avatar = av
  }

  // contact/social_media are objects; sanitize known subfields only
  if (out.contact !== undefined) {
    const c = (out.contact && typeof out.contact === 'object') ? { ...out.contact } : {}
    if (c.company !== undefined) c.company = sanitizePlainText(c.company, 200)
    if (c.phone !== undefined) c.phone = sanitizePlainText(c.phone, 64)
    if (c.bio !== undefined) c.bio = sanitizePlainText(c.bio, 2000)
    if (c.avatar !== undefined) {
      const cav = String(c.avatar || '')
      if (cav && cav.length > 600_000) throw new Error('contact.avatar is too large')
      c.avatar = cav
    }
    if (c.perPage !== undefined) {
      const n = Number(c.perPage)
      c.perPage = Number.isFinite(n) ? Math.max(1, Math.min(500, Math.floor(n))) : null
    }
    if (c.address !== undefined) {
      const a = (c.address && typeof c.address === 'object') ? { ...c.address } : {}
      if (a.street !== undefined) a.street = sanitizePlainText(a.street, 200)
      if (a.city !== undefined) a.city = sanitizePlainText(a.city, 120)
      if (a.state !== undefined) a.state = sanitizePlainText(a.state, 120)
      if (a.zip !== undefined) a.zip = sanitizePlainText(a.zip, 32)
      if (a.country !== undefined) a.country = sanitizePlainText(a.country, 120)
      if (a.taxId !== undefined) a.taxId = sanitizePlainText(a.taxId, 64)
      c.address = a
    }
    if (c.signature !== undefined) {
      const sig = (c.signature && typeof c.signature === 'object') ? { ...c.signature } : {}
      if (sig.title !== undefined) sig.title = sanitizePlainText(sig.title, 120)
      if (sig.person !== undefined) sig.person = sanitizePlainText(sig.person, 120)
      if (sig.block !== undefined) {
        const b = String(sig.block || '')
        if (b && b.length > 900_000) throw new Error('signature.block is too large')
        sig.block = b
      }
      c.signature = sig
    }
    out.contact = c
  }

  if (out.social_media !== undefined) {
    const sm = (out.social_media && typeof out.social_media === 'object') ? { ...out.social_media } : {}
    for (const key of ['linkedin', 'x', 'facebook', 'instagram', 'youtube', 'github', 'telegram', 'website']) {
      if (sm[key] !== undefined) sm[key] = clampString(sm[key], 512)
    }
    out.social_media = sm
  }

  if (out.projects !== undefined) {
    const arr = Array.isArray(out.projects) ? out.projects : []
    out.projects = arr.slice(0, 200).map((p) => {
      if (typeof p === 'string') return p
      if (!p || typeof p !== 'object') return null
      const _id = p._id || p.id || null
      const role = p.role || 'user'
      const def = !!p.default
      return { _id, role, default: def }
    }).filter(Boolean)
  }

  return out
}

// PATCH /api/admin/users/:id/profile (requires support access)
router.patch('/users/:id/profile', requireObjectIdParam('id'), requireSupportAccessGrant, async (req, res) => {
  try {
    let patch = pickUserProfilePayload(req.body)
    patch = sanitizeUserProfilePatch(patch)

    const u = req.supportTargetUser
    const before = u.toObject ? u.toObject() : JSON.parse(JSON.stringify(u))
    for (const k of Object.keys(patch)) u[k] = patch[k]
    await u.save()
    const after = await User.findById(u._id).lean()
    if (after && after.password) delete after.password
    if (after && after.supportAccess) delete after.supportAccess

    try {
      const beforeSanitized = Object.assign({}, before)
      if (beforeSanitized.password) delete beforeSanitized.password
      if (beforeSanitized.supportAccess) delete beforeSanitized.supportAccess
      await AdminAudit.create({
        actorId: req.user?._id || req.user?.id || null,
        actorEmail: req.user?.email || null,
        targetUserId: u._id,
        actionType: 'support_profile.update',
        details: { patch, before: beforeSanitized, after },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (_) { /* ignore */ }

    return res.json(after)
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Failed to update profile' })
  }
})

// POST /api/admin/users/:id/send-reset (admin-triggered reset email)
router.post('/users/:id/send-reset', adminSendResetLimiter, requireObjectIdParam('id'), async (req, res) => {
  try {
    const u = await User.findById(req.params.id).lean()
    if (!u) return res.status(404).json({ error: 'User not found' })
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetUrl = `${String(appUrl).replace(/\/$/, '')}/reset`
    await sendResetEmail({ to: String(u.email), name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), resetUrl })
    try {
      await AdminAudit.create({
        actorId: req.user?._id || req.user?.id || null,
        actorEmail: req.user?.email || null,
        targetUserId: u._id,
        actionType: 'user.reset.send',
        details: { resetUrl },
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      })
    } catch (_) { /* ignore */ }
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin.users.send-reset] error', e && (e.stack || e.message || e))
    return res.status(500).json({ error: 'Failed to send reset email' })
  }
})

// GET /api/admin/audit?targetUserId=...&limit=50&skip=0
router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const filter = {};
    if (req.query.targetUserId) {
      const tid = String(req.query.targetUserId).trim()
      if (!mongoose.Types.ObjectId.isValid(tid)) return res.status(400).json({ error: 'Invalid targetUserId' })
      filter.targetUserId = tid;
    }
    if (req.query.actionType) filter.actionType = req.query.actionType;

    const entries = await AdminAudit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await AdminAudit.countDocuments(filter);
    res.json({ entries, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch audit logs') });
  }
});

// POST /api/admin/send-test-email
// Sends a test email via configured mailer to verify production deliverability.
router.post('/send-test-email', async (req, res) => {
  try {
    const to = String(req.body.to || req.query.to || '').trim()
    if (!to) return res.status(400).json({ error: 'Missing recipient email' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Invalid recipient email' })
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
    return res.status(500).json({ error: safeErrorMessage(err, 'Failed to send test email') })
  }
})

// PATCH /api/admin/users/:id - update allowed fields (supports soft-delete/status)
router.patch('/users/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const allowed = ['firstName','lastName','email','role','contact','social_media','projects','stripeCustomerId','isActive'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const newPassword = req.body.password ? String(req.body.password) : '';

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

    // IMPORTANT: if password is being changed, do NOT use findByIdAndUpdate
    // because it bypasses mongoose pre-save hooks (password hashing).
    const userDoc = await User.findById(req.params.id);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    // Normalize email if provided
    if (typeof patch.email === 'string') patch.email = String(patch.email).trim().toLowerCase()

    // Apply patch fields
    for (const key of Object.keys(patch)) {
      userDoc[key] = patch[key]
    }

    if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
      userDoc.password = newPassword
    }

    await userDoc.save();
    const updated = await User.findById(userDoc._id).lean();

    try {
      // Prepare before/after for audit (redact sensitive fields)
      const beforeSanitized = Object.assign({}, before);
      const afterSanitized = updated ? JSON.parse(JSON.stringify(updated)) : {};
      if (beforeSanitized.password) delete beforeSanitized.password;
      if (afterSanitized.password) delete afterSanitized.password;

      const actorId = (req.user && (req.user._id || req.user.id)) ? (req.user._id || req.user.id) : null;
      const actorEmail = (req.user && (req.user.email || req.user.emailAddress)) ? (req.user.email || req.user.emailAddress) : null;

      await AdminAudit.create({
        actorId: actorId,
        actorEmail: actorEmail,
        targetUserId: userDoc._id,
        actionType: 'user.update',
        details: { patch: { ...patch, password: newPassword ? '[updated]' : undefined }, before: beforeSanitized, after: afterSanitized },
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
    const q = normalizeShortString(req.query.q, { maxLen: 128 }) || '';
    const filter = {};
    if (q) {
      // Support direct lookup by Mongo ObjectId (common admin workflow).
      if (mongoose.Types.ObjectId.isValid(String(q))) {
        filter._id = new mongoose.Types.ObjectId(String(q))
      } else {
        const rx = buildSafeRegex(q, { maxLen: 128 })
        filter.$or = [
          { title: { $regex: rx } },
          { name: { $regex: rx } },
          { client: { $regex: rx } },
        ];
      }
    }
    const list = await Project.find(filter)
      .select([
        '_id',
        'title',
        'name',
        'client',
        'createdAt',
        'updatedAt',
        'status',
        'isActive',
        'deleted',
        'subscriptionTier',
        'stripeSubscriptionStatus',
        'stripeCurrentPeriodEnd',
        'stripeIsPastDue',
        'stripeLastInvoiceStatus',
        'stripeLastPaymentStatus',
        'stripeSubscriptionId',
        'stripePriceId',
        'billingAdminUserId',
      ].join(' '))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await Project.countDocuments(filter);
    res.json({ projects: list, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to list projects') });
  }
});

// GET /api/admin/projects/:id
router.get('/projects/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const p = await Project.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Project not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch project') });
  }
});

// PATCH /api/admin/projects/:id
router.patch('/projects/:id', requireObjectIdParam('id'), async (req, res) => {
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
        const q = normalizeShortString(req.query.q, { maxLen: 128 }) || '';
        const filter = {};
        if (req.query.projectId) {
          const pid = String(req.query.projectId)
          if (!mongoose.Types.ObjectId.isValid(pid)) return res.status(400).json({ error: 'Invalid projectId' })
          filter.projectId = pid
        }
        if (req.query.status) filter.status = normalizeShortString(req.query.status, { maxLen: 64 });
        if (req.query.deleted !== undefined) filter.deleted = (String(req.query.deleted) === 'true');
        if (q) {
          const rx = buildSafeRegex(q, { maxLen: 128 })
          filter.$or = [
            { name: { $regex: rx } },
            { description: { $regex: rx } },
            { notes: { $regex: rx } },
          ];
        }

        const tasks = await Task.find(filter).sort({ start: -1 }).skip(skip).limit(limit).lean();
        const total = await Task.countDocuments(filter);
        res.json({ tasks, total, skip, limit });
      } catch (err) {
        res.status(500).json({ error: safeErrorMessage(err, 'Failed to list tasks') });
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
        res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch task') });
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
    router.patch('/tasks/:id', requireObjectIdParam('id'), async (req, res) => {
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
    // This admin list is dedicated to global templates (not project-scoped).
    filter.$or = [{ projectId: { $exists: false } }, { projectId: null }]

    // Optional safe search (UI uses `q`)
    if (req.query.q) {
      const rx = buildSafeRegex(req.query.q, { maxLen: 128 })
      if (rx) {
        filter.$and = [
          ...(filter.$and || []),
          { $or: [{ tag: { $regex: rx } }, { title: { $regex: rx } }, { type: { $regex: rx } }, { system: { $regex: rx } }] },
        ]
      }
    }
    const list = await Template.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Template.countDocuments(filter);
    res.json({ templates: list, total, skip, limit });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to list templates') });
  }
});

// GET /api/admin/templates/:id
router.get('/templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    // Avoid returning heavy base64 photo blobs in admin edit.
    const t = await Template.findById(req.params.id).select('-photos.data -photos.contentType -photos.size').lean()
    if (!t) return res.status(404).json({ error: 'Template not found' })
    // Admin templates are global-only; project-scoped templates are not managed here.
    if (t.projectId) return res.status(404).json({ error: 'Template not found' })
    return res.json(t)
  } catch (err) {
    console.error('[admin.templates.get] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to fetch template' })
  }
})

// POST /api/admin/templates
router.post('/templates', async (req, res) => {
  try {
    const payload = pickTemplatePayload(req.body)
    // Admin templates are global (not project-scoped).
    delete payload.projectId
    // Validate ObjectIds if present (admin tooling should still be safe)
    if (payload.spaceId && !mongoose.Types.ObjectId.isValid(String(payload.spaceId))) return res.status(400).json({ error: 'Invalid spaceId' })

    // Sanitize potentially rich text fields
    if (typeof payload.description === 'string') payload.description = sanitizeHtml(String(payload.description), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 20000)
    if (typeof payload.labels === 'string') payload.labels = sanitizeHtml(String(payload.labels), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 2000)
    if (typeof payload.metadata === 'string') payload.metadata = sanitizeHtml(String(payload.metadata), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 2000)

    const t = new Template(payload);
    await t.save();
    res.status(201).json(t);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create template' });
  }
});

// PATCH /api/admin/templates/:id
router.patch('/templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const patch = pickTemplatePayload(req.body)
    // Admin templates are global (not project-scoped).
    delete patch.projectId
    if (patch.spaceId && !mongoose.Types.ObjectId.isValid(String(patch.spaceId))) return res.status(400).json({ error: 'Invalid spaceId' })
    if (typeof patch.description === 'string') patch.description = sanitizeHtml(String(patch.description), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 20000)
    if (typeof patch.labels === 'string') patch.labels = sanitizeHtml(String(patch.labels), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 2000)
    if (typeof patch.metadata === 'string') patch.metadata = sanitizeHtml(String(patch.metadata), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 2000)

    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No fields to update' })
    const updated = await Template.findOneAndUpdate(
      { _id: req.params.id, $or: [{ projectId: { $exists: false } }, { projectId: null }] },
      patch,
      { new: true, runValidators: true },
    );
    if (!updated) return res.status(404).json({ error: 'Template not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update template' });
  }
});

// DELETE /api/admin/templates/:id
router.delete('/templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const t = await Template.findOneAndDelete({ _id: req.params.id, $or: [{ projectId: { $exists: false } }, { projectId: null }] });
    if (!t) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to delete template') });
  }
});

// -- Admin: Task Templates CRUD ------------------------------------------
// These are global templates used by Premium users to seed project tasks.

function pickTaskTemplatePayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'name',
    'slug',
    'category',
    'version',
    'isActive',
    'sourceType',
    'xml',
    'csv',
    'description',
    'tags',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  // Normalize tags (trim, de-dupe, cap length/count)
  if (out.tags !== undefined) {
    const arr = Array.isArray(out.tags) ? out.tags : []
    const seen = new Set()
    const normalized = []
    for (const raw of arr) {
      const t = String(raw || '').trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      normalized.push(t.slice(0, 64))
      if (normalized.length >= 32) break
    }
    out.tags = normalized
  }
  return out
}

function normalizeTaskTemplateSource(payload) {
  const p = { ...(payload || {}) }
  const hasSourceType = Object.prototype.hasOwnProperty.call(p, 'sourceType')
  const hasCsvField = Object.prototype.hasOwnProperty.call(p, 'csv')
  const hasXmlField = Object.prototype.hasOwnProperty.call(p, 'xml')
  if (!hasSourceType && !hasCsvField && !hasXmlField) return p

  const rawType = String(p.sourceType || '').trim().toLowerCase()
  const hasCsv = String(p.csv || '').trim().length > 0
  const hasXml = String(p.xml || '').trim().length > 0

  let sourceType = rawType === 'csv' ? 'csv' : 'xml'
  if (!rawType) {
    // Backward-compatible inference
    if (hasCsv && !hasXml) sourceType = 'csv'
    else sourceType = 'xml'
  }

  p.sourceType = sourceType
  if (sourceType === 'csv') {
    // enforce mutual exclusivity
    p.xml = ''
  } else {
    p.csv = ''
  }

  return p
}

// GET /api/admin/task-templates?limit=50&skip=0&q=...&active=true|false
router.get('/task-templates', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500)
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0)
    const q = normalizeShortString(req.query.q, { maxLen: 128 }) || ''
    const filter = {}
    if (req.query.active !== undefined && String(req.query.active).length) {
      filter.isActive = String(req.query.active) === 'true'
    }
    if (q) {
      const rx = buildSafeRegex(q, { maxLen: 128 })
      filter.$or = [
        { name: { $regex: rx } },
        { slug: { $regex: rx } },
        { category: { $regex: rx } },
        { version: { $regex: rx } },
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
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to list task templates') })
  }
})

// GET /api/admin/task-templates/:id
router.get('/task-templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const t = await TaskTemplate.findById(req.params.id).lean()
    if (!t) return res.status(404).json({ error: 'Task template not found' })
    res.json(t)
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch task template') })
  }
})

// POST /api/admin/task-templates
router.post('/task-templates', async (req, res) => {
  try {
    let body = normalizeTaskTemplateSource(pickTaskTemplatePayload(req.body))
    if (!body.name) return res.status(400).json({ error: 'name is required' })
    if (body.sourceType === 'csv') {
      if (!String(body.csv || '').trim()) return res.status(400).json({ error: 'csv is required' })
    } else {
      if (!String(body.xml || '').trim()) return res.status(400).json({ error: 'xml is required' })
    }
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
router.patch('/task-templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const patch = normalizeTaskTemplateSource(pickTaskTemplatePayload(req.body))
    patch.updatedByUserId = req.user && req.user._id ? req.user._id : null
    const updated = await TaskTemplate.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ error: 'Task template not found' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update task template' })
  }
})

// DELETE /api/admin/task-templates/:id
router.delete('/task-templates/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const t = await TaskTemplate.findByIdAndDelete(req.params.id)
    if (!t) return res.status(404).json({ error: 'Task template not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err, 'Failed to delete task template') })
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

    const normalizedCurrency = normalizeShortString(currency, { maxLen: 8 })
    if (!normalizedCurrency || !/^[a-z]{3}$/i.test(normalizedCurrency)) return res.status(400).json({ error: 'Invalid currency' })

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'amount must be a positive number' })
    if (amt > 1000000) return res.status(400).json({ error: 'amount too large' })

    let customer = customerId || null;
    let targetUser = null;

    if (!customer && (userId || email)) {
      if (userId) {
        if (!mongoose.Types.ObjectId.isValid(String(userId))) return res.status(400).json({ error: 'Invalid userId' })
        targetUser = await User.findById(userId);
      } else if (email) {
        if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' })
        const normalizedEmail = String(email).trim().toLowerCase();
        targetUser = await User.findOne({ email: normalizedEmail });
      }
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      customer = await ensureStripeCustomerForUser(targetUser);
    }
    if (customer && !isStripeIdLike(customer, 'cus_')) return res.status(400).json({ error: 'Invalid customerId' })
    if (!customer) return res.status(400).json({ error: 'customerId or userId required' });

    // Stripe requires amount in cents; positive for credit balance
    const cents = Math.round(amt * 100);
    const tx = await stripe.customers.createBalanceTransaction(customer, {
      amount: cents,
      currency: normalizedCurrency.toLowerCase(),
      description: normalizeShortString(description, { maxLen: 200 }) || 'Admin credit',
      metadata: (metadata && typeof metadata === 'object') ? metadata : {},
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
    if (!isStripeIdLike(id, 'promo_')) return res.status(400).json({ error: 'Invalid promotion code id' });

    const payload = {};
    if (req.body.active !== undefined) payload['active'] = !!req.body.active;
    if (req.body.max_redemptions !== undefined) {
      const v = Number(req.body.max_redemptions)
      if (!Number.isFinite(v) || v < 1 || v > 1000000) return res.status(400).json({ error: 'Invalid max_redemptions' })
      payload['max_redemptions'] = Math.floor(v)
    }
    if (req.body.expires_at) {
      const dt = new Date(req.body.expires_at)
      if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: 'Invalid expires_at' })
      payload['expires_at'] = Math.floor(dt.getTime() / 1000);
    }
    if (!Object.keys(payload).length) return res.status(400).json({ error: 'No fields to update' })

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
