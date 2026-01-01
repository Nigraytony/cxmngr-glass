const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');
const { requireActiveProject } = require('../middleware/subscription');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('[startup] Failed to init Stripe (projects):', e && e.message);
  }
} else {
  console.warn('[startup] STRIPE_SECRET_KEY not set; project billing endpoints disabled.');
}
const { getPlan, requireFeature } = require('../middleware/planGuard');
const { encryptString, decryptString } = require('../utils/encryption');
const { isObjectId, requireObjectIdParam } = require('../middleware/validate')
const sanitizeHtml = require('sanitize-html')
const { buildSafeRegex } = require('../utils/search')
const { normalizeLogEvent } = require('../utils/logEvent')

// Defensive: validate `:id` params everywhere in this router to avoid CastErrors and 500s.
router.param('id', (req, res, next, value) => {
  if (!isObjectId(value)) return res.status(400).send({ error: 'Invalid id' })
  return next()
})

function normalizeShortString(value, { maxLen = 128 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function normalizeOptionalFilterString(value, { maxLen = 64, allowAll = true } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (allowAll && s.toLowerCase() === 'all') return null
  if (s.length > maxLen) return undefined
  return s
}

function normalizeInviteToken(value) {
  const s = normalizeShortString(value, { maxLen: 128 })
  if (!s) return null
  // tokens are generated via `crypto.randomBytes(20).toString('hex')` (40 hex chars)
  if (!/^[a-f0-9]{40}$/i.test(s)) return null
  return s.toLowerCase()
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildExactCaseInsensitiveRegex(value, { maxLen = 320 } = {}) {
  const s = normalizeShortString(value, { maxLen })
  if (!s) return null
  return new RegExp(`^${escapeRegex(s)}$`, 'i')
}

function isStripeIdLike(value, prefix) {
  const s = normalizeShortString(value, { maxLen: 128 })
  if (!s) return false
  if (prefix && !s.startsWith(prefix)) return false
  if (!/^[a-zA-Z0-9_]+$/.test(s)) return false
  return true
}

function validateProrationBehavior(value) {
  if (value === undefined || value === null || value === '') return null
  const s = String(value).trim()
  const allowed = new Set(['create_prorations', 'always_invoice', 'none'])
  return allowed.has(s) ? s : null
}

function normalizeSortBy(value, allowed, fallback) {
  const s = String(value || '').trim()
  if (!s) return fallback
  return allowed.has(s) ? s : fallback
}

function normalizeSortDir(value) {
  return String(value || '').toLowerCase() === 'asc' ? 1 : -1
}

const LIST_SORT_FIELDS = new Set([
  'updatedAt',
  'createdAt',
  'name',
  'client',
  'project_type',
  'status',
  'startDate',
])

function isGlobalAdmin(user) {
  const role = String(user && user.role || '').trim()
  return role === 'globaladmin' || role === 'superadmin'
}

function isSubscriptionActive(project) {
  if (!project) return false
  if (project.isActive === true) return true
  const status = String(project.stripeSubscriptionStatus || '').toLowerCase()
  return ['active', 'trialing', 'past_due'].includes(status)
}

async function requireProjectMember(req, res, next) {
  try {
    const projectId = String(req.params.id || '').trim()
    if (!projectId) return res.status(400).send({ error: 'Project id is required' })
    if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).send({ error: 'Invalid project id' })
    const project = await Project.findById(projectId).select('team users').lean()
    if (!project) return res.status(404).send({ error: 'Project not found' })
    if (isGlobalAdmin(req.user)) return next()

    const userId = String(req.user && (req.user._id || req.user.id) || '')
    const email = String(req.user && req.user.email || '').toLowerCase()
    const team = Array.isArray(project.team) ? project.team : []
    const users = Array.isArray(project.users) ? project.users : []
    const member =
      team.some((m) => String(m && (m._id || m.id) || '') === userId || String(m && m.email || '').toLowerCase() === email) ||
      users.some((u) => String(u) === userId)
    if (!member) return res.status(403).send({ error: 'Forbidden' })
    return next()
  } catch (e) {
    return res.status(500).send({ error: 'Failed to authorize project access' })
  }
}

function normalizeAiProvider(v) {
  const p = String(v || '').trim().toLowerCase()
  if (p === 'google' || p === 'gemini') return 'gemini'
  if (p === 'anthropic' || p === 'claude') return 'claude'
  return 'openai'
}

function defaultAiModel(provider) {
  if (provider === 'gemini') return 'gemini-1.5-flash'
  if (provider === 'claude') return 'claude-3-5-sonnet-latest'
  return 'gpt-4o-mini'
}

function ensureTeamCapacity(project) {
  const plan = getPlan(project);
  const limit = plan?.limits?.team || Infinity;
  const current = Array.isArray(project.team) ? project.team.length : 0;
  if (current >= limit) {
    const err = new Error('Team limit reached for current plan');
    err.status = 402;
    err.code = 'PLAN_LIMIT_REACHED';
    err.limit = limit;
    err.current = current;
    throw err;
  }
}

function pickProjectPayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'name',
    'number',
    'po_number',
    'project_type',
    'industry',
    'client',
    'location',
    'building_type',
    'description',
    'settings',
    'photos',
    'documents',
    'logo',
    'meta',
    'tags',
    'startDate',
    'endDate',
    'commissioning_agent',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

// Create a new project
router.post('/', auth, async (req, res) => {
  // console.log('Creating project with data:', req.body);
  try {
    const userId = String(req.user && (req.user._id || req.user.id) || '')
    const user = userId ? await User.findById(userId) : null;
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    delete req.body.userId;
    delete req.body._id;
    // If the creator requested a price/plan during creation, persist it on the
    // project so later checkout/stripe flows can pick it up.
    const incoming = pickProjectPayload(req.body);
    if (req.body && req.body.stripePriceId) {
      const pid = String(req.body.stripePriceId).trim()
      if (!isStripeIdLike(pid, 'price_')) return res.status(400).send({ error: 'Invalid stripePriceId' })
      incoming.stripePriceId = pid
    }

    // Sanitize free-form text fields to reduce risk of storing HTML.
    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.location === 'string') {
      incoming.location = sanitizeHtml(String(incoming.location), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    // Start the trial at project creation time if not explicitly set.
    if (!incoming.trialStartedAt) incoming.trialStartedAt = new Date();

    // Create a new project with the new schema fields
    const project = new Project(incoming);
    await project.save();

    // Add project to user's projects array (store minimally to avoid duplication)
    user.projects.push({ _id: project._id, role: 'admin', default: false });
    await user.save();

    // Add the user to the project's users array with admin role
    ensureTeamCapacity(project);
    project.team.push({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      company: user.contact.company,
      phone: user.contact.phone, // Optional phone number
      role: 'admin', // Default role for the user creating the project
      status: user.status, // Optional status for team members
    });
    await project.save();

    res.status(201).send(project);
  } catch (error) {
    console.error('[projects] create error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create project' });
  }
});

// Read projects (supports pagination, filtering, search, memberId)
router.get('/', auth, async (req, res) => {
  try {
    // For non-global admins, force membership scoping to the authenticated user.
    // Global admins may pass `memberId` to inspect another user's projects.
    if (!isGlobalAdmin(req.user)) {
      req.query.memberId = String(req.user && (req.user._id || req.user.id) || '')
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.max(1, Math.min(200, Number(req.query.perPage || req.query.limit) || 10));
    const status = req.query.status !== undefined ? normalizeOptionalFilterString(req.query.status, { maxLen: 64 }) : null
    if (status === undefined) return res.status(400).send({ error: 'Invalid status' })
    const search = req.query.search ? String(req.query.search).trim() : null;
    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, null);
    const sortDir = normalizeSortDir(req.query.sortDir);

    const filter = {};
    // Status filter
    if (status) filter.status = status;

    // Search across name and client and description
    if (search) {
      const regex = buildSafeRegex(search, { maxLen: 128 });
      filter.$or = [
        { name: { $regex: regex } },
        { client: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    }

    // Member filter: require the member to be present in `team` or `users`.
    // Use $elemMatch on team to avoid matching projects that lack a team array.
    if (req.query.memberId) {
      const memberId = String(req.query.memberId);
      const or = [];
      const mongoose = require('mongoose');
      // Prefer ObjectId matches when valid
      if (mongoose.Types.ObjectId.isValid(memberId)) {
        or.push({ team: { $elemMatch: { _id: new mongoose.Types.ObjectId(memberId) } } });
        or.push({ users: new mongoose.Types.ObjectId(memberId) });
      }
      // Also support string-stored ids (defensive)
      or.push({ team: { $elemMatch: { _id: memberId } } });
      or.push({ users: memberId });

      // Also include projects referenced on the User record (some records
      // may have the user referenced on the user's `projects` array but not
      // in the project's `team` array). This makes the membership filter
      // tolerant of denormalized/inconsistent data.
      try {
        const User = require('../models/user');
        const u = mongoose.Types.ObjectId.isValid(memberId)
          ? await User.findById(memberId).select('projects').lean()
          : null;
        if (u && Array.isArray(u.projects) && u.projects.length) {
          const projIds = u.projects.map((p) => {
            try {
              if (p && (p._id || p.id)) return (p._id || p.id)
              return String(p)
            } catch (e) { return String(p) }
          }).filter(Boolean)
          if (projIds.length) {
            // coerce to ObjectId when possible
            const mongoose = require('mongoose');
            const coerced = projIds.map((pid) => (mongoose.Types.ObjectId.isValid(pid) ? new mongoose.Types.ObjectId(pid) : pid))
            or.push({ _id: { $in: coerced } })
          }
        }
      } catch (e) {
        // best-effort: ignore user lookup failures
      }

      if (filter.$or) {
        // Combine search $or with membership requirement via $and
        filter.$and = [{ $or: filter.$or }, { $or: or }];
        delete filter.$or;
      } else {
        filter.$or = or;
      }
    }

    // Build sort
    let sort = { updatedAt: -1 };
    if (sortBy) {
      const map = { name: 'name', client: 'client', project_type: 'project_type', status: 'status', startDate: 'startDate', createdAt: 'createdAt' };
      const field = map[sortBy] || 'updatedAt';
      sort = {};
      sort[field] = sortDir;
    }

    const total = await Project.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const items = await Project.find(filter)
      .sort(sort)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    return res.status(200).send({ items, total, page, limit: perPage, totalPages });
  } catch (error) {
    console.error('list projects error', error);
    return res.status(500).send({ error: 'Failed to list projects' });
  }
});

// List pending invites for the authenticated user (case-insensitive email match).
// This route is placed before the '/:id' route so the literal path doesn't get
// interpreted as a project id by the '/:id' handler.
router.get('/my-invites', auth, async (req, res) => {
  try {
    const User = require('../models/user');
    const Invitation = require('../models/invitation');
    const Project = require('../models/project');
    const user = await User.findById(req.user && (req.user._id || req.user.id)).lean();
    if (!user) return res.status(404).send({ error: 'User not found' });
    const emailRegex = buildExactCaseInsensitiveRegex(user.email)
    if (!emailRegex) return res.status(400).send({ error: 'Invalid email' })
    const invites = await Invitation.find({ email: { $regex: emailRegex }, accepted: false })
      .sort({ createdAt: -1 })
      .lean();
    const projectIds = [...new Set(invites.map(i => String(i.projectId)))];
    const projects = await Project.find({ _id: { $in: projectIds } }).select('_id name logo').lean();
    const projMap = Object.fromEntries(projects.map(p => [String(p._id), p]));
    const result = invites.map(i => ({
      id: String(i._id),
      email: i.email,
      token: i.token,
      createdAt: i.createdAt,
      project: projMap[String(i.projectId)] || { _id: i.projectId },
    }));
    return res.status(200).send(result);
  } catch (err) {
    console.error('my-invites early handler error', err);
    return res.status(500).send({ error: 'Failed to list invitations' });
  }
});

// DB-backed invoices listing for a project (paginated)
router.get('/:id/invoices', auth, requireObjectIdParam('id'), requireProjectMember, async (req, res) => {
  try {
    const Invoice = require('../models/invoice');
    const id = req.params.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));

    // Ensure project exists
    const project = await Project.findById(id).select('_id');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const query = { projectId: String(id) };
    const total = await Invoice.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const itemsRaw = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = (itemsRaw || []).map(inv => ({
      id: inv.invoiceId,
      ts: inv.createdAt ? (new Date(inv.createdAt)).toISOString() : (inv.createdAt ? inv.createdAt : null),
      amount_due: inv.amount_due != null ? inv.amount_due : null,
      currency: inv.currency || null,
      status: inv.status || null,
      hosted_invoice_url: inv.hosted_invoice_url || null,
      description: inv.description || '',
      subscription: inv.subscriptionId || null,
      metadata: inv.metadata || {}
    }));

    return res.json({ items, total, page, limit, totalPages });
  } catch (err) {
    console.error('projects invoices err', err);
    return res.status(500).json({ error: 'Failed to list invoices from DB' });
  }
});

// Read a single project by ID
router.get('/:id', auth, requireObjectIdParam('id'), requireProjectMember, async (req, res) => {
  try {
    // Do not return project logs by default; they can become very large and there
    // is a dedicated paginated endpoint at GET /api/projects/:id/logs.
    const project = await Project.findById(req.params.id).select('-logs');
    if (!project) {
      return res.status(404).send();
    }
    res.status(200).send(project);
  } catch (error) {
    console.error('[projects] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load project' });
  }
});

// Update a project by ID
router.put('/:id', auth, requireObjectIdParam('id'), requirePermission('projects.update', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const incoming = pickProjectPayload(req.body)
    // Prevent accidental updates to sensitive/system fields via generic project update
    delete incoming.trialStartedAt
    delete incoming.ai
    delete incoming.team
    delete incoming.users
    delete incoming.activities
    delete incoming.issues
    delete incoming.equipment
    delete incoming.templates
    delete incoming.tasks
    delete incoming.spaces
    delete incoming.roleTemplates
    delete incoming.logs
    delete incoming.billingAdminUserId
    delete incoming.billingAdminSetBy
    delete incoming.billingAdminSetAt
    delete incoming.stripeSubscriptionId
    delete incoming.stripePriceId
    delete incoming.stripeSubscriptionStatus
    delete incoming.stripeCurrentPeriodEnd
    delete incoming.stripeCancelAtPeriodEnd
    delete incoming.stripeCanceledAt
    delete incoming.stripeIsPastDue
    delete incoming.stripeLastPaymentStatus
    delete incoming.stripeLastInvoiceId
    delete incoming.stripeLastInvoiceStatus
    delete incoming.stripeDefaultPaymentMethod
    delete incoming.subscriptionTier
    delete incoming.subscriptionFeatures
    delete incoming.trialStarted
    delete incoming.trialStart
    delete incoming.trialEnd
    delete incoming.trialStartedAt
    delete incoming.isActive
    delete incoming.deleted
    delete incoming.status
    delete incoming.lastIssueNumber

    // Sanitize free-form text fields to reduce risk of storing HTML.
    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.location === 'string') {
      incoming.location = sanitizeHtml(String(incoming.location), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    // Basic caps for arrays to avoid huge payloads.
    if (incoming.tags !== undefined) {
      const arr = Array.isArray(incoming.tags) ? incoming.tags : []
      incoming.tags = arr.map(t => String(t).trim()).filter(Boolean).slice(0, 50)
    }
    if (incoming.photos !== undefined) {
      const arr = Array.isArray(incoming.photos) ? incoming.photos : []
      incoming.photos = arr.map(u => String(u).trim()).filter(Boolean).slice(0, 50)
    }
    if (incoming.documents !== undefined) {
      const arr = Array.isArray(incoming.documents) ? incoming.documents : []
      incoming.documents = arr.map(u => String(u).trim()).filter(Boolean).slice(0, 50)
    }

    const project = await Project.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).send();
    }
    res.status(200).send(project);
  } catch (error) {
    console.error('[projects] update error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update project' });
  }
});

