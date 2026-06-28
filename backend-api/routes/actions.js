// CRUD for Actions — sub-records of work performed under an Activity.
// Reuses the existing `activities` feature flag + activities.* permissions.
// Photos/documents are handled out-of-band by the Azure media panels
// (entityType="Action"), so there are no media endpoints here.

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const Action = require('../models/action');
const Activity = require('../models/activity');
const Issue = require('../models/issue');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const runMiddleware = require('../middleware/runMiddleware');
const { requireObjectIdParam, requireBodyField, requireObjectIdBody } = require('../middleware/validate');
const { deleteEntityMedia } = require('../utils/entityMedia');
const { applyClientId } = require('../utils/clientId');

const PAYLOAD_FIELDS = ['title', 'type', 'status', 'date', 'performedBy', 'location', 'equipmentId', 'templateId', 'notes'];

function pickActionPayload(source) {
  const body = source || {};
  const out = {};
  for (const k of PAYLOAD_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  if (typeof out.notes === 'string') {
    out.notes = sanitizeHtml(out.notes, { allowedTags: [], allowedAttributes: {} });
  }
  // Empty-string ids -> null (clears the link)
  for (const k of ['equipmentId', 'templateId']) {
    if (out[k] !== undefined && (out[k] === '' || out[k] === null)) out[k] = null;
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

// Load action -> set projectId on req for RBAC/subscription guards.
async function loadActionProjectId(req, res, next) {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid action id' });
    const action = await Action.findById(id).select('projectId activityId').lean();
    if (!action) return res.status(404).send({ error: 'Action not found' });
    req.query = { ...(req.query || {}), projectId: String(action.projectId) };
    req.body = req.body || {};
    if (!req.body.projectId) req.body.projectId = action.projectId;
    req._action = action;
    return next();
  } catch (e) {
    console.error('[actions] loadActionProjectId error', e && (e.stack || e.message || e));
    return res.status(500).send({ error: 'Failed to resolve action project' });
  }
}

// List actions for an activity. GET /api/actions?activityId=&projectId=
router.get('/', auth, requireFeature('activities'), requirePermission('activities.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const activityId = String(req.query.activityId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(activityId)) return res.status(400).send({ error: 'Valid activityId is required' });
    const projectId = String(req.query.projectId || '').trim();
    const filter = { activityId };
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) filter.projectId = projectId;
    const actions = await Action.find(filter).sort({ createdAt: 1 }).lean();
    res.status(200).send(actions);
  } catch (error) {
    console.error('[actions] list error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Failed to load actions' });
  }
});

// Create an action. POST /api/actions  { projectId, activityId, title, ... }
router.post('/', auth, requireBodyField('projectId'), requireObjectIdBody('projectId'), requireBodyField('activityId'), requireObjectIdBody('activityId'), requireFeature('activities'), requirePermission('activities.create', { projectParam: 'projectId' }), requireActiveProject, async (req, res) => {
  try {
    const projectId = String(req.body.projectId);
    const activityId = String(req.body.activityId);
    const activity = await Activity.findById(activityId).select('projectId').lean();
    if (!activity) return res.status(404).send({ error: 'Activity not found' });
    if (String(activity.projectId) !== projectId) {
      return res.status(400).send({ error: 'Activity does not belong to this project' });
    }

    const payload = pickActionPayload(req.body);
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).send({ error: 'title is required' });
    }
    payload.projectId = projectId;
    payload.activityId = activityId;
    payload.createdBy = req.user && req.user._id ? req.user._id : null;

    // Accept a client-supplied _id for offline creates (idempotent replay).
    const cid = await applyClientId(Action, req, projectId);
    if (cid.handled) return res.status(cid.status).send(cid.body);
    if (cid.id) payload._id = cid.id;

    const action = new Action(payload);
    await action.save();
    res.status(201).send(action);
  } catch (error) {
    console.error('[actions] create error', error && (error.stack || error.message || error));
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to create action' });
  }
});

// Get one action. GET /api/actions/:id
router.get('/:id', auth, requireObjectIdParam('id'), loadActionProjectId, requireFeature('activities'), requirePermission('activities.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const action = await Action.findById(req.params.id).lean();
    if (!action) return res.status(404).send({ error: 'Action not found' });
    res.status(200).send(action);
  } catch (error) {
    console.error('[actions] get error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Failed to load action' });
  }
});

// Update an action. PATCH /api/actions/:id  (supports linked `issues` array)
router.patch('/:id', auth, requireObjectIdParam('id'), loadActionProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const action = await Action.findById(req.params.id);
    if (!action) return res.status(404).send({ error: 'Action not found' });

    req.body = req.body || {};
    req.body.projectId = action.projectId;
    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const incoming = pickActionPayload(req.body);

    // Validate linked issues belong to this project (only check newly-added ids).
    if (Object.prototype.hasOwnProperty.call(req.body, 'issues')) {
      const ids = normalizeIssueIds(req.body.issues) || [];
      if (ids.length > 500) return res.status(400).send({ error: 'Too many issues (max 500)' });
      const previous = new Set((Array.isArray(action.issues) ? action.issues : []).map(v => String(v)));
      const added = ids.filter(id => !previous.has(id));
      if (added.length) {
        const count = await Issue.countDocuments({ _id: { $in: added }, projectId: action.projectId });
        if (count !== added.length) return res.status(400).send({ error: 'One or more issues are invalid for this project' });
      }
      incoming.issues = ids;
    }

    Object.assign(action, incoming);
    await action.save();
    res.status(200).send(action);
  } catch (error) {
    console.error('[actions] update error', error && (error.stack || error.message || error));
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update action' });
  }
});

// Delete an action. DELETE /api/actions/:id
router.delete('/:id', auth, requireObjectIdParam('id'), loadActionProjectId, requireFeature('activities'), async (req, res) => {
  try {
    const action = await Action.findById(req.params.id);
    if (!action) return res.status(404).send({ error: 'Action not found' });

    req.body = req.body || {};
    req.body.projectId = action.projectId;
    await runMiddleware(req, res, requirePermission('activities.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    await Action.deleteOne({ _id: action._id });
    // Clean up this action's photos/documents (Azure blobs + DocFile/DocFolder records).
    await deleteEntityMedia(action.projectId, 'Action', action._id);
    res.status(200).send({ ok: true });
  } catch (error) {
    console.error('[actions] delete error', error && (error.stack || error.message || error));
    res.status(500).send({ error: 'Failed to delete action' });
  }
});

module.exports = router;
