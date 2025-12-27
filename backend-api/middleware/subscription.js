const Project = require('../models/project');
const { isObjectId } = require('./validate');

/**
 * Middleware to ensure a project's subscription is active.
 * It looks for a project id in route params, body or query, loads the project
 * and allows the request to continue only when the project is marked active
 * or has a stripeSubscriptionStatus that indicates an active subscription.
 */
async function requireActiveProject(req, res, next) {
  try {
    // Prefer explicit projectId from body or query over generic route params like :id
    // This avoids misinterpreting resource ids (e.g., issue id) as a project id
    const projectId =
      req.body?.project ||
      req.params?.project ||
      req.body?.projectId ||
      req.query?.projectId ||
      req.params?.projectId ||
      req.params?.id ||
      req.body?.id;
    if (!projectId) {
      return res.status(400).send({ error: 'projectId is required' });
    }
    if (!isObjectId(projectId)) {
      return res.status(400).send({ error: 'Invalid projectId' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).send({ error: 'Project not found' });

    // Primary flag can be an explicit isActive boolean.
    if (project.isActive === true) return next();

    // Fallback to Stripe subscription status if present.
    // Treat past_due as active to allow grace-period access while Stripe retries payment.
    const allowed = ['active', 'trialing', 'past_due'];
    if (project.stripeSubscriptionStatus && allowed.includes(String(project.stripeSubscriptionStatus).toLowerCase())) {
      return next();
    }

    // Otherwise block the request with 402 Payment Required - indicates billing issue
    return res.status(402).send({ error: 'Project subscription inactive or payment required' });
  } catch (err) {
    console.error('[subscription] requireActiveProject error', err && (err.stack || err.message || err))
    return res.status(500).send({ error: 'Subscription check failed' });
  }
}

module.exports = { requireActiveProject };
