const Project = require('../models/project')
const plans = require('../config/plans')

function getPlansArray() {
  if (Array.isArray(plans)) return plans
  // fallback: convert object map to array
  return Object.keys(plans || {}).map(k => ({ key: k, ...(plans[k] || {}) }))
}

function getPlan(project) {
  const list = getPlansArray()
  if (!project) return list[0]
  const tier = String(project.subscriptionTier || '').toLowerCase()
  const byTier = list.find(p => String(p.key || '').toLowerCase() === tier)
  if (byTier) return byTier
  const priceId = project.stripePriceId || project.priceId
  if (priceId) {
    const byPrice = list.find(p => p.priceId === priceId)
    if (byPrice) return byPrice
  }
  return list[0]
}

async function loadProject(projectId) {
  if (!projectId) return null
  try { return await Project.findById(projectId).select('subscriptionTier subscriptionFeatures team').lean() } catch (e) { return null }
}

// Ensure a feature is enabled for the project's plan.
function requireFeature(featureKey) {
  return async function featureGuard(req, res, next) {
    const projectId =
      req.body?.projectId ||
      req.query?.projectId ||
      req.params?.projectId ||
      req.params?.id ||
      req.body?.id;
    if (!projectId) return res.status(400).json({ error: 'projectId is required', code: 'PROJECT_ID_REQUIRED' })
    const project = await loadProject(projectId)
    const plan = getPlan(project)
    const enabled = plan && plan.features ? plan.features[featureKey] === true : false
    if (!enabled) {
      return res.status(403).json({ error: `Feature not available on current plan: ${featureKey}`, code: 'FEATURE_NOT_IN_PLAN', feature: featureKey, tier: project?.subscriptionTier || 'basic' })
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
