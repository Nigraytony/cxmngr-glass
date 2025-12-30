const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Issue = require('../models/issue');
const Equipment = require('../models/equipment');
const Project = require('../models/project');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature, enforceLimit } = require('../middleware/planGuard');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { rateLimit } = require('../middleware/rateLimit');
const { requireNotDisabled } = require('../middleware/killSwitch');
const { isObjectId, requireBodyField, requireObjectIdBody, requireObjectIdParam, requireIntParam } = require('../middleware/validate');
const { tryDeleteLocalUpload } = require('../utils/uploads')
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { buildSafeRegex } = require('../utils/search')
const { normalizeLogEvent } = require('../utils/logEvent')

// Defensive: validate `:id` params everywhere in this router to avoid CastErrors and 500s.
router.param('id', (req, res, next, value) => {
  if (!isObjectId(value)) return res.status(400).send({ error: 'Invalid id' })
  return next()
})

function normalizeSortBy(value, allowed, fallback) {
  const s = String(value || '').trim()
  return allowed.has(s) ? s : fallback
}

function normalizeSortDir(value) {
  return String(value || '').toLowerCase() === 'asc' ? 1 : -1
}

function normalizeShortString(value, { maxLen = 64 } = {}) {
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

const LIST_SORT_FIELDS = new Set([
  'updatedAt',
  'createdAt',
  'number',
  'tag',
  'title',
  'type',
  'priority',
  'status',
  'dateFound',
  'dueDate',
])

function isProdEnv() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production'
}

function safeErrorMessage(err, fallback) {
  const fb = fallback || 'Server error'
  if (isProdEnv()) return fb
  const msg = err && (err.message || err.error || (typeof err === 'string' ? err : null))
  return msg ? String(msg) : fb
}

function sendServerError(res, err, fallback) {
  return res.status(500).send({ error: safeErrorMessage(err, fallback) })
}

// multer memory storage for small images
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 } });
// documents uploader (up to ~10MB per file)
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'uploads' })

// Allowed document mime types (match activities routes)
const ALLOWED_DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/zip',
]);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getBackendBaseUrl(req) {
  const envBase = process.env.BACKEND_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 4242}`;
  return `${proto}://${host}`;
}

// Light projection for list responses to avoid pulling large blobs
const LIGHT_FIELDS = 'number tag title type priority severity status projectId spaceId assignedTo responsible_person foundBy dateFound description system location createdAt updatedAt dueDate closedBy closedDate labels recommendation';

// runMiddleware extracted to ../middleware/runMiddleware.js

// Create a new issue (assign project-scoped atomic number)
// Creating an issue is a premium action and requires an active subscription for the project
router.post(
  '/',
  auth,
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requirePermission('issues.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('issues'),
  enforceLimit('issues', async (projectId) => Issue.countDocuments({ projectId })),
  async (req, res) => {
  try {
    const { projectId } = req.body || {};

    // Sanitize rich text fields (Quill HTML) to reduce XSS risk
    if (req.body && req.body.description) {
      req.body.description = sanitizeHtml(String(req.body.description), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          a: ['href', 'name', 'target'],
          img: ['src', 'alt'],
        },
      });
    }
    if (req.body && req.body.recommendation) {
      req.body.recommendation = sanitizeHtml(String(req.body.recommendation), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (req.body && req.body.resolution) {
      req.body.resolution = sanitizeHtml(String(req.body.resolution), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    // Atomically increment a per-project counter (lastIssueNumber)
    // Use findByIdAndUpdate on the Project to $inc lastIssueNumber and get the new value
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { lastIssueNumber: 1 } },
      { new: true, upsert: false }
    );

    if (!updatedProject) return res.status(404).send({ error: 'Project not found' });

    const assignedNumber = updatedProject.lastIssueNumber || 0;

    // Compose the issue with the assigned number to ensure atomic assignment
    const issueData = { ...req.body, number: assignedNumber };
    const issue = new Issue(issueData);
    await issue.save();

    // Add issue to the corresponding project issues array
    updatedProject.issues.push(issue._id);
    await updatedProject.save();

    res.status(201).send(issue);
  } catch (error) {
    console.error('[issues] create error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create issue' });
  }
});

