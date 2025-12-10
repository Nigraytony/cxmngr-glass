const express = require('express');
const router = express.Router();
let stripe = null;
const mongoose = require('mongoose');
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

// Helper to determine if the requester can manage billing for this project.
function canManageBilling(user, project) {
  if (!user || !project) return false;
  const userId = String(user._id || user.id || '');
  const userEmail = user.email ? String(user.email).toLowerCase() : null;
  const role = user.role || 'user';

  // Global roles can manage billing for all projects.
  if (role === 'globaladmin' || role === 'superadmin') return true;

  // Billing admin is explicitly allowed.
  if (project.billingAdminUserId && String(project.billingAdminUserId) === userId) return true;

  // Project team admins can manage billing.
  const team = Array.isArray(project.team) ? project.team : [];
  const member = team.find((t) => {
    try {
      if (!t) return false;
      if (t._id && String(t._id) === userId) return true;
      if (t.email && userEmail && String(t.email).toLowerCase() === userEmail) return true;
      return false;
    } catch (e) {
      return false;
    }
  });
  if (member && (member.role === 'admin' || member.role === 'globaladmin')) return true;

  return false;
}

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

// Resolve the Stripe customer id for a project: prefer billing admin, then subscription.customer, then requester.
async function resolveBillingCustomerId(project, requester) {
  let customerId = null;
  // Prefer explicit billing admin user
  if (project.billingAdminUserId) {
    const billingUser = await User.findById(project.billingAdminUserId);
    if (billingUser) {
      customerId = billingUser.stripeCustomerId || null;
      if (!customerId && stripe) {
        try { customerId = await ensureStripeCustomer(billingUser); } catch (e) {}
      }
    }
  }
  // If not found, inspect subscription for its customer
  if (!customerId && project.stripeSubscriptionId && stripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
      if (sub && sub.customer) customerId = sub.customer;
    } catch (e) {
      // ignore subscription fetch errors
    }
  }
  // Fallback: use requester
  if (!customerId && requester) {
    const u = requester;
    customerId = u.stripeCustomerId || null;
    if (!customerId && stripe) {
      try { customerId = await ensureStripeCustomer(u); } catch (e) {}
    }
  }
  return customerId;
}

