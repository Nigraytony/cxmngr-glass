const { expect } = require('chai');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { clearDb } = require('./testUtils');

describe('Admin webhook replay - charge event', function () {
  this.timeout(20000);
  let app;
  let WebhookEvent;
  let Invoice;
  let Charge;
  let User;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

    // Ensure a fresh app instance so connectMongo() runs after previous tests disconnected
    try { delete require.cache[require.resolve('../index')]; } catch (e) {}
    app = require('../index');

    // Wait for mongoose to connect
    await new Promise((resolve, reject) => {
      const check = () => {
        if (mongoose.connection.readyState === 1) return resolve();
        setTimeout(check, 50);
      };
      check();
      setTimeout(() => reject(new Error('Timed out waiting for mongoose connect')), 10000);
    });

    WebhookEvent = require('../models/webhookEvent');
    Invoice = require('../models/invoice');
    Charge = require('../models/charge');
    User = require('../models/user');

    await clearDb();
  });

  after(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('replays a stored charge.succeeded event and uses Invoice.projectId', async () => {
    // create admin user
    const admin = new User({ firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'pass1234', role: 'globaladmin', contact: { company: 'TestCo' } });
    await admin.save();

    const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET);

    // create invoice in DB with projectId
    const invoice = new Invoice({ invoiceId: 'in_test_1', projectId: 'proj_test_1', createdAt: new Date(), raw: {} });
    await invoice.save();

    // create a stored webhook event containing a charge.succeeded for that invoice
    const chargePayload = {
      id: 'ch_test_1',
      invoice: 'in_test_1',
      amount: 2000,
      currency: 'usd',
      status: 'succeeded',
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    };

    const event = {
      id: 'evt_test_1',
      type: 'charge.succeeded',
      data: { object: chargePayload },
    };

    const we = new WebhookEvent({ eventId: event.id, type: event.type, meta: { raw: event }, status: 'processing' });
    await we.save();

    // Call the admin replay endpoint
    const res = await request(app)
      .post(`/api/admin/webhook-events/${we.eventId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);

    // Verify Charge doc created with projectId from Invoice
    const ch = await Charge.findOne({ chargeId: 'ch_test_1' }).lean();
    expect(ch).to.exist;
    expect(ch.projectId).to.equal('proj_test_1');
  });

  it('replays a stored charge.succeeded event and uses charge.metadata.projectId when Invoice missing', async () => {
    // create admin user
    const admin2 = new User({ firstName: 'Admin2', lastName: 'User', email: 'admin2@example.com', password: 'pass1234', role: 'globaladmin', contact: { company: 'TestCo' } });
    await admin2.save();
    const token2 = jwt.sign({ _id: admin2._id.toString() }, process.env.JWT_SECRET);

    // ensure no invoice exists for this id
    await Invoice.deleteOne({ invoiceId: 'in_missing_1' });

    const chargePayload = {
      id: 'ch_test_meta_1',
      invoice: 'in_missing_1',
      amount: 3000,
      currency: 'usd',
      status: 'succeeded',
      metadata: { projectId: 'proj_meta_1' },
      created: Math.floor(Date.now() / 1000),
    };

    const event2 = {
      id: 'evt_test_meta_1',
      type: 'charge.succeeded',
      data: { object: chargePayload },
    };

    const we2 = new WebhookEvent({ eventId: event2.id, type: event2.type, meta: { raw: event2 }, status: 'processing' });
    await we2.save();

    const res2 = await request(app)
      .post(`/api/admin/webhook-events/${we2.eventId}/replay`)
      .set('Authorization', `Bearer ${token2}`)
      .send();

    expect(res2.status).to.equal(200);
    const ch2 = await Charge.findOne({ chargeId: 'ch_test_meta_1' }).lean();
    expect(ch2).to.exist;
    expect(ch2.projectId).to.equal('proj_meta_1');
  });

  it('replaying the same event twice is idempotent (no duplicate Charge docs)', async () => {
    // create admin user
    const admin3 = new User({ firstName: 'Admin3', lastName: 'User', email: 'admin3@example.com', password: 'pass1234', role: 'globaladmin', contact: { company: 'TestCo' } });
    await admin3.save();
    const token3 = jwt.sign({ _id: admin3._id.toString() }, process.env.JWT_SECRET);

    const chargePayload = {
      id: 'ch_test_idem_1',
      invoice: 'in_test_1',
      amount: 2500,
      currency: 'usd',
      status: 'succeeded',
      metadata: {},
      created: Math.floor(Date.now() / 1000),
    };

    const event3 = {
      id: 'evt_test_idem_1',
      type: 'charge.succeeded',
      data: { object: chargePayload },
    };

    const we3 = new WebhookEvent({ eventId: event3.id, type: event3.type, meta: { raw: event3 }, status: 'processing' });
    await we3.save();

    // First replay
    const r1 = await request(app)
      .post(`/api/admin/webhook-events/${we3.eventId}/replay`)
      .set('Authorization', `Bearer ${token3}`)
      .send();
    expect(r1.status).to.equal(200);

    // Second replay
    const r2 = await request(app)
      .post(`/api/admin/webhook-events/${we3.eventId}/replay`)
      .set('Authorization', `Bearer ${token3}`)
      .send();
    expect(r2.status).to.equal(200);

    const docs = await Charge.find({ chargeId: 'ch_test_idem_1' }).lean();
    expect(docs.length).to.equal(1);
  });
});
