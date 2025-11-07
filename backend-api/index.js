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

// CORS config: allow specific origins in production via env
// CORS_ALLOWED_ORIGINS can be a comma-separated list or "*" for any
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
let corsOptions = { origin: true, allowedHeaders: ['Content-Type', 'Authorization'] };
if (allowedOriginsEnv && allowedOriginsEnv.trim() && allowedOriginsEnv !== '*') {
  const list = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
  corsOptions = {
    origin: function(origin, callback) {
      // allow REST tools or same-origin (no origin header)
      if (!origin) return callback(null, true);
      if (list.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

// Middleware
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

// Serve uploaded files (local storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/api/', (req, res) => {
  res.send('Welcome to the CXMNGR API');
});
// Simple health endpoint for Azure health checks
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ ok: state === 1, dbState: state });
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
mongoose.connect(mongoUri, {
  // Mongoose 8+ sensible defaults; options kept minimal.
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
});