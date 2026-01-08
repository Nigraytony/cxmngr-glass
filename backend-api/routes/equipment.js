const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Equipment = require('../models/equipment');
const Project = require('../models/project');
const Space = require('../models/space');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature, enforceLimit } = require('../middleware/planGuard');
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  'system',
  'status',
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
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'uploads' })

async function loadEquipmentProjectId(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).send({ error: 'Equipment id is required' })
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid equipment id' })
    const equipment = await Equipment.findById(id).select('projectId').lean()
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' })
    req.query = { ...(req.query || {}), projectId: String(equipment.projectId) }
    req.body = req.body || {}
    if (!req.body.projectId) req.body.projectId = equipment.projectId
    return next()
  } catch (e) {
    return sendServerError(res, e, 'Failed to resolve equipment project')
  }
}

function pickEquipmentPayload(source) {
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
    'checklists',
    'functionalTests',
    'fptSignatures',
    'components',
    'images',
    'history',
    'labels',
    'tags',
    'metadata',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

const ALLOWED_DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/zip',
]);

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }
function getBackendBaseUrl(req) {
  const envBase = process.env.BACKEND_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 4242}`;
  return `${proto}://${host}`;
}

// runMiddleware extracted to ../middleware/runMiddleware.js

// Create a new equipment
router.post(
  '/',
  auth,
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requirePermission('equipment.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('equipment'),
  enforceLimit('equipment', async (projectId) => Equipment.countDocuments({ projectId })),
  async (req, res) => {
  try {
    const payload = pickEquipmentPayload(req.body)
    // Disallow clients from setting heavy media arrays on create; use upload endpoints.
    delete payload.photos
    delete payload.attachments
    delete payload.issues
    delete payload.logs

    if (typeof payload.description === 'string') {
      payload.description = sanitizeHtml(String(payload.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.labels === 'string') {
      payload.labels = sanitizeHtml(String(payload.labels), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.metadata === 'string') {
      payload.metadata = sanitizeHtml(String(payload.metadata), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    const equipment = new Equipment(payload);
    await equipment.save();

    // Add equipment to the corresponding project
    // const project = await Project.findById(equipment.projectId);
    // project.equipment.push(equipment._id);
    // await project.save();

    res.status(201).send(equipment);
  } catch (error) {
    console.error('[equipment] create error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create equipment' });
  }
});

function toPlainEquipment(doc) {
  if (!doc) return doc
  const e = (typeof doc.toObject === 'function') ? doc.toObject() : JSON.parse(JSON.stringify(doc))
  // Backward compatibility: parse stringified JSON fields
  if (typeof e.checklists === 'string') {
    try { e.checklists = JSON.parse(e.checklists) } catch { e.checklists = [] }
  }
  if (!Array.isArray(e.checklists)) e.checklists = []
  if (typeof e.functionalTests === 'string') {
    try { e.functionalTests = JSON.parse(e.functionalTests) } catch { e.functionalTests = [] }
  }
  if (!Array.isArray(e.functionalTests)) e.functionalTests = []
  // Back-compat: signatures may be stored as stringified JSON in some records
  if (typeof e.fptSignatures === 'string') {
    try { e.fptSignatures = JSON.parse(e.fptSignatures) } catch { e.fptSignatures = [] }
  }
  if (!Array.isArray(e.fptSignatures)) e.fptSignatures = []
  return e
}

// Equipment logs: append and read
// GET /api/equipment/:id/logs?limit=200&type=section_created
router.get('/:id/logs', auth, requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const id = req.params.id
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
    const type = req.query.type ? String(req.query.type) : null
    const equipment = await Equipment.findById(id).select('logs').lean()
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' })
    let logs = Array.isArray(equipment.logs) ? equipment.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    logs = logs.slice(0, limit)
    return res.status(200).send(logs)
  } catch (err) {
    console.error('get equipment logs error', err)
    return res.status(500).send({ error: 'Failed to load logs' })
  }
})

// POST /api/equipment/:id/logs -> append one log event
router.post('/:id/logs', auth, requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), requirePermission('equipment.update', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  try {
    const id = req.params.id
    const byFallback = req.user ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || String(req.user._id || req.user.id)) : null
    const event = normalizeLogEvent(req.body, { byFallback })
    if (!event) return res.status(400).send({ error: 'type is required' })
    const updated = await Equipment.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
      { new: true, projection: { _id: 1 } }
    )
    if (!updated) return res.status(404).send({ error: 'Equipment not found' })
    return res.status(201).send({ ok: true })
  } catch (err) {
    console.error('append equipment log error', err)
    return res.status(500).send({ error: 'Failed to append log' })
  }
})