// Billing summary for a project (viewable by billing admin, project admin, or global/super admins)
router.get('/project/:id/summary', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    if (!projectId) return res.status(400).json({ error: 'project id required' });

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!canManageBilling(req.user, project)) {
      return res.status(403).json({ error: 'Not authorized to view billing for this project' });
    }

    // Build plan lookup maps for convenience
    const planByPriceId = {};
    if (Array.isArray(plans)) {
      for (const p of plans) {
        if (p && p.priceId) planByPriceId[p.priceId] = p;
      }
    }

    const plan = planByPriceId[project.stripePriceId] || null;
    const billingAdminUser = project.billingAdminUserId
      ? await User.findById(project.billingAdminUserId).select('_id email firstName lastName').lean()
      : null;

    const summary = {
      projectId: String(project._id),
      subscriptionId: project.stripeSubscriptionId || null,
      priceId: project.stripePriceId || null,
      plan: plan
        ? {
            key: plan.key,
            label: plan.label,
            priceId: plan.priceId,
            summary: plan.summary,
            features: plan.features || [],
          }
        : null,
      status: project.stripeSubscriptionStatus || project.status || null,
      currentPeriodEnd: project.stripeCurrentPeriodEnd || null,
      cancelAtPeriodEnd: project.stripeCancelAtPeriodEnd || false,
      canceledAt: project.stripeCanceledAt || null,
      dunning: {
        isPastDue: Boolean(project.stripeIsPastDue),
        lastPaymentStatus: project.stripeLastPaymentStatus || null,
        lastInvoiceId: project.stripeLastInvoiceId || null,
        lastInvoiceStatus: project.stripeLastInvoiceStatus || null,
      },
      trial: {
        started: Boolean(project.trialStarted),
        start: project.trialStart || project.trialStartedAt || null,
        end: project.trialEnd || null,
      },
      billingAdmin: billingAdminUser
        ? {
            userId: String(billingAdminUser._id),
            email: billingAdminUser.email,
            name: [billingAdminUser.firstName, billingAdminUser.lastName].filter(Boolean).join(' ') || null,
          }
        : project.billingAdminUserId
          ? { userId: String(project.billingAdminUserId) }
          : null,
      defaultPaymentMethod: project.stripeDefaultPaymentMethod || null,
      hasStripe: Boolean(stripe),
    };

    // Optionally enrich from Stripe subscription to keep payment method snapshot fresh
    if (stripe && project.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(project.stripeSubscriptionId, {
          expand: ['default_payment_method', 'latest_invoice.payment_intent', 'discount.coupon', 'latest_invoice.discount.coupon'],
        });
        if (sub && sub.default_payment_method && typeof sub.default_payment_method === 'object') {
          const pm = sub.default_payment_method;
          summary.defaultPaymentMethod = {
            id: pm.id,
            brand: pm.card && pm.card.brand,
            last4: pm.card && pm.card.last4,
            exp_month: pm.card && pm.card.exp_month,
            exp_year: pm.card && pm.card.exp_year,
            funding: pm.card && pm.card.funding,
            cardholder: pm.billing_details && pm.billing_details.name,
          };
          // Persist snapshot on project for quicker reads later
          try {
            await Project.findByIdAndUpdate(project._id, { stripeDefaultPaymentMethod: summary.defaultPaymentMethod });
          } catch (e) {
            console.warn('[billing-summary] failed to persist payment method snapshot', e && e.message);
          }
        }
        // Keep cancellation flags in sync if they diverged
        if (sub && (sub.cancel_at_period_end !== project.stripeCancelAtPeriodEnd || sub.canceled_at)) {
          summary.cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
          summary.canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
          try {
            await Project.findByIdAndUpdate(project._id, {
              stripeCancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
              stripeCanceledAt: summary.canceledAt || null,
            });
          } catch (e) {
            console.warn('[billing-summary] failed to persist cancel flags', e && e.message);
          }
        }
        // Capture active promotion/discount info
        const discount = sub && sub.discount ? sub.discount : (sub && sub.latest_invoice && sub.latest_invoice.discount ? sub.latest_invoice.discount : null);
        if (discount && discount.coupon) {
          summary.promotion = {
            promotionCodeId: discount.promotion_code || null,
            couponId: discount.coupon.id,
            couponName: discount.coupon.name || null,
            percentOff: discount.coupon.percent_off || null,
            amountOff: discount.coupon.amount_off != null ? (discount.coupon.amount_off / 100) : null,
            currency: discount.coupon.currency || 'usd',
            duration: discount.coupon.duration || null,
          };
        }
      } catch (e) {
        console.warn('[billing-summary] stripe subscription fetch failed', e && e.message);
      }
    }

    return res.json(summary);
  } catch (err) {
    console.error('billing summary err', err);
    return res.status(500).json({ error: 'Failed to load billing summary' });
  }
});

// Preview a plan change (proration) for an existing subscription
router.post('/project/:id/plan/preview', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { priceId, proration_behavior } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
    const currentItem = sub.items && sub.items.data && sub.items.data[0];
    if (!currentItem) return res.status(400).json({ error: 'Subscription has no items to preview' });

    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: sub.customer,
      subscription: sub.id,
      subscription_items: [{ id: currentItem.id, price: priceId }],
      // If client asks to disable proration, propagate; otherwise let Stripe default to proration
      proration_behavior: proration_behavior || undefined,
      expand: ['lines.data.discounts', 'discounts', 'total_discount_amounts.discount'],
    });

    return res.json({
      amount_due: upcoming.amount_due != null ? (upcoming.amount_due / 100) : null,
      currency: upcoming.currency || 'usd',
      next_payment_attempt: upcoming.next_payment_attempt ? new Date(upcoming.next_payment_attempt * 1000) : null,
      period_end: upcoming.period_end ? new Date(upcoming.period_end * 1000) : null,
      lines: Array.isArray(upcoming.lines?.data) ? upcoming.lines.data.map(l => ({
        id: l.id,
        description: l.description,
        amount: l.amount != null ? (l.amount / 100) : null,
        proration: Boolean(l.proration),
      })) : [],
      discounts: upcoming.discounts || [],
      total_discount_amounts: upcoming.total_discount_amounts || [],
    });
  } catch (err) {
    console.error('plan preview error', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to preview plan change' });
  }
});

