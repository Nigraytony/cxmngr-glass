const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Project archive/list integration', function () {
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

  it('hides archived projects by default and includes them when requested', async () => {
    const ownerRes = await request(app)
      .post('/api/users/register')
      .send({ email: 'arch@example.com', password: 'password123', firstName: 'A', lastName: 'B', company: 'TestCo' });
    assert.strictEqual(ownerRes.status, 201);
    const token = ownerRes.body.token;
    assert(token, 'expected token from register');

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Archive Me', client: 'Client' });
    assert.strictEqual(projectRes.status, 201);
    const projectId = String(projectRes.body._id);

    const archiveRes = await request(app)
      .post(`/api/projects/${projectId}/archive`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(archiveRes.status, 200);
    assert.strictEqual(String(archiveRes.body.status || '').toLowerCase(), 'archived');

    const listDefault = await request(app)
      .get('/api/projects?page=1&perPage=50')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(listDefault.status, 200);
    const itemsA = Array.isArray(listDefault.body.items) ? listDefault.body.items : [];
    const foundA = itemsA.some((p) => String(p && (p._id || p.id)) === projectId);
    assert.strictEqual(foundA, false, 'archived project should be hidden by default');

    const listIncl = await request(app)
      .get('/api/projects?page=1&perPage=50&includeArchived=true')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(listIncl.status, 200);
    const itemsB = Array.isArray(listIncl.body.items) ? listIncl.body.items : [];
    const foundB = itemsB.some((p) => String(p && (p._id || p.id)) === projectId);
    assert.strictEqual(foundB, true, 'archived project should be returned when includeArchived=true');
  });
});

