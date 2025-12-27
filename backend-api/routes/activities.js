const express = require('express');
const router = express.Router();
const Activity = require('../models/activity');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const mongoose = require('mongoose');
const { rateLimit } = require('../middleware/rateLimit');
const { requireNotDisabled } = require('../middleware/killSwitch');
const { isObjectId, requireBodyField, requireObjectIdBody, requireObjectIdParam, requireIntParam } = require('../middleware/validate');
const { tryDeleteLocalUpload } = require('../utils/uploads')
const { normalizeLogEvent } = require('../utils/logEvent')

// Defensive: validate `:id` params everywhere in this router to avoid CastErrors and 500s.
// Note: some routes use `:id` for project-scoped entities (activityId); those are ObjectIds.
router.param('id', (req, res, next, value) => {
  if (!isObjectId(value)) return res.status(400).send({ error: 'Invalid id' })
  return next()
})

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

// For routes where :id is an Activity id (not a project id), populate projectId
// so plan/subscription guards can evaluate the correct project.
async function loadActivityProjectId(req, res, next) {
  try {
    const activityId = String(req.params.id || '').trim()
    if (!activityId) return res.status(400).send({ error: 'Activity id is required' })
    if (!mongoose.Types.ObjectId.isValid(activityId)) return res.status(400).send({ error: 'Invalid activity id' })
    const activity = await Activity.findById(activityId).select('projectId').lean()
    if (!activity) return res.status(404).send({ error: 'Activity not found' })
    // Prefer query/body, but set both for compatibility with various guards.
    req.query = { ...(req.query || {}), projectId: String(activity.projectId) }
    req.body = req.body || {}
    if (!req.body.projectId) req.body.projectId = activity.projectId
    return next()
  } catch (e) {
    return sendServerError(res, e, 'Failed to resolve activity project')
  }
}

async function requireActivitiesRead(req, res, next) {
  try {
    await runMiddleware(req, res, requirePermission('activities.read', { projectParam: 'projectId' }))
    return next()
  } catch (e) {
    return sendServerError(res, e, 'Failed to authorize activities read')
  }
}

function pickActivityPayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'name',
    'descriptionHtml',
    'type',
    'startDate',
    'endDate',
    'projectId',
    'reviewer',
    'location',
    'spaceId',
    'systems',
    'settings',
    'metadata',
    'labels',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

// Create a new activity
router.post(
  '/',
  auth,
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requirePermission('activities.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('activities'),
  async (req, res) => {
  try {
    const payload = pickActivityPayload(req.body)
    // Disallow clients from setting heavy media arrays on create; use upload endpoints.
    delete payload.photos
    delete payload.attachments
    delete payload.issues
    delete payload.comments
    delete payload.logs

    // sanitize descriptionHtml if present
    if (payload.descriptionHtml) {
      payload.descriptionHtml = sanitizeHtml(payload.descriptionHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          a: ['href', 'name', 'target'],
          img: ['src', 'alt'],
        },
      });
    }

    const activity = new Activity(payload);
    await activity.save();

    // Add activity to the corresponding project
    const project = await Project.findById(activity.projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' })
    project.activities.push(activity._id);
    await project.save();

    res.status(201).send(activity);
  } catch (error) {
    console.log('[activity-create] Error creating activity:', error);
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create activity' });
  }
});

// Read all activities (project-scoped, lightweight)
router.get('/', auth, requireFeature('activities'), requirePermission('activities.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const projectId = req.query.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) return res.status(400).send({ error: 'Invalid projectId' })
    let filter = {}
    if (projectId) {
      const pid = String(projectId)
      filter = { projectId: mongoose.Types.ObjectId.isValid(pid) ? new mongoose.Types.ObjectId(pid) : pid }
    }

    // Return a lightweight list with counts for UI list views, without embedding heavy arrays
    // like photos (base64) or full comments/attachments.
    const activities = await Activity.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          name: 1,
          descriptionHtml: 1,
          type: 1,
          startDate: 1,
          endDate: 1,
          projectId: 1,
          location: 1,
          spaceId: 1,
          systems: 1,
          settings: 1,
          metadata: 1,
          labels: 1,
          reviewer: 1,
          createdAt: 1,
          updatedAt: 1,
          issuesCount: { $size: { $ifNull: ['$issues', []] } },
          photosCount: { $size: { $ifNull: ['$photos', []] } },
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
          attachmentsCount: { $size: { $ifNull: ['$attachments', []] } },
          equipmentCount: { $size: { $ifNull: ['$systems', []] } },
        }
      }
    ])

    res.status(200).send(activities)
  } catch (error) {
    console.error('[activities] list error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to list activities' })
  }
});

