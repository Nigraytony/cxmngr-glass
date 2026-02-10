const express = require('express');
const router = express.Router();
const Space = require('../models/space');
const Equipment = require('../models/equipment');
const Issue = require('../models/issue');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const { requireNotDisabled } = require('../middleware/killSwitch');
const { isObjectId, requireBodyField, requireObjectIdBody, requireObjectIdParam, requireIntParam } = require('../middleware/validate');
const mongoose = require('mongoose');
const runMiddleware = require('../middleware/runMiddleware');
const { rateLimit } = require('../middleware/rateLimit');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { tryDeleteLocalUpload } = require('../utils/uploads')
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
  'tag',
  'title',
  'type',
])

// documents uploader (up to ~10MB per file)
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'uploads' })

// Allowed document mime types (match issues/activities routes)
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

function normalizeOptionalObjectId(value) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null
  if (!mongoose.Types.ObjectId.isValid(s)) return undefined
  return s
}

function pickSpacePayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'tag',
    'title',
    'type',
    'description',
    'parentSpace',
    'attributes',
    'tags',
    'settings',
    'notes',
    'metaData',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

// Middleware to look up space and add project to request for RBAC
const lookupSpaceProject = async (req, res, next) => {
  try {
    const space = await Space.findById(req.params.id).lean();
    if (!space) return res.status(404).send({ error: 'Space not found' });
    req.body.project = space.project;
    req.params.project = space.project;
    next();
  } catch (error) {
    res.status(500).send({ error: 'Error looking up space project' });
  }
};

function normalizeProjectId(req, _res, next) {
  try {
    if (req.body && !req.body.project && req.body.projectId) req.body.project = req.body.projectId
  } catch (_) { /* ignore */ }
  next()
}

// Create a new space
router.post(
  '/',
  auth,
  normalizeProjectId,
  requireBodyField('project'),
  requireObjectIdBody('project'),
  requirePermission('spaces.create', { projectParam: 'project' }),
  requireActiveProject,
  requireFeature('spaces'),
  async (req, res) => {
  // console.log(req.body);
  try {
    // Normalize projectId -> project for callers that use projectId in payload
    if (!req.body.project && req.body.projectId) {
      req.body.project = req.body.projectId;
    }
    // Validate project field
    if (!req.body.project || !mongoose.Types.ObjectId.isValid(req.body.project)) {
      return res.status(400).send({ error: 'Invalid project ID' });
    }

    // Create a new space from request body
    const space = new Space({
      tag: req.body.tag || '',
      title: req.body.title || '',
      type: req.body.type || '',
      description: typeof req.body.description === 'string'
        ? sanitizeHtml(String(req.body.description), { allowedTags: [], allowedAttributes: {} }).trim()
        : (req.body.description || ''),
      project: req.body.project, // Ensure project ID is valid
      parentSpace: req.body.parentSpace || '',
      attributes: Array.isArray(req.body.attributes) ? req.body.attributes : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      attachments: req.body.attachments || '',
      settings: req.body.settings || '',
      notes: typeof req.body.notes === 'string'
        ? sanitizeHtml(String(req.body.notes), { allowedTags: [], allowedAttributes: {} }).trim()
        : (req.body.notes || ''),
      metaData: req.body.metaData || '',
    });

    await space.save(); // Persist to database
    res.status(201).send(space);
  } catch (error) {
    console.error('Error saving space:', error); // Log detailed error
    res.status(400).send({ error: error.message });
  }
});

// Light projection fields for list responses (include description for breadcrumbs/labels if needed)
const LIGHT_FIELDS = 'tag title type project parentSpace description tags createdAt updatedAt parentChain'

async function buildParentChains(projectId, items) {
  if (!projectId || !Array.isArray(items) || items.length === 0) return items
  const parents = await Space.find({ project: projectId }).select('_id title tag parentSpace').lean()
  const map = new Map()
  for (const p of parents) map.set(String(p._id), p)
  const memo = new Map()
  const chainFor = (id) => {
    const key = id ? String(id) : ''
    if (!key) return ''
    if (memo.has(key)) return memo.get(key)
    const parts = []
    let cur = map.get(key)
    let depth = 0
    while (cur && depth < 20) {
      const title = String(cur.title || cur.tag || '').trim()
      if (title) parts.unshift(title)
      const pid = cur.parentSpace || cur.parent || null
      if (!pid) break
      cur = map.get(String(pid))
      depth++
    }
    const chain = parts.join(' > ')
    memo.set(key, chain)
    return chain
  }
  for (const it of items) {
    it.parentChain = chainFor(it.parentSpace)
  }
  return items
}

