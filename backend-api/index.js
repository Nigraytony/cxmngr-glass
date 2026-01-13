require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
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
const adminRoutes = require('./routes/admin');
const rbacRoutes = require('./routes/rbac');
const rolesAdminRoutes = require('./routes/roles_admin');
const billingRoutes = require('./routes/billing');
const webhookRoutes = require('./routes/webhooks');
const plansRoutes = require('./routes/plans');
const aiRoutes = require('./routes/ai');
const assistantRoutes = require('./routes/assistant');
const projectDocsRoutes = require('./routes/projectDocs');
const { securityHeaders } = require('./middleware/securityHeaders');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// Trust first proxy in production deployments (Azure/NGINX) so req.ip and
// x-forwarded-* behave correctly for rate limiting and absolute URL building.
// Set TRUST_PROXY=false to disable.
if (String(process.env.TRUST_PROXY || 'true').toLowerCase() !== 'false') {
  app.set('trust proxy', 1);
}
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cxmngr-api';
if (!process.env.MONGODB_URI) {
  console.warn('[startup] MONGODB_URI not set; using local fallback.');
}

// CORS config: allow specific origins in production via env
// CORS_ALLOWED_ORIGINS can be a comma-separated list or "*" for any
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
const appUrlEnv = process.env.APP_URL; // used for building links; include as allowed origin if present
const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
let corsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Build allowed origins list from env, also include APP_URL origin if provided
if (allowedOriginsEnv && allowedOriginsEnv.trim() && allowedOriginsEnv !== '*') {
  const list = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
  try {
    if (appUrlEnv) {
      const origin = new URL(appUrlEnv).origin;
      if (!list.includes(origin)) list.push(origin);
    }
  } catch (_) { /* ignore invalid APP_URL */ }

  corsOptions = {
    ...corsOptions,
    origin: function(origin, callback) {
      // allow REST tools or same-origin (no origin header)
      if (!origin) return callback(null, true);
      if (list.includes(origin)) return callback(null, true);
      // Helpful diagnostics in logs for origin mismatches
      console.warn(`[cors] blocked origin: ${origin}; allowed: ${list.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    }
  };
}

// If explicit wildcard configured and we don't need cookies, allow all
if (allowedOriginsEnv === '*') {
  corsOptions = {
    ...corsOptions,
    credentials: false, // wildcard cannot be used with credentials
    origin: '*'
  };
}

// In production, do not default to reflecting any Origin when no allowlist is set.
// Prefer explicit `CORS_ALLOWED_ORIGINS`, otherwise derive from APP_URL/FRONTEND_URL.
if (isProd && (!allowedOriginsEnv || !String(allowedOriginsEnv).trim())) {
  const derived = []
  const addOrigin = (raw) => {
    try {
      if (!raw) return
      const o = new URL(String(raw)).origin
      if (o && !derived.includes(o)) derived.push(o)
    } catch (_) { /* ignore invalid url */ }
  }
  addOrigin(process.env.APP_URL)
  addOrigin(process.env.FRONTEND_URL)

  if (derived.length) {
    corsOptions = {
      ...corsOptions,
      origin: function(origin, callback) {
        if (!origin) return callback(null, true)
        if (derived.includes(origin)) return callback(null, true)
        console.warn(`[cors] blocked origin: ${origin}; allowed: ${derived.join(', ')}`)
        return callback(new Error('Not allowed by CORS'))
      },
    }
  } else {
    console.warn('[cors] NODE_ENV=production but no CORS_ALLOWED_ORIGINS/APP_URL/FRONTEND_URL set; blocking browser origins by default.')
    corsOptions = {
      ...corsOptions,
      origin: function(origin, callback) {
        if (!origin) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
      },
    }
  }
}

// Middleware
// Basic root for sanity
app.get('/', (_req, res) => {
  res.type('text').send('CXMNGR API alive');
});

// Baseline security headers (no deps)
app.use(securityHeaders);

// Request context + structured request logs (JSON)
app.use(requestLogger);

// Enable CORS (restricted if CORS_ALLOWED_ORIGINS is set)
// NOTE: Must be registered before body parsers so that even 4xx/413 responses
// (e.g., payload too large) still include CORS headers and don't surface as
// opaque "Network Error" in the browser.
app.use(cors(corsOptions));
// Handle preflight requests for all routes explicitly
app.options('*', cors(corsOptions));

// Capture raw body for Stripe webhook signature verification, then parse JSON normally
// Allow larger payloads for equipment and other rich payloads; configurable via BODY_PARSER_LIMIT
const bodyParserLimit = process.env.BODY_PARSER_LIMIT || '10mb'
app.use(express.json({
  limit: bodyParserLimit,
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

// Also accept urlencoded bodies with the same limit
app.use(express.urlencoded({ extended: true, limit: bodyParserLimit }))

// Serve uploaded files (local storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/api/', (req, res) => {
  res.send('Welcome to the CXMNGR API');
});
// Simple health endpoint for Azure health checks
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  const ok = state === 1;
  res.status(ok ? 200 : 500).json({ status: ok ? 'ok' : 'error', dbState: state });
});
app.use('/api/projects', 
  projectRoutes
);
// Project-scoped documents (folders/files; blob bytes live in Azure storage)
app.use('/api/projects/:projectId/docs', projectDocsRoutes);
app.use('/api/issues', 
  issueRoutes
);
app.use('/api/equipment', 
  equipmentRoutes
);
app.use('/api/templates', 
  templateRoutes
);
app.use('/api/tasks', 
  taskRoutes
);
app.use('/api/activities', 
  activityRoutes
);
app.use('/api/spaces', 
  spaceRoutes
);
app.use('/api/users', userRoutes);
app.use('/api/rbac', rbacRoutes);
// Admin console - restrict to global-level admins
app.use('/api/admin', authorize(['globaladmin', 'superadmin']), adminRoutes);
// Roles management - restricted to global-admin (see RBAC design)
app.use('/api/admin/roles', authorize(['globaladmin']), rolesAdminRoutes);
// Stripe/Billing routes
app.use('/api/stripe', billingRoutes);
app.use('/api/stripe', webhookRoutes);
// Public plans endpoint
app.use('/api/plans', plansRoutes);
// AI endpoints (plan-gated per project)
app.use('/api/ai', aiRoutes);
// Assistant endpoints (project-scoped; AI gated separately)
app.use('/api/assistant', assistantRoutes);

// Central error handler (always last)
app.use(errorHandler);

// Connect to MongoDB (Cosmos DB for MongoDB or Atlas or self-hosted)
async function connectMongo(retries = 5, delayMs = 4000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000
      });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`[mongo] attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt === retries) {
        console.error('[mongo] giving up after max retries; continuing without DB connection.');
        return;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
connectMongo().catch(e => console.error('[mongo] unexpected connect error', e));

// Start server only when this file is run directly. When required (tests) we
// export the `app` without binding to a port so the test harness can control
// the lifecycle.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}

module.exports = app;

// Global diagnostics for unexpected errors
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});