// Project AI configuration (Premium only)
router.get('/:id/ai', auth, requireObjectIdParam('id'), requirePermission('projects.update', { projectParam: 'id' }), requireFeature('ai'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('ai').lean()
    if (!project) return res.status(404).send({ error: 'Project not found' })
    const ai = (project && project.ai) ? project.ai : {}
    return res.status(200).send({
      enabled: !!ai.enabled,
      provider: normalizeAiProvider(ai.provider || 'openai'),
      model: ai.model || defaultAiModel(normalizeAiProvider(ai.provider || 'openai')),
      hasKey: !!ai.hasKey,
      lastVerifiedAt: ai.lastVerifiedAt || null,
      updatedAt: ai.updatedAt || null,
    })
  } catch (e) {
    return res.status(500).send({ error: 'Failed to load AI settings' })
  }
})

router.put('/:id/ai', auth, requireObjectIdParam('id'), requirePermission('projects.update', { projectParam: 'id' }), requireActiveProject, requireFeature('ai'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).send({ error: 'Project not found' })

    const enabled = req.body && typeof req.body.enabled === 'boolean' ? req.body.enabled : !!(project.ai && project.ai.enabled)
    const provider = normalizeAiProvider(req.body && req.body.provider ? req.body.provider : ((project.ai && project.ai.provider) || 'openai'))
    const model = req.body && req.body.model ? String(req.body.model).trim() : (project.ai && project.ai.model) || defaultAiModel(provider)

    if (!project.ai) project.ai = {}
    project.ai.enabled = !!enabled
    project.ai.provider = provider
    project.ai.model = model || defaultAiModel(provider)

    // apiKey is optional; if provided as empty string => clear
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'apiKey')) {
      const keyRaw = String((req.body && req.body.apiKey) || '')
      if (!keyRaw.trim()) {
        project.ai.apiKey = { enc: '', iv: '', tag: '' }
        project.ai.hasKey = false
        project.ai.lastVerifiedAt = null
      } else {
        let enc
        try {
          enc = encryptString(keyRaw.trim())
        } catch (err) {
          const msg = err && err.message ? String(err.message) : 'AI_ENCRYPTION_KEY is not configured'
          return res.status(500).send({
            error: msg,
            code: 'AI_ENCRYPTION_KEY_MISSING',
          })
        }
        project.ai.apiKey = enc
        project.ai.hasKey = true
      }
    }

    project.ai.updatedAt = new Date()
    await project.save()

    return res.status(200).send({
      enabled: !!project.ai.enabled,
      provider: normalizeAiProvider(project.ai.provider || 'openai'),
      model: project.ai.model || defaultAiModel(normalizeAiProvider(project.ai.provider || 'openai')),
      hasKey: !!project.ai.hasKey,
      lastVerifiedAt: project.ai.lastVerifiedAt || null,
      updatedAt: project.ai.updatedAt || null,
    })
  } catch (e) {
    const msg = e && e.message ? e.message : 'Failed to save AI settings'
    return res.status(400).send({ error: msg })
  }
})