// Paginated, filtered list (query: projectId required)
router.get('/', auth, requireFeature('spaces'), requirePermission('spaces.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    const includeTypes = String(req.query.includeTypes || '').toLowerCase() === 'true' || String(req.query.includeTypes || '') === '1'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 50))
    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, 'updatedAt')
    const sortDir = normalizeSortDir(req.query.sortDir)
    const filter = { project: projectId }
    if (req.query.type !== undefined) {
      const v = normalizeOptionalFilterString(req.query.type)
      if (v === undefined) return res.status(400).send({ error: 'Invalid type' })
      if (v) filter.type = v
    }
    if (req.query.parentSpace !== undefined) {
      const parentSpace = normalizeOptionalObjectId(req.query.parentSpace)
      if (parentSpace === undefined) return res.status(400).send({ error: 'Invalid parentSpace' })
      if (parentSpace) filter.parentSpace = parentSpace
    }
    if (req.query.search) {
      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
      if (rx) filter.$or = [
        { tag: { $regex: rx } },
        { title: { $regex: rx } },
        { type: { $regex: rx } },
      ]
    }
    const total = await Space.countDocuments(filter)
    let items = await Space.find(filter)
      .select(LIGHT_FIELDS)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()
    await buildParentChains(projectId, items)

    // Counts for current page:
    // - equipmentCount: equipment records whose spaceId == this space
    // - subspacesCount: spaces whose parentSpace == this space id
    // - issuesCount: issues whose spaceId == this space
    const spaceObjectIds = (items || []).map(s => s && s._id).filter(Boolean)
    const spaceIdStrings = spaceObjectIds.map(id => String(id))
    if (spaceObjectIds.length) {
      const projectObjId = new mongoose.Types.ObjectId(String(projectId))
      const [equipAgg, subAgg, issueAgg] = await Promise.all([
        Equipment.aggregate([
          { $match: { projectId: projectObjId, spaceId: { $in: spaceObjectIds } } },
          { $group: { _id: '$spaceId', count: { $sum: 1 } } },
        ]),
        Space.aggregate([
          { $match: { project: projectObjId, parentSpace: { $in: spaceIdStrings } } },
          { $group: { _id: '$parentSpace', count: { $sum: 1 } } },
        ]),
        Issue.aggregate([
          { $match: { projectId: projectObjId, spaceId: { $in: spaceObjectIds } } },
          { $group: { _id: '$spaceId', count: { $sum: 1 } } },
        ]),
      ])

      const equipBySpace = new Map(equipAgg.map(a => [String(a && a._id), Number(a && a.count) || 0]))
      const subBySpace = new Map(subAgg.map(a => [String(a && a._id), Number(a && a.count) || 0]))
      const issuesBySpace = new Map(issueAgg.map(a => [String(a && a._id), Number(a && a.count) || 0]))

      items = items.map(s => {
        const sid = String(s && s._id)
        return {
          ...s,
          equipmentCount: equipBySpace.get(sid) || 0,
          subspacesCount: subBySpace.get(sid) || 0,
          issuesCount: issuesBySpace.get(sid) || 0,
        }
      })
    }
    let types = []
    let typeCounts = {}
    if (includeTypes) {
      const agg = await Space.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      types = agg.map(a => a?._id).filter(Boolean)
      typeCounts = agg.reduce((acc, a) => { acc[a._id] = a.count; return acc }, {})
    }
    res.status(200).send({ items, total, types, typeCounts })
  } catch (error) {
    console.error('[spaces] list error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to list spaces' })
  }
})

