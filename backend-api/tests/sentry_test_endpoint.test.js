// Verifies /api/admin/_sentry-test:
//   - Is admin-gated (401 without auth, 403 for non-admin).
//   - Responds 500 to authenticated admins after throwing.
// This endpoint is a temporary verification helper added when SENTRY_DSN
// was first provisioned. Delete this test alongside the route.

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('/api/admin/_sentry-test (TEMPORARY)', function () {
  this.timeout(30000);
  let app;
  let User;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    try { delete require.cache[require.resolve('../index')]; } catch (_) { /* ignore */ }
    app = require('../index.js');
    const deadline = Date.now() + 10000;
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState !== 1) throw new Error('Failed to connect to mongo');
    User = require('../models/user');
    await clearDb();
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await withCsrf(request(app).post('/api/admin/_sentry-test'));
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  it('rejects non-admin authenticated requests', async () => {
    const reg = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'plain@example.com', password: 'password123', firstName: 'P', lastName: 'U', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    const token = reg.body.accessToken;
    const res = await withCsrf(request(app).post('/api/admin/_sentry-test'))
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 403, `expected 403, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  it('returns 500 (synthetic throw) for an authenticated globaladmin', async () => {
    const admin = new User({
      firstName: 'Admin', lastName: 'User',
      email: 'sentryadmin@example.com', password: 'pass1234',
      role: 'globaladmin', contact: { company: 'TestCo' },
    });
    await admin.save();
    const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET);
    const res = await withCsrf(request(app).post('/api/admin/_sentry-test'))
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 500, `expected 500 from synthetic throw, got ${res.status}: ${JSON.stringify(res.body)}`);
  });
});
