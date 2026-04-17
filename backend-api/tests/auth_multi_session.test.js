const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

function extractRefreshCookie(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const raw = setCookie.find((c) => /(^|;\s*)rt=|(^|;\s*)__Host-rt=/.test(c) || c.startsWith('rt=') || c.startsWith('__Host-rt='));
  if (!raw) return null;
  const head = raw.split(';')[0].trim();
  return head || null;
}

async function registerUser(app, suffix) {
  const res = await withCsrf(request(app).post('/api/users/register'))
    .send({
      firstName: 'Test',
      lastName: 'User',
      company: 'Acme',
      email: `multi+${suffix}@example.com`,
      password: 'testpass1234',
    });
  assert.strictEqual(res.status, 201, `register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = extractRefreshCookie(res);
  assert.ok(cookie, 'expected refresh cookie on register');
  return { accessToken: res.body.accessToken, cookie, user: res.body.user };
}

async function loginUser(app, email) {
  const res = await withCsrf(request(app).post('/api/users/login'))
    .send({ email, password: 'testpass1234' });
  assert.strictEqual(res.status, 200, `login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = extractRefreshCookie(res);
  assert.ok(cookie, 'expected refresh cookie on login');
  return { accessToken: res.body.accessToken, cookie };
}

describe('Auth — multi-session refresh', function () {
  this.timeout(30000);
  let app;

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
  });

  it('a second login does not invalidate the first session', async () => {
    const first = await registerUser(app, 'a');
    // A second login (same user, different "device") used to overwrite
    // refreshTokenIdHash and kill the first session. With the array-backed
    // model both sessions should coexist.
    const second = await loginUser(app, first.user.email);
    assert.notStrictEqual(first.cookie, second.cookie, 'expected distinct refresh cookies');

    const r1 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', first.cookie);
    assert.strictEqual(r1.status, 200, 'first session refresh should still succeed');
    assert.ok(r1.body.accessToken, 'first session should get a new access token');

    const r2 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', second.cookie);
    assert.strictEqual(r2.status, 200, 'second session refresh should succeed');
    assert.ok(r2.body.accessToken, 'second session should get a new access token');
  });

  it('logout only revokes the session that sent the cookie', async () => {
    const first = await registerUser(app, 'b');
    const second = await loginUser(app, first.user.email);

    const logout = await withCsrf(request(app).post('/api/users/logout')).set('Cookie', first.cookie);
    assert.strictEqual(logout.status, 204);

    const r1 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', first.cookie);
    assert.strictEqual(r1.status, 204, 'first session should be revoked after its own logout');

    const r2 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', second.cookie);
    assert.strictEqual(r2.status, 200, 'second session should still be valid');
  });

  it('change-password revokes every session', async () => {
    const first = await registerUser(app, 'c');
    const second = await loginUser(app, first.user.email);

    const change = await withCsrf(request(app).post('/api/users/change-password'))
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ currentPassword: 'testpass1234', newPassword: 'newpass5678' });
    assert.strictEqual(change.status, 200, `change-password should succeed: ${JSON.stringify(change.body)}`);

    const r1 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', first.cookie);
    assert.strictEqual(r1.status, 204, 'first session must be revoked after password change');

    const r2 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', second.cookie);
    assert.strictEqual(r2.status, 204, 'second session must also be revoked after password change');
  });

  it('refresh-cookie reuse still succeeds (no rotation)', async () => {
    const sess = await registerUser(app, 'd');
    const r1 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', sess.cookie);
    assert.strictEqual(r1.status, 200);
    const r2 = await withCsrf(request(app).post('/api/users/refresh')).set('Cookie', sess.cookie);
    assert.strictEqual(r2.status, 200, 'same cookie should keep working — no rotation');
  });
});