router.post('/:id/ai/test', auth, requireObjectIdParam('id'), requirePermission('projects.update', { projectParam: 'id' }), requireActiveProject, requireFeature('ai'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('ai.enabled ai.provider ai.model ai.hasKey ai.lastVerifiedAt ai.updatedAt +ai.apiKey.enc +ai.apiKey.iv +ai.apiKey.tag')
    if (!project) return res.status(404).send({ error: 'Project not found' })

    const enabled = !!(project.ai && project.ai.enabled)
    if (!enabled) return res.status(403).send({ error: 'AI is disabled for this project' })

    const provider = normalizeAiProvider(project.ai && project.ai.provider)

    // Prefer project key; fallback to server key if present
    let apiKey = ''
    if (project.ai && project.ai.hasKey) {
      try {
        apiKey = decryptString(project.ai.apiKey || {})
      } catch (err) {
        const msg = err && err.message ? String(err.message) : 'AI_ENCRYPTION_KEY is not configured'
        return res.status(500).send({ error: msg, code: 'AI_ENCRYPTION_KEY_MISSING' })
      }
    } else {
      apiKey =
        provider === 'gemini'
          ? String(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim()
          : provider === 'claude'
            ? String(process.env.ANTHROPIC_API_KEY || '').trim()
            : String(process.env.OPENAI_API_KEY || '').trim()
    }
    if (!apiKey) return res.status(400).send({ error: 'No API key configured for this project' })

    const model = (project.ai && project.ai.model)
      ? String(project.ai.model).trim()
      : (provider === 'gemini' ? (process.env.GEMINI_MODEL || defaultAiModel(provider)) : (process.env.OPENAI_MODEL || defaultAiModel(provider)))

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with: OK' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 10 },
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        const errMsg = (data && data.error && data.error.message) ? data.error.message : `Gemini error (${r.status})`
        return res.status(400).send({ error: errMsg })
      }
    } else if (provider === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with: OK' }] }],
          temperature: 0,
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        const errMsg = (data && data.error && data.error.message) ? data.error.message : `Anthropic error (${r.status})`
        return res.status(400).send({ error: errMsg })
      }
    } else {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a health check.' },
            { role: 'user', content: 'Reply with: OK' },
          ],
          temperature: 0,
          max_tokens: 10,
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        const errMsg = (data && data.error && data.error.message) ? data.error.message : `OpenAI error (${r.status})`
        return res.status(400).send({ error: errMsg })
      }
    }

    project.ai.lastVerifiedAt = new Date()
    project.ai.updatedAt = new Date()
    await project.save()
    return res.status(200).send({ ok: true, lastVerifiedAt: project.ai.lastVerifiedAt })
  } catch (e) {
    const msg = e && e.message ? e.message : 'AI test failed'
    if (/AI_ENCRYPTION_KEY/i.test(String(msg))) {
      return res.status(500).send({ error: String(msg), code: 'AI_ENCRYPTION_KEY_MISSING' })
    }
    return res.status(400).send({ error: msg })
  }
})

// post route to add user to project (with invitation flow)
const Invitation = require('../models/invitation');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { sendInviteEmail } = require('../utils/mailer');