// Read issues (paginated, filtered, light projection, optional facets)
router.get(
  '/',
  auth,
  requireFeature('issues'),
  requirePermission('issues.read', { projectParam: 'projectId' }),
  async (req, res) => {
  try {
	    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
	    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
	    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, 'updatedAt')
	    const sortDir = normalizeSortDir(req.query.sortDir)
	    const projectId = req.query.projectId
	    const includeFacets = String(req.query.includeFacets || '').toLowerCase() === 'true' || String(req.query.includeFacets || '') === '1'

    if (!projectId) {
      return res.status(200).send({ items: [], total: 0, totalAll: 0 })
    }
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) {
      return res.status(400).send({ error: 'Invalid projectId' })
    }

    const filter = { projectId }
    if (req.query.search) {
      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
      if (rx) filter.$or = [
        { tag: { $regex: rx } },
        { title: { $regex: rx } },
        { type: { $regex: rx } },
        { priority: { $regex: rx } },
        { status: { $regex: rx } },
      ]
    }
	    if (req.query.type !== undefined) {
	      const v = normalizeOptionalFilterString(req.query.type)
	      if (v === undefined) return res.status(400).send({ error: 'Invalid type' })
	      if (v) filter.type = v
	    }
	    if (req.query.priority !== undefined) {
	      const v = normalizeOptionalFilterString(req.query.priority)
	      if (v === undefined) return res.status(400).send({ error: 'Invalid priority' })
	      if (v) filter.priority = v
	    }
	    if (req.query.status !== undefined) {
	      const v = normalizeOptionalFilterString(req.query.status)
	      if (v === undefined) return res.status(400).send({ error: 'Invalid status' })
	      if (v) filter.status = v
	    }

    const totalAll = await Issue.countDocuments({ projectId })
    const total = await Issue.countDocuments(filter)
    const items = await Issue.find(filter)
      .select(LIGHT_FIELDS)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()

    let facets = {}
    if (includeFacets) {
      let projectObjectId = null
      try { projectObjectId = new mongoose.Types.ObjectId(projectId) } catch {}
      const projectMatch = projectObjectId ? { projectId: projectObjectId } : { projectId }
      const aggTypes = await Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      const aggPriorities = await Issue.aggregate([
        { $match: projectMatch },
        { $project: { priority: { $ifNull: ['$priority', '$severity'] } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ])
      const aggStatuses = await Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      facets = {
        types: aggTypes.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        priorities: aggPriorities.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        statuses: aggStatuses.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
      }
    }

    res.status(200).send({ items, total, totalAll, ...facets })
  } catch (error) {
    console.error('[issues] list error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to list issues' });
  }
});