// Change plan (update the price on the existing Stripe subscription item)
// Preserves trial_end when subscription is in trialing state, so trial does not reset.
router.post('/project/:id/change-plan', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { priceId, proration_behavior } = req.body || {};
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    // Retrieve subscription
    const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
    const currentItem = sub.items && sub.items.data && sub.items.data[0];
    if (!currentItem) return res.status(400).json({ error: 'Subscription has no items to update' });

    const updateParams = {
      items: [{ id: currentItem.id, price: priceId }],
      // Default to Stripe's prorations unless explicitly disabled by client
      proration_behavior: proration_behavior || 'create_prorations',
    };
    // If still in trial, explicitly preserve the original trial_end so it cannot be extended/reset
    if (sub.status === 'trialing' && sub.trial_end) {
      updateParams.trial_end = sub.trial_end;
    }

    const updated = await stripe.subscriptions.update(sub.id, updateParams);

    // Mirror to DB (do not extend trialEnd – keep existing or the earlier of the two)
    let nextTrialEnd = project.trialEnd || null;
    const incomingTrialEnd = updated.trial_end ? new Date(updated.trial_end * 1000) : null;
    if (incomingTrialEnd) {
      nextTrialEnd = nextTrialEnd ? new Date(Math.min(nextTrialEnd.getTime(), incomingTrialEnd.getTime())) : incomingTrialEnd;
    }

    // Determine plan defaults for subscriptionFeatures by matching priceId
    let planDefaults = null;
    try {
      if (Array.isArray(plans)) {
        const byPrice = plans.find(p => p && p.priceId === priceId);
        const byKey = !byPrice && updated && updated.items && updated.items.data && updated.items.data[0] && updated.items.data[0].plan && updated.items.data[0].plan.product ? plans.find(p => p && p.key === String(p.key)) : null;
        planDefaults = (byPrice && byPrice.features) || null;
      }
    } catch (e) { /* ignore plan mapping errors */ }

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionId: updated.id,
      stripePriceId: priceId,
      stripeSubscriptionStatus: updated.status,
      stripeCurrentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000) : null,
      stripeCancelAtPeriodEnd: Boolean(updated.cancel_at_period_end),
      stripeCanceledAt: updated.canceled_at ? new Date(updated.canceled_at * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(updated.status),
      trialEnd: nextTrialEnd || project.trialEnd || null,
      trialStarted: project.trialStarted || Boolean(updated.trial_end),
      // Reset subscriptionFeatures to plan defaults unless explicitly preserved by client
      ...(planDefaults ? { subscriptionFeatures: planDefaults } : {}),
    });

    return res.json({ ok: true, status: updated.status, priceId });
  } catch (err) {
    console.error('change-plan error', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Cancel subscription (default: at period end)
router.post('/project/:id/cancel', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { atPeriodEnd = true } = req.body || {};

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    let sub = null;
    if (atPeriodEnd) {
      sub = await stripe.subscriptions.update(String(project.stripeSubscriptionId), { cancel_at_period_end: true });
    } else {
      sub = await stripe.subscriptions.cancel(String(project.stripeSubscriptionId));
    }

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      stripeCancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      stripeCanceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
    });

    return res.json({ ok: true, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end, canceledAt: sub.canceled_at });
  } catch (err) {
    console.error('cancel subscription error', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Resume subscription (undo cancel_at_period_end)
router.post('/project/:id/resume', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    const sub = await stripe.subscriptions.update(String(project.stripeSubscriptionId), { cancel_at_period_end: false });

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionStatus: sub.status,
      stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      stripeCancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      stripeCanceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
    });

    return res.json({ ok: true, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end, canceledAt: sub.canceled_at });
  } catch (err) {
    console.error('resume subscription error', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// Change billing admin for a project (metadata + local fields)
router.post('/project/:id/billing-admin', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId: newBillingAdminUserId, email } = req.body || {};
    if (!newBillingAdminUserId && !email) return res.status(400).json({ error: 'userId or email is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to change billing admin' });

    let newUser = null;
    // Prefer ObjectId lookup when valid
    if (newBillingAdminUserId && mongoose.Types.ObjectId.isValid(String(newBillingAdminUserId))) {
      try { newUser = await User.findById(newBillingAdminUserId); } catch (e) { /* ignore */ }
    }
    // Email lookup
    if (!newUser && email) {
      const normalized = String(email).trim().toLowerCase();
      newUser = await User.findOne({ email: normalized }).catch(() => null);
    }
    // Fallback: only try string id lookup when ObjectId is valid to avoid cast errors
    if (!newUser && newBillingAdminUserId && mongoose.Types.ObjectId.isValid(String(newBillingAdminUserId))) {
      newUser = await User.findOne({ _id: newBillingAdminUserId }).catch(() => null);
    }
    if (!newUser) return res.status(404).json({ error: 'Target user not found' });

    // Ensure the new billing admin is part of the project team (by id or email).
    const team = Array.isArray(project.team) ? project.team : [];
    const inTeam = team.some((t) => {
      try {
        if (!t) return false;
        if (t._id && String(t._id) === String(newUser._id)) return true;
        if (t.email && String(t.email).toLowerCase() === String(newUser.email).toLowerCase()) return true;
        return false;
      } catch (e) {
        return false;
      }
    });
    if (!inTeam) return res.status(400).json({ error: 'User must be a project member to become billing admin' });

    // Persist billing admin locally
    await Project.findByIdAndUpdate(projectId, {
      billingAdminUserId: newUser._id,
      billingAdminSetBy: req.user && req.user._id ? req.user._id : null,
      billingAdminSetAt: new Date(),
    });

    // Update subscription metadata to reflect new billing admin (best-effort)
    if (stripe && project.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(String(project.stripeSubscriptionId), {
          metadata: {
            ...(project.billingAdminUserId ? { previousBillingAdminUserId: String(project.billingAdminUserId) } : {}),
            billingAdminUserId: String(newUser._id),
            projectId: String(project._id),
          },
        });
      } catch (e) {
        console.warn('[billing-admin] failed to update subscription metadata', e && e.message);
      }
    }

    return res.json({
      ok: true,
      billingAdminUserId: String(newUser._id),
      billingAdminEmail: newUser.email,
      name: [newUser.firstName, newUser.lastName].filter(Boolean).join(' ') || null,
    });
  } catch (err) {
    console.error('billing admin change error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Failed to change billing admin' });
  }
});