// Read a single activity by ID
// Supports light=true to omit heavy photo/attachment payloads, includePhotos=true to force photos
router.get('/:id', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), requireActivitiesRead, async (req, res) => {
  try {
    const isLight = String(req.query.light || '').toLowerCase() === 'true' || String(req.query.light || '') === '1'
    const includePhotos = String(req.query.includePhotos || '').toLowerCase() === 'true' || String(req.query.includePhotos || '') === '1'

    const lightFields = 'name type startDate endDate projectId location spaceId systems settings metadata labels reviewer createdAt updatedAt descriptionHtml'
    let query = Activity.findById(req.params.id)
    if (isLight) {
      // lightweight projection; optionally include photos
      const sel = includePhotos ? `${lightFields} photos` : lightFields
      query = query.select(sel)
    } else if (!includePhotos) {
      // keep metadata about photos but drop base64 data to reduce payload size
      query = query.select('-photos.data -photos.size -photos.contentType')
    }

    const activity = await query.lean()
    if (!activity) {
      return res.status(404).send()
    }
    res.status(200).send(activity)
  } catch (error) {
    console.error('[activities] get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load activity' })
  }
});

// Photos-only endpoint to avoid sending other heavy fields
router.get('/:id/photos', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), requireActivitiesRead, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).select('photos').lean()
    if (!activity) return res.status(404).send()
    res.status(200).send(activity.photos || [])
  } catch (error) {
    console.error('[activities] photos get error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to load photos' })
  }
})

// Upload photos for an activity (multipart/form-data)
router.post('/:id/photos', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), uploadLimiter, upload.array('photos', 16), async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).send({ error: 'Activity not found' });

    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = activity.projectId;

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const existingCount = Array.isArray(activity.photos) ? activity.photos.length : 0;
    const incomingFiles = Array.isArray(req.files) ? req.files : [];
    if (existingCount + incomingFiles.length > 16) {
      return res.status(400).send({ error: 'Total photos would exceed maximum of 16' });
    }

    // validate and convert each file
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
      activity.photos.push({
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

    await activity.save();
    res.status(200).send(activity);
  } catch (error) {
    console.error('[activities] upload error', error);
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Allowed document mime types
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

// runMiddleware extracted to ../middleware/runMiddleware.js

// Upload attachments (documents) for an activity
router.post('/:id/attachments', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), uploadLimiter, uploadDocs.array('attachments', 16), async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).send({ error: 'Activity not found' });

    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = activity.projectId;

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) return res.status(400).send({ error: 'No files uploaded' });

    let useS3 = !!process.env.S3_BUCKET;
    const urls = [];
    if (useS3) {
      // Best-effort S3 support; requires @aws-sdk/client-s3 in production
      let S3Client, PutObjectCommand;
      try {
        ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
      } catch (e) {
        console.warn('[activities] S3 requested but @aws-sdk/client-s3 not installed; falling back to local storage');
        useS3 = false;
      }
      if (useS3) {
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        for (const f of incoming) {
          if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
            return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
          }
          const key = `activities/${activity._id}/${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: f.buffer, ContentType: f.mimetype }));
          const base = process.env.S3_PUBLIC_BASE || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;
          urls.push({ filename: f.originalname, url: `${base}/${key}`, type: f.mimetype });
        }
      }
    }
    if (!useS3) {
      // Local file storage to /uploads/activities/:id
      const dir = path.join(__dirname, '..', 'uploads', 'activities', String(activity._id));
      ensureDir(dir);
      for (const f of incoming) {
        if (!ALLOWED_DOC_MIME.has(f.mimetype)) {
          return res.status(400).send({ error: `Unsupported file type: ${f.mimetype}` });
        }
        const safeName = `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = path.join(dir, safeName);
        fs.writeFileSync(fullPath, f.buffer);
        const base = getBackendBaseUrl(req);
        const url = `${base}/uploads/activities/${activity._id}/${safeName}`;
        urls.push({ filename: f.originalname, url, type: f.mimetype });
      }
    }

    for (const u of urls) {
      activity.attachments.push({ filename: u.filename, url: u.url, type: u.type, uploadedBy: req.user ? req.user._id : undefined, createdAt: new Date() });
    }
    await activity.save();
    res.status(200).send(activity);
  } catch (error) {
    console.error('[activities] attachments upload error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Upload failed' });
  }
});

