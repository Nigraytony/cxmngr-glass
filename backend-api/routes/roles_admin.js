const express = require('express');
const router = express.Router();
const Role = require('../models/role');
const { isObjectId, requireObjectIdParam } = require('../middleware/validate')

function normalizePermissions(input) {
  const arr = Array.isArray(input) ? input : []
  return arr.map((p) => String(p).trim()).filter(Boolean).slice(0, 500)
}

// List roles. Optional query: ?scope=global|project&projectId=...
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.scope) {
      const scope = String(req.query.scope).trim().toLowerCase()
      if (!['global', 'project'].includes(scope)) return res.status(400).json({ error: 'Invalid scope' })
      filter.scope = scope
    }
    if (req.query.projectId) {
      const pid = String(req.query.projectId).trim()
      if (!isObjectId(pid)) return res.status(400).json({ error: 'Invalid projectId' })
      filter.projectId = pid
    }
    const roles = await Role.find(filter).sort({ name: 1 }).lean();
    res.json(roles);
  } catch (err) {
    console.error('list roles error', err);
    res.status(500).json({ error: 'Failed to list roles' });
  }
});

// Create a role
router.post('/', async (req, res) => {
  try {
    const name = String(req.body && req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (name.length > 80) return res.status(400).json({ error: 'name is too long' })

    const payload = {
      name,
      description: typeof req.body?.description === 'string' ? String(req.body.description).trim().slice(0, 2000) : '',
      permissions: normalizePermissions(req.body && req.body.permissions),
      scope: req.body.scope === 'project' ? 'project' : 'global',
    };
    if (payload.scope === 'project') {
      const projectId = String(req.body && req.body.projectId || '').trim()
      if (!projectId) return res.status(400).json({ error: 'projectId is required for project-scoped roles' })
      if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' })
      payload.projectId = projectId
    }
    const role = new Role(payload);
    await role.save();
    res.status(201).json(role);
  } catch (err) {
    console.error('create role error', err && err.message ? err.message : err);
    res.status(400).json({ error: err.message || 'Failed to create role' });
  }
});

// Update a role
router.put('/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.description !== undefined) {
      updates.description = typeof req.body.description === 'string' ? String(req.body.description).trim().slice(0, 2000) : ''
    }
    if (req.body.permissions !== undefined) {
      updates.permissions = normalizePermissions(req.body.permissions)
    }
    const role = await Role.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    console.error('update role error', err);
    res.status(400).json({ error: err.message || 'Failed to update role' });
  }
});

// Delete a role
router.delete('/:id', requireObjectIdParam('id'), async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('delete role error', err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
