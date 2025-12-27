const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Template = require('../models/template');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const { requireNotDisabled } = require('../middleware/killSwitch');
const { isObjectId, requireBodyField, requireObjectIdBody, requireObjectIdParam, requireIntParam } = require('../middleware/validate');
const { tryDeleteLocalUpload } = require('../utils/uploads')
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { rateLimit } = require('../middleware/rateLimit');
const sanitizeHtml = require('sanitize-html');
const { buildSafeRegex } = require('../utils/search')

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
  'system',
  'status',
])

// Mirror equipment routes for templates
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 } });
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'uploads' })

function validatePhotosArray(photos) {
  if (!Array.isArray(photos)) return true;
  if (photos.length > 16) return false;
  for (const p of photos) {
    if (!p.data || !p.size) return false;
    if (p.size > 250 * 1024) return false; // 250 KB
  }
  return true;
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
    'checklists',
    'functionalTests',
    'components',
    'images',
    'history',
    'labels',
    'tags',
    'metadata',
    'projectId',
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

function toPlainTemplate(doc) {
  if (!doc) return doc
  const t = (typeof doc.toObject === 'function') ? doc.toObject() : JSON.parse(JSON.stringify(doc))
  // Backward compatibility: parse stringified JSON fields
  if (typeof t.checklists === 'string') {
    try { t.checklists = JSON.parse(t.checklists) } catch { t.checklists = [] }
  }
  if (!Array.isArray(t.checklists)) t.checklists = []
  if (typeof t.functionalTests === 'string') {
    try { t.functionalTests = JSON.parse(t.functionalTests) } catch { t.functionalTests = [] }
  }
  if (!Array.isArray(t.functionalTests)) t.functionalTests = []
  return t
}

// Light projection for list responses (avoid heavy fields)
const LIGHT_FIELDS = 'number tag title type system status projectId responsible template orderDate installationDate balanceDate testDate labels tags metadata createdAt updatedAt'

// Create
router.post(
  '/',
  auth,
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requirePermission('templates.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('templates'),
  async (req, res) => {
  try {
    const payload = pickTemplatePayload(req.body)
    if (typeof payload.description === 'string') {
      payload.description = sanitizeHtml(String(payload.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.labels === 'string') {
      payload.labels = sanitizeHtml(String(payload.labels), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.metadata === 'string') {
      payload.metadata = sanitizeHtml(String(payload.metadata), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    // Disallow clients from setting heavy media arrays on create; use upload endpoints.
    delete payload.photos
    delete payload.attachments
    delete payload.issues

    const rec = new Template(payload);
    await rec.save();
    res.status(201).send(rec);
  } catch (error) {
    console.error('[templates] create error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create template' });
  }
});

// Read all (paginated, filtered, light projection, optional facets)
router.get('/', auth, requireFeature('templates'), requirePermission('templates.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
    const sortBy = normalizeSortBy(req.query.sortBy, LIST_SORT_FIELDS, 'updatedAt')
    const sortDir = normalizeSortDir(req.query.sortDir)
    const projectId = req.query.projectId
    const includeFacets = String(req.query.includeFacets || '').toLowerCase() === 'true' || String(req.query.includeFacets || '') === '1'

    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })

    const filter = { projectId }
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

    const totalAll = await Template.countDocuments({ projectId })
    const total = await Template.countDocuments(filter)
    const items = await Template.find(filter)
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
      const aggTypes = await Template.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      const aggStatuses = await Template.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      const aggSystems = await Template.aggregate([
        { $match: projectMatch },
        { $group: { _id: '$system', count: { $sum: 1 } } },
      ])
      facets = {
        types: aggTypes.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        statuses: aggStatuses.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        systems: aggSystems.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
      }
    }

    res.status(200).send({ items, total, totalAll, ...facets })
  } catch (error) {
    console.error('[templates] list error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to list templates' });
  }
});

// Read by project
router.get('/project/:projectId', auth, requireObjectIdParam('projectId'), requirePermission('templates.read', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
  try {
    const list = await Template.find({ projectId: req.params.projectId }).select(LIGHT_FIELDS);
    res.status(200).send(list.map(toPlainTemplate));
  } catch (error) {
    console.error('[templates] list by project error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load templates' });
  }
});

// Middleware to look up template and add projectId to request for RBAC
const lookupTemplateProject = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id).lean();
    if (!template) return res.status(404).send({ error: 'Template not found' });
    req.body.projectId = template.projectId;
    req.params.projectId = template.projectId;
    next();
  } catch (error) {
    res.status(500).send({ error: 'Error looking up template project' });
  }
};

// Read one
router.get('/:id', auth, requireObjectIdParam('id'), lookupTemplateProject, requirePermission('templates.read', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
  try {
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load template' });
  }
});

