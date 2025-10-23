require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const projectRoutes = require('./routes/projects');
const issueRoutes = require('./routes/issues');
const equipmentRoutes = require('./routes/equipment');
const templateRoutes = require('./routes/templates');
const taskRoutes = require('./routes/tasks');
const activityRoutes = require('./routes/activities');
const userRoutes = require('./routes/users');
const spaceRoutes = require('./routes/spaces');
const { authorize } = require('./middleware/auth');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const Project = require('./models/project');
const User = require('./models/user');
const crypto = require('crypto');
const plans = require('./config/plans');
const WebhookEvent = require('./models/webhookEvent');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 4242;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

// Middleware
// We will use raw body parsing for the Stripe webhook route specifically below.
app.use((req, res, next) => {
  // Let express.json handle normal routes; webhook route needs raw body later
  next();
});
// Capture raw body for Stripe webhook signature verification, then parse JSON normally
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    // store raw buffer only for webhook endpoint
    try {
      if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) {
        req.rawBody = buf;
      }
    } catch (e) {
      // ignore
    }
  }
}));
// Enable CORS and allow Authorization header for preflight
app.use(cors({ origin: true, allowedHeaders: ['Content-Type', 'Authorization'] }));

// Log incoming requests to Stripe-related endpoints for debugging
app.use('/api/stripe', (req, res, next) => {
  console.log('[stripe-mw] Incoming', req.method, req.path);
  next();
});

// Simple ping endpoint to verify connectivity without auth
app.get('/api/stripe/ping', (req, res) => {
  console.log('[stripe-ping] ping received');
  res.json({ ok: true });
});

// Routes
app.get('/api/', (req, res) => {
  res.send('Welcome to the CXMNGR API');
});
app.use('/api/projects', 
  // authorize(['admin', 'user']),
  projectRoutes
);
app.use('/api/issues', 
  // authorize(['admin', 'user']), 
  issueRoutes
);
app.use('/api/equipment', 
  // authorize(['admin', 'user']), 
  equipmentRoutes
);
app.use('/api/templates', 
  // authorize(['admin', 'user']), 
  templateRoutes
);
app.use('/api/tasks', 
  authorize(['admin', 'user']), 
  taskRoutes
);
app.use('/api/activities', 
  authorize(['admin', 'user']), 
  activityRoutes
);
app.use('/api/spaces', 
  // authorize(['admin', 'user']), 
  spaceRoutes
);
app.use('/api/users', userRoutes);
app.use('/api/admin', authorize(['admin']), adminRoutes);