// Project-wide issue analytics for charts
router.get('/analytics', auth, requireFeature('issues'), requirePermission('issues.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    const projectObjectId = new mongoose.Types.ObjectId(String(projectId))
    const projectMatch = { projectId: projectObjectId }

    const [
      issuesByStatusAgg,
      issuesByTypeAgg,
      issuesByPriorityAgg,
      issuesBySystemAgg,
      issuesByLocationAgg,
      issuesByEquipmentAgg,
    ] = await Promise.all([
      Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$status', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$type', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: projectMatch },
        { $project: { priority: { $ifNull: ['$priority', '$severity'] } } },
        { $group: { _id: { $ifNull: ['$priority', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$system', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$location', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: projectMatch },
        { $match: { assetId: { $ne: null } } },
        { $group: { _id: '$assetId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
    ])

    const issuesByStatus = Array.isArray(issuesByStatusAgg)
      ? issuesByStatusAgg.map((x) => ({ name: String(x._id || 'Unspecified'), count: Number(x.count || 0) }))
      : []
    const issuesByType = Array.isArray(issuesByTypeAgg)
      ? issuesByTypeAgg.map((x) => ({ name: String(x._id || 'Unspecified'), count: Number(x.count || 0) }))
      : []
    const issuesByPriority = Array.isArray(issuesByPriorityAgg)
      ? issuesByPriorityAgg.map((x) => ({ name: String(x._id || 'Unspecified'), count: Number(x.count || 0) }))
      : []
    const issuesBySystem = Array.isArray(issuesBySystemAgg)
      ? issuesBySystemAgg.map((x) => ({ name: String(x._id || 'Unspecified'), count: Number(x.count || 0) }))
      : []
    const issuesByLocation = Array.isArray(issuesByLocationAgg)
      ? issuesByLocationAgg.map((x) => ({ name: String(x._id || 'Unspecified'), count: Number(x.count || 0) }))
      : []

    const equipmentIds = Array.isArray(issuesByEquipmentAgg) ? issuesByEquipmentAgg.map((x) => x && x._id).filter(Boolean) : []
    let equipmentMap = new Map()
    if (equipmentIds.length) {
      const equip = await Equipment.find({ _id: { $in: equipmentIds } }).select('_id tag title').lean()
      equipmentMap = new Map(equip.map((e) => [String(e._id), e]))
    }
    const issuesByEquipment = Array.isArray(issuesByEquipmentAgg)
      ? issuesByEquipmentAgg.map((x) => {
        const eid = String(x._id || '')
        const e = equipmentMap.get(eid)
        const label = String(e?.tag || e?.title || 'Unknown')
        return { equipmentId: eid, name: label, count: Number(x.count || 0) }
      })
      : []

    return res.status(200).send({
      issuesByStatus,
      issuesByType,
      issuesByPriority,
      issuesBySystem,
      issuesByLocation,
      issuesByEquipment,
    })
  } catch (error) {
    console.error('[issues] analytics error', error && (error.stack || error.message || error))
    return sendServerError(res, error, 'Failed to load analytics')
  }
})

async function loadIssueProjectId(req, res, next) {
  try {
    const issueId = String(req.params.id || '').trim()
    if (!issueId) return res.status(400).send({ error: 'Issue id is required' })
    if (!mongoose.Types.ObjectId.isValid(issueId)) return res.status(400).send({ error: 'Invalid issue id' })
    const issue = await Issue.findById(issueId).select('projectId').lean()
    if (!issue) return res.status(404).send({ error: 'Issue not found' })
    req.query = { ...(req.query || {}), projectId: String(issue.projectId) }
    req.body = req.body || {}
    if (!req.body.projectId) req.body.projectId = issue.projectId
    return next()
  } catch (e) {
    return sendServerError(res, e, 'Failed to resolve issue project')
  }
}

// Read a single issue by ID
router.get('/:id', auth, requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), requirePermission('issues.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).send();
    }
    res.status(200).send(issue);
  } catch (error) {
    console.error('[issues] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load issue' });
  }
});

// Issue logs: read by issue id
router.get('/:id/logs', auth, requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), requirePermission('issues.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).select('logs').lean()
    if (!issue) return res.status(404).send({ error: 'Issue not found' })
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
    const type = req.query.type ? String(req.query.type) : null
    let logs = Array.isArray(issue.logs) ? issue.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    logs = logs.slice(0, limit)
    return res.status(200).send(logs)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load issue logs')
  }
})

// Upload photos for an issue (multipart/form-data)
router.post('/:id/photos', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), uploadLimiter, upload.array('photos', 16), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
    if (!issue) return res.status(404).send({ error: 'Issue not found' })

    // ensure middleware can validate project subscription
    req.body = req.body || {}
    req.body.projectId = issue.projectId

    // Check project-scoped permission then subscription
    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const existingCount = Array.isArray(issue.photos) ? issue.photos.length : 0;
    const incomingFiles = Array.isArray(req.files) ? req.files : [];
    if (existingCount + incomingFiles.length > 16) {
      return res.status(400).send({ error: 'Total photos would exceed maximum of 16' });
    }

    for (const file of incomingFiles) {
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).send({ error: 'Only image files are allowed' });
      }
      if (file.size > 250 * 1024) {
        return res.status(400).send({ error: `File ${file.originalname} exceeds 250KB` });
      }
      const b64 = file.buffer.toString('base64');
      const uploader = req.user || {};
      const uploadedByName = [uploader.firstName, uploader.lastName].filter(Boolean).join(' ') || uploader.email || '';
      const uploadedByAvatar = uploader.avatar || (uploader.contact && uploader.contact.avatar) || '';
      issue.photos.push({
        filename: file.originalname,
        data: `data:${file.mimetype};base64,${b64}`,
        contentType: file.mimetype,
        size: file.size,
        uploadedBy: req.user ? req.user._id : undefined,
        uploadedByName,
        uploadedByAvatar,
        caption: '',
        createdAt: new Date(),
      });
    }

    await issue.save();
    return res.status(200).send(issue);
  } catch (error) {
    console.error('[issues] upload photos error', error && (error.stack || error.message || error))
    return res.status(500).send({ error: 'Upload failed' })
  }
})