// Create a setup intent for updating payment method (billing admin or managing admin)
router.post('/project/:id/setup-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });

    // Prefer the billing admin as the customer; fall back to current user
    let billingUser = null;
    if (project.billingAdminUserId) {
      billingUser = await User.findById(project.billingAdminUserId);
    }
    if (!billingUser) billingUser = req.user;
    if (!billingUser) return res.status(400).json({ error: 'Billing user not available' });

    const customerId = await ensureStripeCustomer(billingUser);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      metadata: { projectId: String(project._id), userId: String(billingUser._id) },
    });

    return res.json({ client_secret: intent.client_secret, customerId });
  } catch (err) {
    console.error('setup-intent error', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

// Attach a payment method and set as default for the subscription/customer
router.post('/project/:id/payment-method', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { paymentMethodId } = req.body || {};
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });

    // Use billing admin or current user as customer owner
    let billingUser = null;
    if (project.billingAdminUserId) billingUser = await User.findById(project.billingAdminUserId);
    if (!billingUser) billingUser = req.user;
    if (!billingUser) return res.status(400).json({ error: 'Billing user not available' });

    const customerId = await ensureStripeCustomer(billingUser);

    // Attach payment method to the customer and set default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    // If a subscription exists, set its default payment method
    if (project.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(String(project.stripeSubscriptionId), { default_payment_method: paymentMethodId });
      } catch (e) {
        console.warn('[payment-method] failed to set default on subscription', e && e.message);
      }
    }

    // Fetch PM for snapshot
    let pm = null;
    try {
      pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (e) {
      // best-effort
    }

    const snapshot = pm && pm.card ? {
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      funding: pm.card.funding,
      cardholder: pm.billing_details && pm.billing_details.name,
    } : null;

    if (snapshot) {
      try {
        await Project.findByIdAndUpdate(projectId, { stripeDefaultPaymentMethod: snapshot });
      } catch (e) {
        console.warn('[payment-method] failed to persist PM snapshot', e && e.message);
      }
    }

    return res.json({ ok: true, paymentMethod: snapshot || { id: paymentMethodId } });
  } catch (err) {
    console.error('payment-method error', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// List saved payment methods (cards) for the project's billing customer
router.get('/project/:id/payment-methods', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to view billing for this project' });

    const customerId = await resolveBillingCustomerId(project, req.user);
    if (!customerId) return res.status(400).json({ error: 'No billing customer found' });

    const pmList = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 20 });
    let defaultPmId = null;
    try {
      const cust = await stripe.customers.retrieve(customerId);
      defaultPmId = cust && cust.invoice_settings ? cust.invoice_settings.default_payment_method : null;
    } catch (e) {
      // ignore
    }

    const items = Array.isArray(pmList.data) ? pmList.data.map((pm) => ({
      id: pm.id,
      brand: pm.card && pm.card.brand,
      last4: pm.card && pm.card.last4,
      exp_month: pm.card && pm.card.exp_month,
      exp_year: pm.card && pm.card.exp_year,
      funding: pm.card && pm.card.funding,
      isDefault: defaultPmId ? String(defaultPmId) === String(pm.id) : false,
      billing_details: pm.billing_details || {},
    })) : [];

    return res.json({ items, defaultPaymentMethodId: defaultPmId || null });
  } catch (err) {
    console.error('list payment methods err', err && err.raw ? err.raw : err);
    return res.status(500).json({ error: 'Failed to list payment methods' });
  }
});

