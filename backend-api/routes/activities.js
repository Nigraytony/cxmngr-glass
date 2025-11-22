const express = require('express');
const router = express.Router();
const Activity = require('../models/activity');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');

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

// Create a new activity
router.post('/', auth, requirePermission('activities.create', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  console.log('[activity-create] Request body:', JSON.stringify(req.body, null, 2));
  try {
    // if photos provided, validate count and sizes
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      console.log('[activity-create] Photos validation failed');
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }

    // sanitize descriptionHtml if present
    if (req.body.descriptionHtml) {
      req.body.descriptionHtml = sanitizeHtml(req.body.descriptionHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          a: ['href', 'name', 'target'],
          img: ['src', 'alt'],
        },
      });
    }

    const activity = new Activity(req.body);
    await activity.save();

    // Add activity to the corresponding project
    const project = await Project.findById(activity.projectId);
    project.activities.push(activity._id);
    await project.save();

    res.status(201).send(activity);
  } catch (error) {
    console.log('[activity-create] Error creating activity:', error);
    res.status(400).send(error);
  }
});

// Read all activities
router.get('/', auth, async (req, res) => {
  try {
    const activities = await Activity.find();
    res.status(200).send(activities);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single activity by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).send();
    }
    res.status(200).send(activity);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Upload photos for an activity (multipart/form-data)
router.post('/:id/photos', auth, upload.array('photos', 16), async (req, res) => {
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
router.post('/:id/attachments', auth, uploadDocs.array('attachments', 16), async (req, res) => {
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
router.delete('/:id/attachments/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid attachment index' });
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

    // Try delete local file
    if (removed && removed.url && removed.url.includes('/uploads/activities/')) {
      try {
        const urlPath = removed.url.split('/uploads/')[1];
        if (urlPath) {
          const full = path.join(__dirname, '..', 'uploads', urlPath);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      } catch (_) {}
    }

    res.status(200).send(activity);
  } catch (error) {
    console.error('[activities] remove attachment error', error);
    res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

// Remove a single photo by index (avoids sending large base64 payloads)
router.delete('/:id/photos/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.patch('/:id/photos/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.body.photos && !validatePhotosArray(req.body.photos)) {
      return res.status(400).send({ error: 'Photos exceed limits (max 16, each <= 250KB) or invalid format' });
    }

    if (req.body.descriptionHtml) {
      req.body.descriptionHtml = sanitizeHtml(req.body.descriptionHtml, {
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

    const updated = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).send();
    res.status(200).send(updated);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete an activity by ID
router.delete('/:id', auth, async (req, res) => {
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
    res.status(500).send(error);
  }
});

// Generate PDF report for an activity
router.get('/:id/report', auth, async (req, res) => {
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
router.get('/:id/logs', auth, async (req, res) => {
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