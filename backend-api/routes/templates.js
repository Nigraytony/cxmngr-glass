const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Template = require('../models/template');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Mirror equipment routes for templates
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
const LIGHT_FIELDS = 'number tag title type system status projectId responsible template orderDate installationDate balanceDate testDate labels metadata createdAt updatedAt'

// Create
router.post('/', auth, requirePermission('templates.create', { projectParam: 'projectId' }), requireActiveProject, requireFeature('templates'), async (req, res) => {
  try {
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }
    const rec = new Template(req.body);
    await rec.save();
    res.status(201).send(rec);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all (paginated, filtered, light projection, optional facets)
router.get('/', auth, requireFeature('templates'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.perPage, 10) || 25))
    const sortBy = String(req.query.sortBy || 'updatedAt')
    const sortDir = String(req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1
    const projectId = req.query.projectId
    const includeFacets = String(req.query.includeFacets || '').toLowerCase() === 'true' || String(req.query.includeFacets || '') === '1'

    if (!projectId) {
      return res.status(200).send({ items: [], total: 0, totalAll: 0 })
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
    res.status(500).send(error);
  }
});

// Read by project
router.get('/project/:projectId', auth, requirePermission('templates.read', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
  try {
    const list = await Template.find({ projectId: req.params.projectId }).select(LIGHT_FIELDS);
    res.status(200).send(list.map(toPlainTemplate));
  } catch (error) {
    res.status(500).send(error);
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
router.get('/:id', auth, lookupTemplateProject, requirePermission('templates.read', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
  try {
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update
router.patch('/:id', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
  try {
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }
    const rec = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!rec) return res.status(404).send();
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete
router.delete('/:id', auth, lookupTemplateProject, requirePermission('templates.delete', { projectParam: 'projectId' }), requireFeature('templates'), async (req, res) => {
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
    res.status(500).send(error);
  }
});

// Photos upload
router.post('/:id/photos', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireFeature('templates'), upload.array('photos', 16), async (req, res) => {
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
router.delete('/:id/photos/:index', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.patch('/:id/photos/:index', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.post('/:id/attachments', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), requireFeature('templates'), uploadDocs.array('attachments', 16), async (req, res) => {
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
router.delete('/:id/attachments/:index', auth, lookupTemplateProject, requirePermission('templates.update', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid attachment index' });
    const rec = await Template.findById(req.params.id);
    if (!rec) return res.status(404).send({ error: 'Template not found' });
    const arr = Array.isArray(rec.attachments) ? rec.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    rec.attachments = arr;
    await rec.save();

    // Best-effort delete local file
    if (removed && removed.url && removed.url.includes('/uploads/templates/')) {
      try {
        const urlPath = removed.url.split('/uploads/')[1];
        if (urlPath) {
          const full = path.join(__dirname, '..', 'uploads', urlPath);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      } catch (_) {}
    }
    res.status(200).send(toPlainTemplate(rec));
  } catch (error) {
    console.error('[templates] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;