// Update an issue by ID
// Updating an issue requires an active subscription. Load the issue first, set projectId so middleware can validate,
// then perform the update if allowed.
router.patch('/:id', auth, requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send();

    // ensure middleware can see the parent project ID
    req.body = req.body || {}
    req.body.projectId = issue.projectId

    // Sanitize rich text fields (Quill HTML) to reduce XSS risk
    if (typeof req.body.description === 'string') {
      req.body.description = sanitizeHtml(String(req.body.description), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          a: ['href', 'name', 'target'],
          img: ['src', 'alt'],
        },
      });
    }
    if (typeof req.body.recommendation === 'string') {
      req.body.recommendation = sanitizeHtml(String(req.body.recommendation), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof req.body.resolution === 'string') {
      req.body.resolution = sanitizeHtml(String(req.body.resolution), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    // require project update permission then subscription
    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    try {
      // If status is transitioning, set/clear closed metadata
      const incoming = req.body || {};
      const prevStatus = String(issue.status || '').toLowerCase();
      const nextStatus = typeof incoming.status === 'string' ? String(incoming.status).toLowerCase() : prevStatus;

      // Helper to format ISO date (YYYY-MM-DD)
      function isoDate(d) {
        try {
          const dt = d instanceof Date ? d : new Date(d);
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        } catch (_) { return undefined }
      }

      const isClosing = nextStatus === 'closed' && prevStatus !== 'closed';
      const isReopening = nextStatus !== 'closed' && prevStatus === 'closed';

      if (isClosing) {
        // If client didn't provide, stamp closedDate/closedBy
        if (!incoming.closedDate) incoming.closedDate = isoDate(new Date());
        if (!incoming.closedBy) {
          const u = req.user || {};
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          incoming.closedBy = name || u.email || 'System';
        }
      }
      if (isReopening) {
        incoming.closedDate = '';
        incoming.closedBy = '';
      }

      const updated = await Issue.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
      if (!updated) return res.status(404).send();
      return res.status(200).send(updated);
    } catch (err) {
      console.error('[issues] update inner error', err && (err.stack || err.message || err))
      return res.status(400).send({ error: err && err.message ? String(err.message) : 'Failed to update issue' });
    }
  } catch (error) {
    console.error('[issues] update error', error && (error.stack || error.message || error))
    return res.status(500).send({ error: 'Failed to update issue' });
  }
});

// Delete an issue by ID
// Deleting an issue requires an active subscription for the parent project. Load the issue, set projectId for middleware,
// then delete if allowed.
router.delete('/:id', auth, requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send();

    req.body = req.body || {}
    req.body.projectId = issue.projectId

    await runMiddleware(req, res, requirePermission('issues.delete', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    try {
      await Issue.findByIdAndDelete(req.params.id);
      // Remove issue from the corresponding project
      const project = await Project.findById(issue.projectId);
      if (project) {
        project.issues.pull(issue._id);
        await project.save();
      }
      return res.status(200).send(issue);
    } catch (err) {
      console.error('[issues] delete inner error', err && (err.stack || err.message || err))
      return res.status(500).send({ error: 'Failed to delete issue' });
    }
  } catch (error) {
    console.error('[issues] delete error', error && (error.stack || error.message || error))
    return res.status(500).send({ error: 'Failed to delete issue' });
  }
});

