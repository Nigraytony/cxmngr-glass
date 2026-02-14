const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');

const System = require('../models/system');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const runMiddleware = require('../middleware/runMiddleware');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature, enforceLimit } = require('../middleware/planGuard');
const { requireBodyField, requireObjectIdBody, requireObjectIdParam, isObjectId } = require('../middleware/validate');

function asStr(v, { maxLen = 2000 } = {}) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function pickSystemPayload(source) {
  const body = source || {};
  const out = {};
  const allowed = [
    'projectId',
    'tag',
    'name',
    'type',
    'description',
    'parentSystem',
    'equipmentIds',
    'issueIds',
    'oprItemIds',
    'checklists',
    'functionalTests',
    'fptSignatures',
    'tags',
    'attributes',
    'metadata',
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function normalizeStringArray(value, { maxItemLen = 80, maxItems = 200 } = {}) {
  if (value === undefined) return undefined;
  let v = value;
  if (typeof v === 'string') {
    // support comma-separated strings
    v = v.split(',');
  }
  if (!Array.isArray(v)) return null;
  const out = [];
  const seen = new Set();
  for (const raw of v) {
    const s = asStr(raw, { maxLen: maxItemLen }).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeAttrPairs(value, { maxItems = 200, maxKeyLen = 120, maxValueLen = 500 } = {}) {
  if (value === undefined) return undefined;
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (!Array.isArray(v)) return null;
  const out = [];
  for (const row of v) {
    if (!row) continue;
    const key = asStr(row.key ?? row.title ?? '', { maxLen: maxKeyLen }).trim();
    if (!key) continue;
    const val = asStr(row.value ?? '', { maxLen: maxValueLen }).trim();
    out.push({ key, value: val });
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeObjectIdArray(value, { maxItems = 500 } = {}) {
  if (value === undefined) return undefined;
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (!Array.isArray(v)) return null;
  const out = [];
  const seen = new Set();
  for (const raw of v) {
    const s = String((raw && (raw._id || raw.id)) || raw || '').trim();
    if (!s) continue;
    if (!isObjectId(s)) return null;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeMixedJsonArray(value) {
  if (value === undefined) return undefined;
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (!Array.isArray(v)) return null;
  return v;
}

async function loadSystemProjectId(req, res, next) {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const sys = await System.findById(id).select('projectId').lean();
    if (!sys) return res.status(404).json({ error: 'System not found' });

    req.body = req.body || {};
    req.body.projectId = sys.projectId;
    return next();
  } catch (err) {
    console.error('[systems] load projectId error', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Failed to resolve system project' });
  }
}

// List systems for a project
router.get(
  '/project/:projectId',
  auth,
  requireObjectIdParam('projectId'),
  requireFeature('systems'),
  requirePermission('systems.read', { projectParam: 'projectId' }),
  async (req, res) => {
    try {
      const projectId = new mongoose.Types.ObjectId(String(req.params.projectId));
      const q = asStr(req.query.q || '', { maxLen: 128 }).trim();

      const filter = { projectId };
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
          { name: { $regex: rx } },
          { tag: { $regex: rx } },
          { type: { $regex: rx } },
        ];
      }
      if (req.query.parentSystem !== undefined) {
        const raw = String(req.query.parentSystem || '').trim();
        if (!raw) {
          filter.parentSystem = null;
        } else if (!isObjectId(raw)) {
          return res.status(400).json({ error: 'Invalid parentSystem' });
        } else {
          filter.parentSystem = new mongoose.Types.ObjectId(raw);
        }
      }

      const items = await System.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .lean();

      return res.status(200).json(items);
    } catch (err) {
      console.error('[systems] list error', err && (err.stack || err.message || err));
      return res.status(500).json({ error: 'Failed to load systems' });
    }
  }
);

// Read one system
router.get(
  '/:id',
  auth,
  requireObjectIdParam('id'),
  loadSystemProjectId,
  requireFeature('systems'),
  requirePermission('systems.read', { projectParam: 'projectId' }),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const sys = await System.findById(id).lean();
      if (!sys) return res.status(404).json({ error: 'System not found' });
      return res.status(200).json(sys);
    } catch (err) {
      console.error('[systems] get error', err && (err.stack || err.message || err));
      return res.status(500).json({ error: 'Failed to load system' });
    }
  }
);

// Create
router.post(
  '/',
  auth,
  requireBodyField('projectId'),
  requireObjectIdBody('projectId'),
  requirePermission('systems.create', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('systems'),
  enforceLimit('systems', async (projectId) => System.countDocuments({ projectId })),
  async (req, res) => {
    try {
      const payload = pickSystemPayload(req.body);

      payload.tag = asStr(payload.tag, { maxLen: 80 }).trim();
      payload.name = asStr(payload.name, { maxLen: 160 }).trim();
      payload.type = asStr(payload.type, { maxLen: 120 }).trim();

      if (!payload.name) return res.status(400).json({ error: 'name is required' });

      if (payload.description !== undefined) {
        payload.description = sanitizeHtml(asStr(payload.description), { allowedTags: [], allowedAttributes: {} }).trim();
      }

      if (payload.tags !== undefined) {
        const normalized = normalizeStringArray(payload.tags, { maxItemLen: 80, maxItems: 200 });
        if (normalized === null) return res.status(400).json({ error: 'Invalid tags' });
        payload.tags = normalized;
      }
      if (payload.attributes !== undefined) {
        const normalized = normalizeAttrPairs(payload.attributes);
        if (normalized === null) return res.status(400).json({ error: 'Invalid attributes' });
        payload.attributes = normalized;
      }
      if (payload.oprItemIds !== undefined) {
        const normalized = normalizeObjectIdArray(payload.oprItemIds);
        if (normalized === null) return res.status(400).json({ error: 'Invalid oprItemIds' });
        payload.oprItemIds = normalized;
      }

      if (payload.parentSystem !== undefined && payload.parentSystem !== null && payload.parentSystem !== '') {
        const ps = String(payload.parentSystem).trim();
        if (!isObjectId(ps)) return res.status(400).json({ error: 'Invalid parentSystem' });
        payload.parentSystem = new mongoose.Types.ObjectId(ps);
      } else {
        payload.parentSystem = null;
      }

      const sys = new System(payload);
      await sys.save();
      return res.status(201).json(sys);
    } catch (err) {
      console.error('[systems] create error', err && (err.stack || err.message || err));
      return res.status(400).json({ error: err && err.message ? String(err.message) : 'Failed to create system' });
    }
  }
);

// Update (PATCH)
router.patch(
  '/:id',
  auth,
  requireObjectIdParam('id'),
  loadSystemProjectId,
  requireFeature('systems'),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const incoming = pickSystemPayload(req.body);
      delete incoming.projectId; // never allow changing project

      // Permission model (mirrors equipment patch behavior):
      // - Updating system metadata requires `systems.update`
      // - Updating embedded checklists requires `systems.checklists.update`
      // - Updating embedded functional tests/signatures requires `systems.functionalTests.update`
      const wantsChecklists = Object.prototype.hasOwnProperty.call(incoming, 'checklists');
      const wantsFunctionalTests = Object.prototype.hasOwnProperty.call(incoming, 'functionalTests');
      const wantsFptSignatures = Object.prototype.hasOwnProperty.call(incoming, 'fptSignatures');
      const wantsFpt = wantsFunctionalTests || wantsFptSignatures;
      const otherKeys = Object.keys(incoming || {}).filter((k) => !['checklists', 'functionalTests', 'fptSignatures'].includes(k));

      if (!wantsChecklists && !wantsFpt && otherKeys.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      if (wantsChecklists) {
        await runMiddleware(req, res, requirePermission('systems.checklists.update', { projectParam: 'projectId' }));
      }
      if (wantsFpt) {
        await runMiddleware(req, res, requirePermission('systems.functionalTests.update', { projectParam: 'projectId' }));
      }
      if (otherKeys.length) {
        await runMiddleware(req, res, requirePermission('systems.update', { projectParam: 'projectId' }));
      }
      await runMiddleware(req, res, requireActiveProject);

      if (incoming.tag !== undefined) incoming.tag = asStr(incoming.tag, { maxLen: 80 }).trim();
      if (incoming.name !== undefined) incoming.name = asStr(incoming.name, { maxLen: 160 }).trim();
      if (incoming.type !== undefined) incoming.type = asStr(incoming.type, { maxLen: 120 }).trim();
      if (incoming.description !== undefined) incoming.description = sanitizeHtml(asStr(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim();

      if (incoming.tags !== undefined) {
        const normalized = normalizeStringArray(incoming.tags, { maxItemLen: 80, maxItems: 200 });
        if (normalized === null) return res.status(400).json({ error: 'Invalid tags' });
        incoming.tags = normalized;
      }
      if (incoming.attributes !== undefined) {
        const normalized = normalizeAttrPairs(incoming.attributes);
        if (normalized === null) return res.status(400).json({ error: 'Invalid attributes' });
        incoming.attributes = normalized;
      }
      if (incoming.oprItemIds !== undefined) {
        const normalized = normalizeObjectIdArray(incoming.oprItemIds);
        if (normalized === null) return res.status(400).json({ error: 'Invalid oprItemIds' });
        incoming.oprItemIds = normalized;
      }

      if (incoming.equipmentIds !== undefined) {
        const normalized = normalizeObjectIdArray(incoming.equipmentIds);
        if (normalized === null) return res.status(400).json({ error: 'Invalid equipmentIds' });
        incoming.equipmentIds = normalized;
      }
      if (incoming.issueIds !== undefined) {
        const normalized = normalizeObjectIdArray(incoming.issueIds);
        if (normalized === null) return res.status(400).json({ error: 'Invalid issueIds' });
        incoming.issueIds = normalized;
      }

      if (wantsChecklists) {
        const normalized = normalizeMixedJsonArray(incoming.checklists);
        if (normalized === null) return res.status(400).json({ error: 'Invalid checklists' });
        incoming.checklists = normalized;
      }
      if (wantsFunctionalTests) {
        const normalized = normalizeMixedJsonArray(incoming.functionalTests);
        if (normalized === null) return res.status(400).json({ error: 'Invalid functionalTests' });
        incoming.functionalTests = normalized;
      }
      if (wantsFptSignatures) {
        const normalized = normalizeMixedJsonArray(incoming.fptSignatures);
        if (normalized === null) return res.status(400).json({ error: 'Invalid fptSignatures' });
        incoming.fptSignatures = normalized;
      }

      if (incoming.parentSystem !== undefined) {
        if (incoming.parentSystem === null || String(incoming.parentSystem).trim() === '') {
          incoming.parentSystem = null;
        } else {
          const ps = String(incoming.parentSystem).trim();
          if (!isObjectId(ps)) return res.status(400).json({ error: 'Invalid parentSystem' });
          incoming.parentSystem = new mongoose.Types.ObjectId(ps);
        }
      }

      // Prevent self-parenting
      if (incoming.parentSystem && String(incoming.parentSystem) === String(id)) {
        return res.status(400).json({ error: 'parentSystem cannot be self' });
      }

      const updated = await System.findByIdAndUpdate(
        id,
        { $set: incoming },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) return res.status(404).json({ error: 'System not found' });
      return res.status(200).json(updated);
    } catch (err) {
      console.error('[systems] update error', err && (err.stack || err.message || err));
      return res.status(400).json({ error: err && err.message ? String(err.message) : 'Failed to update system' });
    }
  }
);

// Delete
router.delete(
  '/:id',
  auth,
  requireObjectIdParam('id'),
  loadSystemProjectId,
  requirePermission('systems.delete', { projectParam: 'projectId' }),
  requireActiveProject,
  requireFeature('systems'),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const deleted = await System.findByIdAndDelete(id).lean();
      if (!deleted) return res.status(404).json({ error: 'System not found' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[systems] delete error', err && (err.stack || err.message || err));
      return res.status(500).json({ error: 'Failed to delete system' });
    }
  }
);

module.exports = router;