// Detach a payment method from the billing customer
router.delete('/project/:id/payment-methods/:pmId', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const pmId = req.params.pmId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!pmId) return res.status(400).json({ error: 'payment method id required' });

    // Ensure the PM belongs to the project's billing customer
    const customerId = await resolveBillingCustomerId(project, req.user);
    if (!customerId) return res.status(400).json({ error: 'No billing customer found' });
    try {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm && pm.customer && String(pm.customer) !== String(customerId)) {
        return res.status(403).json({ error: 'Payment method does not belong to this project customer' });
      }
    } catch (e) {
      // If retrieval fails, continue to detach attempt; Stripe will error if invalid
    }

    const detached = await stripe.paymentMethods.detach(pmId);

    // Clear stored snapshot if it matches
    if (project.stripeDefaultPaymentMethod && project.stripeDefaultPaymentMethod.id === pmId) {
      try {
        await Project.findByIdAndUpdate(projectId, { stripeDefaultPaymentMethod: null });
      } catch (e) {
        console.warn('[payment-method.detach] failed to clear snapshot', e && e.message);
      }
    }

    return res.json({ ok: true, detached: detached && detached.id });
  } catch (err) {
    console.error('detach payment method err', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to detach payment method' });
  }
});

// Apply a promotion code to an existing subscription
router.post('/project/:id/promotion', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'promotion code is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized to manage billing for this project' });
    if (!project.stripeSubscriptionId) return res.status(400).json({ error: 'Project does not have an active subscription' });

    // Look up promotion code by its human-friendly code
    const promoList = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const promo = Array.isArray(promoList.data) && promoList.data[0] ? promoList.data[0] : null;
    if (!promo) return res.status(404).json({ error: 'Promotion code not found or inactive' });

    const updated = await stripe.subscriptions.update(String(project.stripeSubscriptionId), {
      promotion_code: promo.id,
    });

    await Project.findByIdAndUpdate(projectId, {
      stripeSubscriptionStatus: updated.status,
      stripeCurrentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000) : null,
      isActive: ['active', 'trialing', 'past_due'].includes(updated.status),
    });

    return res.json({ ok: true, promotionCodeId: promo.id, subscriptionStatus: updated.status });
  } catch (err) {
    console.error('apply promotion err', err && err.raw ? err.raw : err);
    if (err && err.raw && err.raw.message) return res.status(400).json({ error: err.raw.message });
    return res.status(500).json({ error: 'Failed to apply promotion code' });
  }
});

