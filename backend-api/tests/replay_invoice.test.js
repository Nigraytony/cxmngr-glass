const { expect } = require('chai');
const request = require('supertest');
let MongoMemoryServer = null;
try { ({ MongoMemoryServer } = require('mongodb-memory-server')); } catch (e) {}
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('Admin webhook replay - invoice events', function () {
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

    // stub Stripe module in require cache so admin routes use our fake client
    try {
      const stripeResolve = require.resolve('stripe');
      originalStripeCache = require.cache[stripeResolve];
    } catch (e) {
      originalStripeCache = null;
    }

    // Simple mutable stub state
    let stubProjectId = null;

    const FakeStripeConstructor = function (key, opts) {
      return {
        subscriptions: {
          retrieve: async (id) => {
            return {
              id,
              metadata: { projectId: stubProjectId },
              status: 'active',
              current_period_end: Math.floor(Date.now() / 1000) + 3600,
              items: { data: [{ price: { id: 'price_test' } }] },
            };
          }
        },
        // expose setter to test to adjust stubProjectId
        __setProjectId: (pid) => { stubProjectId = pid; }
      };
    };

    // Inject into require cache
    try {
      const stripePath = require.resolve('stripe');
      require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeConstructor };
    } catch (e) {
      // if stripe not installed, create a synthetic module id
      require.cache['stripe'] = { id: 'stripe', filename: 'stripe', loaded: true, exports: FakeStripeConstructor };
    }

    // Clear cached app and routes so they pick up our stubbed stripe module
    try {
      const appPath = require.resolve('../index');
      delete require.cache[appPath];
    } catch (e) {}
    try {
      const adminPath = require.resolve('../routes/admin');
      delete require.cache[adminPath];
    } catch (e) {}
    try {
      const webhookPath = require.resolve('../routes/webhooks');
      delete require.cache[webhookPath];
    } catch (e) {}

    // Now require the app (it will pick up the stubbed stripe)
    app = require('../index');

    // Wait for mongoose connection
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

    // expose setter helper by finding the fake constructor instance in require cache
    try {
      const stripePath = require.resolve('stripe');
      const FakeCtor = require.cache[stripePath].exports;
      // attach global helper to set project id for the fake
      global.__setStubStripeProjectId = (pid) => {
        // when admin route constructs new FakeStripeConstructor it will create a new instance
        // we need to ensure the constructor's prototype has __setProjectId to toggle internal state
        // For simplicity, store the pid on process so retrieve() can access it via closure above isn't possible here
        process.env.__STUB_STRIPE_PROJECT_ID = pid;
      };
    } catch (e) {
      // ignore
    }
  });

  after(async () => {
    // restore stripe cache if we replaced it
    try {
      const stripeResolve = require.resolve('stripe');
      if (originalStripeCache) require.cache[stripeResolve] = originalStripeCache;
      else delete require.cache[stripeResolve];
    } catch (e) {
      // ignore
    }
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('replays invoice.payment_succeeded and updates Project from subscription metadata', async () => {
    // create admin user
    const admin = new User({ firstName: 'InvAdmin', lastName: 'User', email: 'invadmin@example.com', password: 'pass1234', role: 'globaladmin', contact: { company: 'TestCo' } });
    await admin.save();
    const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET);

    // create project to be referenced by subscription metadata
    const project = new Project({ name: 'proj-inv', client: 'ClientX' });
    await project.save();

    // Now set the stub project id in process env (fake constructor will read it)
    process.env.__STUB_STRIPE_PROJECT_ID = project._id.toString();

    // create stored webhook event for invoice.payment_succeeded
    const invoicePayload = {
      id: 'inv_test_1',
      // provide an expanded subscription object so replay logic can read metadata without calling Stripe
      subscription: {
        id: 'sub_test_1',
        metadata: { projectId: project._id.toString() },
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 3600,
        items: { data: [{ price: { id: 'price_test' } }] },
      },
      amount_due: 1000,
      amount_paid: 1000,
      currency: 'usd',
      status: 'paid',
      created: Math.floor(Date.now() / 1000),
      metadata: {},
    };
    const event = { id: 'evt_inv_1', type: 'invoice.payment_succeeded', data: { object: invoicePayload } };
    const we = new WebhookEvent({ eventId: event.id, type: event.type, meta: { raw: event }, status: 'processing' });
    await we.save();

    // Patch the stripe module's constructor in cache to read process.env.__STUB_STRIPE_PROJECT_ID
    // Re-define the cached module to a constructor that captures process.env at call time
    try {
      const stripePath = require.resolve('stripe');
      require.cache[stripePath].exports = function (key, opts) {
        return {
          subscriptions: {
            retrieve: async (id) => ({ id, metadata: { projectId: process.env.__STUB_STRIPE_PROJECT_ID }, status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 3600, items: { data: [{ price: { id: 'price_test' } }] } })
          }
        };
      };
    } catch (e) {
      // ignore
    }

    // Quick sanity: ensure our stubbed Stripe returns expected metadata
    try {
      const Stripe = require('stripe');
      const stripeClient = Stripe('x');
      const subCheck = await stripeClient.subscriptions.retrieve('sub_test_1');
      // project id should reflect the stub value
      // If this assertion fails, the admin route will also not see the stub
      expect(String(subCheck.metadata && subCheck.metadata.projectId)).to.equal(project._id.toString());
    } catch (e) {
      // if stripe stub not found, let the replay attempt continue and it will fail
    }

    // Replay the event
    const res = await request(app)
      .post(`/api/admin/webhook-events/${we.eventId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).to.equal(200);

    const proj = await Project.findById(project._id).lean();
    expect(proj).to.exist;
    expect(proj.stripeSubscriptionStatus).to.equal('active');
    expect(proj.isActive).to.equal(true);
    expect(proj.stripeCurrentPeriodEnd).to.exist;
  });
});
