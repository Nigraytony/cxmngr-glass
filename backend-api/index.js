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
const billingRoutes = require('./routes/billing');
const webhookRoutes = require('./routes/webhooks');
const plansRoutes = require('./routes/plans');

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cxmngr-api';
if (!process.env.MONGODB_URI) {
  console.warn('[startup] MONGODB_URI not set; using local fallback.');
}

// CORS config: allow specific origins in production via env
// CORS_ALLOWED_ORIGINS can be a comma-separated list or "*" for any
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
let corsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 204
};
if (allowedOriginsEnv && allowedOriginsEnv.trim() && allowedOriginsEnv !== '*') {
  const list = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
  corsOptions = {
    ...corsOptions,
    origin: function(origin, callback) {
      // allow REST tools or same-origin (no origin header)
      if (!origin) return callback(null, true);
      if (list.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    }
  };
}

// Middleware
// Basic root for sanity
app.get('/', (_req, res) => {
  res.type('text').send('CXMNGR API alive');
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
// Enable CORS (restricted if CORS_ALLOWED_ORIGINS is set)
app.use(cors(corsOptions));
// Handle preflight requests for all routes explicitly
app.options('*', cors(corsOptions));

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
// Stripe/Billing routes
app.use('/api/stripe', billingRoutes);
app.use('/api/stripe', webhookRoutes);
// Public plans endpoint
app.use('/api/plans', plansRoutes);

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