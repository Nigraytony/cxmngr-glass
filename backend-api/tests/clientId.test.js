const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');
const { ID_TAKEN_CODE, INVALID_ID_CODE } = require('../utils/clientId');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

function newId() {
  return new mongoose.Types.ObjectId().toString();
}

describe('Client-supplied _id on create (offline D2)', function () {
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
      .send({ email: 'cid@example.com', password: 'password123', firstName: 'C', lastName: 'I', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    token = reg.body.accessToken;
    const proj = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CID Project', client: 'C' });
    assert.strictEqual(proj.status, 201);
    projectId = String(proj.body._id);
  });

  function createActivity(body) {
    return withCsrf(request(app).post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, name: 'A', ...body });
  }

  it('persists a valid client-supplied _id on create', async function () {
    const id = newId();
    const res = await createActivity({ _id: id, name: 'Offline activity' });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    assert.strictEqual(String(res.body._id), id);
    assert.strictEqual(res.body.name, 'Offline activity');
  });

  it('is idempotent: replaying the same create returns the existing doc (not a duplicate)', async function () {
    const id = newId();
    const first = await createActivity({ _id: id, name: 'First' });
    assert.strictEqual(first.status, 201);

    const replay = await createActivity({ _id: id, name: 'Replay attempt' });
    assert.strictEqual(replay.status, 200, JSON.stringify(replay.body));
    assert.strictEqual(String(replay.body._id), id);
    // The original wins — replay does not overwrite.
    assert.strictEqual(replay.body.name, 'First');

    // Exactly one activity exists for the project.
    const list = await withCsrf(request(app).get(`/api/activities?projectId=${projectId}`))
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(list.body.length, 1);
  });

  it('rejects a malformed _id with 400 INVALID_ID', async function () {
    const res = await createActivity({ _id: 'not-an-objectid' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, INVALID_ID_CODE);
  });

  it('rejects an _id already used by a different project with 409 ID_TAKEN', async function () {
    const id = newId();
    const first = await createActivity({ _id: id, name: 'Owned by project 1' });
    assert.strictEqual(first.status, 201);

    // A second project owned by the same user.
    const proj2 = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other', client: 'C' });
    assert.strictEqual(proj2.status, 201);

    const res = await withCsrf(request(app).post('/api/activities'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId: String(proj2.body._id), name: 'collide', _id: id });
    assert.strictEqual(res.status, 409, JSON.stringify(res.body));
    assert.strictEqual(res.body.code, ID_TAKEN_CODE);
  });

  it('issue replay is idempotent and does not burn an issue number', async function () {
    const id = newId();
    const first = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Issue one', description: 'd', _id: id });
    assert.strictEqual(first.status, 201, JSON.stringify(first.body));
    const firstNumber = first.body.number;

    // Replay the same create — must return the existing issue, same number.
    const replay = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Issue one', description: 'd', _id: id });
    assert.strictEqual(replay.status, 200);
    assert.strictEqual(replay.body.number, firstNumber);

    // A genuinely new issue gets the next number (no gap from the replay).
    const second = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'Issue two', description: 'd' });
    assert.strictEqual(second.status, 201);
    assert.strictEqual(second.body.number, firstNumber + 1);
  });
});
