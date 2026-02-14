const Project = require('../models/project')
const plans = require('../config/plans')
const { isObjectId } = require('./validate')

function getPlansArray() {
  if (Array.isArray(plans)) return plans
  // fallback: convert object map to array
  return Object.keys(plans || {}).map(k => ({ key: k, ...(plans[k] || {}) }))
}

function inferTierFromFeatures(subscriptionFeatures) {
  const f = subscriptionFeatures && typeof subscriptionFeatures === 'object' ? subscriptionFeatures : null
  if (!f) return ''
  // Premium-only indicators in this app.
  if (f.ai === true || f.tasks === true || f.documents === true) return 'premium'
  // Templates has historically been premium-only in UI; treat as premium.
  if (f.templates === true) return 'premium'
  // Standard indicators.
  if (f.spaces === true || f.activities === true) return 'standard'
  // Basic indicators.
  if (f.issues === true || f.equipment === true) return 'basic'
  return ''
}

function getPlan(project) {
  const list = getPlansArray()
  if (!project) return list[0]
  // Prefer Stripe price mapping when it is configured/mapped, then fall back to tier.
  const priceId = project.stripePriceId || project.priceId
  if (priceId) {
    const byPrice = list.find(p => p.priceId === priceId)
    if (byPrice) return byPrice
  }
  const tier = String(project.subscriptionTier || '').toLowerCase()
  const byTier = list.find(p => String(p.key || '').toLowerCase() === tier)
  // Legacy/backfilled projects can have a stale subscriptionTier but accurate
  // subscriptionFeatures. Infer tier from premium-only feature flags.
  const inferredTier = inferTierFromFeatures(project.subscriptionFeatures)
  if (inferredTier) {
    const byInferred = list.find(p => String(p.key || '').toLowerCase() === inferredTier)
    if (byInferred) return byInferred
  }

  if (byTier) return byTier
  return list[0]
}

async function loadProject(projectId) {
  if (!projectId) return null
  try {
    // Include stripePriceId so getPlan can prefer price-based resolution.
    return await Project.findById(projectId).select('subscriptionTier subscriptionFeatures team stripePriceId').lean()
  } catch (e) { return null }
}

// Ensure a feature is enabled for the project's plan.
function requireFeature(featureKey) {
  return async function featureGuard(req, res, next) {
    const projectId =
      // Common project id carriers across routes
      req.body?.project ||
      req.params?.project ||
      req.body?.projectId ||
      req.query?.projectId ||
      req.params?.projectId ||
      req.params?.id ||
      req.body?.id;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' })
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId', code: 'PROJECT_ID_INVALID' })
    const project = await loadProject(projectId)
    // If the provided projectId does not resolve to a project, return a clear error
    // instead of silently falling back to the basic plan which can cause confusing 403s.
    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND', projectId })
    }
    const plan = getPlan(project)
    const enabled = plan && plan.features ? plan.features[featureKey] === true : false
    if (!enabled) {
      return res.status(403).json({
        error: `Feature not available on current plan: ${featureKey}`,
        code: 'FEATURE_NOT_IN_PLAN',
        feature: featureKey,
        tier: project?.subscriptionTier || 'unknown',
        resolvedPlanKey: plan?.key || 'unknown',
        resolvedPriceId: plan?.priceId || null,
        projectStripePriceId: project?.stripePriceId || null,
      })
    }
    return next()
  }
}

// Enforce numeric limits for a resource (e.g., issues/equipment/team).
// countFn should return the current count for the project.
function enforceLimit(resourceKey, countFn) {
  return async function limitGuard(req, res, next) {
    const projectId =
      req.body?.projectId ||
      req.query?.projectId ||
      req.params?.projectId ||
      req.params?.id ||
      req.body?.id;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' })
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId', code: 'PROJECT_ID_INVALID' })
    const project = await loadProject(projectId)
    const plan = getPlan(project)
    const limit = plan && plan.limits ? plan.limits[resourceKey] : 0
    if (!limit || limit <= 0) {
      return res.status(403).json({ error: `Feature not available on current plan: ${resourceKey}`, code: 'FEATURE_NOT_IN_PLAN', feature: resourceKey, tier: project?.subscriptionTier || 'basic' })
    }
    const current = await countFn(projectId)
    if (current >= limit) {
      return res.status(402).json({ error: `${resourceKey} limit reached`, code: 'PLAN_LIMIT_REACHED', resource: resourceKey, limit, current })
    }
    return next()
  }
}

module.exports = { requireFeature, enforceLimit, getPlan }
