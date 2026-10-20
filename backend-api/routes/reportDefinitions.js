/**
 * Project-scoped saved report definitions ("custom reports", Stage 1: list
 * presets; Stage 2: composer blocks). Project-shared: any team member can
 * list, create, update and delete them (deletes also allowed for admins).
 *
 * Mounted under /api/projects/:projectId/report-definitions (see index.js).
 */
const express = require('express');
const router = express.Router({ mergeParams: true });

const { auth } = require('../middleware/auth');
const { requireObjectIdParam, isObjectId } = require('../middleware/validate');
const Project = require('../models/project');
const ReportDefinition = require('../models/reportDefinition');
const { isProjectMember } = require('../utils/projectMembership');

const ALLOWED_ENTITIES = new Set([
  'issues', 'equipment', 'activities', 'tasks', 'spaces', 'systems', 'opritems', 'composite',
]);
// A definition is a settings payload, not a document store.
const MAX_DEFINITION_JSON = 64 * 1024;

router.param('id', (req, res, next, value) => {
  if (!isObjectId(value)) return res.status(400).send({ error: 'Invalid id' });
  return next();
});

// Load the project once and gate on team membership.
async function loadProjectAndRequireMember(req, res, next) {
  try {
    const pid = String(req.params.projectId || '');
    if (!isObjectId(pid)) return res.status(400).send({ error: 'Invalid project id' });
    const project = await Project.findById(pid).select('team name').lean();
    if (!project) return res.status(404).send({ error: 'Project not found' });
    if (!isProjectMember(project, req.user)) return res.status(403).send({ error: 'Not a member of this project' });
    req.project = project;
    return next();
  } catch (err) {
    console.error('[reportDefinitions] project load error', err && (err.message || err));
    return res.status(500).send({ error: 'Failed to load project' });
  }
}

function normalizeEntity(value) {
  const s = String(value || '').trim().toLowerCase();
  return ALLOWED_ENTITIES.has(s) ? s : null;
}

function normalizeName(value) {
  const s = String(value || '').trim();
  if (!s || s.length > 120) return null;
  return s;
}

function normalizeDefinition(value) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    if (JSON.stringify(value).length > MAX_DEFINITION_JSON) return null;
  } catch (e) {
    return null;
  }
  return value;
}

// List definitions for the project (optionally one entity's)
router.get('/', auth, requireObjectIdParam('projectId'), loadProjectAndRequireMember, async (req, res) => {
  try {
    const query = { projectId: req.params.projectId };
    const entity = String(req.query.entity || '').trim().toLowerCase();
    if (entity) {
      if (!ALLOWED_ENTITIES.has(entity)) return res.status(400).send({ error: 'Unknown entity' });
      query.entity = entity;
    }
    const items = await ReportDefinition.find(query).sort({ updatedAt: -1 }).limit(200).lean();
    return res.send({ items });
  } catch (err) {
    console.error('[reportDefinitions] list error', err && (err.message || err));
    return res.status(500).send({ error: 'Failed to list report definitions' });
  }
});

// Create
router.post('/', auth, requireObjectIdParam('projectId'), loadProjectAndRequireMember, async (req, res) => {
  try {
    const body = req.body || {};
    const entity = normalizeEntity(body.entity);
    if (!entity) return res.status(400).send({ error: 'Unknown or missing entity' });
    const name = normalizeName(body.name);
    if (!name) return res.status(400).send({ error: 'Name is required (max 120 chars)' });
    const definition = normalizeDefinition(body.definition);
    if (definition === null) return res.status(400).send({ error: 'Invalid definition payload' });

    const existing = await ReportDefinition.findOne({ projectId: req.params.projectId, entity, name }).select('_id').lean();
    if (existing) return res.status(409).send({ error: 'A report with this name already exists for this module' });

    const u = req.user || {};
    const createdByName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || String(u.email || '');
    const doc = await ReportDefinition.create({
      projectId: req.params.projectId,
      entity,
      name,
      description: String(body.description || '').slice(0, 500),
      definition,
      createdBy: u._id || u.id || undefined,
      createdByName,
    });
    return res.status(201).send(doc);
  } catch (err) {
    console.error('[reportDefinitions] create error', err && (err.message || err));
    return res.status(500).send({ error: 'Failed to create report definition' });
  }
});

// Update (rename, re-describe, or replace the definition payload)
router.patch('/:id', auth, requireObjectIdParam('projectId'), loadProjectAndRequireMember, async (req, res) => {
  try {
    const doc = await ReportDefinition.findOne({ _id: req.params.id, projectId: req.params.projectId });
    if (!doc) return res.status(404).send({ error: 'Report definition not found' });
    const body = req.body || {};

    if (body.name !== undefined) {
      const name = normalizeName(body.name);
      if (!name) return res.status(400).send({ error: 'Invalid name (max 120 chars)' });
      if (name !== doc.name) {
        const dup = await ReportDefinition.findOne({ projectId: req.params.projectId, entity: doc.entity, name }).select('_id').lean();
        if (dup && String(dup._id) !== String(doc._id)) return res.status(409).send({ error: 'A report with this name already exists for this module' });
      }
      doc.name = name;
    }
    if (body.description !== undefined) doc.description = String(body.description || '').slice(0, 500);
    if (body.definition !== undefined) {
      const definition = normalizeDefinition(body.definition);
      if (definition === null) return res.status(400).send({ error: 'Invalid definition payload' });
      doc.definition = definition;
      doc.markModified('definition');
    }
    await doc.save();
    return res.send(doc);
  } catch (err) {
    console.error('[reportDefinitions] update error', err && (err.message || err));
    return res.status(500).send({ error: 'Failed to update report definition' });
  }
});

// Delete
router.delete('/:id', auth, requireObjectIdParam('projectId'), loadProjectAndRequireMember, async (req, res) => {
  try {
    const result = await ReportDefinition.deleteOne({ _id: req.params.id, projectId: req.params.projectId });
    if (!result.deletedCount) return res.status(404).send({ error: 'Report definition not found' });
    return res.send({ ok: true });
  } catch (err) {
    console.error('[reportDefinitions] delete error', err && (err.message || err));
    return res.status(500).send({ error: 'Failed to delete report definition' });
  }
});

module.exports = router;
