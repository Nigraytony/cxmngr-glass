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
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// multer memory storage for small images
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 } });
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function validatePhotosArray(photos) {
  if (!Array.isArray(photos)) return true;
  if (photos.length > 16) return false;
  for (const p of photos) {
    if (!p.data || !p.size) return false;
    if (p.size > 250 * 1024) return false; // 250 KB
  }
  return true;
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
  requirePermission('equipment.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('equipment'),
  enforceLimit('equipment', async (projectId) => Equipment.countDocuments({ projectId })),
  async (req, res) => {
  console.log(req.body);
  try {
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }
    const equipment = new Equipment(req.body);
    await equipment.save();

    // Add equipment to the corresponding project
    // const project = await Project.findById(equipment.projectId);
    // project.equipment.push(equipment._id);
    // await project.save();

    res.status(201).send(equipment);
  } catch (error) {
    res.status(400).send(error);
  }
});

function toPlainEquipment(doc) {
  if (!doc) return doc
  const e = (typeof doc.toObject === 'function') ? doc.toObject() : JSON.parse(JSON.stringify(doc))
  // Backward compatibility: parse stringified JSON fields
  if (typeof e.checklists === 'string') {
    try { e.checklists = JSON.parse(e.checklists) } catch { e.checklists = [] }
  }

// Equipment logs: append and read
// GET /api/equipment/:id/logs?limit=200&type=section_created
router.get('/:id/logs', auth, async (req, res) => {
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
router.post('/:id/logs', auth, async (req, res) => {
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

// Projection for list/light responses (omit heavy fields)
const LIGHT_FIELDS = 'number tag title type system status projectId spaceId space responsible template orderDate installationDate balanceDate testDate labels metadata createdAt updatedAt'

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

// Read all equipment (paginated, filtered, light projection)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
    const sortBy = String(req.query.sortBy || 'updatedAt')
    const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const projectId = req.query.projectId
    const includeFacets = String(req.query.includeFacets || '').toLowerCase() === 'true' || String(req.query.includeFacets || '') === '1'

    if (!projectId) {
      return res.status(200).send({ items: [], total: 0 })
    }

    const filter = { projectId }
    if (req.query.search) {
      const s = String(req.query.search).trim()
      if (s) filter.$or = [
        { tag: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { type: { $regex: s, $options: 'i' } },
        { system: { $regex: s, $options: 'i' } },
      ]
    }
    if (req.query.type) filter.type = req.query.type
    if (req.query.system) filter.system = req.query.system
    if (req.query.status) filter.status = req.query.status

    const totalAll = await Equipment.countDocuments({ projectId })
    const total = await Equipment.countDocuments(filter)
    const items = await Equipment.find(filter)
      .select(LIGHT_FIELDS)
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()
    // Enrich with space breadcrumb chains (server-side to avoid extra client lookups)
    let spaceChainFor = null
    if (items.some(it => it.spaceId)) {
      try {
        spaceChainFor = await buildSpaceChainResolver(projectId)
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
      let projectObjectId = null
      try { projectObjectId = new mongoose.Types.ObjectId(projectId) } catch {}
      const projectMatch = projectObjectId ? { projectId: projectObjectId } : { projectId }
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
      facets = {
        types: aggTypes.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        statuses: aggStatuses.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
        systems: aggSystems.map(a => ({ name: a?._id || 'Unknown', count: a?.count || 0 })).filter(f => f.name),
      }
    }

    res.status(200).send({ items, total, totalAll, ...facets })
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read all equipment by project ID (light projection)
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const filter = { projectId: req.params.projectId }
    if (req.query.search) {
      const s = String(req.query.search).trim()
      if (s) filter.$or = [
        { tag: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { type: { $regex: s, $options: 'i' } },
        { system: { $regex: s, $options: 'i' } },
      ]
    }
    if (req.query.status) filter.status = req.query.status
    const equipment = await Equipment.find(filter).select(LIGHT_FIELDS).lean()
    res.status(200).send(equipment);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single equipment by ID (supports light/includePhotos)
router.get('/:id', auth, async (req, res) => {
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
    res.status(500).send(error);
  }
});

// Update equipment by ID
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }

    // Load equipment to determine project for RBAC/subscription checks
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send();

    req.body = req.body || {};
    req.body.projectId = equipment.projectId;

    await runMiddleware(req, res, requirePermission('equipment.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    // Server-side validation: ensure fptSignatures does not contain duplicate createdBy entries
    if (req.body && Array.isArray(req.body.fptSignatures)) {
      const seen = new Set()
      for (const s of req.body.fptSignatures) {
        if (s && s.createdBy) {
          const id = String(s.createdBy)
          if (seen.has(id)) return res.status(400).send({ error: 'Duplicate signature for the same user is not allowed' })
          seen.add(id)
        }
      }
    }

    const updated = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).send();
    res.status(200).send(toPlainEquipment(updated));
  } catch (error) {
    res.status(400).send(error);
  }
});

// Upload photos for an equipment (multipart/form-data)
router.post('/:id/photos', auth, upload.array('photos', 16), async (req, res) => {
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
router.delete('/:id/photos/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.patch('/:id/photos/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.delete('/:id', auth, async (req, res) => {
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
    res.status(500).send(error);
  }
});

// Upload attachments (documents) for equipment
router.post('/:id/attachments', auth, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' });

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
router.delete('/:id/attachments/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid attachment index' });
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).send({ error: 'Equipment not found' });
    const arr = Array.isArray(equipment.attachments) ? equipment.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    equipment.attachments = arr;
    await equipment.save();

    // Best-effort delete local file
    if (removed && removed.url && removed.url.includes('/uploads/equipment/')) {
      try {
        const urlPath = removed.url.split('/uploads/')[1];
        if (urlPath) {
          const full = path.join(__dirname, '..', 'uploads', urlPath);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      } catch (_) {}
    }
    res.status(200).send(toPlainEquipment(equipment));
  } catch (error) {
    console.error('[equipment] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