// POST /api/issues/:id/logs -> append one log event
router.post('/:id/logs', auth, requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), async (req, res) => {
  try {
    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }))
    await runMiddleware(req, res, requireActiveProject)
    const id = req.params.id
    const byFallback = req.user ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || String(req.user._id || req.user.id)) : null
    const event = normalizeLogEvent(req.body, { byFallback })
    if (!event) return res.status(400).send({ error: 'type is required' })
    // Cap total size to last 5000 entries
    const updated = await Issue.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
      { new: true, projection: { _id: 1 } }
    )
    if (!updated) return res.status(404).send({ error: 'Issue not found' })
    return res.status(201).send({ ok: true })
  } catch (err) {
    console.error('append issue log error', err)
    return res.status(500).send({ error: 'Failed to append log' })
  }
})

// Remove a single photo by index for an issue
router.delete('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadIssueProjectId, requireFeature('issues'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const issue = await Issue.findById(req.params.id)
    if (!issue) return res.status(404).send({ error: 'Issue not found' })

    // attach projectId for subscription check
    req.body = req.body || {}
    req.body.projectId = issue.projectId

    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(issue.photos) ? issue.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    arr.splice(idx, 1)
    issue.photos = arr
    await issue.save()
    return res.status(200).send(issue)
  } catch (error) {
    console.error('[issues] remove photo error', error)
    return res.status(500).send({ error: 'Failed to remove photo' })
  }
})

// Upload attachments (documents) for an issue
router.post('/:id/attachments', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadIssueProjectId, requireFeature('issues'), uploadLimiter, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send({ error: 'Issue not found' });

    // ensure subscription guard by injecting projectId
    req.body = req.body || {};
    req.body.projectId = issue.projectId;

    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) return res.status(400).send({ error: 'No files uploaded' });

      let useS3 = !!process.env.S3_BUCKET;
      const urls = [];
      if (useS3) {
        let S3Client, PutObjectCommand;
        try {
          ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
        } catch (e) {
          console.warn('[issues] S3 requested but @aws-sdk/client-s3 not installed; falling back to local storage');
          useS3 = false;
        }
        if (useS3) {
          const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
          for (const f of incoming) {
            if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
              return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
            }
            const key = `issues/${issue._id}/${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: f.buffer, ContentType: f.mimetype }));
            const base = process.env.S3_PUBLIC_BASE || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;
            urls.push({ filename: f.originalname, url: `${base}/${key}`, type: f.mimetype });
          }
        }
      }
      if (!useS3) {
        // Local file storage to /uploads/issues/:id
        const dir = path.join(__dirname, '..', 'uploads', 'issues', String(issue._id));
        ensureDir(dir);
        for (const f of incoming) {
          if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
            return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
          }
          const safeName = `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const fullPath = path.join(dir, safeName);
          fs.writeFileSync(fullPath, f.buffer);
          const base = getBackendBaseUrl(req);
          const url = `${base}/uploads/issues/${issue._id}/${safeName}`;
          urls.push({ filename: f.originalname, url, type: f.mimetype });
        }
      }

      for (const u of urls) {
        issue.attachments.push({ filename: u.filename, url: u.url, type: u.type, uploadedBy: req.user ? req.user._id : undefined, createdAt: new Date() });
      }
      await issue.save();
      return res.status(200).send(issue);
  } catch (error) {
    console.error('[issues] attachments upload error', error && (error.stack || error.message || error));
    return res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove an attachment by index; best-effort delete local file if under uploads
router.delete('/:id/attachments/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadIssueProjectId, requireFeature('issues'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send({ error: 'Issue not found' });

    // attach projectId for subscription check
    req.body = req.body || {};
    req.body.projectId = issue.projectId;

    await runMiddleware(req, res, requirePermission('issues.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(issue.attachments) ? issue.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    issue.attachments = arr;
    await issue.save();

    tryDeleteLocalUpload({ url: removed && removed.url, prefix: 'issues' })

    return res.status(200).send(issue);
  } catch (error) {
    console.error('[issues] remove attachment error', error);
    return res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
