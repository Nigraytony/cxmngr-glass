const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

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

    const ownerRes = await withCsrf(request(app)
      .post('/api/users/register'))
      .send({ email: 'owner@example.com', password: 'password123', firstName: 'Own', lastName: 'Er', company: 'TestCo' });
    assert.strictEqual(ownerRes.status, 201);
    const ownerToken = ownerRes.body.accessToken;
    const ownerId = ownerRes.body.user._id;
    assert(ownerToken, 'owner should receive token');

    const otherRes = await withCsrf(request(app)
      .post('/api/users/register'))
      .send({ email: 'other@example.com', password: 'password123', firstName: 'Oth', lastName: 'Er', company: 'TestCo' });
    assert.strictEqual(otherRes.status, 201);
    const otherId = otherRes.body.user._id;

    const projectRes = await withCsrf(request(app)
      .post('/api/projects'))
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

    const delRes = await withCsrf(request(app)
      .delete(`/api/projects/${projectId}`))
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(delRes.status, 200, `expected 200 delete, got ${delRes.status}: ${JSON.stringify(delRes.body)}`);

    const owner = await User.findById(ownerId).lean();
    const other = await User.findById(otherId).lean();

    const ownerHas = (owner.projects || []).some((p) => String(p && p._id) === projectId);
    const otherHas = (other.projects || []).some((p) => String(p && p._id) === projectId);
    assert.strictEqual(ownerHas, false, 'owner should not still reference deleted project');
    assert.strictEqual(otherHas, false, 'other user should not still reference deleted project');
  });

  it('cascades delete to every project-scoped collection', async () => {
    // Regression test for the cascade-delete fix: previously DELETE /projects/:id
    // only removed the Project doc and User.projects[] refs, leaving every
    // child collection (activities, issues, tasks, equipment, spaces, etc.)
    // pointing at a non-existent parent.
    const Project = require('../models/project');
    const Activity = require('../models/activity');
    const Issue = require('../models/issue');
    const Task = require('../models/task');
    const Equipment = require('../models/equipment');
    const Space = require('../models/space');
    const Template = require('../models/template');
    const FinalReport = require('../models/finalReport');
    const Invitation = require('../models/invitation');
    const AssistantChatMessage = require('../models/assistantChatMessage');

    const ownerRes = await withCsrf(request(app)
      .post('/api/users/register'))
      .send({ email: 'cascade-owner@example.com', password: 'password123', firstName: 'Cas', lastName: 'Owner', company: 'TestCo' });
    assert.strictEqual(ownerRes.status, 201);
    const ownerToken = ownerRes.body.accessToken;
    const ownerId = ownerRes.body.user._id;

    const projectRes = await withCsrf(request(app)
      .post('/api/projects'))
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Cascade Project', client: 'Client' });
    assert.strictEqual(projectRes.status, 201);
    const projectId = String(projectRes.body._id);
    const pidObj = new mongoose.Types.ObjectId(projectId);

    // Seed one document in every covered shape. Model layer bypasses the route
    // auth surface so the test stays focused on what cascadeDelete cleans up.
    await Activity.create({ projectId: pidObj, name: 'A', type: 'Cx Meeting' });
    await Issue.create({ projectId: pidObj, title: 'I', description: 'D' });
    await Task.create({ projectId: pidObj, name: 'T', wbs: '1' });
    await Equipment.create({ projectId: pidObj, tag: 'EQ-1', title: 'EQ-Title', type: 'AHU' });
    await Space.create({ project: pidObj, title: 'S' });
    await Template.create({ projectId: pidObj, tag: 'TPL', title: 'TPL-Title', type: 'Checklist' });
    await FinalReport.create({ projectId: pidObj });
    await Invitation.create({ projectId: pidObj, email: 'someone@example.com', inviterId: new mongoose.Types.ObjectId(ownerId), token: 'cascade-token-' + Date.now() });
    await AssistantChatMessage.create({ projectId: pidObj, role: 'user', content: 'hi' });

    // Sanity check: seeds landed.
    assert.strictEqual(await Activity.countDocuments({ projectId: pidObj }), 1);
    assert.strictEqual(await Space.countDocuments({ project: pidObj }), 1);

    const delRes = await withCsrf(request(app)
      .delete(`/api/projects/${projectId}`))
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(delRes.status, 200, `delete failed: ${JSON.stringify(delRes.body)}`);

    // Every covered collection should be empty for this projectId.
    assert.strictEqual(await Activity.countDocuments({ projectId: pidObj }), 0, 'activities should be cascade-deleted');
    assert.strictEqual(await Issue.countDocuments({ projectId: pidObj }), 0, 'issues should be cascade-deleted');
    assert.strictEqual(await Task.countDocuments({ projectId: pidObj }), 0, 'tasks should be cascade-deleted');
    assert.strictEqual(await Equipment.countDocuments({ projectId: pidObj }), 0, 'equipment should be cascade-deleted');
    assert.strictEqual(await Space.countDocuments({ project: pidObj }), 0, 'spaces should be cascade-deleted (uses `project` not `projectId`)');
    assert.strictEqual(await Template.countDocuments({ projectId: pidObj }), 0, 'templates should be cascade-deleted');
    assert.strictEqual(await FinalReport.countDocuments({ projectId: pidObj }), 0, 'final reports should be cascade-deleted');
    assert.strictEqual(await Invitation.countDocuments({ projectId: pidObj }), 0, 'invitations should be cascade-deleted');
    assert.strictEqual(await AssistantChatMessage.countDocuments({ projectId: pidObj }), 0, 'assistant chat messages should be cascade-deleted');
    assert.strictEqual(await Project.countDocuments({ _id: pidObj }), 0, 'project doc itself should be deleted');
  });
});