router.post('/addUser', auth, requirePermission('projects.users.manage', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  // Support environments without Mongo replica set by attempting to detect transaction support.
  let session = null;
  let txResult = null;
  try {
    // Basic request validation (avoid cast errors and missing required fields)
    if (!req.body || !req.body.projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(req.body.projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    if (!req.body.email) return res.status(400).send({ error: 'email is required' })
    const email = String(req.body.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send({ error: 'Invalid email' })
    req.body.email = email

    // Detect if server is replica set (supports transactions)
    let isReplica = false;
    try {
      const admin = mongoose.connection.db.admin();
      let info = null;
      try { info = await admin.command({ hello: 1 }) } catch (e) { info = await admin.command({ isMaster: 1 }) }
      isReplica = !!(info && info.setName);
    } catch (e) {
      isReplica = false;
    }

    if (isReplica) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        const project = await Project.findById(req.body.projectId).session(session);
        if (!project) {
          throw { status: 404, error: 'Project not found' };
        }
        // find user by email if they exist in the database
        const user = await User.findOne({ email: req.body.email }).session(session);
        // If user exists, add them directly (if not already present)
        if (user) {
          const userExists = project.team.some((u) => String(u.email).toLowerCase() === String(req.body.email).toLowerCase());
          if (userExists) throw { status: 400, error: 'User is already on the project' };
          // Determine if a role template was selected and copy its permissions
          let memberPermissions = [];
          try {
            const tplId = req.body.roleTemplateId || req.body.templateId || req.body.roleTemplate || null;
            if (tplId) {
              const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(tplId) || String(r._id) === String((tplId && tplId.toString && tplId.toString())) );
              if (tpl && Array.isArray(tpl.permissions)) memberPermissions = tpl.permissions.slice();
            } else if (req.body.role) {
              // allow selecting template by role name
              const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role));
              if (tpl && Array.isArray(tpl.permissions)) memberPermissions = tpl.permissions.slice();
            }
          } catch (e) {
            // best-effort; continue without template if lookup fails
          }

          // Enforce plan team limit
          ensureTeamCapacity(project);
          // Add an invited entry for existing users; they must accept to become active.
          ensureTeamCapacity(project);
          project.team.push({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            company: user.contact?.company || req.body.company || '',
            role: req.body.role,
            permissions: memberPermissions,
            status: 'invited',
          });
          await project.save({ session });
          // Persist an Invitation document as well so the invitee can accept/decline
          // via the standard invitations API. Avoid creating duplicate invites.
          try {
            const emailRegex = buildExactCaseInsensitiveRegex(req.body.email)
            if (!emailRegex) throw new Error('Invalid invite email')
            let existingInvite = await Invitation.findOne({ projectId: project._id, email: { $regex: emailRegex }, accepted: false }).session(session);
            if (!existingInvite) {
              let created = null
              for (let attempt = 0; attempt < 5; attempt++) {
                const token = crypto.randomBytes(20).toString('hex')
                const invitePayload = { email: req.body.email, projectId: project._id, inviterId: (req.user && (req.user._id || req.user.id)), token }
                try {
                  if (req.body.roleTemplateId || req.body.templateId) {
                    const chosenId = req.body.roleTemplateId || req.body.templateId
                    invitePayload.roleTemplateId = chosenId
                    const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(chosenId) || String(r._id) === String((chosenId && chosenId.toString && chosenId.toString())) )
                    if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] }
                  } else if (req.body.role) {
                    const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role))
                    if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] }
                  }
                } catch (e) {}
                const invDoc = new Invitation(invitePayload)
                try {
                  await invDoc.save({ session })
                  created = invDoc
                  existingInvite = created
                  break
                } catch (saveErr) {
                  if (saveErr && saveErr.code === 11000 && /token/.test(String(saveErr.message))) {
                    if (attempt === 4) throw saveErr
                    continue
                  }
                  throw saveErr
                }
              }
            }
          } catch (invErr) {
            console.error('failed to create Invitation for existing user (transaction)', invErr)
          }
          // Do NOT add the project to the user's `projects` list yet — that should
          // happen when they accept the invitation.
          txResult = { status: 200, body: { message: 'User invited to project' } }
          return
        }

        // user does not exist: create an invitation
        const inviterId = req.user && (req.user._id || req.user.id);
        // generate a unique token and guard against rare duplicate-key collisions
        let invite = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const token = crypto.randomBytes(20).toString('hex');
          // Persist chosen template id/snapshot on the invite so it can be applied upon acceptance
          const invitePayload = { email: req.body.email, projectId: project._id, inviterId, token };
          try {
            if (req.body.roleTemplateId || req.body.templateId) {
              const chosenId = req.body.roleTemplateId || req.body.templateId;
              invitePayload.roleTemplateId = chosenId;
              // try to snapshot permissions from project templates
              const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(chosenId) || String(r._id) === String((chosenId && chosenId.toString && chosenId.toString())) );
              if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
            } else if (req.body.role) {
              const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role));
              if (tpl) {
                invitePayload.roleTemplateId = tpl._id;
                invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
              }
            }
          } catch (e) {
            // best-effort; continue without template info if lookup fails
          }

          invite = new Invitation(invitePayload);
          try {
            await invite.save({ session });
            // Add a lightweight invited member entry to the project.team so
            // the invitee appears in project membership lists before they
            // accept. Use the transaction session so this write is atomic.
            try {
              const invitedMember = {
                firstName: (req.body && req.body.firstName) ? String(req.body.firstName).trim() : '',
                lastName: (req.body && req.body.lastName) ? String(req.body.lastName).trim() : '',
                email: String(req.body.email).trim().toLowerCase(),
                company: req.body.company || '',
                role: (invitePayload.roleTemplateSnapshot && invitePayload.roleTemplateSnapshot.name) || req.body.role || 'user',
                permissions: (invitePayload.roleTemplateSnapshot && Array.isArray(invitePayload.roleTemplateSnapshot.permissions)) ? invitePayload.roleTemplateSnapshot.permissions.slice() : [],
                status: 'invited',
              };
              ensureTeamCapacity(project);
              project.team.push(invitedMember);
              await project.save({ session });
            } catch (pushErr) {
              // Best-effort: if adding the invited team entry fails, log but don't
              // fail the whole transaction since invitation itself is primary.
              console.error('failed to add invited team entry (transaction)', pushErr);
            }
            break; // success
          } catch (saveErr) {
            // If duplicate key on token, try again; otherwise rethrow
            if (saveErr && saveErr.code === 11000 && /token/.test(String(saveErr.message))) {
              invite = null;
              if (attempt === 4) throw saveErr;
              // else generate another token and retry
              continue;
            }
            throw saveErr;
          }
        }

        // send invite email with accept link (do not run in transaction because external IO shouldn't be in tx)
        const acceptUrl = `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${invite && invite.token}`;
        try {
          await sendInviteEmail({ to: req.body.email, inviterName: req.body.inviterName || 'A colleague', projectName: project.name, acceptUrl });
        } catch (mailErr) {
          console.error('sendInviteEmail error', mailErr);
          // don't fail the entire request if email fails; invite persisted in DB via transaction
        }

        txResult = { status: 200, body: { message: 'Invitation sent', inviteId: invite._id } }
      })
      session.endSession();
      if (txResult) return res.status(txResult.status).send(txResult.body)
      // fallback
      return res.status(200).send({ message: 'OK' })
    }

    // Non-replica fallback: run the same logic without transactions/session
    {
      const project = await Project.findById(req.body.projectId);
      if (!project) {
        return res.status(404).send({ error: 'Project not found' });
      }
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        const userExists = project.team.some((u) => String(u.email).toLowerCase() === String(req.body.email).toLowerCase());
        if (userExists) return res.status(400).send({ error: 'User is already on the project' });
        let memberPermissions = [];
        try {
          const tplId = req.body.roleTemplateId || req.body.templateId || req.body.roleTemplate || null;
          if (tplId) {
            const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(tplId) || String(r._id) === String((tplId && tplId.toString && tplId.toString())) );
            if (tpl && Array.isArray(tpl.permissions)) memberPermissions = tpl.permissions.slice();
          } else if (req.body.role) {
            const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role));
            if (tpl && Array.isArray(tpl.permissions)) memberPermissions = tpl.permissions.slice();
          }
        } catch (e) {}
        // Add existing user as invited; do not add to user's projects until acceptance
        project.team.push({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          company: user.contact?.company || req.body.company || '',
          role: req.body.role,
          permissions: memberPermissions,
          status: 'invited',
        });
        await project.save();
        // Create an Invitation document so the invited user sees a pending invite
        try {
          const emailRegex = buildExactCaseInsensitiveRegex(req.body.email)
          if (!emailRegex) throw new Error('Invalid invite email')
          let existingInvite = await Invitation.findOne({ projectId: project._id, email: { $regex: emailRegex }, accepted: false });
          if (!existingInvite) {
            let created = null
            for (let attempt = 0; attempt < 5; attempt++) {
              const token = crypto.randomBytes(20).toString('hex')
              const invitePayload = { email: req.body.email, projectId: project._id, inviterId: (req.user && (req.user._id || req.user.id)), token }
              try {
                if (req.body.roleTemplateId || req.body.templateId) {
                  const chosenId = req.body.roleTemplateId || req.body.templateId
                  invitePayload.roleTemplateId = chosenId
                  const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(chosenId) || String(r._id) === String((chosenId && chosenId.toString && chosenId.toString())) );
                  if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
                } else if (req.body.role) {
                  const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role));
                  if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
                }
              } catch (e) {}
              const invDoc = new Invitation(invitePayload);
              try {
                await invDoc.save();
                created = invDoc; existingInvite = created; break;
              } catch (saveErr) {
                if (saveErr && saveErr.code === 11000 && /token/.test(String(saveErr.message))) { if (attempt === 4) throw saveErr; continue }
                throw saveErr;
              }
            }
          }
        } catch (invErr) {
          console.error('failed to create Invitation for existing user', invErr);
        }
        return res.status(200).send({ message: 'User invited to project' })
      }

      // create invite
      let invite = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const token = crypto.randomBytes(20).toString('hex');
        const invitePayload = { email: req.body.email, projectId: project._id, inviterId: (req.user && (req.user._id || req.user.id)), token };
        try {
          if (req.body.roleTemplateId || req.body.templateId) {
            const chosenId = req.body.roleTemplateId || req.body.templateId;
            invitePayload.roleTemplateId = chosenId;
            const tpl = (project.roleTemplates || []).find((r) => String(r._id) === String(chosenId) || String(r._id) === String((chosenId && chosenId.toString && chosenId.toString())) );
            if (tpl) invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
          } else if (req.body.role) {
            const tpl = (project.roleTemplates || []).find((r) => String(r.name) === String(req.body.role));
            if (tpl) {
              invitePayload.roleTemplateId = tpl._id;
              invitePayload.roleTemplateSnapshot = { name: tpl.name, permissions: Array.isArray(tpl.permissions) ? tpl.permissions.slice() : [] };
            }
          }
        } catch (e) {}

        invite = new Invitation(invitePayload);
        try {
          await invite.save();
          // Best-effort: add invited member entry to project.team so the
          // invitee is visible in membership lists before acceptance.
          try {
            const invitedMember = {
              firstName: (req.body && req.body.firstName) ? String(req.body.firstName).trim() : '',
              lastName: (req.body && req.body.lastName) ? String(req.body.lastName).trim() : '',
              email: String(req.body.email).trim().toLowerCase(),
              company: req.body.company || '',
              role: (invitePayload.roleTemplateSnapshot && invitePayload.roleTemplateSnapshot.name) || req.body.role || 'user',
              permissions: (invitePayload.roleTemplateSnapshot && Array.isArray(invitePayload.roleTemplateSnapshot.permissions)) ? invitePayload.roleTemplateSnapshot.permissions.slice() : [],
              status: 'invited',
            };
            ensureTeamCapacity(project);
            project.team.push(invitedMember);
            await project.save();
          } catch (pushErr) {
            console.error('failed to add invited team entry (non-transactional)', pushErr);
          }
          break;
        } catch (saveErr) {
          if (saveErr && saveErr.code === 11000 && /token/.test(String(saveErr.message))) {
            invite = null; if (attempt === 4) throw saveErr; continue;
          }
          throw saveErr;
        }
      }
      const acceptUrl = `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${invite && invite.token}`;
      try { await sendInviteEmail({ to: req.body.email, inviterName: req.body.inviterName || 'A colleague', projectName: project.name, acceptUrl }) } catch (mailErr) { console.error('sendInviteEmail error', mailErr) }
      return res.status(200).send({ message: 'Invitation sent', inviteId: invite._id })
    }
  } catch (error) {
    try { if (session) session.endSession() } catch (e) {}
    if (error && error.status) return res.status(error.status).send({ error: error.error || 'Error' })
    console.error('addUser transaction error', error && error.stack ? error.stack : error);
    if (process.env.NODE_ENV !== 'production') {
      const detail = error && (error.message || JSON.stringify(error))
      return res.status(400).send({ error: 'Failed to add user or create invite', details: detail })
    }
    return res.status(400).send({ error: 'Failed to add user or create invite' })
  }
});

