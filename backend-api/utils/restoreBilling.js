// Billing helpers for the project *restore-through-checkout* flow.
//
// These intentionally mirror a subset of the helpers in routes/billing.js
// (canManageBilling, ensureStripeCustomer, resolveBillingCustomerId, checkout
// session creation). They are duplicated here rather than imported so that the
// money-critical billing.js routes stay untouched by the restore feature. If
// these drift, prefer consolidating both into a single shared module.
//
// Used by POST /api/projects/:id/restore to:
//   1) reconcile a live active/past_due subscription (covers webhook lag), and
//   2) build a Stripe Checkout URL when restore needs a fresh paid subscription.

const crypto = require('crypto');
const User = require('../models/user');
const plans = require('../config/plans');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('[restoreBilling] Failed to init Stripe:', e && e.message);
  }
}

function getStripe() {
  return stripe;
}

function isStripeIdLike(value, prefix) {
  if (value === undefined || value === null) return false;
  const s = String(value).trim();
  if (!s || s.length > 128) return false;
  if (prefix && !s.startsWith(prefix)) return false;
  return /^[a-zA-Z0-9_]+$/.test(s);
}

// Mirror of billing.js canManageBilling: globaladmin/superadmin, explicit billing
// admin, or a project team member with role admin/globaladmin.
function canManageBilling(user, project) {
  if (!user || !project) return false;
  const userId = String(user._id || user.id || '');
  const userEmail = user.email ? String(user.email).toLowerCase() : null;
  const role = user.role || 'user';

  if (role === 'globaladmin' || role === 'superadmin') return true;
  if (project.billingAdminUserId && String(project.billingAdminUserId) === userId) return true;

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
  return Boolean(member && (member.role === 'admin' || member.role === 'globaladmin'));
}

async function ensureStripeCustomer(user) {
  if (!stripe) throw new Error('Stripe not configured');
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(String(user.stripeCustomerId));
      if (existing && !existing.deleted) return user.stripeCustomerId;
    } catch (e) {
      user.stripeCustomerId = null;
      await user.save();
    }
  }
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

async function resolveBillingCustomerId(project, requester) {
  let customerId = null;
  if (project.billingAdminUserId) {
    const billingUser = await User.findById(project.billingAdminUserId);
    if (billingUser && stripe) {
      try { customerId = await ensureStripeCustomer(billingUser); } catch (e) { /* ignore */ }
    }
  }
  if (!customerId && project.stripeSubscriptionId && stripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(String(project.stripeSubscriptionId));
      if (sub && sub.customer) customerId = sub.customer;
    } catch (e) { /* ignore */ }
  }
  if (!customerId && requester && stripe) {
    try { customerId = await ensureStripeCustomer(requester); } catch (e) { /* ignore */ }
  }
  return customerId;
}

// Build the project field patch a webhook/reconcile would apply for a given sub.
function subscriptionUpdatePayload(sub) {
  const firstItem = sub.items && sub.items.data && sub.items.data[0];
  const priceId = firstItem && firstItem.price && firstItem.price.id ? firstItem.price.id : null;
  let planKey = null;
  let planDefaults = null;
  if (Array.isArray(plans) && priceId) {
    const byPrice = plans.find((p) => p && String(p.priceId) === String(priceId));
    if (byPrice) {
      planKey = byPrice.key || null;
      planDefaults = byPrice.features || null;
    }
  }
  return {
    stripeSubscriptionId: sub.id,
    stripeSubscriptionStatus: sub.status,
    stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    stripeCancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeCanceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    stripePriceId: priceId,
    isActive: ['active', 'trialing', 'past_due'].includes(String(sub.status)),
    ...(planKey ? { subscriptionTier: planKey } : {}),
    ...(planDefaults ? { subscriptionFeatures: planDefaults } : {}),
    _priceId: priceId,
  };
}

// Reconcile against Stripe to catch webhook lag: if the project's billing customer
// has a live active/past_due subscription, return the update payload to persist.
// Returns null when none is found (or Stripe unconfigured). Does NOT write to the DB.
async function findLiveActiveSubscription(project, requester) {
  if (!stripe) return null;
  const customerId = await resolveBillingCustomerId(project, requester);
  if (!customerId) return null;
  const subResp = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
    expand: ['data.items.data.price'],
  });
  const subs = Array.isArray(subResp.data) ? subResp.data : [];
  // Restore allows active/past_due only (no trialing — restore must be paid, no new trial).
  const preferred = subs.find((s) => ['active', 'past_due'].includes(String(s.status)));
  if (!preferred) return null;
  return subscriptionUpdatePayload(preferred);
}

// Build a Stripe Checkout URL for restoring a project to a PAID subscription.
// Reuses the project's last plan (stripePriceId). Never grants a trial. The
// success_url carries `intent=restore` so the SPA retries POST /restore on return.
// Returns null if Stripe is unconfigured or no plan can be resolved.
async function buildRestoreCheckoutUrl(project, user, { promotionCode } = {}) {
  if (!stripe) return null;

  let priceId = project.stripePriceId || null;
  if (!priceId && Array.isArray(plans) && plans.length) {
    // No prior plan recorded — fall back to the first configured plan's price.
    priceId = plans[0] && plans[0].priceId ? plans[0].priceId : null;
  }
  if (!priceId || !isStripeIdLike(priceId, 'price_')) return null;
  if (promotionCode && !isStripeIdLike(promotionCode, 'promo_')) promotionCode = null;

  const customerId = await resolveBillingCustomerId(project, user);
  if (!customerId) return null;

  const base = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const sessionParams = {
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // No trial on restore (belt-and-suspenders; project.trialStarted is already true).
    subscription_data: {
      metadata: { projectId: String(project._id), userId: String(user._id), intent: 'restore' },
    },
    success_url: `${base}/app/projects/edit/${project._id}?checkout=success&intent=restore`,
    cancel_url: `${base}/app/projects/edit/${project._id}?checkout=cancel`,
    client_reference_id: String(project._id),
    metadata: { projectId: String(project._id), userId: String(user._id), intent: 'restore' },
  };
  // Stripe rejects a session that sets both `discounts` and `allow_promotion_codes`.
  // Pre-apply a specific code when provided; otherwise expose the promo-code field.
  if (promotionCode) {
    sessionParams.discounts = [{ promotion_code: promotionCode }];
  } else {
    sessionParams.allow_promotion_codes = true;
  }

  let idempotencyKey;
  try {
    const hash = crypto.createHash('sha256').update(JSON.stringify(sessionParams)).digest('hex');
    idempotencyKey = `proj_${project._id}_restore_${hash}`;
  } catch (e) {
    idempotencyKey = `proj_${project._id}_restore_${String(project._id)}`;
  }

  const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  return session && session.url ? session.url : null;
}

module.exports = {
  getStripe,
  canManageBilling,
  resolveBillingCustomerId,
  findLiveActiveSubscription,
  buildRestoreCheckoutUrl,
};
