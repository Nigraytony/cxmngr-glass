const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');
const {
  readExpectedVersion,
  applyOptimisticUpdate,
  STALE_VERSION_CODE,
} = require('../utils/optimisticLock');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Optimistic locking helper', function () {
  describe('readExpectedVersion', function () {
    it('returns null when no version is supplied', function () {
      assert.strictEqual(readExpectedVersion({}), null);
      assert.strictEqual(readExpectedVersion({ body: {} }), null);
      assert.strictEqual(readExpectedVersion({ body: {}, headers: {} }), null);
    });

    it('prefers body.__v over the If-Match header', function () {
      const req = { body: { __v: 3 }, headers: { 'if-match': '99' } };
      assert.strictEqual(readExpectedVersion(req), 3);
    });

    it('falls back to the If-Match header (lowercase and TitleCase)', function () {
      assert.strictEqual(readExpectedVersion({ body: {}, headers: { 'if-match': '7' } }), 7);
      assert.strictEqual(readExpectedVersion({ body: {}, headers: { 'If-Match': '7' } }), 7);
    });

    it('returns null for non-numeric values', function () {
      assert.strictEqual(readExpectedVersion({ body: { __v: 'abc' } }), null);
      assert.strictEqual(readExpectedVersion({ body: { __v: '' } }), null);
      assert.strictEqual(readExpectedVersion({ body: { __v: null } }), null);
    });

    it('accepts zero as a valid version', function () {
      assert.strictEqual(readExpectedVersion({ body: { __v: 0 } }), 0);
    });
  });
});

describe('Optimistic locking integration — PATCH /api/issues/:id', function () {
  this.timeout(30000);
  let app;
  let token;
  let projectId;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    try { delete require.cache[require.resolve('../index')]; } catch (e) { /* ignore */ }
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
    try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  });

  beforeEach(async () => {
    await clearDb();
    const reg = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'lock@example.com', password: 'password123', firstName: 'L', lastName: 'O', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    token = reg.body.accessToken;
    const proj = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lock Project', client: 'C' });
    assert.strictEqual(proj.status, 201);
    projectId = String(proj.body._id);
  });

  async function createIssue(title) {
    const res = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title, description: 'd' });
    assert.strictEqual(res.status, 201);
    return res.body;
  }

  it('accepts an update without __v (back-compat with existing clients)', async function () {
    const issue = await createIssue('Initial');
    const patch = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' });
    assert.strictEqual(patch.status, 200);
    assert.strictEqual(patch.body.title, 'Updated');
  });

  it('returns 409 with STALE_VERSION when the supplied __v is behind', async function () {
    const issue = await createIssue('First');

    // First write bumps __v (e.g. from 0 → 1).
    const firstPatch = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'First write wins', __v: issue.__v });
    assert.strictEqual(firstPatch.status, 200);

    // Second write supplies the original (now stale) __v.
    const secondPatch = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Stale tab tries to overwrite', __v: issue.__v });
    assert.strictEqual(secondPatch.status, 409, `expected 409, got ${secondPatch.status} ${JSON.stringify(secondPatch.body)}`);
    assert.strictEqual(secondPatch.body.code, STALE_VERSION_CODE);
    assert.strictEqual(secondPatch.body.current.title, 'First write wins');
    assert.ok(typeof secondPatch.body.currentVersion === 'number');
    assert.ok(secondPatch.body.currentVersion > issue.__v);
  });

  it('accepts the second update when the client supplies the current __v', async function () {
    const issue = await createIssue('First');
    const firstPatch = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'After first', __v: issue.__v });
    assert.strictEqual(firstPatch.status, 200);

    const secondPatch = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'After refresh', __v: firstPatch.body.__v });
    assert.strictEqual(secondPatch.status, 200);
    assert.strictEqual(secondPatch.body.title, 'After refresh');
  });

  it('honors If-Match header when body lacks __v', async function () {
    const issue = await createIssue('Header form');
    const fresh = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .set('If-Match', String(issue.__v))
      .send({ title: 'Set via header' });
    assert.strictEqual(fresh.status, 200);

    // Stale If-Match → 409.
    const stale = await withCsrf(request(app).patch(`/api/issues/${issue._id}`))
      .set('Authorization', `Bearer ${token}`)
      .set('If-Match', String(issue.__v))
      .send({ title: 'Stale via header' });
    assert.strictEqual(stale.status, 409);
    assert.strictEqual(stale.body.code, STALE_VERSION_CODE);
  });

  it('strips client-supplied __v from $set so it cannot bypass the inc', async function () {
    // Construct an update that carries __v: 99999. The route must NOT
    // persist that value — applyOptimisticUpdate strips it and replaces
    // with $inc { __v: 1 }.
    const Issue = require('../models/issue');
    const r = await applyOptimisticUpdate(
      Issue,
      (await createIssue('Bypass test'))._id,
      { title: 'Sneaky', __v: 99999 },
      null,
      { new: true }
    );
    assert.strictEqual(r.notFound, false);
    assert.strictEqual(r.conflict, false);
    assert.ok(r.updated.__v < 99999, 'client-supplied __v must not have landed in the doc');
  });
});