// Accept invitation: authenticated users can accept an invite token and be added to the project
router.post('/accept-invite', auth, async (req, res) => {
  // Support standalone Mongo by detecting replica set support and
  // falling back to a non-transactional path if transactions are not available.
  let session = null;
  try {
    const token = normalizeInviteToken(req.body && req.body.token)
    // Treat malformed/unknown tokens as "not found" to avoid leaking validation details.
    if (!token) return res.status(404).send({ error: 'Invite not found' })

    // detect replica set
    let isReplica = false;
    try {
      const admin = mongoose.connection.db.admin();
      let info = null;
      try { info = await admin.command({ hello: 1 }) } catch (e) { info = await admin.command({ isMaster: 1 }) }
      isReplica = !!(info && info.setName);
    } catch (e) { isReplica = false }

    if (isReplica) {
      session = await mongoose.startSession();
      let txResult = null
      await session.withTransaction(async () => {
        const invite = await Invitation.findOne({ token }).session(session);
        if (!invite) throw { status: 404, error: 'Invite not found' };
        if (invite.accepted) throw { status: 400, error: 'Invite already accepted' };

        const project = await Project.findById(invite.projectId).session(session);
        if (!project) throw { status: 404, error: 'Project not found' };
        if (!isSubscriptionActive(project)) throw { status: 402, error: 'Project subscription inactive or payment required' }

        const user = await User.findById(req.user && (req.user._id || req.user.id)).session(session);
        if (!user) throw { status: 404, error: 'User not found' };

        const existingIndex = project.team.findIndex(t => String(t.email).toLowerCase() === String(user.email).toLowerCase());
        if (existingIndex === -1) {
          const memberObj = { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user', status: 'active' };
          if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
            const snap = invite.roleTemplateSnapshot || null;
            if (snap && Array.isArray(snap.permissions)) memberObj.permissions = snap.permissions.slice();
            if (snap && snap.name) memberObj.role = snap.name;
          }
          ensureTeamCapacity(project);
          project.team.push(memberObj);
          await project.save({ session });
        } else {
          try {
            const existing = project.team[existingIndex];
            existing._id = user._id;
            existing.firstName = user.firstName;
            existing.lastName = user.lastName;
            existing.company = user.contact?.company || existing.company || '';
            existing.status = 'active';
            if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
              const snap = invite.roleTemplateSnapshot || null;
              if (snap && Array.isArray(snap.permissions)) existing.permissions = snap.permissions.slice();
              if (snap && snap.name) existing.role = snap.name;
            } else if (!existing.role) {
              existing.role = existing.role || 'user';
            }
            await project.save({ session });
          } catch (upgradeErr) {
            console.error('failed to upgrade invited team entry during accept (transaction)', upgradeErr);
          }
        }

        const hasProject = (user.projects || []).some((p) => String((p && (p._id || p.id || p))) === String(project._id))
        if (!hasProject) {
          user.projects.push({ _id: project._id, role: 'user', default: false })
          await user.save({ session })
        }

        invite.accepted = true;
        await invite.save({ session });
        txResult = { status: 200, body: { message: 'Invite accepted', projectId: project._id } }
      })
      session.endSession();
      if (txResult) return res.status(txResult.status).send(txResult.body)
      return res.status(200).send({ message: 'Invite accepted', projectId: null })
    }

    // Non-replica fallback: do not use transactions
    const invite = await Invitation.findOne({ token });
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).send({ error: 'Invite already accepted' });

    const project = await Project.findById(invite.projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    if (!isSubscriptionActive(project)) return res.status(402).send({ error: 'Project subscription inactive or payment required' })

    const user = await User.findById(req.user && (req.user._id || req.user.id));
    if (!user) return res.status(404).send({ error: 'User not found' });

    const existingIndex = project.team.findIndex(t => String(t.email).toLowerCase() === String(user.email).toLowerCase());
    if (existingIndex === -1) {
      const memberObj = { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user', status: 'active' };
      if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
        const snap = invite.roleTemplateSnapshot || null;
        if (snap && Array.isArray(snap.permissions)) memberObj.permissions = snap.permissions.slice();
        if (snap && snap.name) memberObj.role = snap.name;
      }
      ensureTeamCapacity(project);
      project.team.push(memberObj);
      await project.save();
    } else {
      try {
        const existing = project.team[existingIndex];
        existing._id = user._id;
        existing.firstName = user.firstName;
        existing.lastName = user.lastName;
        existing.company = user.contact?.company || existing.company || '';
        existing.status = 'active';
        if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
          const snap = invite.roleTemplateSnapshot || null;
          if (snap && Array.isArray(snap.permissions)) existing.permissions = snap.permissions.slice();
          if (snap && snap.name) existing.role = snap.name;
        } else if (!existing.role) {
          existing.role = existing.role || 'user';
        }
        await project.save();
      } catch (upgradeErr) {
        console.error('failed to upgrade invited team entry during accept (non-transactional)', upgradeErr);
      }
    }

    const hasProject = (user.projects || []).some((p) => String((p && (p._id || p.id || p))) === String(project._id))
    if (!hasProject) {
      user.projects.push({ _id: project._id, role: 'user', default: false })
      await user.save()
    }

    invite.accepted = true;
    await invite.save();
    return res.status(200).send({ message: 'Invite accepted', projectId: project._id })
  } catch (err) {
    try { if (session) session.endSession() } catch (e) {}
    if (err && err.status) return res.status(err.status).send({ error: err.error })
    console.error('accept-invite error', err)
    return res.status(400).send({ error: 'Failed to accept invite' })
  }
});

