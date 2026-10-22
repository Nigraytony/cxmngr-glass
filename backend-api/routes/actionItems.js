// CRUD for ActionItems — work OWED out of an Activity (A-1, A-2 … with
// owner/due/status), as opposed to Actions (work performed). Mirrors
// routes/actions.js: activities feature flag + activities.* permissions.

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const ActionItem = require('../models/actionItem');
const Activity = require('../models/activity');
const Issue = require('../models/issue');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const runMiddleware = require('../middleware/runMiddleware');
const { requireObjectIdParam, requireBodyField, requireObjectIdBody } = require('../middleware/validate');
const { applyClientId } = require('../utils/clientId');

const PAYLOAD_FIELDS = ['description', 'owner', 'due', 'status', 'refNote'];

function pickPayload(source) {
  const body = source || {};
  const out = {};
  for (const k of PAYLOAD_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  for (const k of ['description', 'owner', 'due', 'refNote']) {
    if (typeof out[k] === 'string') {
      out[k] = sanitizeHtml(out[k], { allowedTags: [], allowedAttributes: {} }).trim();
    }
  }
  return out;
}

function normalizeIssueIds(input) {
  if (!Array.isArray(input)) return null;
  const ids = [];
  const seen = new Set();
  for (const v of input) {
    const s = String(v && (v._id || v.id || v) || '').trim();
    if (!s || !mongoose.Types.ObjectId.isValid(s) || seen.has(s)) continue;
    seen.add(s);
    ids.push(s);
  }
  return ids;
}

async function loadItemProjectId(req, res, next) {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid action item id' });
    const item = await ActionItem.findById(id).select('projectId activityId').lean();
    if (!item) return res.status(404).send({ error: 'Action item not found' });
    req.query = { ...(req.query || {}), projectId: String(item.projectId) };
    req.body = req.body || {};
    if (!req.body.projectId) req.body.projectId = item.projectId;
    return next();
  } catch (e) {
    console.error('[actionItems] loadItemProjectId error', e && (e.stack || e.message || e));
    return res.status(500).send({ error: 'Failed to resolve action item project' });
  }
}

// Resolve projectId from the activity when the caller only sends activityId,
// so the RBAC guard has a project to check.
async function resolveProjectFromActivity(req, res, next) {
  try {
    if (!String((req.query || {}).projectId || '').trim()) {
      const activityId = String((req.query || {}).activityId || '').trim();
      if (mongoose.Types.ObjectId.isValid(activityId)) {
        const act = await Activity.findById(activityId).select('projectId').lean();
        if (act) req.query = { ...(req.query || {}), projectId: String(act.projectId) };
      }
    }
  } catch (e) { /* ignore — the permission check will reject */ }
  return next();
}

// List. GET /api/action-items?activityId=&projectId=
router.get('/', auth, requireFeature('activities'), resolveProjectFromActivity, requirePermission('activities.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const activityId = String(req.query.activityId || '').trim();
    const projectId = String(req.query.projectId || '').trim();
    const filter = {};
    if (mongoose.Types.ObjectId.isValid(activityId)) filter.activityId = activityId;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
    if (!filter.activityId && !filter.projectId) return res.status(400).send({ error: 'activityId or projectId is required' });
    const items = await ActionItem.find(filter).sort({ activityId: 1, sequence: 1 }).lean();
    res.status(200).send(items);
  } catch (error) {
    console.error('[actionItems] list error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Failed to load action items' });
  }
});

// Create. POST /api/action-items { projectId, activityId, description, ... }
router.post('/', auth, requireBodyField('projectId'), requireObjectIdBody('projectId'), requireBodyField('activityId'), requireObjectIdBody('activityId'), requireFeature('activities'), requirePermission('activities.create', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  try {
    const projectId = String(req.body.projectId);
    const activityId = String(req.body.activityId);
    const activity = await Activity.findById(activityId).select('projectId').lean();
    if (!activity) return res.status(404).send({ error: 'Activity not found' });
    if (String(activity.projectId) !== projectId) {
      return res.status(400).send({ error: 'Activity does not belong to this project' });
    }

    const payload = pickPayload(req.body);
    if (!payload.description) return res.status(400).send({ error: 'description is required' });
    payload.projectId = projectId;
    payload.activityId = activityId;
    payload.createdBy = req.user && req.user._id ? req.user._id : null;

    if (Object.prototype.hasOwnProperty.call(req.body, 'issueIds')) {
      const ids = normalizeIssueIds(req.body.issueIds) || [];
      if (ids.length) {
        const count = await Issue.countDocuments({ _id: { $in: ids }, projectId });
        if (count !== ids.length) return res.status(400).send({ error: 'One or more issues are invalid for this project' });
      }
      payload.issueIds = ids;
    }

    // Next A-n sequence for this activity.
    const last = await ActionItem.findOne({ activityId }).sort({ sequence: -1 }).select('sequence').lean();
    payload.sequence = (last && Number(last.sequence) ? Number(last.sequence) : 0) + 1;

    const cid = await applyClientId(ActionItem, req, projectId);
    if (cid.handled) return res.status(cid.status).send(cid.body);
    if (cid.id) payload._id = cid.id;

    const item = new ActionItem(payload);
    await item.save();
    res.status(201).send(item);
  } catch (error) {
    console.error('[actionItems] create error', error && (error.stack || error.message || error));
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create action item' });
  }
});

// Update. PATCH /api/action-items/:id
router.patch('/:id', auth, requireObjectIdParam('id'), loadItemProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const item = await ActionItem.findById(req.params.id);
    if (!item) return res.status(404).send({ error: 'Action item not found' });

    req.body = req.body || {};
    req.body.projectId = item.projectId;
    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const incoming = pickPayload(req.body);
    if (Object.prototype.hasOwnProperty.call(incoming, 'description') && !incoming.description) {
      return res.status(400).send({ error: 'description cannot be empty' });
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'issueIds')) {
      const ids = normalizeIssueIds(req.body.issueIds) || [];
      if (ids.length > 200) return res.status(400).send({ error: 'Too many issues (max 200)' });
      const previous = new Set((Array.isArray(item.issueIds) ? item.issueIds : []).map(v => String(v)));
      const added = ids.filter(id => !previous.has(id));
      if (added.length) {
        const count = await Issue.countDocuments({ _id: { $in: added }, projectId: item.projectId });
        if (count !== added.length) return res.status(400).send({ error: 'One or more issues are invalid for this project' });
      }
      incoming.issueIds = ids;
    }

    Object.assign(item, incoming);
    await item.save();
    res.status(200).send(item);
  } catch (error) {
    console.error('[actionItems] update error', error && (error.stack || error.message || error));
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update action item' });
  }
});

// Delete. DELETE /api/action-items/:id
router.delete('/:id', auth, requireObjectIdParam('id'), loadItemProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const item = await ActionItem.findById(req.params.id);
    if (!item) return res.status(404).send({ error: 'Action item not found' });

    req.body = req.body || {};
    req.body.projectId = item.projectId;
    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    await ActionItem.deleteOne({ _id: item._id });
    res.status(200).send({ ok: true });
  } catch (error) {
    console.error('[actionItems] delete error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Failed to delete action item' });
  }
});

module.exports = router;
