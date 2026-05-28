const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Schema drift — Issue priority/responsible_person and Equipment name', function () {
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
      .send({ email: 'drift@example.com', password: 'password123', firstName: 'D', lastName: 'R', company: 'TestCo' });
    assert.strictEqual(reg.status, 201);
    token = reg.body.accessToken;

    const proj = await withCsrf(request(app).post('/api/projects'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Drift Project', client: 'C' });
    assert.strictEqual(proj.status, 201);
    projectId = String(proj.body._id);
  });

  it('Issue: priority sent by UI is persisted as severity (round-trip + filter work)', async () => {
    // The UI sends `priority` (e.g. 'High'). The schema declares `severity`.
    // Before the fix, Mongoose strict mode silently dropped `priority` on
    // write and a filter on `?priority=High` returned zero.
    const create = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        title: 'Bad damper',
        description: 'AHU-1 damper stuck closed',
        priority: 'High',
      });
    assert.strictEqual(create.status, 201, `create failed: ${JSON.stringify(create.body)}`);

    // The persisted doc must have severity set from the priority input.
    const Issue = require('../models/issue');
    const persisted = await Issue.findById(create.body._id).lean();
    assert.strictEqual(persisted.severity, 'High', 'severity should be set from incoming priority');

    // And the list filter on `?priority=High` must find the record.
    const list = await request(app).get(`/api/issues?projectId=${projectId}&priority=High`)
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(list.status, 200);
    const items = list.body.items || list.body;
    const ids = (Array.isArray(items) ? items : []).map((i) => String(i._id || i.id));
    assert.ok(ids.includes(String(create.body._id)), 'list filter ?priority=High should return the High-severity issue');
  });

  it('Issue: responsible_person sent by UI is persisted as assignedTo', async () => {
    const create = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        title: 'Calibration overdue',
        description: 'Sensor needs cal',
        responsible_person: 'Alice Cooper',
      });
    assert.strictEqual(create.status, 201, `create failed: ${JSON.stringify(create.body)}`);

    const Issue = require('../models/issue');
    const persisted = await Issue.findById(create.body._id).lean();
    assert.strictEqual(persisted.assignedTo, 'Alice Cooper', 'assignedTo should be set from incoming responsible_person');
    assert.strictEqual(persisted.responsible_person, undefined, 'responsible_person should not be persisted as its own field');
  });

  it('Issue: PATCH translates priority/responsible_person on update', async () => {
    const create = await withCsrf(request(app).post('/api/issues'))
      .set('Authorization', `Bearer ${token}`)
      .send({ projectId, title: 'X', description: 'Y' });
    assert.strictEqual(create.status, 201);
    const id = create.body._id;

    const patch = await withCsrf(request(app).patch(`/api/issues/${id}`))
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'Critical', responsible_person: 'Bob' });
    assert.strictEqual(patch.status, 200, `patch failed: ${JSON.stringify(patch.body)}`);

    const Issue = require('../models/issue');
    const persisted = await Issue.findById(id).lean();
    assert.strictEqual(persisted.severity, 'Critical', 'severity should be updated from priority');
    assert.strictEqual(persisted.assignedTo, 'Bob', 'assignedTo should be updated from responsible_person');
  });

  it('Equipment: agent create_equipment does not write a stray `name` field', async () => {
    // Pre-fix, agentTools wrote `name: str(input.title, 160)` which was
    // dropped by Mongoose strict mode and made list_equipment's
    // `{ name: re }` search return nothing.
    const Equipment = require('../models/equipment');
    const Project = require('../models/project');
    const project = await Project.findById(projectId);

    const agentTools = require('../utils/agentTools');
    const result = await agentTools.executeTool(
      'create_equipment',
      { tag: 'AHU-1', title: 'Air Handling Unit 1', type: 'AHU' },
      { project, projectId: new mongoose.Types.ObjectId(projectId) }
    );
    assert.strictEqual(result.success, true, `create_equipment failed: ${JSON.stringify(result)}`);

    // Raw fetch via the underlying collection so we see exactly which fields
    // landed in the document — bypasses Mongoose's silent strict-drop.
    const raw = await mongoose.connection.db.collection('equipment').findOne({ _id: result.record._id });
    assert.ok(raw, 'equipment doc should exist');
    assert.strictEqual(raw.title, 'Air Handling Unit 1', 'title should be persisted');
    assert.strictEqual(raw.name, undefined, 'name should NOT be persisted (not a schema field)');

    // And the agent's list_equipment search by `search: title` should find it
    // (previously the search included a no-op `{ name: re }` branch only).
    const list = await agentTools.executeTool(
      'list_equipment',
      { search: 'Air Handling' },
      { project, projectId: new mongoose.Types.ObjectId(projectId) }
    );
    assert.strictEqual(list.success, true);
    const found = (list.records || []).some((r) => String(r._id) === String(result.record._id));
    assert.ok(found, 'list_equipment ?search=Air Handling should find the equipment by title');
  });
});