// Export helper: fetch per-space linked lists (equipment tags, subspace tags, issue ids)
// Query: projectId required, ids (comma-separated ObjectIds) required
router.get('/export-details', auth, requireFeature('spaces'), requirePermission('spaces.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })

    const rawIds = req.query.ids ?? req.query.spaceIds ?? ''
    const ids = String(rawIds || '')
      .split(',')
      .map(s => String(s || '').trim())
      .filter(Boolean)

    if (!ids.length) return res.status(400).send({ error: 'ids is required' })
    if (ids.length > 200) return res.status(400).send({ error: 'Too many ids (max 200)' })
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid id in ids' })
    }

    const projectObjId = new mongoose.Types.ObjectId(String(projectId))
    const spaceObjectIds = ids.map(id => new mongoose.Types.ObjectId(id))

    const [equipAgg, subAgg, issueAgg] = await Promise.all([
      Equipment.aggregate([
        { $match: { projectId: projectObjId, spaceId: { $in: spaceObjectIds } } },
        { $project: { spaceId: 1, tag: 1 } },
        { $group: { _id: '$spaceId', equipmentTags: { $addToSet: '$tag' }, equipmentIds: { $addToSet: '$_id' } } },
      ]),
      Space.aggregate([
        { $match: { project: projectObjId, parentSpace: { $in: ids } } },
        { $project: { parentSpace: 1, tag: 1 } },
        { $group: { _id: '$parentSpace', subspaceTags: { $addToSet: '$tag' }, subspaceIds: { $addToSet: '$_id' } } },
      ]),
      Issue.aggregate([
        { $match: { projectId: projectObjId, spaceId: { $in: spaceObjectIds } } },
        { $project: { spaceId: 1, number: 1 } },
        { $group: { _id: '$spaceId', issueIds: { $addToSet: '$_id' }, issueNumbers: { $addToSet: '$number' } } },
      ]),
    ])

    const bySpaceId = {}
    for (const id of ids) bySpaceId[String(id)] = { equipmentTags: [], equipmentIds: [], subspaceTags: [], subspaceIds: [], issueIds: [], issueNumbers: [] }

    for (const row of (equipAgg || [])) {
      const sid = String(row && row._id)
      if (!sid) continue
      bySpaceId[sid] = bySpaceId[sid] || { equipmentTags: [], equipmentIds: [], subspaceTags: [], subspaceIds: [], issueIds: [], issueNumbers: [] }
      bySpaceId[sid].equipmentTags = (row.equipmentTags || []).map(v => String(v || '')).filter(Boolean)
      bySpaceId[sid].equipmentIds = (row.equipmentIds || []).map(v => String(v || '')).filter(Boolean)
    }
    for (const row of (subAgg || [])) {
      const sid = String(row && row._id)
      if (!sid) continue
      bySpaceId[sid] = bySpaceId[sid] || { equipmentTags: [], equipmentIds: [], subspaceTags: [], subspaceIds: [], issueIds: [], issueNumbers: [] }
      bySpaceId[sid].subspaceTags = (row.subspaceTags || []).map(v => String(v || '')).filter(Boolean)
      bySpaceId[sid].subspaceIds = (row.subspaceIds || []).map(v => String(v || '')).filter(Boolean)
    }
    for (const row of (issueAgg || [])) {
      const sid = String(row && row._id)
      if (!sid) continue
      bySpaceId[sid] = bySpaceId[sid] || { equipmentTags: [], equipmentIds: [], subspaceTags: [], subspaceIds: [], issueIds: [], issueNumbers: [] }
      bySpaceId[sid].issueIds = (row.issueIds || []).map(v => String(v || '')).filter(Boolean)
      bySpaceId[sid].issueNumbers = (row.issueNumbers || []).filter(v => v !== null && v !== undefined && v !== '').map(v => Number(v)).filter(n => Number.isFinite(n)).sort((a, b) => a - b)
    }

    res.status(200).send({ bySpaceId })
  } catch (error) {
    console.error('[spaces] export-details error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load export details' })
  }
})