// Update
router.patch('/:id', auth, requireObjectIdParam('id'), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    const incoming = pickTemplatePayload(req.body)
    // Never allow changing template ownership via patch
    delete incoming.projectId
    delete incoming.photos
    delete incoming.attachments
    delete incoming.issues

    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.labels === 'string') {
      incoming.labels = sanitizeHtml(String(incoming.labels), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.metadata === 'string') {
      incoming.metadata = sanitizeHtml(String(incoming.metadata), { allowedTags: [], allowedAttributes: {} }).trim()
    }

    const rec = await Template.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!rec) return res.status(404).send();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] update error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update template' });
  }
});

// Delete
router.delete('/:id', auth, requireObjectIdParam('id'), lookupTemplateProject, requirePermission('templates.delete', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    const rec = await Template.findByIdAndDelete(req.params.id);
    if (!rec) return res.status(404).send();
    // Best-effort remove from project
    try {
      const project = await Project.findById(rec.projectId);
      if (project && Array.isArray(project.templates)) {
        project.templates.pull(rec._id);
        await project.save();
      }
    } catch (_) {}
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] delete error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to delete template' });
  }
});

// Photos upload
router.post('/:id/photos', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), uploadLimiter, upload.array('photos', 16), async (req, res) => {
  try {
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send({ error: 'Template not found' });

    const existingCount = Array.isArray(rec.photos) ? rec.photos.length : 0;
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
      rec.photos = Array.isArray(rec.photos) ? rec.photos : []
      rec.photos.push({
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

    await rec.save();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] upload photos error', error);
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove photo
router.delete('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const rec = await Template.findById(req.params.id)
    if (!rec) return res.status(404).send({ error: 'Template not found' })
    const arr = Array.isArray(rec.photos) ? rec.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    arr.splice(idx, 1)
    rec.photos = arr
    await rec.save()
    res.status(200).send(toPlainTemplate(rec))
  } catch (error) {
    console.error('[templates] remove photo error', error)
    res.status(500).send({ error: 'Failed to remove photo' })
  }
})

// Update photo metadata
router.patch('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const rec = await Template.findById(req.params.id)
    if (!rec) return res.status(404).send({ error: 'Template not found' })
    const arr = Array.isArray(rec.photos) ? rec.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    if (typeof req.body.caption === 'string') {
      arr[idx].caption = String(req.body.caption).slice(0, 500)
    }
    rec.photos = arr
    await rec.save()
    res.status(200).send(toPlainTemplate(rec))
  } catch (error) {
    console.error('[templates] update photo meta error', error)
    res.status(500).send({ error: 'Failed to update photo' })
  }
})

// Upload attachments
router.post('/:id/attachments', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), uploadLimiter, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send({ error: 'Template not found' });

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) return res.status(400).send({ error: 'No files uploaded' });

    let useS3 = !!process.env.S3_BUCKET;
    const urls = [];
    if (useS3) {
      let S3Client, PutObjectCommand;
      try { ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')); }
      catch (e) { console.warn('[templates] S3 not installed; falling back to local'); useS3 = false; }
      if (useS3) {
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        for (const f of incoming) {
          if (!ALLOWED_DOC_MIME.has(f.mimetype)) return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
          const key = `templates/${rec._id}/${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: f.buffer, ContentType: f.mimetype }));
          const base = process.env.S3_PUBLIC_BASE || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;
          urls.push({ filename: f.originalname, url: `${base}/${key}`, type: f.mimetype });
        }
      }
    }
    if (!useS3) {
      const dir = path.join(__dirname, '..', 'uploads', 'templates', String(rec._id));
      ensureDir(dir);
      for (const f of incoming) {
        if (!ALLOWED_DOC_MIME.has(f.mimetype)) return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
        const safeName = `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, safeName);
        fs.writeFileSync(fullPath, f.buffer);
        const base = getBackendBaseUrl(req);
        const url = `${base}/uploads/templates/${rec._id}/${safeName}`;
        urls.push({ filename: f.originalname, url, type: f.mimetype });
      }
    }

    rec.attachments = Array.isArray(rec.attachments) ? rec.attachments : []
    for (const u of urls) rec.attachments.push({ filename: u.filename, url: u.url, type: u.type, uploadedBy: req.user ? req.user._id : undefined, createdAt: new Date() });
    await rec.save();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] attachments upload error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove attachment
router.delete('/:id/attachments/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send({ error: 'Template not found' });
    const arr = Array.isArray(rec.attachments) ? rec.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    rec.attachments = arr;
    await rec.save();

    tryDeleteLocalUpload({ url: removed && removed.url, prefix: 'templates' })
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
