const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('GET /api/assistant/setup-status', function () {
  this.timeout(30000);
  let app;
  let Project;
  let Task;

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    try { delete require.cache[require.resolve('../index')]; } catch (e) {}
    app = require('../index.js');
    Project = require('../models/project');
    Task = require('../models/task');

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

  async function setupProject() {
    const userRes = await withCsrf(request(app).post('/api/users/register'))
      .send({ email: 'owner@example.com', password: 'password123', firstName: 'Owner', lastName: 'User', company: 'TestCo' });
    assert(userRes.status === 201, `expected 201 from register, got ${userRes.status}`);
    const token = userRes.body.accessToken;
    const user = userRes.body.user;

    const projectRes = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user._id, name: 'Setup Project', client: 'Client', project_type: 'New Building Cx' });
    assert(projectRes.status === 201, `expected 201 from create project, got ${projectRes.status}`);
    const project = projectRes.body;

    // requireActiveProject gate.
    await Project.findByIdAndUpdate(project._id, { $set: { isActive: true, subscriptionTier: 'premium' } });

    return { token, projectId: project._id };
  }

  it('reports a fresh project as in setup with importTasks next', async () => {
    const { token, projectId } = await setupProject();
    const res = await request(app)
      .get('/api/assistant/setup-status')
      .query({ projectId })
      .set('Authorization', `Bearer ${token}`);
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.inSetup, true);
    assert.ok(res.body.nextStep);
    assert.strictEqual(res.body.nextStep.key, 'importTasks');
    assert.ok(Array.isArray(res.body.steps) && res.body.steps.length >= 4);
  });

  it('marks importTasks done once a task exists', async () => {
    const { token, projectId } = await setupProject();
    await Task.create({ projectId, name: 'Pre-functional walkthrough', status: 'Not Started' });

    const res = await request(app)
      .get('/api/assistant/setup-status')
      .query({ projectId })
      .set('Authorization', `Bearer ${token}`);
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    const importStep = res.body.steps.find((s) => s.key === 'importTasks');
    assert.strictEqual(importStep.done, true);
    assert.strictEqual(res.body.nextStep.key, 'kickoffActivity');
  });

  it('rejects an unauthenticated request', async () => {
    const { projectId } = await setupProject();
    const res = await request(app)
      .get('/api/assistant/setup-status')
      .query({ projectId });
    assert(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });
});
