const express = require('express');
const router = express.Router();
const plans = require('../config/plans');
const Project = require('../models/project');
const { getPlan } = require('../middleware/planGuard');

// Public plans endpoint: serve canonical plan definitions
router.get('/', (req, res) => {
  try {
    res.json(plans || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// Diagnostic: resolve effective plan for a given projectId
router.get('/resolve/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' });
    const project = await Project.findById(projectId).select('subscriptionTier stripePriceId subscriptionFeatures').lean();
    if (!project) return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    const plan = getPlan(project);
    return res.status(200).json({
      projectId,
      subscriptionTier: project.subscriptionTier || null,
      stripePriceId: project.stripePriceId || null,
      resolvedPlanKey: plan?.key || null,
      resolvedPriceId: plan?.priceId || null,
      features: plan?.features || {},
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to resolve plan', details: String(e?.message || e) });
  }
});

// Reconcile a project's subscriptionTier from its stripePriceId against known plans
router.post('/reconcile/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' });
    const project = await Project.findById(projectId).select('subscriptionTier stripePriceId subscriptionFeatures').lean();
    if (!project) return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    const list = Array.isArray(plans) ? plans : Object.keys(plans || {}).map(k => ({ key: k, ...(plans[k] || {}) }))
    const matched = list.find(p => p.priceId && p.priceId === (project.stripePriceId || ''))
    if (!matched) {
      return res.status(400).json({ error: 'stripePriceId does not match any configured plan priceId', code: 'PRICE_ID_NOT_MAPPED', stripePriceId: project.stripePriceId || null })
    }
    await Project.updateOne({ _id: projectId }, { $set: { subscriptionTier: matched.key, subscriptionFeatures: matched.features || null } })
    const updated = await Project.findById(projectId).select('subscriptionTier stripePriceId subscriptionFeatures').lean()
    return res.status(200).json({ ok: true, project: updated, resolvedPlanKey: matched.key })
  } catch (e) {
    res.status(500).json({ error: 'Failed to reconcile project plan', details: String(e?.message || e) })
  }
})

module.exports = router;
