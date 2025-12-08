const express = require('express');
const router = express.Router();
const Space = require('../models/space');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// documents uploader (up to ~10MB per file)
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// Create a new space
router.post('/', auth, requirePermission('spaces.create', { projectParam: 'project' }), requireActiveProject, requireFeature('spaces'), async (req, res) => {
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
      description: req.body.description || '',
      project: req.body.project, // Ensure project ID is valid
      parentSpace: req.body.parentSpace || '',
      attributes: Array.isArray(req.body.attributes) ? req.body.attributes : [],
      attachments: req.body.attachments || '',
      settings: req.body.settings || '',
      notes: req.body.notes || '',
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
const LIGHT_FIELDS = 'tag title type project parentSpace description createdAt updatedAt parentChain'

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
router.get('/', auth, requireFeature('spaces'), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(200).send({ items: [], total: 0 })
    const includeTypes = String(req.query.includeTypes || '').toLowerCase() === 'true' || String(req.query.includeTypes || '') === '1'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 50))
    const sortBy = String(req.query.sortBy || 'updatedAt')
    const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const filter = { project: projectId }
    if (req.query.type) filter.type = req.query.type
    if (req.query.parentSpace) filter.parentSpace = req.query.parentSpace
    if (req.query.search) {
      const s = String(req.query.search).trim()
      if (s) filter.$or = [
        { tag: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { type: { $regex: s, $options: 'i' } },
      ]
    }
    const total = await Space.countDocuments(filter)
    const items = await Space.find(filter)
      .select(LIGHT_FIELDS)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()
    await buildParentChains(projectId, items)
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
    res.status(500).send(error)
  }
})

// Get all spaces by project ID (light, optional search/filter, pagination)
router.get('/project/:projectId', auth, requirePermission('spaces.read', { projectParam: 'projectId' }), requireFeature('spaces'), async (req, res) => {
  try {
    const includeTypes = String(req.query.includeTypes || '').toLowerCase() === 'true' || String(req.query.includeTypes || '') === '1'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 50))
    const sortBy = String(req.query.sortBy || 'updatedAt')
    const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const filter = { project: req.params.projectId }
    if (req.query.type) filter.type = req.query.type
    if (req.query.parentSpace) filter.parentSpace = req.query.parentSpace
    if (req.query.search) {
      const s = String(req.query.search).trim()
      if (s) filter.$or = [
        { tag: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { type: { $regex: s, $options: 'i' } },
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
    res.status(500).send(error);
  }
});

// Read a single space by ID and find subSpaces (supports light/includeAttachments)
router.get('/:id', auth, lookupSpaceProject, requirePermission('spaces.read', { projectParam: 'project' }), requireFeature('spaces'), async (req, res) => {
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
    res.status(500).send(error);
  }
});

// Update a space by ID
router.patch('/:id', auth, lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireFeature('spaces'), async (req, res) => {
  // console.log('Updating space:', req.params.id, req.body);
  try {
    const space = await Space.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a space by ID
router.delete('/:id', auth, lookupSpaceProject, requirePermission('spaces.delete', { projectParam: 'project' }), requireFeature('spaces'), async (req, res) => {
  try {
    const space = await Space.findByIdAndDelete(req.params.id);
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    res.status(500).send(error);
  }
});

  // Space logs: append and read
  // GET /api/spaces/:id/logs?limit=200&type=section_created
  router.get('/:id/logs', auth, requireFeature('spaces'), async (req, res) => {
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
  router.post('/:id/logs', auth, requireFeature('spaces'), async (req, res) => {
    try {
      const id = req.params.id
      const event = (typeof req.body === 'object' && req.body) ? { ...req.body } : {}
      if (!event.type) return res.status(400).send({ error: 'type is required' })
      event.ts = event.ts ? new Date(event.ts) : new Date()
      if (!event.by && req.user) {
        try {
          const u = await require('../models/user').findById(req.user && (req.user._id || req.user.id)).lean()
          if (u) event.by = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || String(u._id)
        } catch {}
      }
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
router.post('/:id/attachments', auth, lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireFeature('spaces'), uploadDocs.array('attachments', 16), async (req, res) => {
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
router.delete('/:id/attachments/:index', auth, lookupSpaceProject, requirePermission('spaces.update', { projectParam: 'project' }), requireFeature('spaces'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid attachment index' });
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).send({ error: 'Space not found' });

    const arr = Array.isArray(space.attachments) ? space.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    space.attachments = arr;
    await space.save();

    // Try delete local file if it points within /uploads/spaces/
    try {
      const url = String(removed || '');
      if (url.includes('/uploads/spaces/')) {
        const urlPath = url.split('/uploads/')[1];
        if (urlPath) {
          const full = path.join(__dirname, '..', 'uploads', urlPath);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      }
    } catch (_) {}

    return res.status(200).send(space);
  } catch (error) {
    console.error('[spaces] remove attachment error', error);
    return res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