// Accept invitation by ID (alternative to token-based flow when user logs in later)
router.post('/invitations/:id/accept', auth, requireObjectIdParam('id'), async (req, res) => {
  // Support standalone Mongo by detecting replica set support and falling back
  // to a non-transactional path if transactions aren't available.
  let session = null;
  try {
    let isReplica = false;
    try {
      const admin = mongoose.connection.db.admin();
      let info = null;
      try { info = await admin.command({ hello: 1 }) } catch (e) { info = await admin.command({ isMaster: 1 }) }
      isReplica = !!(info && info.setName);
    } catch (e) { isReplica = false }

    if (isReplica) {
      session = await mongoose.startSession();
      let txResult = null
      await session.withTransaction(async () => {
        const inviteId = req.params.id;
        const invite = await Invitation.findById(inviteId).session(session);
        if (!invite) throw { status: 404, error: 'Invite not found' };
        if (invite.accepted) throw { status: 400, error: 'Invite already accepted' };
        const user = await User.findById(req.user && (req.user._id || req.user.id)).session(session);
        if (!user) throw { status: 404, error: 'User not found' };
        if (String(user.email).toLowerCase() !== String(invite.email).toLowerCase()) {
          throw { status: 403, error: 'Invite email mismatch' };
        }
        const project = await Project.findById(invite.projectId).session(session);
        if (!project) throw { status: 404, error: 'Project not found' };
        if (!isSubscriptionActive(project)) throw { status: 402, error: 'Project subscription inactive or payment required' }

        const idx = project.team.findIndex(t => String(t.email).toLowerCase() === String(user.email).toLowerCase());
        if (idx === -1) {
          const memberObj = { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user', status: 'active' };
          if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
            const snap = invite.roleTemplateSnapshot || null;
            if (snap && Array.isArray(snap.permissions)) memberObj.permissions = snap.permissions.slice();
            if (snap && snap.name) memberObj.role = snap.name;
          }
          ensureTeamCapacity(project);
          project.team.push(memberObj);
          await project.save({ session });
        } else {
          try {
            const existing = project.team[idx];
            existing._id = user._id;
            existing.firstName = user.firstName;
            existing.lastName = user.lastName;
            existing.company = user.contact?.company || existing.company || '';
            existing.status = 'active';
            if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
              const snap = invite.roleTemplateSnapshot || null;
              if (snap && Array.isArray(snap.permissions)) existing.permissions = snap.permissions.slice();
              if (snap && snap.name) existing.role = snap.name;
            } else if (!existing.role) {
              existing.role = existing.role || 'user';
            }
            await project.save({ session });
          } catch (upgradeErr) {
            console.error('failed to upgrade invited team entry during accept by id (transaction)', upgradeErr);
          }
        }
        const hasProject = (user.projects || []).some(p => String((p && (p._id || p.id || p))) === String(project._id));
        if (!hasProject) {
          user.projects.push({ _id: project._id, role: 'user', default: false });
          await user.save({ session });
        }
        invite.accepted = true;
        await invite.save({ session });
        txResult = { status: 200, body: { message: 'Invite accepted', projectId: project._id } }
      })
      session.endSession();
      if (txResult) return res.status(txResult.status).send(txResult.body)
      return res.status(200).send({ message: 'Invite accepted', projectId: null })
    }

    // Non-replica fallback
    const inviteId = req.params.id;
    const invite = await Invitation.findById(inviteId);
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).send({ error: 'Invite already accepted' });
    const user = await User.findById(req.user && (req.user._id || req.user.id));
    if (!user) return res.status(404).send({ error: 'User not found' });
    if (String(user.email).toLowerCase() !== String(invite.email).toLowerCase()) return res.status(403).send({ error: 'Invite email mismatch' });
    const project = await Project.findById(invite.projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    if (!isSubscriptionActive(project)) return res.status(402).send({ error: 'Project subscription inactive or payment required' })

    const idx = project.team.findIndex(t => String(t.email).toLowerCase() === String(user.email).toLowerCase());
    if (idx === -1) {
      const memberObj = { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, company: user.contact?.company || '', role: 'user', status: 'active' };
      if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
        const snap = invite.roleTemplateSnapshot || null;
        if (snap && Array.isArray(snap.permissions)) memberObj.permissions = snap.permissions.slice();
        if (snap && snap.name) memberObj.role = snap.name;
      }
      ensureTeamCapacity(project);
      project.team.push(memberObj);
      await project.save();
    } else {
      try {
        const existing = project.team[idx];
        existing._id = user._id;
        existing.firstName = user.firstName;
        existing.lastName = user.lastName;
        existing.company = user.contact?.company || existing.company || '';
        existing.status = 'active';
        if (invite && (invite.roleTemplateSnapshot || invite.roleTemplateId)) {
          const snap = invite.roleTemplateSnapshot || null;
          if (snap && Array.isArray(snap.permissions)) existing.permissions = snap.permissions.slice();
          if (snap && snap.name) existing.role = snap.name;
        } else if (!existing.role) {
          existing.role = existing.role || 'user';
        }
        await project.save();
      } catch (upgradeErr) {
        console.error('failed to upgrade invited team entry during accept by id (non-transactional)', upgradeErr);
      }
    }
    const hasProject = (user.projects || []).some(p => String((p && (p._id || p.id || p))) === String(project._id));
    if (!hasProject) {
      user.projects.push({ _id: project._id, role: 'user', default: false });
      await user.save();
    }
    invite.accepted = true;
    await invite.save();
    return res.status(200).send({ message: 'Invite accepted', projectId: project._id })
  } catch (err) {
    try { if (session) session.endSession() } catch (e) {}
    if (err && err.status) return res.status(err.status).send({ error: err.error })
    console.error('accept invite by id error', err)
    return res.status(400).send({ error: 'Failed to accept invite' })
  }
});

// List invites for a project
router.get('/:id/invites', auth, requireObjectIdParam('id'), requirePermission('projects.users.manage', { projectParam: 'id' }), async (req, res) => {
  try {
    const invites = await Invitation.find({ projectId: req.params.id }).lean();
    return res.status(200).send(invites);
  } catch (err) {
    console.error('list-invites error', err);
    return res.status(500).send({ error: 'Failed to list invites' });
  }
});

