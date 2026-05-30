const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Tasks analytics — new phase slices', function () {
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
      .send({ email: 'tasks-analytics@example.com', password: 'password123', firstName: 'TA', lastName: 'X', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    token = reg.body.accessToken;
    // Premium project — tasks feature is gated to that tier.
    const proj = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Analytics Project', client: 'C', subscriptionTier: 'premium' });
    assert.strictEqual(proj.status, 201);
    projectId = String(proj.body._id);
    // Force-enable the tasks feature flag on the project. The default Premium
    // plan has it on; we also flip the project's subscriptionFeatures so the
    // requireFeature middleware doesn't 503 in this test harness.
    const Project = require('../models/project');
    await Project.findByIdAndUpdate(projectId, {
      subscriptionFeatures: { tasks: true, issues: true, equipment: true, spaces: true, templates: true, activities: true },
      isActive: true,
    });
  });

  it('returns completedByPhase and linkedActivityByPhase', async function () {
    const Task = require('../models/task');
    const pid = new mongoose.Types.ObjectId(projectId);

    // Phase 1.1 — 3 tasks total: 2 completed (1 by status, 1 by percent), 1 with activity
    await Task.create({ projectId: pid, wbs: '1.1.1', name: 'P1.1.1', status: 'Completed' });
    await Task.create({ projectId: pid, wbs: '1.1.2', name: 'P1.1.2', percentComplete: 100, status: 'In Progress' });
    await Task.create({ projectId: pid, wbs: '1.1.3', name: 'P1.1.3', status: 'In Progress', activityId: 'act-123' });

    // Phase 2.1 — 2 tasks: 0 completed, 1 with activity
    await Task.create({ projectId: pid, wbs: '2.1.1', name: 'P2.1.1', status: 'Not Started' });
    await Task.create({ projectId: pid, wbs: '2.1.2', name: 'P2.1.2', status: 'In Progress', activityId: 'act-999' });

    const res = await request(app).get(`/api/tasks/analytics?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);

    // Both new arrays present
    assert.ok(Array.isArray(res.body.completedByPhase), 'completedByPhase should be an array');
    assert.ok(Array.isArray(res.body.linkedActivityByPhase), 'linkedActivityByPhase should be an array');

    // Completed-by-phase: phase 1.1 has 2 completed, phase 2.1 has 0 (so absent from results)
    const completedMap = Object.fromEntries(res.body.completedByPhase.map((r) => [r.wbs, r.count]));
    assert.strictEqual(completedMap['1.1'], 2, 'phase 1.1 should have 2 completed tasks');
    assert.strictEqual(completedMap['2.1'], undefined, 'phase 2.1 should not appear (0 completed)');

    // Linked-activity-by-phase: phase 1.1 has 1, phase 2.1 has 1
    const linkedMap = Object.fromEntries(res.body.linkedActivityByPhase.map((r) => [r.wbs, r.count]));
    assert.strictEqual(linkedMap['1.1'], 1, 'phase 1.1 should have 1 linked-activity task');
    assert.strictEqual(linkedMap['2.1'], 1, 'phase 2.1 should have 1 linked-activity task');
  });

  it('linkedActivityByPhase excludes empty-string and null activityId', async function () {
    const Task = require('../models/task');
    const pid = new mongoose.Types.ObjectId(projectId);
    await Task.create({ projectId: pid, wbs: '1.1.1', name: 'a', activityId: '' });
    await Task.create({ projectId: pid, wbs: '1.1.2', name: 'b', activityId: null });
    await Task.create({ projectId: pid, wbs: '1.1.3', name: 'c' /* unset */ });
    await Task.create({ projectId: pid, wbs: '1.1.4', name: 'd', activityId: 'real-id' });

    const res = await request(app).get(`/api/tasks/analytics?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(res.status, 200);
    const linkedMap = Object.fromEntries(res.body.linkedActivityByPhase.map((r) => [r.wbs, r.count]));
    assert.strictEqual(linkedMap['1.1'], 1, 'only the task with a real activityId should count');
  });

  it('PUT /api/projects/:id persists taskAnalyticsConfig (allowlist regression)', async function () {
    const desired = {
      statusDonut: false,
      completionBar: true,
      tasksByPhase: true,
      completedByPhase: false,
      linkedActivityByPhase: true,
      totalCostKpi: true,
      costByPhase: true,
      topCostTasks: false,
    }
    const res = await withCsrf(request(app).put(`/api/projects/${projectId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ taskAnalyticsConfig: desired })
    assert.strictEqual(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`)
    const got = res.body && res.body.taskAnalyticsConfig
    assert.ok(got, 'response should include taskAnalyticsConfig')
    assert.strictEqual(got.totalCostKpi, true, 'financial toggle must round-trip via PUT')
    assert.strictEqual(got.statusDonut, false, 'non-financial toggle must round-trip via PUT')
    // Unknown keys are stripped by the sanitizer
    const res2 = await withCsrf(request(app).put(`/api/projects/${projectId}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ taskAnalyticsConfig: { ...desired, bogusKey: true, __proto__: { polluted: true } } })
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.taskAnalyticsConfig.bogusKey, undefined, 'unknown keys must be stripped')
  })

  it('Project schema accepts and persists taskAnalyticsConfig', async function () {
    const Project = require('../models/project');
    await Project.findByIdAndUpdate(projectId, {
      taskAnalyticsConfig: {
        statusDonut: false,
        completionBar: true,
        tasksByPhase: true,
        completedByPhase: false,
        linkedActivityByPhase: true,
        totalCostKpi: true,
        costByPhase: true,
        topCostTasks: false,
      },
    });
    const fresh = await Project.findById(projectId).lean();
    assert.strictEqual(fresh.taskAnalyticsConfig.statusDonut, false);
    assert.strictEqual(fresh.taskAnalyticsConfig.totalCostKpi, true);
    assert.strictEqual(fresh.taskAnalyticsConfig.topCostTasks, false);
  });
});