// Get all spaces by project ID (light, optional search/filter, pagination)
router.get('/project/:projectId', auth, requireObjectIdParam('projectId'), requirePermission('spaces.read', { projectParam: 'projectId' }), requireFeature('spaces'), async (req, res) => {
  try {
    const includeTypes = String(req.query.includeTypes || '').toLowerCase() === 'true' || String(req.query.includeTypes || '') === '1'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 50))
    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, 'updatedAt')
    const sortDir = normalizeSortDir(req.query.sortDir)
    const filter = { project: req.params.projectId }
    if (req.query.type !== undefined) {
      const v = normalizeOptionalFilterString(req.query.type)
      if (v === undefined) return res.status(400).send({ error: 'Invalid type' })
      if (v) filter.type = v
    }
    if (req.query.parentSpace !== undefined) {
      const parentSpace = normalizeOptionalObjectId(req.query.parentSpace)
      if (parentSpace === undefined) return res.status(400).send({ error: 'Invalid parentSpace' })
      if (parentSpace) filter.parentSpace = parentSpace
    }
    if (req.query.search) {
      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
      if (rx) filter.$or = [
        { tag: { $regex: rx } },
        { title: { $regex: rx } },
        { type: { $regex: rx } },
      ]
    }
    const total = await Space.countDocuments(filter)
    const items = await Space.find(filter)
      .select(LIGHT_FIELDS)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()
    await buildParentChains(req.params.projectId, items)
    let types = []
    let typeCounts = {}
    if (includeTypes) {
      const agg = await Space.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(req.params.projectId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      types = agg.map(a => a?._id).filter(Boolean)
      typeCounts = agg.reduce((acc, a) => { acc[a._id] = a.count; return acc }, {})
    }
    res.status(200).send({ items, total, types, typeCounts })
  } catch (error) {
    console.error('[spaces] list by project error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load spaces' });
  }
});

// Read a single space by ID and find subSpaces (supports light/includeAttachments)
router.get('/:id', auth, requireObjectIdParam('id'), lookupSpaceProject, requirePermission('spaces.read', { projectParam: 'project' }), requireFeature('spaces'), async (req, res) => {
  try {
    const isLight = String(req.query.light || '').toLowerCase() === 'true' || String(req.query.light || '') === '1'
    const includeAttachments = String(req.query.includeAttachments || '').toLowerCase() === 'true' || String(req.query.includeAttachments || '') === '1'
    let query = Space.findById(req.params.id)
    if (isLight) {
      const sel = includeAttachments ? `${LIGHT_FIELDS} attachments` : LIGHT_FIELDS
      query = query.select(sel)
    } else if (!includeAttachments) {
      query = query.select('-attachments -logs -attributes -metaData')
    }
    const space = await query.lean();
    if (!space) {
      return res.status(404).send();
    }
    const subSpaces = await Space.find({ parentSpace: space._id }).select('_id tag title type description parentSpace').lean();
    if (!space.parentChain && space.parentSpace) {
      const chainArr = []
      let cur = await Space.findById(space.parentSpace).select('title tag parentSpace').lean()
      let depth = 0
      while (cur && depth < 20) {
        const title = String(cur.title || cur.tag || '').trim()
        if (title) chainArr.unshift(title)
        if (!cur.parentSpace) break
        cur = await Space.findById(cur.parentSpace).select('title tag parentSpace').lean()
        depth++
      }
      space.parentChain = chainArr.join(' > ')
    }
    res.status(200).send({ ...space, subSpaces });
  } catch (error) {
    console.error('[spaces] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load space' });
  }
});

// Update a space by ID
router.patch('/:id', auth, requireObjectIdParam('id'), lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireActiveProject, requireFeature('spaces'), async (req, res) => {
  // console.log('Updating space:', req.params.id, req.body);
  try {
    const incoming = pickSpacePayload(req.body)
    // Never allow changing ownership or attachments via generic patch
    delete incoming.project
    delete incoming.projectId
    delete incoming.attachments
    delete incoming.logs
    delete incoming.equipment
    delete incoming.subSpaces

    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.notes === 'string') {
      incoming.notes = sanitizeHtml(String(incoming.notes), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    const space = await Space.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    console.error('[spaces] update error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update space' });
  }
});