// Remove an attachment by index; best-effort delete local file if under uploads
router.delete('/:id/attachments/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).send({ error: 'Activity not found' });
    // attach projectId for RBAC/subscription checks
    req.body = req.body || {};
    req.body.projectId = activity.projectId;

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(activity.attachments) ? activity.attachments : [];
    if (idx >= arr.length) return res.status(400).send({ error: 'Attachment index out of range' });
    const [removed] = arr.splice(idx, 1);
    activity.attachments = arr;
    await activity.save();

    tryDeleteLocalUpload({ url: removed && removed.url, prefix: 'activities' })

    res.status(200).send(activity);
  } catch (error) {
    console.error('[activities] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

// Remove a single photo by index (avoids sending large base64 payloads)
router.delete('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const activity = await Activity.findById(req.params.id)
    if (!activity) return res.status(404).send({ error: 'Activity not found' })
    // attach projectId for RBAC/subscription checks
    req.body = req.body || {}
    req.body.projectId = activity.projectId

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(activity.photos) ? activity.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    arr.splice(idx, 1)
    activity.photos = arr
    await activity.save()
    res.status(200).send(activity)
  } catch (error) {
    console.error('[activities] remove photo error', error)
    res.status(500).send({ error: 'Failed to remove photo' })
  }
})

// Update a single photo's metadata (e.g., caption) by index
router.patch('/:id/photos/:index', auth, requireNotDisabled('uploads'), requireObjectIdParam('id'), requireIntParam('index', { min: 0 }), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    const activity = await Activity.findById(req.params.id)
    if (!activity) return res.status(404).send({ error: 'Activity not found' })
    // attach projectId for RBAC/subscription checks
    req.body = req.body || {}
    req.body.projectId = activity.projectId

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const arr = Array.isArray(activity.photos) ? activity.photos : []
    if (idx >= arr.length) return res.status(400).send({ error: 'Photo index out of range' })
    // Only update safe, small metadata fields
    if (typeof req.body.caption === 'string') {
      arr[idx].caption = String(req.body.caption).slice(0, 500)
    }
    activity.photos = arr
    await activity.save()
    res.status(200).send(activity)
  } catch (error) {
    console.error('[activities] update photo meta error', error)
    res.status(500).send({ error: 'Failed to update photo' })
  }
})

// Update an activity by ID
router.patch('/:id', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const incoming = pickActivityPayload(req.body)
    // Never allow changing ownership or heavy arrays via generic patch
    delete incoming.projectId
    delete incoming.photos
    delete incoming.attachments
    delete incoming.issues
    delete incoming.comments
    delete incoming.logs

    if (incoming.descriptionHtml) {
      incoming.descriptionHtml = sanitizeHtml(incoming.descriptionHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          a: ['href', 'name', 'target'],
          img: ['src', 'alt'],
        },
      });
    }

    // Load activity to determine project for RBAC/subscription checks
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).send();

    req.body = req.body || {};
    req.body.projectId = activity.projectId;

    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const updated = await Activity.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!updated) return res.status(404).send();
    res.status(200).send(updated);
  } catch (error) {
    console.error('[activities] update error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update activity' });
  }
});

// Delete an activity by ID
router.delete('/:id', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).send();

    req.body = req.body || {};
    req.body.projectId = activity.projectId;

    await runMiddleware(req, res, requirePermission('activities.delete', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    await Activity.findByIdAndDelete(req.params.id);

    // Remove activity from the corresponding project
    try {
      const project = await Project.findById(activity.projectId);
      if (project && Array.isArray(project.activities)) {
        project.activities.pull(activity._id);
        await project.save();
      }
    } catch (_) {}

    res.status(200).send(activity);
  } catch (error) {
    console.error('[activities] delete error', error && (error.stack || error.message || error))
    res.status(500).send({ error: 'Failed to delete activity' });
  }
});

