const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');
const Project = require('../models/project');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Offline checkout / grant (D1)', function () {
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
      .send({ email: 'd1@example.com', password: 'password123', firstName: 'D', lastName: '1', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    token = reg.body.accessToken;
    const proj = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D1 Project', client: 'C' });
    assert.strictEqual(proj.status, 201);
    projectId = String(proj.body._id);
  });

  function checkout(deviceId = 'device-1') {
    return withCsrf(request(app).post(`/api/projects/${projectId}/checkout`))
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId });
  }

  it('checks out a project: returns a grant and reports locked status', async () => {
    const res = await checkout();
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.grant, 'expected a grant token');
    assert.ok(res.body.expiresAt);

    const status = await withCsrf(request(app).get(`/api/projects/${projectId}/checkout`))
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(status.status, 200);
    assert.strictEqual(status.body.checkedOut, true);
    assert.strictEqual(status.body.deviceId, 'device-1');
  });

  it('requires a deviceId', async () => {
    const res = await withCsrf(request(app).post(`/api/projects/${projectId}/checkout`))
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'DEVICE_ID_REQUIRED');
  });

  it('rejects checkout when another user holds the lock', async () => {
    // Simulate a different user holding an active lock.
    await Project.findByIdAndUpdate(projectId, {
      offlineCheckout: {
        userId: new mongoose.Types.ObjectId(),
        deviceId: 'other-device',
        grantId: 'somegrant',
        checkedOutAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const res = await checkout();
    assert.strictEqual(res.status, 409, JSON.stringify(res.body));
    assert.strictEqual(res.body.code, 'PROJECT_CHECKED_OUT');
  });

  it('redeems a grant for a fresh, working access token', async () => {
    const co = await checkout();
    const grant = co.body.grant;

    const redeem = await withCsrf(request(app).post('/api/users/offline-grant/redeem'))
      .send({ grant });
    assert.strictEqual(redeem.status, 200, JSON.stringify(redeem.body));
    assert.ok(redeem.body.accessToken);
    assert.ok(redeem.body.user);

    // The redeemed token authenticates a normal request.
    const me = await withCsrf(request(app).get('/api/users/me'))
      .set('Authorization', `Bearer ${redeem.body.accessToken}`);
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.body.user.email, 'd1@example.com');
  });

  it('revokes the grant on check-in', async () => {
    const co = await checkout();
    const grant = co.body.grant;

    const checkin = await withCsrf(request(app).post(`/api/projects/${projectId}/checkin`))
      .set('Authorization', `Bearer ${token}`)
      .send({});
    assert.strictEqual(checkin.status, 200);
    assert.strictEqual(checkin.body.released, true);

    const redeem = await withCsrf(request(app).post('/api/users/offline-grant/redeem'))
      .send({ grant });
    assert.strictEqual(redeem.status, 401, JSON.stringify(redeem.body));
    assert.strictEqual(redeem.body.code, 'GRANT_REVOKED');

    const status = await withCsrf(request(app).get(`/api/projects/${projectId}/checkout`))
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(status.body.checkedOut, false);
  });

  it('rejects a malformed grant', async () => {
    const redeem = await withCsrf(request(app).post('/api/users/offline-grant/redeem'))
      .send({ grant: 'not-a-jwt' });
    assert.strictEqual(redeem.status, 401);
    assert.strictEqual(redeem.body.code, 'GRANT_INVALID');
  });

  it('lets the same user re-check-out (new device) without conflict', async () => {
    const first = await checkout('device-1');
    assert.strictEqual(first.status, 200);
    const second = await checkout('device-2');
    assert.strictEqual(second.status, 200, JSON.stringify(second.body));
    // The first grant is superseded — its grantId no longer matches the lock.
    const redeemOld = await withCsrf(request(app).post('/api/users/offline-grant/redeem'))
      .send({ grant: first.body.grant });
    assert.strictEqual(redeemOld.status, 401);
    assert.strictEqual(redeemOld.body.code, 'GRANT_REVOKED');
  });
});