// Delete a space by ID
router.delete('/:id', auth, requireObjectIdParam('id'), lookupSpaceProject, requirePermission('spaces.delete', { projectParam: 'project' }), requireActiveProject, requireFeature('spaces'), async (req, res) => {
  try {
    const space = await Space.findByIdAndDelete(req.params.id);
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    console.error('[spaces] delete error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to delete space' });
  }
});

  // Space logs: append and read
  // GET /api/spaces/:id/logs?limit=200&type=section_created
  router.get('/:id/logs', auth, requireObjectIdParam('id'), lookupSpaceProject, requireFeature('spaces'), requirePermission('spaces.read', { projectParam: 'project' }), async (req, res) => {
    try {
      const id = req.params.id
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
      const type = req.query.type ? String(req.query.type) : null
      const space = await Space.findById(id).select('logs').lean()
      if (!space) return res.status(404).send({ error: 'Space not found' })
      let logs = Array.isArray(space.logs) ? space.logs.slice() : []
      if (type) logs = logs.filter((e) => e && e.type === type)
      logs.sort((a, b) => {
        const ta = a && a.ts ? new Date(a.ts).getTime() : 0
        const tb = b && b.ts ? new Date(b.ts).getTime() : 0
        return tb - ta
      })
      logs = logs.slice(0, limit)
      return res.status(200).send(logs)
    } catch (err) {
      console.error('get space logs error', err)
      return res.status(500).send({ error: 'Failed to load logs' })
    }
  })

  // POST /api/spaces/:id/logs -> append one log event
  router.post('/:id/logs', auth, requireObjectIdParam('id'), lookupSpaceProject, requireFeature('spaces'), async (req, res) => {
    try {
      await runMiddleware(req, res, requirePermission('spaces.update', { projectParam: 'project' }))
      await runMiddleware(req, res, requireActiveProject)
      const id = req.params.id
      const byFallback = req.user ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || String(req.user._id || req.user.id)) : null
      const event = normalizeLogEvent(req.body, { byFallback })
      if (!event) return res.status(400).send({ error: 'type is required' })
      const updated = await Space.findByIdAndUpdate(
        id,
        { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
        { new: true, projection: { _id: 1 } }
      )
      if (!updated) return res.status(404).send({ error: 'Space not found' })
      return res.status(201).send({ ok: true })
    } catch (err) {
      console.error('append space log error', err)
      return res.status(500).send({ error: 'Failed to append log' })
    }
  })

// Upload attachments (documents) for a space
router.post('/:id/attachments', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireActiveProject, requireFeature('spaces'), uploadLimiter, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).send({ error: 'Space not found' });

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) return res.status(400).send({ error: 'No files uploaded' });

    let useS3 = !!process.env.S3_BUCKET;
    const urls = [];
    if (useS3) {
      let S3Client, PutObjectCommand;
      try {
        ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
      } catch (e) {
        console.warn('[spaces] S3 requested but @aws-sdk/client-s3 not installed; falling back to local storage');
        useS3 = false;
      }
      if (useS3) {
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        for (const f of incoming) {
          if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
            return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
          }
          const key = `spaces/${space._id}/${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: f.buffer, ContentType: f.mimetype }));
          const base = process.env.S3_PUBLIC_BASE || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;
          urls.push({ filename: f.originalname, url: `${base}/${key}`, type: f.mimetype });
        }
      }
    }
    if (!useS3) {
      // Local file storage to /uploads/spaces/:id
      const dir = path.join(__dirname, '..', 'uploads', 'spaces', String(space._id));
      ensureDir(dir);
      for (const f of incoming) {
        if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
          return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
        }
        const safeName = `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, safeName);
        fs.writeFileSync(fullPath, f.buffer);
        const base = getBackendBaseUrl(req);
        const url = `${base}/uploads/spaces/${space._id}/${safeName}`;
        urls.push({ filename: f.originalname, url, type: f.mimetype });
      }
    }

    // Space.attachments is an array of strings (URLs). Append URLs.
    const arr = Array.isArray(space.attachments) ? space.attachments : [];
    for (const u of urls) arr.push(u.url);
    space.attachments = arr;
    await space.save();
    return res.status(200).send(space);
  } catch (error) {
    console.error('[spaces] attachments upload error', error && (error.stack || error.message || error));
    return res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove an attachment by index for a space; best-effort delete local file if under uploads
router.delete('/:id/attachments/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireActiveProject, requireFeature('spaces'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).send({ error: 'Space not found' });

    const arr = Array.isArray(space.attachments) ? space.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    space.attachments = arr;
    await space.save();

    // Best-effort delete local file (only if under /uploads/spaces/)
    tryDeleteLocalUpload({ url: removed ? String(removed) : '', prefix: 'spaces' })

    return res.status(200).send(space);
  } catch (error) {
    console.error('[spaces] remove attachment error', error);
    return res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