// Generate PDF report for an activity
router.get('/:id/report', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), requireActivitiesRead, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).populate('issues');
    if (!activity) return res.status(404).send({ error: 'Activity not found' });

    // Small HTML template for printing
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Activity Report - ${activity.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { font-size: 20px; }
            .meta { margin-bottom: 12px; }
            .photos img { max-width: 200px; margin: 6px; }
            .section { margin-top: 16px; }
          </style>
        </head>
        <body>
          <h1>${activity.name}</h1>
          <div class="meta">
            <strong>Type:</strong> ${activity.type}<br/>
            <strong>Start:</strong> ${activity.startDate ? activity.startDate.toISOString() : ''}<br/>
            <strong>End:</strong> ${activity.endDate ? activity.endDate.toISOString() : ''}<br/>
            <strong>Location:</strong> ${activity.location || ''}
          </div>
          <div class="section">
            <h2>Description</h2>
            <div>${activity.descriptionHtml || ''}</div>
          </div>
          <div class="section">
            <h2>Photos</h2>
            <div class="photos">
              ${(activity.photos || []).map(p => `<img src="${p.data}" alt="${p.filename || ''}"/>`).join('')}
            </div>
          </div>
          <div class="section">
            <h2>Issues</h2>
            <ul>
              ${(activity.issues || []).map(i => `<li>${i.title || i._id}</li>`).join('')}
            </ul>
          </div>
        </body>
      </html>
    `;

    // Use PDFKit to generate PDF server-side without Chromium
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // Stream PDF to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="activity-${activity._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(activity.name || 'Activity', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Type: ${activity.type || ''}`);
    doc.text(`Start: ${activity.startDate ? activity.startDate.toISOString() : ''}`);
    doc.text(`End: ${activity.endDate ? activity.endDate.toISOString() : ''}`);
    doc.text(`Location: ${activity.location || ''}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('Description', { underline: true });
    // PDFKit does not render HTML: strip tags and render plaintext fallback
    const stripHtml = require('string-strip-html');
    const plain = activity.descriptionHtml ? stripHtml.stripHtml(activity.descriptionHtml).result : '';
    doc.fontSize(10).text(plain || '', { align: 'left' });
    doc.moveDown(0.5);

    // Photos - render thumbnails
    const photos = activity.photos || [];
    for (const p of photos) {
      try {
        if (p.data && p.data.startsWith('data:')) {
          const matches = p.data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
          if (matches) {
            const b64 = matches[2];
            const buffer = Buffer.from(b64, 'base64');
            // Embed image (scale down if necessary)
            doc.image(buffer, { fit: [300, 200], align: 'center' });
            doc.moveDown(0.2);
          }
        }
      } catch (imgErr) {
        console.warn('Failed to render image in PDF', imgErr && imgErr.message);
      }
    }

    doc.addPage();
    doc.fontSize(12).text('Issues', { underline: true });
    doc.moveDown(0.2);
    const issues = activity.issues || [];
    for (const iss of issues) {
      doc.fontSize(10).text(`- ${iss.title || iss._id}`);
    }

    doc.end();
  } catch (error) {
    console.error('[activities] report error', error);
    res.status(500).send({ error: 'Failed to generate report' });
  }
});

// Activity logs: append and read
// GET /api/activities/:id/logs?limit=200&type=section_created
router.get('/:id/logs', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), requireActivitiesRead, async (req, res) => {
  try {
    const id = req.params.id
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
    const type = req.query.type ? String(req.query.type) : null
    const activity = await Activity.findById(id).select('logs').lean()
    if (!activity) return res.status(404).send({ error: 'Activity not found' })
    let logs = Array.isArray(activity.logs) ? activity.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    logs = logs.slice(0, limit)
    return res.status(200).send(logs)
  } catch (err) {
    console.error('get activity logs error', err)
    return res.status(500).send({ error: 'Failed to load logs' })
  }
})

// POST /api/activities/:id/logs -> append one log event
router.post('/:id/logs', auth, requireObjectIdParam('id'), loadActivityProjectId, requireFeature('activities'), async (req, res) => {
  try {
    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }))
    await runMiddleware(req, res, requireActiveProject)
    const id = req.params.id
    const byFallback = req.user ? ([req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || req.user.email || String(req.user._id || req.user.id)) : null
    const event = normalizeLogEvent(req.body, { byFallback })
    if (!event) return res.status(400).send({ error: 'type is required' })
    const updated = await Activity.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [event], $slice: -5000 } }, $set: { updatedAt: new Date() } },
      { new: true, projection: { _id: 1 } }
    )
    if (!updated) return res.status(404).send({ error: 'Activity not found' })
    return res.status(201).send({ ok: true })
  } catch (err) {
    console.error('append activity log error', err)
    return res.status(500).send({ error: 'Failed to append log' })
  }
})

    module.exports = router;