// Billing and webhook routes
// --- JWT auth middleware (example) ---
const requireAuth = async (req, res, next) => {
  try {
    const rawAuth = req.headers.authorization || '';
    console.log('[auth] incoming Authorization header present?', Boolean(rawAuth));
    const token = rawAuth.replace('Bearer ', '');
    console.log('[auth] token length:', token ? token.length : 0);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[auth] JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (verifyErr) {
      console.error('[auth] jwt.verify failed:', verifyErr && verifyErr.message);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Support tokens that use _id or id
    req.userId = payload && (payload._id || payload.id || payload.userId);
    console.log('[auth] resolved userId:', req.userId);
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    next();
  } catch (err) {
    console.error('[auth] unexpected error', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Ensure a Stripe Customer exists for the user
async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// Create Checkout Session for a given project + price
app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
  console.log('Creating checkout session with body:', req.body);
  try {
    const { projectId, planKey } = req.body;
    // Resolve planKey to a Stripe priceId on the server
    let priceId = null;
    if (planKey) {
      const plan = plans.find(p => p.key === planKey);
      if (!plan) return res.status(400).json({ error: 'Invalid plan key' });
      priceId = plan.priceId;
    }
    // Backwards-compat: support direct priceId as well
    if (!priceId && req.body.priceId) priceId = req.body.priceId;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const customerId = await ensureStripeCustomer(user);

    // Compute trial_end from the project's trialStartedAt so we don't grant
    // a fresh 15-day window if the project already started its trial.
    const nowTs = Math.floor(Date.now() / 1000);
    const TRIAL_SECONDS = 15 * 24 * 60 * 60;
    const MIN_SECONDS_AHEAD = 2 * 24 * 60 * 60; // Stripe requires >=48 hours

    let trialEndTs = null;
    if (project.trialStartedAt) {
      // Compute remaining seconds of the original trial window
      const startedTs = Math.floor(new Date(project.trialStartedAt).getTime() / 1000);
      const elapsed = Math.max(0, nowTs - startedTs);
      const remaining = TRIAL_SECONDS - elapsed;
      if (remaining > 0) {
        // Use remaining time but ensure at least MIN_SECONDS_AHEAD
        if (remaining < MIN_SECONDS_AHEAD) {
          // If remaining is less than Stripe's minimum, extend to minimum so Stripe accepts it,
          // but we won't give the customer a fresh 15 days — this is just to satisfy Stripe.
          trialEndTs = nowTs + MIN_SECONDS_AHEAD;
        } else {
          trialEndTs = nowTs + remaining;
        }
      } else {
        // Trial exhausted — do not set trial_end
        trialEndTs = null;
      }
    } else {
      // No recorded trial start on the project: initialize it to now and grant full trial
      // (first-time project creation behavior). Record it on the project to avoid
      // re-granting on subsequent calls.
      project.trialStartedAt = new Date();
      await project.save();
      trialEndTs = nowTs + TRIAL_SECONDS;
      if (trialEndTs < nowTs + MIN_SECONDS_AHEAD) trialEndTs = nowTs + MIN_SECONDS_AHEAD;
    }

    console.log('[stripe] computed trial_end (unix ts):', trialEndTs);

    // NOTE: For Checkout Subscriptions, pass trial via subscription_data.trial_end
    // (Stripe supports this and sets billing cycle anchor accordingly).
    const sessionParams = {
      mode: 'subscription',
      customer: customerId, // ensures all project subs are under one customer
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        // Only include trial_end when we have a value to provide
        ...(trialEndTs ? { trial_end: trialEndTs } : {}),
        metadata: {
          projectId: String(project._id),
          userId: String(user._id),
        },
      },
      success_url: `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${project._id}/project-settings?checkout=success`,
      cancel_url: `${process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${project._id}/project-settings?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: String(project._id),
      metadata: {
        projectId: String(project._id),
        userId: String(user._id),
      },
    };

    // Persist the selected priceId on the project so later webhooks/sub updates
    // have a canonical reference. Only set if provided.
    if (priceId) {
      try {
        project.stripePriceId = priceId;
        await project.save();
      } catch (e) {
        console.warn('[stripe] failed to persist priceId on project', e && e.message);
      }
    }

    // Derive an idempotency key from the exact payload so that requests with
    // different parameters produce different keys (avoids Stripe idempotency errors).
    let idempotencyKey;
    try {
      const hash = crypto.createHash('sha256').update(JSON.stringify(sessionParams)).digest('hex');
      idempotencyKey = `proj_${project._id}_session_${hash}`;
    } catch (e) {
      // Fallback to a timestamped key if hashing fails
      idempotencyKey = `proj_${project._id}_session_${Date.now()}`;
    }

    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session creation error', err && err.raw ? err.raw : err);
    // If this is a Stripe error with a helpful message, return it as 400
    if (err && err.raw && err.raw.message) {
      return res.status(400).json({ error: err.raw.message });
    }
    return res.status(500).json({ error: 'Stripe session error' });
  }
});

// Customer Billing Portal (manage payment method, switch/cancel plan)
app.post('/api/stripe/portal-session', requireAuth, async (req, res) => {
  console.log('Request Body:', req.body);
  console.log('[portal-session] Authorization header:', req.headers.authorization ? '[present]' : '[missing]');
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const customerId = await ensureStripeCustomer(user);

    // Create a short-lived portal session and return URL to client. :contentReference[oaicite:2]{index=2}
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/account/billing-return`,
    });
    return res.json({ url: portal.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Portal session error' });
  }
});

// Debug route: decode token without verifying to inspect payload in dev
app.get('/api/debug/decode-token', (req, res) => {
  try {
    const rawAuth = req.headers.authorization || '';
    const token = rawAuth.replace('Bearer ', '');
    const decoded = jwt.decode(token);
    console.log('[debug] decode-token:', decoded);
    return res.json({ decoded });
  } catch (err) {
    console.error('[debug] decode-token error', err);
    return res.status(400).json({ error: 'Failed to decode token' });
  }
});

// Webhook: use the captured raw body for signature verification
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!sig) return res.status(400).send('Missing stripe signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).send('Webhook secret not configured');

    const payload = req.rawBody || (req.body ? Buffer.from(JSON.stringify(req.body)) : null);
    if (!payload) return res.status(400).send('Webhook Error: raw body not available');

    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.verify', ok: false, message: err && err.message }));
    return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : String(err)}`);
  }

  // Insert or find the webhook event - ensure idempotency by unique eventId
  const eventId = event && event.id;
  if (!eventId) {
    console.error(JSON.stringify({ ctx: 'webhook', ok: false, message: 'Event missing id' }));
    return res.status(400).send('Event missing id');
  }

  let wevent = null;
  try {
    wevent = await WebhookEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, type: event.type, receivedAt: new Date(), status: 'processing', meta: { raw: event } } },
      { upsert: true, new: true }
    );

    // If this event has already been processed, respond quickly
    if (wevent && wevent.status === 'processed') {
      console.log(JSON.stringify({ ctx: 'webhook', eventId, ok: true, message: 'already processed' }));
      return res.json({ received: true, skipped: true });
    }
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.record', ok: false, message: err && err.message }));
    // Continue: we still attempt to process, but record failure may indicate DB issues
  }

  // Process the event and update the DB accordingly. Mark processed/failed in WebhookEvent.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          const projectId = (session.metadata && session.metadata.projectId) || (sub.metadata && sub.metadata.projectId) || session.client_reference_id;
          if (projectId) {
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const projectId = sub.metadata && sub.metadata.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items && sub.items.data[0] && sub.items.data[0].price ? sub.items.data[0].price.id : null,
            stripeSubscriptionStatus: sub.status,
            stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
            isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
          });
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(String(subId));
          const projectId = sub.metadata && sub.metadata.projectId;
          if (projectId) {
            await Project.findByIdAndUpdate(projectId, {
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              isActive: ['active', 'trialing', 'past_due'].includes(sub.status),
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const projectId = sub.metadata && sub.metadata.projectId;
        if (projectId) {
          await Project.findByIdAndUpdate(projectId, {
            stripeSubscriptionStatus: 'canceled',
            isActive: false,
          });
        }
        break;
      }
      default:
        // handle more events if you need them
        break;
    }

    // mark event processed
    try {
      await WebhookEvent.findOneAndUpdate({ eventId }, { status: 'processed', processedAt: new Date() });
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markProcessed', ok: false, eventId, message: markErr && markErr.message }));
    }

    console.log(JSON.stringify({ ctx: 'webhook', ok: true, eventId, type: event.type }));
    return res.json({ received: true });
  } catch (err) {
    console.error(JSON.stringify({ ctx: 'webhook.handler', ok: false, eventId, message: err && err.message }));
    try {
      await WebhookEvent.findOneAndUpdate({ eventId }, { status: 'failed', errorMessage: err && err.message });
    } catch (markErr) {
      console.error(JSON.stringify({ ctx: 'webhook.markFailed', ok: false, eventId, message: markErr && markErr.message }));
    }
    return res.status(500).send('Webhook handler error');
  }
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cxmngr-api', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});