// Create Checkout Session for subscribing a project
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { projectId, planKey, promotionCode } = req.body;
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
    if (promotionCode) {
      sessionParams.discounts = [{ promotion_code: promotionCode }];
    }

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

// GET /api/stripe/project/:id/transactions?type=all|invoice|charge&status=open|paid&start=ISO&end=ISO&page=1&limit=10&format=csv
router.get('/project/:id/transactions', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const projectId = req.params.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const typeFilter = (req.query.type || 'all').toString().toLowerCase();
    const statusFilter = req.query.status ? req.query.status.toString().toLowerCase() : null;
    const format = (req.query.format || '').toString().toLowerCase();
    const start = req.query.start ? new Date(req.query.start) : null;
    const end = req.query.end ? new Date(req.query.end) : null;
    const created = {};
    if (start && !isNaN(start.getTime())) created.gte = Math.floor(start.getTime() / 1000);
    if (end && !isNaN(end.getTime())) created.lte = Math.floor(end.getTime() / 1000);

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canManageBilling(req.user, project)) return res.status(403).json({ error: 'Not authorized' });

    const customerId = await resolveBillingCustomerId(project, req.user);
    const fetchCount = Math.min(100, page * limit);

    const shouldFetchInvoices = typeFilter === 'all' || typeFilter === 'invoice' || typeFilter === 'invoices';
    const shouldFetchCharges = typeFilter === 'all' || typeFilter === 'charge' || typeFilter === 'charges';
    const transactions = [];

    if (shouldFetchInvoices) {
      const invoiceParams = {
        limit: fetchCount,
        status: statusFilter || undefined,
        created: Object.keys(created).length ? created : undefined,
      };
      if (project.stripeSubscriptionId) invoiceParams.subscription = project.stripeSubscriptionId;
      else if (customerId) invoiceParams.customer = customerId;
      const invResp = await stripe.invoices.list(invoiceParams);
      const invoices = Array.isArray(invResp.data) ? invResp.data : [];
      for (const inv of invoices) {
        // Keep only items tied to this project when metadata is present
        if (inv.metadata && inv.metadata.projectId && String(inv.metadata.projectId) !== String(projectId)) continue;
        const discountAmountCents = Array.isArray(inv.total_discount_amounts)
          ? inv.total_discount_amounts.reduce((sum, d) => sum + (d.amount || 0), 0)
          : 0;
        const totalCents = typeof inv.total === 'number' ? inv.total : (typeof inv.amount_due === 'number' ? inv.amount_due : 0);
        const coupon = inv.discount && inv.discount.coupon ? inv.discount.coupon : null;
        transactions.push({
          id: inv.id,
          type: 'invoice',
          ts: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          amount: totalCents / 100,
          discountAmount: discountAmountCents / 100,
          netAmount: (totalCents - discountAmountCents) / 100,
          currency: inv.currency || 'usd',
          status: inv.status || null,
          description: inv.description || (inv.metadata && inv.metadata.description) || '',
          invoiceUrl: inv.hosted_invoice_url || null,
          receiptUrl: inv.invoice_pdf || null,
          subscriptionId: inv.subscription || null,
          promotionCodeId: inv.discount ? inv.discount.promotion_code || null : null,
          coupon: coupon
            ? {
                id: coupon.id,
                name: coupon.name || null,
                percentOff: coupon.percent_off || null,
                amountOff: coupon.amount_off != null ? (coupon.amount_off / 100) : null,
                duration: coupon.duration || null,
              }
            : null,
        });
      }
    }

    if (shouldFetchCharges && customerId) {
      const chargeParams = {
        customer: customerId,
        limit: fetchCount,
        created: Object.keys(created).length ? created : undefined,
      };
      const chargeResp = await stripe.charges.list(chargeParams);
      const charges = Array.isArray(chargeResp.data) ? chargeResp.data : [];
      for (const ch of charges) {
        // Skip charges that already correspond to invoices we captured
        if (ch.invoice) continue;
        if (ch.metadata && ch.metadata.projectId && String(ch.metadata.projectId) !== String(projectId)) continue;
        transactions.push({
          id: ch.id,
          type: 'charge',
          ts: ch.created ? new Date(ch.created * 1000).toISOString() : null,
          amount: typeof ch.amount === 'number' ? (ch.amount / 100) : null,
          discountAmount: 0,
          netAmount: typeof ch.amount_captured === 'number' ? (ch.amount_captured / 100) : (typeof ch.amount === 'number' ? (ch.amount / 100) : null),
          currency: ch.currency || 'usd',
          status: ch.status || null,
          description: ch.description || (ch.metadata && ch.metadata.description) || '',
          invoiceUrl: null,
          receiptUrl: ch.receipt_url || null,
          subscriptionId: null,
          promotionCodeId: null,
          coupon: null,
        });
      }
    }

    // Sort newest first
    transactions.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    const total = transactions.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = transactions.slice((page - 1) * limit, page * limit);

    if (format === 'csv') {
      const headers = ['id', 'type', 'ts', 'amount', 'discount', 'net', 'currency', 'status', 'description', 'coupon', 'promotionCodeId', 'invoiceUrl', 'receiptUrl'];
      const rows = [headers.join(',')];
      for (const t of items) {
        const row = [
          t.id,
          t.type,
          t.ts || '',
          t.amount != null ? t.amount.toFixed(2) : '',
          t.discountAmount != null ? t.discountAmount.toFixed(2) : '',
          t.netAmount != null ? t.netAmount.toFixed(2) : '',
          (t.currency || '').toUpperCase(),
          t.status || '',
          (t.description || '').replace(/,/g, ' '),
          t.coupon && (t.coupon.name || t.coupon.id) || '',
          t.promotionCodeId || '',
          t.invoiceUrl || '',
          t.receiptUrl || '',
        ];
        rows.push(row.join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-transactions-page-${page}.csv"`);
      return res.send(rows.join('\n'));
    }

    return res.json({ items, total, page, limit, totalPages });
  } catch (err) {
    console.error('list project transactions err', err);
    return res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// GET /api/stripe/project/:id/invoices?page=1&limit=10
router.get('/project/:id/invoices', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const id = req.params.id
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10))
    const project = await Project.findById(id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Try to list invoices for the subscription first, otherwise fall back to customer (current user)
    let invoices = []
    if (project.stripeSubscriptionId) {
      // list invoices for the subscription; request page*limit and slice (Stripe uses cursor pagination)
      const fetchCount = Math.min(100, page * limit)
      const resp = await stripe.invoices.list({ subscription: project.stripeSubscriptionId, limit: fetchCount })
      invoices = Array.isArray(resp.data) ? resp.data : []
      // filter by metadata.projectId when present
      invoices = invoices.filter(inv => !inv.metadata || !inv.metadata.projectId || String(inv.metadata.projectId) === String(id))
    } else {
      // fallback: use current authenticated user's customer id if available
      const user = req.user
      if (user && user.stripeCustomerId) {
        const fetchCount = Math.min(100, page * limit)
        const resp = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: fetchCount })
        invoices = Array.isArray(resp.data) ? resp.data : []
        invoices = invoices.filter(inv => !inv.metadata || !inv.metadata.projectId || String(inv.metadata.projectId) === String(id))
      } else {
        return res.status(400).json({ error: 'No subscription or customer available to list invoices' })
      }
    }

    const total = invoices.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const items = invoices.slice(start, start + limit).map(inv => ({
      id: inv.id,
      ts: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount_due: inv.amount_due != null ? (inv.amount_due / 100) : null,
      currency: inv.currency || 'usd',
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url,
      description: inv.description || inv.metadata && inv.metadata.description || '',
      subscription: inv.subscription || null,
      metadata: inv.metadata || {}
    }))

    return res.json({ items, total, page, limit, totalPages })
  } catch (err) {
    console.error('list project invoices err', err)
    return res.status(500).json({ error: 'Failed to list invoices' })
  }
})

module.exports = router;
