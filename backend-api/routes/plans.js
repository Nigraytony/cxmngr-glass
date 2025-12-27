const express = require('express');
const router = express.Router();
const plans = require('../config/plans');
const Project = require('../models/project');
const { getPlan } = require('../middleware/planGuard');
const { authorize } = require('../middleware/auth');
const { requireObjectIdParam } = require('../middleware/validate');

function normalizeShortString(value, { maxLen = 128 } = {}) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > maxLen) return null;
  return s;
}

function isStripeIdLike(value, prefix) {
  const s = normalizeShortString(value, { maxLen: 128 });
  if (!s) return false;
  if (prefix && !s.startsWith(prefix)) return false;
  if (!/^[a-zA-Z0-9_]+$/.test(s)) return false;
  return true;
}

// Public plans endpoint: serve canonical plan definitions
router.get('/', (req, res) => {
  try {
    res.json(plans || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// Diagnostic: resolve effective plan for a given projectId
router.get('/resolve/:projectId', authorize(['globaladmin', 'superadmin']), requireObjectIdParam('projectId'), async (req, res) => {
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
    res.status(500).json({ error: 'Failed to resolve plan' });
  }
});

// Reconcile a project's subscriptionTier from its stripePriceId against known plans
router.post('/reconcile/:projectId', authorize(['globaladmin', 'superadmin']), requireObjectIdParam('projectId'), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' });
    const project = await Project.findById(projectId).select('subscriptionTier stripePriceId subscriptionFeatures').lean();
    if (!project) return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    if (!project.stripePriceId) {
      return res.status(400).json({ error: 'stripePriceId is missing on project', code: 'PRICE_ID_MISSING' });
    }
    if (!isStripeIdLike(project.stripePriceId, 'price_')) {
      return res.status(400).json({ error: 'Invalid stripePriceId on project', code: 'PRICE_ID_INVALID', stripePriceId: project.stripePriceId || null });
    }

    const list = Array.isArray(plans)
      ? plans
      : Object.keys(plans || {}).map((k) => ({ key: k, ...(plans[k] || {}) }));
    const matched = list.find((p) => p && p.priceId && p.priceId === project.stripePriceId);
    if (!matched) {
      return res.status(400).json({
        error: 'stripePriceId does not match any configured plan priceId',
        code: 'PRICE_ID_NOT_MAPPED',
        stripePriceId: project.stripePriceId || null,
      });
    }
    await Project.updateOne(
      { _id: projectId },
      { $set: { subscriptionTier: matched.key, subscriptionFeatures: matched.features || null } }
    );
    const updated = await Project.findById(projectId).select('subscriptionTier stripePriceId subscriptionFeatures').lean();
    return res.status(200).json({ ok: true, project: updated, resolvedPlanKey: matched.key });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reconcile project plan' });
  }
});

module.exports = router;
