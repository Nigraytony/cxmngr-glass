const { expect } = require('chai');
const request = require('supertest');
let MongoMemoryServer = null;
try { ({ MongoMemoryServer } = require('mongodb-memory-server')); } catch (e) {}
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('Admin webhook replay - invoice fallback to Stripe by ID', function () {
  this.timeout(20000);
  let mongoServer;
  let app;
  let WebhookEvent;
  let Project;
  let User;
  let originalStripeCache = null;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

    // Prepare fake Stripe constructor that will be used by the routes when required
    const FakeStripeConstructor = function (key, opts) {
      return {
        subscriptions: {
          retrieve: async (id) => ({
            id,
            metadata: { projectId: process.env.__TEST_STUB_PROJECT_ID || null },
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 3600,
            items: { data: [{ price: { id: 'price_test' } }] },
          })
        }
      };
    };

    // Inject fake stripe module into require cache
    try {
      const stripePath = require.resolve('stripe');
      originalStripeCache = require.cache[stripePath];
      require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeConstructor };
    } catch (e) {
      // If stripe isn't installed, create a cache entry keyed by 'stripe'
      originalStripeCache = require.cache['stripe'] || null;
      require.cache['stripe'] = { id: 'stripe', filename: 'stripe', loaded: true, exports: FakeStripeConstructor };
    }

    // Clear app and routes from cache so they pick up fake stripe
    try { delete require.cache[require.resolve('../index')]; } catch (e) {}
    try { delete require.cache[require.resolve('../routes/admin')]; } catch (e) {}
    try { delete require.cache[require.resolve('../routes/webhooks')]; } catch (e) {}

    // Now require app
    app = require('../index');

    // Wait for mongoose connect
    await new Promise((resolve, reject) => {
      const check = () => {
        if (mongoose.connection.readyState === 1) return resolve();
        setTimeout(check, 50);
      };
      check();
      setTimeout(() => reject(new Error('Timed out waiting for mongoose connect')), 5000);
    });

    WebhookEvent = require('../models/webhookEvent');
    Project = require('../models/project');
    User = require('../models/user');
  });

  after(async () => {
    // restore stripe cache
    try {
      const stripePath = require.resolve('stripe');
      if (originalStripeCache) require.cache[stripePath] = originalStripeCache;
      else delete require.cache[stripePath];
    } catch (e) {
      if (originalStripeCache) require.cache['stripe'] = originalStripeCache;
      else delete require.cache['stripe'];
    }
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('when subscription is an ID, admin replay calls Stripe and updates Project', async () => {
    // create admin user
    const admin = new User({ firstName: 'Stub', lastName: 'Admin', email: 'stubadmin@example.com', password: 'pass1234', role: 'globaladmin', contact: { company: 'TestCo' } });
    await admin.save();
    const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET);

    // create project to be targeted by Stripe stub
    const project = new Project({ name: 'proj-stub', client: 'ClientY' });
    await project.save();

    // set stub value so FakeStripeConstructor returns this project id
    process.env.__TEST_STUB_PROJECT_ID = project._id.toString();

    // store webhook event where invoice.subscription is only an id (string)
    const invoicePayload = {
      id: 'inv_fallback_1',
      subscription: 'sub_fallback_1',
      amount_due: 5000,
      amount_paid: 5000,
      currency: 'usd',
      status: 'paid',
      created: Math.floor(Date.now() / 1000),
      metadata: {},
    };
    const event = { id: 'evt_inv_fb_1', type: 'invoice.payment_succeeded', data: { object: invoicePayload } };
    const we = new WebhookEvent({ eventId: event.id, type: event.type, meta: { raw: event }, status: 'processing' });
    await we.save();

    // replay
    const res = await request(app)
      .post(`/api/admin/webhook-events/${we.eventId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).to.equal(200);

    const proj = await Project.findById(project._id).lean();
    expect(proj).to.exist;
    expect(proj.stripeSubscriptionStatus).to.equal('active');
    expect(proj.isActive).to.equal(true);
  });
});