// Projection for list/light responses (omit heavy fields)
const LIGHT_FIELDS = 'number tag title type system status projectId spaceId space responsible template orderDate installationDate balanceDate testDate labels tags metadata createdAt updatedAt'

function countArrayExpr(field) {
  return { $cond: [{ $isArray: field }, { $size: field }, 0] }
}

function normalizeBoolFlag(value) {
  const s = String(value ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on'
}

function appendExpr(filter, expr) {
  if (!expr) return
  if (!filter.$expr) {
    filter.$expr = expr
    return
  }
  if (filter.$expr && typeof filter.$expr === 'object' && Array.isArray(filter.$expr.$and)) {
    filter.$expr.$and.push(expr)
    return
  }
  filter.$expr = { $and: [filter.$expr, expr] }
}

function applyHasFilters(filter, query) {
  // Use simple query operators (more Mongo-compatible) instead of $expr pipelines.
  // This avoids 500s on some Mongo-compatible backends.
  if (normalizeBoolFlag(query?.hasChecklists)) filter['checklists.0'] = { $exists: true }
  if (normalizeBoolFlag(query?.hasFpt)) filter['functionalTests.0'] = { $exists: true }
  if (normalizeBoolFlag(query?.hasIssues)) filter['issues.0'] = { $exists: true }

  const checklistSystem = normalizeOptionalFilterString(query?.checklistSystem, { maxLen: 64 })
  if (checklistSystem === undefined) return 'Invalid checklistSystem'
  if (checklistSystem) {
    // Match any checklist section with a system label (case-insensitive exact match).
    // Note: legacy records with stringified checklists won't match this filter, but will not 500.
    filter['checklists.system'] = { $regex: new RegExp(`^${escapeRegex(checklistSystem)}$`, 'i') }
  }
  return null
}

function checklistSystemsExpr() {
  // Extract checklist.system for each checklist section; omit empty values.
  const raw = {
    $map: {
      input: { $cond: [{ $isArray: '$checklists' }, '$checklists', []] },
      as: 'c',
      in: { $ifNull: ['$$c.system', null] },
    },
  }
  return {
    $filter: {
      input: raw,
      as: 's',
      cond: { $and: [{ $ne: ['$$s', null] }, { $ne: ['$$s', ''] }] },
    },
  }
}

function checklistSystemCountsExpr() {
  const systems = checklistSystemsExpr()
  const unique = { $setUnion: [systems, []] }
  return {
    $map: {
      input: unique,
      as: 'sys',
      in: {
        system: '$$sys',
        count: {
          $size: {
            $filter: {
              input: systems,
              as: 's',
              cond: { $eq: ['$$s', '$$sys'] },
            },
          },
        },
      },
    },
  }
}

async function buildSpaceChainResolver(projectId) {
  const spaces = await Space.find({ project: projectId }).select('_id id title tag parentSpace parent').lean()
  const map = new Map()
  for (const s of spaces) {
    const id = String(s._id || s.id || '')
    if (!id) continue
    map.set(id, { ...s, id })
  }
  const cache = new Map()
  return function chainFor(spaceId) {
    const sid = String(spaceId || '')
    if (!sid) return ''
    if (cache.has(sid)) return cache.get(sid)
    const parts = []
    const seen = new Set()
    let cur = map.get(sid)
    let depth = 0
    while (cur && !seen.has(cur.id) && depth < 25) {
      seen.add(cur.id)
      const title = String(cur.title || cur.tag || '').trim()
      if (title) parts.unshift(title)
      const parentId = cur.parentSpace || cur.parent
      if (!parentId) break
      cur = map.get(String(parentId))
      depth += 1
    }
    const chain = parts.join(' > ')
    cache.set(sid, chain)
    return chain
  }
}

// Project-wide equipment analytics for charts (counts + progress)
router.get('/analytics', auth, requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    const projectObjectId = new mongoose.Types.ObjectId(String(projectId))
    const projectMatch = { projectId: projectObjectId }

    const [
      equipmentBySystemAgg,
      equipmentByStatusAgg,
      checklistsBySystemAgg,
      issuesByEquipmentSystemAgg,
      checklistProgressAgg,
      fptProgressAgg,
    ] = await Promise.all([
      Equipment.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$system', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Equipment.aggregate([
        { $match: projectMatch },
        { $group: { _id: { $ifNull: ['$status', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Equipment.aggregate([
        { $match: projectMatch },
        { $project: { checklistsBySystem: checklistSystemCountsExpr() } },
        { $unwind: { path: '$checklistsBySystem', preserveNullAndEmptyArrays: false } },
        { $match: { 'checklistsBySystem.system': { $nin: [null, ''] } } },
        {
          $group: {
            _id: '$checklistsBySystem.system',
            system: { $first: '$checklistsBySystem.system' },
            checklistsCount: { $sum: { $ifNull: ['$checklistsBySystem.count', 0] } },
            equipmentCount: { $sum: 1 },
          },
        },
        { $sort: { system: 1 } },
      ]),
      Equipment.aggregate([
        { $match: projectMatch },
        {
          $project: {
            system: { $ifNull: ['$system', 'Unknown'] },
            issuesCount: countArrayExpr('$issues'),
          },
        },
        { $group: { _id: '$system', system: { $first: '$system' }, issuesCount: { $sum: '$issuesCount' } } },
        { $sort: { system: 1 } },
      ]),
      Equipment.aggregate([
        { $match: projectMatch },
        { $project: { checklists: { $cond: [{ $isArray: '$checklists' }, '$checklists', []] } } },
        { $unwind: { path: '$checklists', preserveNullAndEmptyArrays: true } },
        { $project: { question: '$checklists.questions' } },
        { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalQuestions: { $sum: { $cond: [{ $ne: ['$question', null] }, 1, 0] } },
            answeredQuestions: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$question', null] },
                      {
                        $or: [
                          { $eq: ['$question.done', true] },
                          { $eq: ['$question.is_complete', true] },
                          {
                            $and: [
                              { $ne: ['$question.answer', null] },
                              {
                                $ne: [
                                  { $convert: { input: '$question.answer', to: 'string', onError: '', onNull: '' } },
                                  '',
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Equipment.aggregate([
        { $match: projectMatch },
        { $project: { functionalTests: { $cond: [{ $isArray: '$functionalTests' }, '$functionalTests', []] } } },
        { $unwind: { path: '$functionalTests', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalTests: { $sum: { $cond: [{ $ne: ['$functionalTests', null] }, 1, 0] } },
            doneTests: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$functionalTests', null] },
                      {
                        $or: [
                          { $eq: ['$functionalTests.pass', true] },
                          { $eq: ['$functionalTests.pass', false] },
                          { $eq: ['$functionalTests.done', true] },
                          { $eq: ['$functionalTests.is_complete', true] },
                          {
                            $and: [
                              { $ne: ['$functionalTests.answer', null] },
                              {
                                $ne: [
                                  { $convert: { input: '$functionalTests.answer', to: 'string', onError: '', onNull: '' } },
                                  '',
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            passTests: { $sum: { $cond: [{ $eq: ['$functionalTests.pass', true] }, 1, 0] } },
            failTests: { $sum: { $cond: [{ $eq: ['$functionalTests.pass', false] }, 1, 0] } },
          },
        },
      ]),
    ])

    const equipmentBySystem = Array.isArray(equipmentBySystemAgg)
      ? equipmentBySystemAgg.map((x) => ({ name: String(x?._id || 'Unknown'), count: Number(x?.count || 0) }))
      : []
    const equipmentByStatus = Array.isArray(equipmentByStatusAgg)
      ? equipmentByStatusAgg.map((x) => ({ name: String(x?._id || 'Unknown'), count: Number(x?.count || 0) }))
      : []
    const checklistsBySystem = Array.isArray(checklistsBySystemAgg)
      ? checklistsBySystemAgg
          .filter((x) => x && x.system)
          .map((x) => ({
            system: String(x.system),
            checklistsCount: Number(x.checklistsCount || 0),
            equipmentCount: Number(x.equipmentCount || 0),
          }))
      : []
    const issuesByEquipmentSystem = Array.isArray(issuesByEquipmentSystemAgg)
      ? issuesByEquipmentSystemAgg
          .filter((x) => x && x.system)
          .map((x) => ({ system: String(x.system), issuesCount: Number(x.issuesCount || 0) }))
      : []

    const checklistTotals = (Array.isArray(checklistProgressAgg) && checklistProgressAgg[0]) ? checklistProgressAgg[0] : {}
    const totalQuestions = Number(checklistTotals.totalQuestions || 0)
    const answeredQuestions = Number(checklistTotals.answeredQuestions || 0)
    const checklistProgressPct = totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

    const fptTotals = (Array.isArray(fptProgressAgg) && fptProgressAgg[0]) ? fptProgressAgg[0] : {}
    const totalTests = Number(fptTotals.totalTests || 0)
    const doneTests = Number(fptTotals.doneTests || 0)
    const passTests = Number(fptTotals.passTests || 0)
    const failTests = Number(fptTotals.failTests || 0)
    const fptProgressPct = totalTests ? Math.round((doneTests / totalTests) * 100) : 0

    return res.status(200).send({
      equipmentBySystem,
      equipmentByStatus,
      checklistsBySystem,
      issuesByEquipmentSystem,
      checklistProgress: { answeredQuestions, totalQuestions, pct: checklistProgressPct },
      fptProgress: { doneTests, totalTests, pct: fptProgressPct, passTests, failTests },
    })
  } catch (error) {
    console.error('[equipment] analytics error', error && (error.stack || error.message || error))
    return res.status(500).send({ error: 'Failed to load equipment analytics' })
  }
})

function safeArrayLen(value) {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch (e) {
      return 0
    }
  }
  return 0
}

function safeChecklistsArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }
  return []
}

function checklistSystemCountsFromChecklists(checklists) {
  const items = safeChecklistsArray(checklists)
  const counts = new Map()
  for (const c of items) {
    const sys = c && typeof c === 'object' ? String(c.system || '').trim() : ''
    if (!sys) continue
    counts.set(sys, (counts.get(sys) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([system, count]) => ({ system, count }))
    .sort((a, b) => String(a.system).localeCompare(String(b.system)))
}

// Read all equipment (paginated, filtered, light projection)
router.get('/', auth, requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
	    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
	    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
	    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, 'updatedAt')
	    const sortDir = normalizeSortDir(req.query.sortDir)
	    const projectId = req.query.projectId
	    const includeFacets = String(req.query.includeFacets || '').toLowerCase() === 'true' || String(req.query.includeFacets || '') === '1'

    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })

    const projectObjectId = new mongoose.Types.ObjectId(String(projectId))
    const filter = { projectId: projectObjectId }
    const hasErr = applyHasFilters(filter, req.query)
    if (hasErr) return res.status(400).send({ error: hasErr })
	    if (req.query.search) {
	      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
	      if (rx) filter.$or = [
	        { tag: { $regex: rx } },
	        { title: { $regex: rx } },
	        { type: { $regex: rx } },
	        { system: { $regex: rx } },
	      ]
	    }
		    if (req.query.type !== undefined) {
		      const v = normalizeOptionalFilterString(req.query.type)
		      if (v === undefined) return res.status(400).send({ error: 'Invalid type' })
		      if (v) filter.type = v
		    }
		    if (req.query.system !== undefined) {
		      const v = normalizeOptionalFilterString(req.query.system)
		      if (v === undefined) return res.status(400).send({ error: 'Invalid system' })
		      if (v) filter.system = v
		    }
		    if (req.query.status !== undefined) {
		      const v = normalizeOptionalFilterString(req.query.status)
		      if (v === undefined) return res.status(400).send({ error: 'Invalid status' })
		      if (v) filter.status = v
		    }

    const totalAll = await Equipment.countDocuments({ projectId: projectObjectId })
    const total = await Equipment.countDocuments(filter)

    // Avoid aggregation operators here (Cosmos/Mongo-compatible backends can be picky).
    // Use a plain query and compute counts/derived fields in JS.
    const docs = await Equipment.find(filter)
      .sort({ [sortBy]: sortDir, _id: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .select(`${LIGHT_FIELDS} issues checklists functionalTests`)
      .lean()

    const items = (docs || []).map((it) => {
      const issuesCount = safeArrayLen(it && it.issues)
      const checklistsCount = safeArrayLen(it && it.checklists)
      const fptCount = safeArrayLen(it && it.functionalTests)
      const checklistsBySystem = checklistSystemCountsFromChecklists(it && it.checklists)
      const out = { ...(it || {}) }
      out.issuesCount = issuesCount
      out.checklistsCount = checklistsCount
      out.fptCount = fptCount
      out.checklistsBySystem = checklistsBySystem
      delete out.issues
      delete out.checklists
      delete out.functionalTests
      return out
    })
    for (const it of items) {
      if (Array.isArray(it.checklistsBySystem)) {
        it.checklistsBySystem = it.checklistsBySystem
          .filter((x) => x && x.system && Number(x.count) > 0)
          .sort((a, b) => String(a.system).localeCompare(String(b.system)))
      } else {
        it.checklistsBySystem = []
      }
    }
    // Enrich with space breadcrumb chains (server-side to avoid extra client lookups)
    let spaceChainFor = null
    if (items.some(it => it.spaceId)) {
      try {
        spaceChainFor = await buildSpaceChainResolver(projectObjectId)
      } catch (e) {
        spaceChainFor = null
      }
    }
    if (spaceChainFor) {
      for (const it of items) {
        if (!it) continue
        const sid = it.spaceId || it.space
        if (sid) it.spaceChain = spaceChainFor(sid)
      }
    }
    let facets = {}
    if (includeFacets) {
      // Facets should reflect the entire project (not just the current page or search filter)
      // If a facet aggregation fails for any reason, degrade gracefully (items still load).
      try {
        const projectMatch = { projectId: projectObjectId }
        const aggTypes = await Equipment.aggregate([
          { $match: projectMatch },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ])
        const aggStatuses = await Equipment.aggregate([
          { $match: projectMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        const aggSystems = await Equipment.aggregate([
          { $match: projectMatch },
          { $group: { _id: '$system', count: { $sum: 1 } } },
        ])
        const aggChecklistCounts = await Equipment.aggregate([
          { $match: projectMatch },
          {
            $project: {
              checklistsCount: countArrayExpr('$checklists'),
              checklistsBySystem: checklistSystemCountsExpr(),
            },
          },
          {
            $facet: {
              total: [
                { $group: { _id: null, count: { $sum: '$checklistsCount' } } },
              ],
              systems: [
                { $unwind: '$checklistsBySystem' },
                {
                  $group: {
                    _id: { $toLower: { $ifNull: ['$checklistsBySystem.system', ''] } },
                    system: { $first: '$checklistsBySystem.system' },
                    count: { $sum: { $ifNull: ['$checklistsBySystem.count', 0] } },
                  },
                },
                { $match: { system: { $ne: null } } },
                { $sort: { system: 1 } },
              ],
            },
          },
        ])
        const checklistsTotalCount = Number(aggChecklistCounts?.[0]?.total?.[0]?.count || 0)
        const checklistSystems = Array.isArray(aggChecklistCounts?.[0]?.systems)
          ? aggChecklistCounts[0].systems
              .filter((x) => x && x.system && Number(x.count) > 0)
              .map((x) => ({ system: x.system, count: Number(x.count) || 0 }))
          : []

        const aggCounts = await Equipment.aggregate([
          { $match: projectMatch },
          {
            $project: {
              issuesCount: countArrayExpr('$issues'),
              fptCount: countArrayExpr('$functionalTests'),
            },
          },
          {
            $group: {
              _id: null,
              issuesTotalCount: { $sum: '$issuesCount' },
              fptTotalCount: { $sum: '$fptCount' },
            },
          },
        ])
        const issuesTotalCount = Number(aggCounts?.[0]?.issuesTotalCount || 0)
        const fptTotalCount = Number(aggCounts?.[0]?.fptTotalCount || 0)
        facets = {
          types: aggTypes.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
          statuses: aggStatuses.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
          systems: aggSystems.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
          checklistsTotalCount,
          checklistSystems,
          issuesTotalCount,
          fptTotalCount,
        }
      } catch (e) {
        console.error('[equipment] facets error', { reqId: req.id, error: e && (e.stack || e.message || e) })
        facets = {}
      }
    }

    res.status(200).send({ items, total, totalAll, ...facets })
  } catch (error) {
    console.error('[equipment] list error', { reqId: req.id, error: error && (error.stack || error.message || error) })
    res.status(500).send({ error: 'Failed to list equipment', reqId: req.id || null });
  }
});

// Export equipment as CSV (all records matching filters for a project)
router.get('/export', auth, requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    const filter = { projectId }
    const hasErr = applyHasFilters(filter, req.query)
    if (hasErr) return res.status(400).send({ error: hasErr })
    if (req.query.type) filter.type = req.query.type
    if (req.query.system) filter.system = req.query.system
    if (req.query.status) filter.status = req.query.status
    if (req.query.search) {
      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
      if (rx) filter.$or = [
        { tag: { $regex: rx } },
        { title: { $regex: rx } },
        { type: { $regex: rx } },
        { system: { $regex: rx } },
      ]
    }
    const items = await Equipment.find(filter).lean()
    const records = items.map(toPlainEquipment)
    const headers = ['id','tag','type','title','system','status','spaceId','description','attributes','components','checklists','functionalTests','template','images','attachments','projectId']
    const sanitizeMedia = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr.map(m => {
        const out = {}
        if (m && m.filename) out.filename = m.filename
        if (m && m.url) out.url = m.url
        if (m && m.caption) out.caption = m.caption
        return out
      })
    }
    const esc = (val) => {
      const s = String(val ?? '')
      const needsQuotes = /[",\n\r]/.test(s) || s.includes(',')
      const doubled = s.replace(/"/g, '""')
      return needsQuotes ? `"${doubled}"` : doubled
    }
    const rows = []
    rows.push(headers.join(','))
    for (const r of records) {
      const attrsJson = JSON.stringify(r.attributes || r.metadata?.attributes || {})
      const compsJson = JSON.stringify(r.components || [])
      const checksJson = JSON.stringify(r.checklists || [])
      const fptJson = JSON.stringify(r.functionalTests || [])
      const imgsJson = JSON.stringify(sanitizeMedia(r.images || r.photos || []))
      const attsJson = JSON.stringify(sanitizeMedia(r.attachments || []))
      const row = [
        String(r._id || r.id || ''),
        String(r.tag || ''),
        String(r.type || ''),
        String(r.title || ''),
        String(r.system || ''),
        String(r.status || ''),
        String(r.spaceId || r.space || ''),
        String(r.description || ''),
        attrsJson || '',
        compsJson || '',
        checksJson || '',
        fptJson || '',
        String(r.template || ''),
        imgsJson || '',
        attsJson || '',
        String(r.projectId || ''),
      ]
      rows.push(row.map(esc).join(','))
    }
    const csv = '\ufeff' + rows.join('\r\n')
    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="equipment-export.csv"')
    return res.status(200).send(csv)
  } catch (error) {
    console.error('[equipment/export] error', error)
    return res.status(500).send({ error: 'Failed to export equipment' })
  }
})

// Read all equipment by project ID (light projection)
router.get('/project/:projectId', auth, requireObjectIdParam('projectId'), requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const filter = { projectId: new mongoose.Types.ObjectId(String(req.params.projectId)) }
    const hasErr = applyHasFilters(filter, req.query)
    if (hasErr) return res.status(400).send({ error: hasErr })
    if (req.query.search) {
      const rx = buildSafeRegex(req.query.search, { maxLen: 128 })
      if (rx) filter.$or = [
        { tag: { $regex: rx } },
        { title: { $regex: rx } },
        { type: { $regex: rx } },
        { system: { $regex: rx } },
      ]
    }
    if (req.query.status) filter.status = req.query.status
    const equipment = await Equipment.aggregate([
      { $match: filter },
      { $sort: { updatedAt: -1, _id: -1 } },
      {
        $project: {
          ...LIGHT_FIELDS.split(' ').reduce((acc, k) => { acc[k] = 1; return acc }, {}),
          issuesCount: countArrayExpr('$issues'),
          checklistsCount: countArrayExpr('$checklists'),
          checklistsBySystem: checklistSystemCountsExpr(),
          fptCount: countArrayExpr('$functionalTests'),
        },
      },
    ])
    for (const it of equipment) {
      if (Array.isArray(it.checklistsBySystem)) {
        it.checklistsBySystem = it.checklistsBySystem
          .filter((x) => x && x.system && Number(x.count) > 0)
          .sort((a, b) => String(a.system).localeCompare(String(b.system)))
      } else {
        it.checklistsBySystem = []
      }
    }
    res.status(200).send(equipment);
  } catch (error) {
    console.error('[equipment] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load equipment' });
  }
});

// Read a single equipment by ID (supports light/includePhotos)
router.get('/:id', auth, requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), requirePermission('equipment.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const isLight = String(req.query.light || '').toLowerCase() === 'true' || String(req.query.light || '') === '1'
    const includePhotos = String(req.query.includePhotos || '').toLowerCase() === 'true' || String(req.query.includePhotos || '') === '1'
    let query = Equipment.findById(req.params.id)
    if (isLight) {
      const sel = includePhotos ? `${LIGHT_FIELDS} photos` : LIGHT_FIELDS
      query = query.select(sel)
    } else if (!includePhotos) {
      // Exclude heavy photo blobs, but keep functional tests/signatures for edit screens
      query = query.select('-photos.data -photos.size -photos.contentType -checklists -components -attachments -logs')
    }
    const equipment = await query.lean()
    if (!equipment) {
      return res.status(404).send();
    }
    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] list by project error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load equipment' });
  }
});

// Update equipment by ID
router.patch('/:id', auth, requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), async (req, res) => {
  try {
    const incoming = pickEquipmentPayload(req.body)
    // Never allow changing ownership or heavy arrays via generic patch
    delete incoming.projectId
    delete incoming.photos
    delete incoming.attachments
    delete incoming.issues
    delete incoming.logs

    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.labels === 'string') {
      incoming.labels = sanitizeHtml(String(incoming.labels), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.metadata === 'string') {
      incoming.metadata = sanitizeHtml(String(incoming.metadata), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    // Load equipment to determine project for RBAC/subscription checks
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send();

    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    // Server-side validation: ensure fptSignatures does not contain duplicate createdBy entries
    if (incoming && Array.isArray(incoming.fptSignatures)) {
      const seen = new Set()
      for (const s of incoming.fptSignatures) {
        if (s && s.createdBy) {
          const id = String(s.createdBy)
          if (seen.has(id)) return res.status(400).send({ error: 'Duplicate signature for the same user is not allowed' })
          seen.add(id)
        }
      }
    }

    const updated = await Equipment.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!updated) return res.status(404).send();
    res.status(200).send(toPlainEquipment(updated));
  } catch (error) {
    console.error('[equipment] update error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update equipment' });
  }
});

// Upload photos for an equipment (multipart/form-data)
router.post('/:id/photos', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), uploadLimiter, upload.array('photos', 16), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' });

    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const existingCount = Array.isArray(equipment.photos) ? equipment.photos.length : 0;
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
      const uploadedByName = [uploader.firstName, uploader.lastName].filter(Boolean).join(' ') || uploader.email || ''
      const uploadedByAvatar = uploader.avatar || (uploader.contact && uploader.contact.avatar) || ''
      equipment.photos = Array.isArray(equipment.photos) ? equipment.photos : []
      equipment.photos.push({
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

    await equipment.save();
    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] upload photos error', error);
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove a single photo by index
router.delete('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadEquipmentProjectId, requireFeature('equipment'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const equipment = await Equipment.findById(req.params.id)
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' })
    // attach projectId for RBAC/subscription checks
    req.body = req.body || {}
    req.body.projectId = equipment.projectId

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(equipment.photos) ? equipment.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    arr.splice(idx, 1)
    equipment.photos = arr
    await equipment.save()
    res.status(200).send(toPlainEquipment(equipment))
  } catch (error) {
    console.error('[equipment] remove photo error', error)
    res.status(500).send({ error: 'Failed to remove photo' })
  }
})

// Update photo metadata (e.g., caption) by index
router.patch('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadEquipmentProjectId, requireFeature('equipment'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const equipment = await Equipment.findById(req.params.id)
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' })
    // attach projectId for RBAC/subscription checks
    req.body = req.body || {}
    req.body.projectId = equipment.projectId

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(equipment.photos) ? equipment.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    if (typeof req.body.caption === 'string') {
      arr[idx].caption = String(req.body.caption).slice(0, 500)
    }
    equipment.photos = arr
    await equipment.save()
    res.status(200).send(toPlainEquipment(equipment))
  } catch (error) {
    console.error('[equipment] update photo meta error', error)
    res.status(500).send({ error: 'Failed to update photo' })
  }
})

// Delete equipment by ID
router.delete('/:id', auth, requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send();

    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.delete', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    await Equipment.findByIdAndDelete(req.params.id);

    // Remove equipment from the corresponding project (best-effort)
    try {
      const project = await Project.findById(equipment.projectId);
      if (project && Array.isArray(project.equipment)) {
        project.equipment.pull(equipment._id);
        await project.save();
      }
    } catch (_) {}

    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] report error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to generate equipment report' });
  }
});

// Upload attachments (documents) for equipment
router.post('/:id/attachments', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadEquipmentProjectId, requireFeature('equipment'), uploadLimiter, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' });

    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) return res.status(400).send({ error: 'No files uploaded' });

    let useS3 = !!process.env.S3_BUCKET;
    const urls = [];
    if (useS3) {
      let S3Client, PutObjectCommand;
      try { ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')); }
      catch (e) { console.warn('[equipment] S3 not installed; falling back to local'); useS3 = false; }
      if (useS3) {
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        for (const f of incoming) {
          if (!ALLOWED_DOC_MIME.has(f.mimetype)) return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
          const key = `equipment/${equipment._id}/${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: f.buffer, ContentType: f.mimetype }));
          const base = process.env.S3_PUBLIC_BASE || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;
          urls.push({ filename: f.originalname, url: `${base}/${key}`, type: f.mimetype });
        }
      }
    }
    if (!useS3) {
      const dir = path.join(__dirname, '..', 'uploads', 'equipment', String(equipment._id));
      ensureDir(dir);
      for (const f of incoming) {
        if (!ALLOWED_DOC_MIME.has(f.mimetype)) return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
        const safeName = `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, safeName);
        fs.writeFileSync(fullPath, f.buffer);
        const base = getBackendBaseUrl(req);
        const url = `${base}/uploads/equipment/${equipment._id}/${safeName}`;
        urls.push({ filename: f.originalname, url, type: f.mimetype });
      }
    }

    equipment.attachments = Array.isArray(equipment.attachments) ? equipment.attachments : []
    for (const u of urls) equipment.attachments.push({ filename: u.filename, url: u.url, type: u.type, uploadedBy: req.user ? req.user._id : undefined, createdAt: new Date() });
    await equipment.save();
    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] attachments upload error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove an attachment by index
router.delete('/:id/attachments/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadEquipmentProjectId, requireFeature('equipment'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' });

    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(equipment.attachments) ? equipment.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    equipment.attachments = arr;
    await equipment.save();

    tryDeleteLocalUpload({ url: removed && removed.url, prefix: 'equipment' })
    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
