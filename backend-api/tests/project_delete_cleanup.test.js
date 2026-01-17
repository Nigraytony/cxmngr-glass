const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Project delete cleanup integration', function () {
  this.timeout(30000);
  let app;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    try { delete require.cache[require.resolve('../index')]; } catch (e) {}
    app = require('../index.js');

    const deadline = Date.now() + 10000;
    while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState !== 1) throw new Error('Failed to connect to mongo');
    await clearDb();
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (e) {}
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('removes deleted project from all user project lists', async () => {
    const User = require('../models/user');

    const ownerRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'owner@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' });
    assert.strictEqual(ownerRes.status, 201);
    const ownerToken = ownerRes.body.token;
    const ownerId = ownerRes.body.user._id;
    assert(ownerToken, 'owner should receive token');

    const otherRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'other@example.com', password: 'password123', firstName: 'Oth', lastName: 'Er', company: 'TestCo' });
    assert.strictEqual(otherRes.status, 201);
    const otherId = otherRes.body.user._id;

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Delete Me', client: 'Client' });
    assert.strictEqual(projectRes.status, 201);
    const projectId = String(projectRes.body._id);

    // Ensure both users have explicit membership entries (covering the cleanup logic).
    await User.findByIdAndUpdate(ownerId, {
      $addToSet: { projects: { _id: projectId, role: 'admin', default: true } },
    });
    await User.findByIdAndUpdate(otherId, {
      $addToSet: { projects: { _id: projectId, role: 'user', default: false } },
    });

    const delRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(delRes.status, 200, `expected 200 delete, got ${delRes.status}: ${JSON.stringify(delRes.body)}`);

    const owner = await User.findById(ownerId).lean();
    const other = await User.findById(otherId).lean();

    const ownerHas = (owner.projects || []).some((p) => String(p && p._id) === projectId);
    const otherHas = (other.projects || []).some((p) => String(p && p._id) === projectId);
    assert.strictEqual(ownerHas, false, 'owner should not still reference deleted project');
    assert.strictEqual(otherHas, false, 'other user should not still reference deleted project');
  });
});