// Resend an invitation email
router.post('/:id/resend-invite', auth, requireObjectIdParam('id'), requirePermission('projects.users.manage', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const { inviteId } = req.body;
    if (!inviteId) return res.status(400).send({ error: 'inviteId is required' });
    if (!mongoose.Types.ObjectId.isValid(String(inviteId))) return res.status(400).send({ error: 'Invalid inviteId' })
    const invite = await Invitation.findById(inviteId);
    if (!invite) return res.status(404).send({ error: 'Invite not found' });
    if (String(invite.projectId) !== String(req.params.id)) return res.status(400).send({ error: 'Invite does not belong to project' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const acceptUrl = `${process.env.APP_URL || 'http://localhost:5173'}/register?invite=${invite.token}`;
    try {
      await sendInviteEmail({ to: invite.email, inviterName: 'A colleague', projectName: project.name, acceptUrl });
    } catch (mailErr) {
      console.error('resendInvite email error', mailErr);
      return res.status(500).send({ error: 'Failed to send invite email' });
    }

    // update createdAt to now
    invite.createdAt = new Date();
    await invite.save();

    return res.status(200).send({ message: 'Invitation resent' });
  } catch (err) {
    console.error('resend-invite error', err);
    return res.status(500).send({ error: 'Failed to resend invite' });
  }
});

// Decline (delete) an invitation by ID for the logged-in user
// Allows the invitee to remove an invite they do not want to accept.
router.delete('/invitations/:id', auth, requireObjectIdParam('id'), async (req, res) => {
  try {
    const inviteId = req.params.id
    const invite = await Invitation.findById(inviteId)
    if (!invite) return res.status(404).send({ error: 'Invite not found' })
    const me = await User.findById(req.user && (req.user._id || req.user.id)).lean()
    if (!me) return res.status(404).send({ error: 'User not found' })
    // Security: only the invitee (email match) can decline their invite
    if (String(me.email).toLowerCase() !== String(invite.email).toLowerCase()) {
      return res.status(403).send({ error: 'Not authorized to decline this invite' })
    }
    await Invitation.deleteOne({ _id: invite._id })
    // Also remove any lightweight invited team entry on the project (best-effort).
    try {
      await Project.updateOne({ _id: invite.projectId }, { $pull: { team: { email: String(invite.email).trim().toLowerCase(), status: 'invited' } } });
    } catch (pullErr) {
      console.error('failed to remove invited team entry on decline', pullErr);
    }
    return res.status(200).send({ message: 'Invitation declined' })
  } catch (err) {
    console.error('decline-invite error', err)
    return res.status(500).send({ error: 'Failed to decline invite' })
  }
})

// Set a project as default for a user
router.post('/:id/set-default', auth, requireObjectIdParam('id'), requireProjectMember, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = String(req.user && (req.user._id || req.user.id) || '')
    if (!userId) return res.status(400).send({ error: 'userId is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ error: 'User not found' });

    // Ensure user.projects entries that reference this projectId are updated
    const oldProjects = (user.projects || [])
    user.projects = oldProjects.map((p) => {
      const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
      const isDefault = (pid === String(projectId))
      const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
      return { _id: pid, role, default: isDefault }
    })

    await user.save();

    // sanitize user object before returning
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    if (userObj.password) delete userObj.password;
    // avoid returning internal fields
    if (userObj.__v) delete userObj.__v;

    // Hydrate user.projects with live project data so UI has names immediately
    try {
      const projIds = Array.isArray(userObj.projects)
        ? userObj.projects.map((p) => String(typeof p === 'string' ? p : (p && (p._id || p.id)))).filter(Boolean)
        : []
      if (projIds.length) {
        const unique = Array.from(new Set(projIds))
        const found = await Project.find({ _id: { $in: unique } }).lean()
        const map = {}
        for (const pr of found) map[String(pr._id)] = pr
        userObj.projects = userObj.projects.map((p) => {
          const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
          const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
          const isDefault = Boolean(typeof p === 'object' && p && p.default)
          const pr = map[pid] || null
          return {
            _id: pid,
            name: pr ? pr.name : undefined,
            client: pr ? pr.client : undefined,
            location: pr ? pr.location : undefined,
            project_type: pr ? pr.project_type : undefined,
            status: pr ? pr.status : undefined,
            description: pr ? pr.description : undefined,
            role,
            default: isDefault,
          }
        })
      }
    } catch (e) {
      // fallback: leave minimal shape
    }

    return res.status(200).send({ user: userObj });
  } catch (error) {
    console.error('[projects] change-plan error', error && (error.stack || error.message || error))
    return res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to change plan' });
  }
});

// Change plan (update the price on the existing Stripe subscription item)
// Preserves trial_end when subscription is in trialing state, so trial does not reset.
// const { auth } = require('../middleware/auth');
router.post('/:id/change-plan', auth, requireObjectIdParam('id'), requirePermission('projects.update', { projectParam: 'id' }), async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { priceId, proration_behavior } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });
    if (!isStripeIdLike(priceId, 'price_')) return res.status(400).json({ error: 'Invalid priceId' });
    const prorationBehavior = validateProrationBehavior(proration_behavior);
    if (proration_behavior && !prorationBehavior) return res.status(400).json({ error: 'Invalid proration_behavior' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    // Retrieve subscription
    const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
    const currentItem = sub.items && sub.items.data && sub.items.data[0];
    if (!currentItem) return res.status(400).json({ error: 'Subscription has no items to update' });

    const updateParams = {
      items: [{ id: currentItem.id, price: priceId }],
      // Default to Stripe's prorations unless explicitly disabled by client
      proration_behavior: prorationBehavior || 'create_prorations',
    };
    // If still in trial, explicitly preserve the original trial_end so it cannot be extended/reset
    if (sub.status === 'trialing' && sub.trial_end) {
      updateParams.trial_end = sub.trial_end;
    }

    const updated = await stripe.subscriptions.update(sub.id, updateParams);

    // Mirror to DB (do not extend trialEnd – keep existing or the earlier of the two)
    let nextTrialEnd = project.trialEnd || null;
    const incomingTrialEnd = updated.trial_end ? new Date(updated.trial_end * 1000) : null;
    if (incomingTrialEnd) {
      nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
    }

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionId: updated.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: updated.status,
      stripeCurrentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(updated.status),
      trialEnd: nextTrialEnd || project.trialEnd || null,
      trialStarted: project.trialStarted || Boolean(updated.trial_end),
    });

    return res.json({ ok: true, status: updated.status, priceId });
  } catch (err) {
    console.error('change-plan error', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Delete a project by ID (only project admin or globaladmin allowed)
// Delete a project by ID (require RBAC permission and also ensure project admin/globaladmin)
router.delete('/:id', auth, requireObjectIdParam('id'), requirePermission('projects.delete', { projectParam: 'id' }), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).send({ error: 'Project not found' });
    }

    const userId = req.user && (req.user._id || req.user.id);
    const userEmail = req.user && req.user.email ? String(req.user.email).toLowerCase() : null;
    const userRoles = Array.isArray(req.user && req.user.roles) ? req.user.roles : [];

    // If not a globaladmin, ensure the user is a project admin
    if (!userRoles.includes('globaladmin')) {
      const team = Array.isArray(project.team) ? project.team : [];
      const member = team.find((t) => {
        try {
          if (!t) return false;
          if (t._id && String(t._id) === String(userId)) return true;
          if (t.email && userEmail && String(t.email).toLowerCase() === userEmail) return true;
          return false;
        } catch (e) {
          return false;
        }
      });

      if (!member || !(member.role === 'admin' || member.role === 'globaladmin')) {
        return res.status(403).send({ error: 'Not authorized to delete this project' });
      }
    }

    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).send({ error: 'Project not found' });
    return res.status(200).send(deleted);
  } catch (error) {
    console.error('delete project error', error);
    return res.status(500).send({ error: 'Failed to delete project' });
  }
});

// Project logs: append and read
// GET /api/projects/:id/logs?page=1&limit=50&type=section_created
function isProjectMember(project, user) {
  if (!project || !user) return false
  const userId = String(user._id || user.id || '')
  const userEmail = user.email ? String(user.email).toLowerCase() : ''
  const role = String(user.role || '').toLowerCase()
  if (role === 'globaladmin' || role === 'superadmin') return true
  const team = Array.isArray(project.team) ? project.team : []
  return !!team.find((t) => {
    try {
      if (!t) return false
      if (t._id && String(t._id) === userId) return true
      if (t.email && userEmail && String(t.email).toLowerCase() === userEmail) return true
      return false
    } catch (e) { return false }
  })
}

router.get('/:id/logs', auth, requireObjectIdParam('id'), requireProjectMember, async (req, res) => {
  try {
    const id = req.params.id
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 50))
    const page = Math.max(1, Number(req.query.page) || 1)
    const type = req.query.type ? String(req.query.type) : null
    const project = await Project.findById(id).select('logs').lean()
    if (!project) return res.status(404).send({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).send({ error: 'Forbidden' })
    let logs = Array.isArray(project.logs) ? project.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    // Sort by ts descending; if missing ts, treat as 0
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    const total = logs.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const items = logs.slice(start, start + limit)
    return res.status(200).send({ items, total, page, limit, totalPages })
  } catch (err) {
    console.error('get project logs error', err)
    return res.status(500).send({ error: 'Failed to load logs' })
  }
})

