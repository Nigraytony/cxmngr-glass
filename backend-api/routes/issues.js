const express = require('express');
const router = express.Router();
const Issue = require('../models/issue');
const Project = require('../models/project');
const { requireActiveProject } = require('../middleware/subscription');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// multer memory storage for small images
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 } });
// documents uploader (up to ~10MB per file)
const uploadDocs = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// runMiddleware extracted to ../middleware/runMiddleware.js

// Create a new issue (assign project-scoped atomic number)
// Creating an issue is a premium action and requires an active subscription for the project
router.post('/', auth, requirePermission('issues.create', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).send({ error: 'projectId is required' });

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
    res.status(400).send(error);
  }
});

// Read issues (optionally filtered by ?projectId=...)
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query || {};
    const filter = {};
    if (projectId) {
      try {
        const mongoose = require('mongoose');
        filter.projectId = mongoose.Types.ObjectId(projectId);
      } catch (e) {
        filter.projectId = projectId;
      }
    }
    const issues = await Issue.find(filter);
    res.status(200).send(issues);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single issue by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).send();
    }
    res.status(200).send(issue);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Upload photos for an issue (multipart/form-data)
router.post('/:id/photos', auth, upload.array('photos', 16), async (req, res) => {
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
router.patch('/:id', auth, async (req, res) => {
  console.log('Issue is:', req.body, req.params);
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send();

    // ensure middleware can see the parent project ID
    req.body = req.body || {}
    req.body.projectId = issue.projectId

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
      return res.status(400).send(err);
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});

// Delete an issue by ID
// Deleting an issue requires an active subscription for the parent project. Load the issue, set projectId for middleware,
// then delete if allowed.
router.delete('/:id', auth, async (req, res) => {
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
      return res.status(500).send(err);
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});

// Issue logs: append and read
// GET /api/issues/:id/logs?limit=200&type=section_created
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const id = req.params.id
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200))
    const type = req.query.type ? String(req.query.type) : null
    const issue = await Issue.findById(id).select('logs').lean()
    if (!issue) return res.status(404).send({ error: 'Issue not found' })
    let logs = Array.isArray(issue.logs) ? issue.logs.slice() : []
    if (type) logs = logs.filter((e) => e && e.type === type)
    // Sort by ts descending; if missing ts, push to end
    logs.sort((a, b) => {
      const ta = a && a.ts ? new Date(a.ts).getTime() : 0
      const tb = b && b.ts ? new Date(b.ts).getTime() : 0
      return tb - ta
    })
    logs = logs.slice(0, limit)
    return res.status(200).send(logs)
  } catch (err) {
    console.error('get issue logs error', err)
    return res.status(500).send({ error: 'Failed to load logs' })
  }
})

// POST /api/issues/:id/logs -> append one log event
router.post('/:id/logs', auth, async (req, res) => {
  try {
    const id = req.params.id
    const event = (typeof req.body === 'object' && req.body) ? { ...req.body } : {}
    if (!event.type) return res.status(400).send({ error: 'type is required' })
    // Normalize fields
    event.ts = event.ts ? new Date(event.ts) : new Date()
    // Best-effort: if by not set, try to populate from auth user
    if (!event.by && req.user) {
      try {
        const u = await require('../models/user').findById(req.user && (req.user._id || req.user.id)).lean()
        if (u) event.by = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || String(u._id)
      } catch {}
    }
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
router.delete('/:id/photos/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10)
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid photo index' })
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
router.post('/:id/attachments', auth, uploadDocs.array('attachments', 16), async (req, res) => {
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
router.delete('/:id/attachments/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (Number.isNaN(idx) || idx < 0) return res.status(400).send({ error: 'Invalid attachment index' });
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

    // Try delete local file
    if (removed && removed.url && removed.url.includes('/uploads/issues/')) {
      try {
        const urlPath = removed.url.split('/uploads/')[1];
        if (urlPath) {
          const full = path.join(__dirname, '..', 'uploads', urlPath);
          if (fs.existsSync(full)) fs.unlinkSync(full);
        }
      } catch (_) {}
    }

    return res.status(200).send(issue);
  } catch (error) {
    console.error('[issues] remove attachment error', error);
    return res.status(500).send({ error: 'Failed to remove attachment' });
  }
});

module.exports = router;