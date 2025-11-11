const express = require('express');
const router = express.Router();
const Role = require('../models/role');

// List roles. Optional query: ?scope=global|project&projectId=...
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.scope) filter.scope = req.query.scope;
    if (req.query.projectId) filter.projectId = req.query.projectId;
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
    const payload = {
      name: req.body.name,
      description: req.body.description || '',
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      scope: req.body.scope === 'project' ? 'project' : 'global',
    };
    if (payload.scope === 'project' && req.body.projectId) payload.projectId = req.body.projectId;
    const role = new Role(payload);
    await role.save();
    res.status(201).json(role);
  } catch (err) {
    console.error('create role error', err && err.message ? err.message : err);
    res.status(400).json({ error: err.message || 'Failed to create role' });
  }
});

// Update a role
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.permissions !== undefined) updates.permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const role = await Role.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    console.error('update role error', err);
    res.status(400).json({ error: err.message || 'Failed to update role' });
  }
});

// Delete a role
router.delete('/:id', async (req, res) => {
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