// POST /api/projects/:id/logs -> append one log event
router.post('/:id/logs', auth, requireObjectIdParam('id'), requireProjectMember, requireActiveProject, async (req, res) => {
  try {
    const id = req.params.id
    const project = await Project.findById(id).select('team').lean()
    if (!project) return res.status(404).send({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).send({ error: 'Forbidden' })
    const byFallback = req.user ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || String(req.user._id || req.user.id)) : null
    const event = normalizeLogEvent(req.body, { byFallback })
    if (!event) return res.status(400).send({ error: 'type is required' })
    // Cap total size to last 5000 entries
    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
      { new: true, projection: { _id: 1 } }
    )
    if (!updated) return res.status(404).send({ error: 'Project not found' })
    return res.status(201).send({ ok: true })
  } catch (err) {
    console.error('append project log error', err)
    return res.status(500).send({ error: 'Failed to append log' })
  }
})

// Allow an authenticated user to leave a project. This is atomic on the server:
// - removes the user from the project's team
// - removes the project reference from the user's projects array
// - prevents the last admin from leaving (requires ownership transfer or project delete)
router.post('/:id/leave', auth, requireObjectIdParam('id'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(401).send({ error: 'Please authenticate.' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // Find the team member entry for this user
  const member = project.team.find((t) => String(t._id) === String(userId) || String(t.email).toLowerCase() === String(req.user.email).toLowerCase());
    if (!member) return res.status(400).send({ error: 'You are not a member of this project' });

    // If member is an admin, ensure they're not the last admin
    const adminCount = project.team.reduce((acc, t) => acc + (t.role === 'admin' ? 1 : 0), 0);
    if (member.role === 'admin' && adminCount <= 1) {
      return res.status(400).send({ error: 'Cannot leave project as the last admin. Transfer admin role or delete the project first.' });
    }

    // Remove member from project.team
    project.team = project.team.filter((t) => !(String(t._id) === String(userId) || String(t.email).toLowerCase() === String(req.user.email).toLowerCase()));
    await project.save();

    // Remove project reference from user.projects
    const user = await User.findById(userId);
    if (user) {
      user.projects = (user.projects || []).filter((p) => String(typeof p === 'string' ? p : (p && (p._id || p.id))) !== String(projectId));
      await user.save();
    }

    return res.status(200).send({ message: 'Left project successfully', projectId });
  } catch (err) {
    console.error('leave-project error', err);
    return res.status(500).send({ error: 'Failed to leave project' });
  }
});

// -------------------------
// Project role template management (Phase A)
// - GET  /api/projects/:id/roles        -> list project role templates (project members)
// - POST /api/projects/:id/roles        -> create a project-scoped role template (project admin/globaladmin)
// - PUT  /api/projects/:id/roles/:roleId -> update a template (project admin/globaladmin)
// - DELETE /api/projects/:id/roles/:roleId -> delete a template (project admin/globaladmin)
// -------------------------

// List project role templates: visible to project members (or globaladmin)
router.get('/:id/roles', auth, requireObjectIdParam('id'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // allow globaladmin to view
    const userGlobalRole = String(req.user && req.user.role || '').trim();
    if (userGlobalRole === 'globaladmin') return res.status(200).send({ roleTemplates: project.roleTemplates || [] });

    // ensure user is a project member
    const userId = String(req.user && (req.user._id || req.user.id));
    const member = Array.isArray(project.team) ? project.team.find((t) => String(t._id || t.id) === userId || String((t.email || '')).toLowerCase() === String((req.user.email || '')).toLowerCase()) : null;
    if (!member) return res.status(403).send({ error: 'Forbidden' });

    return res.status(200).send({ roleTemplates: project.roleTemplates || [] });
  } catch (err) {
    console.error('list project role templates error', err);
    return res.status(500).send({ error: 'Failed to list role templates' });
  }
});

// Create a project role template - restricted to project admins or globaladmin via requirePermission
router.post('/:id/roles', auth, requireObjectIdParam('id'), requirePermission('projects.roles.manage', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const { name, description, permissions } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).send({ error: 'name is required' });

    const tpl = {
      name: String(name).trim(),
      description: description ? String(description) : '',
      permissions: Array.isArray(permissions) ? permissions.map(String) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project.roleTemplates = project.roleTemplates || [];
    project.roleTemplates.push(tpl);
    await project.save();

    // return the newly created template (last item)
    const created = project.roleTemplates[project.roleTemplates.length - 1];
    return res.status(201).send({ roleTemplate: created });
  } catch (err) {
    console.error('create project role template error', err);
    return res.status(500).send({ error: 'Failed to create role template' });
  }
});

// Update a project role template
router.put('/:id/roles/:roleId', auth, requireObjectIdParam('id'), requireObjectIdParam('roleId'), requirePermission('projects.roles.manage', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    const roleId = req.params.roleId;
    if (!roleId) return res.status(400).send({ error: 'roleId is required' });

    const idx = project.roleTemplates ? project.roleTemplates.findIndex((r) => String(r._id) === String(roleId)) : -1;
    if (idx === -1) return res.status(404).send({ error: 'Role template not found' });

    const { name, description, permissions } = req.body || {};
    if (typeof name !== 'undefined') project.roleTemplates[idx].name = String(name || project.roleTemplates[idx].name).trim();
    if (typeof description !== 'undefined') project.roleTemplates[idx].description = description ? String(description) : '';
    if (typeof permissions !== 'undefined') project.roleTemplates[idx].permissions = Array.isArray(permissions) ? permissions.map(String) : [];
    project.roleTemplates[idx].updatedAt = new Date();

    await project.save();
    return res.status(200).send({ roleTemplate: project.roleTemplates[idx] });
  } catch (err) {
    console.error('update project role template error', err);
    return res.status(500).send({ error: 'Failed to update role template' });
  }
});

// Delete a project role template
router.delete('/:id/roles/:roleId', auth, requireObjectIdParam('id'), requireObjectIdParam('roleId'), requirePermission('projects.roles.manage', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });
    const roleId = req.params.roleId;
    if (!roleId) return res.status(400).send({ error: 'roleId is required' });

    const before = Array.isArray(project.roleTemplates) ? project.roleTemplates.length : 0;
    project.roleTemplates = (project.roleTemplates || []).filter((r) => String(r._id) !== String(roleId));
    const after = project.roleTemplates.length;
    if (after === before) return res.status(404).send({ error: 'Role template not found' });

    await project.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.error('delete project role template error', err);
    return res.status(500).send({ error: 'Failed to delete role template' });
  }
});

// Update a team member's explicit permissions (project admins or globaladmin)
router.put('/:id/team/:memberId/permissions', auth, requireObjectIdParam('id'), requireObjectIdParam('memberId'), requirePermission('projects.users.manage', { projectParam: 'id' }), requireActiveProject, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    const memberId = req.params.memberId;
    if (!memberId) return res.status(400).send({ error: 'memberId is required' });

    const idx = (project.team || []).findIndex((t) => String(t._id) === String(memberId) || String((t.email || '')).toLowerCase() === String(memberId).toLowerCase());
    if (idx === -1) return res.status(404).send({ error: 'Team member not found' });

    const incoming = req.body && Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : null;
    if (incoming === null) return res.status(400).send({ error: 'permissions array is required' });

    // Optionally update role if provided (allow permissions modal to change role via template)
    const newRole = req.body && req.body.role ? String(req.body.role).trim() : null;

    project.team[idx].permissions = incoming;
    if (newRole) project.team[idx].role = newRole;
    project.team[idx].updatedAt = new Date();
    await project.save();

    return res.status(200).send({ member: project.team[idx] });
  } catch (err) {
    console.error('update member permissions error', err);
    return res.status(500).send({ error: 'Failed to update member permissions' });
  }
});

module.exports = router;
