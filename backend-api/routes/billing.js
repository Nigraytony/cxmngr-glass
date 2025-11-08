const express = require('express');
const router = express.Router();
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('[startup] Failed to init Stripe:', e && e.message);
  }
} else {
  console.warn('[startup] STRIPE_SECRET_KEY not set; billing endpoints disabled.');
}
const crypto = require('crypto');
const Project = require('../models/project');
const User = require('../models/user');
const plans = require('../config/plans');
const { auth } = require('../middleware/auth');

// Simple ping endpoint to verify connectivity without auth
router.get('/ping', (req, res) => {
  console.log('[stripe-ping] ping received');
  res.json({ ok: true });
});

async function ensureStripeCustomer(user) {
  if (!stripe) throw new Error('Stripe not configured');
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// Create Checkout Session for subscribing a project
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { projectId, planKey } = req.body;
    // Resolve planKey to priceId server-side; support direct priceId for backward-compat
    let priceId = null;
    if (planKey) {
      const plan = Array.isArray(plans) ? plans.find(p => p.key === planKey) : null;
      if (!plan) return res.status(400).json({ error: 'Invalid plan key' });
      priceId = plan.priceId;
    }
    if (!priceId && req.body.priceId) priceId = req.body.priceId;

    if (!projectId || !priceId) return res.status(400).json({ error: 'projectId and priceId required' });

    const user = req.user;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const customerId = await ensureStripeCustomer(user);

    // One fixed trial per project
    const firstTimeTrial = !project.trialStarted && !project.stripeSubscriptionId;
    const TRIAL_SECONDS = 15 * 24 * 60 * 60;
    let trialEndTs = null;
    if (firstTimeTrial) {
      const startDate = project.trialStart || project.trialStartedAt || project.createdAt || new Date();
      trialEndTs = Math.floor((new Date(startDate).getTime() + (TRIAL_SECONDS * 1000)) / 1000);
    }

    const sessionParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(firstTimeTrial ? {
        subscription_data: {
          trial_end: trialEndTs,
          metadata: { projectId: String(project._id), userId: String(user._id) },
        }
      } : {
        subscription_data: {
          metadata: { projectId: String(project._id), userId: String(user._id) },
        }
      }),
      success_url: `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/edit/${project._id}?checkout=success`,
      cancel_url: `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/edit/${project._id}?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: String(project._id),
      metadata: { projectId: String(project._id), userId: String(user._id) },
    };

    // Persist intended price on project
    try {
      project.stripePriceId = priceId;
      await project.save();
    } catch (e) {
      console.warn('[stripe] failed to persist priceId on project', e && e.message);
    }

    // Idempotency key
    let idempotencyKey;
    try {
      const hash = crypto.createHash('sha256').update(JSON.stringify(sessionParams)).digest('hex');
      idempotencyKey = `proj_${project._id}_session_${hash}`;
    } catch (e) {
      idempotencyKey = `proj_${project._id}_session_${Date.now()}`;
    }

    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    if (firstTimeTrial) {
      try {
        const startDate = project.trialStart || project.trialStartedAt || project.createdAt || new Date();
        await Project.findByIdAndUpdate(project._id, {
          trialStarted: true,
          trialStart: startDate,
          trialEnd: trialEndTs ? new Date(trialEndTs * 1000) : (project.trialEnd || null),
        });
      } catch (e) {
        console.warn('[stripe] failed to persist trial window on project', e && e.message);
      }
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session creation error', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Stripe session error' });
  }
});

// Create Billing Portal Session
router.post('/portal-session', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const user = req.user;
    const customerId = await ensureStripeCustomer(user);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173'}/account/billing-return`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('create-portal-session err', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

module.exports = router;
