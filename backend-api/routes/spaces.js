const express = require('express');
const router = express.Router();
const Space = require('../models/space');
const Project = require('../models/project');
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

// Create a new space
router.post('/', async (req, res) => {
  // console.log(req.body);
  try {
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

// Get all spaces by project ID
router.get('/project/:projectId', async (req, res) => {
  try {
    const spaces = await Space.find({ project: req.params.projectId });
    if (!spaces) {
      return res.status(404).send();
    }
    res.status(200).send(spaces);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single space by ID and find subSpaces
router.get('/:id', async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).send();
    }
    const subSpaces = await Space.find({ parentSpace: space._id }).select('_id tag title type description');
    res.status(200).send({ ...space.toObject(), subSpaces });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a space by ID
router.patch('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

// Upload attachments (documents) for a space
router.post('/:id/attachments', uploadDocs.array('attachments', 16), async (req, res) => {
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
router.delete('/:id/attachments/:index', async (req, res) => {
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
