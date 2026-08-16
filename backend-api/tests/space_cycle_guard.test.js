const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Space re-parent cycle guard', function () {
  this.timeout(30000);

  let app;
  let Space;
  let Project;

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
    Space = require('../models/space');
    Project = require('../models/project');
    await clearDb();
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('Space.wouldCreateCycle — model static', () => {
    let project;

    beforeEach(async () => {
      project = await Project.create({ name: 'P', client: 'C' });
    });

    // Chain: root → mid → leaf
    async function makeChain() {
      const root = await Space.create({ project: project._id, title: 'Root' });
      const mid = await Space.create({ project: project._id, title: 'Mid', parentSpace: String(root._id) });
      const leaf = await Space.create({ project: project._id, title: 'Leaf', parentSpace: String(mid._id) });
      return { root, mid, leaf };
    }

    it('rejects a space parented to itself', async () => {
      const { mid } = await makeChain();
      assert.strictEqual(await Space.wouldCreateCycle(mid._id, mid._id), true);
    });

    it('rejects a space parented to its direct child', async () => {
      const { root, mid } = await makeChain();
      assert.strictEqual(await Space.wouldCreateCycle(root._id, mid._id), true);
    });

    it('rejects a space parented to a deeper descendant', async () => {
      const { root, leaf } = await makeChain();
      assert.strictEqual(await Space.wouldCreateCycle(root._id, leaf._id), true);
    });

    it('allows re-parenting under an unrelated space', async () => {
      const { leaf } = await makeChain();
      const other = await Space.create({ project: project._id, title: 'Other' });
      assert.strictEqual(await Space.wouldCreateCycle(leaf._id, other._id), false);
    });

    it('allows moving a space up to its own grandparent', async () => {
      const { root, leaf } = await makeChain();
      assert.strictEqual(await Space.wouldCreateCycle(leaf._id, root._id), false);
    });

    it('allows moving a space out to the root', async () => {
      const { leaf } = await makeChain();
      assert.strictEqual(await Space.wouldCreateCycle(leaf._id, ''), false);
      assert.strictEqual(await Space.wouldCreateCycle(leaf._id, null), false);
    });

    it('treats a dangling parent reference as safe, not a cycle', async () => {
      const { leaf } = await makeChain();
      const ghost = new mongoose.Types.ObjectId();
      assert.strictEqual(await Space.wouldCreateCycle(leaf._id, String(ghost)), false);
    });

    it('refuses to extend a pre-existing loop in the data', async () => {
      // Corrupt the data behind the model's back: a <-> b point at each other.
      const a = await Space.create({ project: project._id, title: 'A' });
      const b = await Space.create({ project: project._id, title: 'B', parentSpace: String(a._id) });
      await Space.updateOne({ _id: a._id }, { $set: { parentSpace: String(b._id) } });

      const outsider = await Space.create({ project: project._id, title: 'Outsider' });
      assert.strictEqual(await Space.wouldCreateCycle(outsider._id, String(a._id)), true);
    });
  });

  describe('PATCH /api/spaces/:id — route guard', () => {
    let token;
    let projectId;
    let root;
    let mid;
    let leaf;

    async function createSpace(title, parentSpace) {
      const res = await withCsrf(request(app).post('/api/spaces'))
        .set('Authorization', `Bearer ${token}`)
        .send({ project: projectId, title, type: 'Room', parentSpace: parentSpace || '' });
      assert.strictEqual(res.status, 201, `expected 201 creating ${title}, got ${res.status}`);
      return String(res.body._id);
    }

    function patchParent(spaceId, parentSpace) {
      return withCsrf(request(app).patch(`/api/spaces/${spaceId}`))
        .set('Authorization', `Bearer ${token}`)
        .send({ parentSpace });
    }

    beforeEach(async () => {
      const reg = await withCsrf(request(app).post('/api/users/register'))
        .send({ email: 'spaces@example.com', password: 'password123', firstName: 'S', lastName: 'P', company: 'TestCo' });
      assert.strictEqual(reg.status, 201);
      token = reg.body.accessToken;
      assert(token, 'expected token from register');

      const proj = await withCsrf(request(app).post('/api/projects'))
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Spaces Project', client: 'Client' });
      assert.strictEqual(proj.status, 201);
      projectId = String(proj.body._id);

      // Chain: root → mid → leaf
      root = await createSpace('Root', '');
      mid = await createSpace('Mid', root);
      leaf = await createSpace('Leaf', mid);
    });

    it('rejects parenting a space to itself with 400', async () => {
      const res = await patchParent(mid, mid);
      assert.strictEqual(res.status, 400);
      assert.match(String(res.body.error || ''), /own parent or descendant/i);

      // The stored parent is untouched.
      const after = await Space.findById(mid).lean();
      assert.strictEqual(String(after.parentSpace), root);
    });

    it('rejects parenting a space under its own descendant with 400', async () => {
      const res = await patchParent(root, leaf);
      assert.strictEqual(res.status, 400);
      assert.match(String(res.body.error || ''), /own parent or descendant/i);

      const after = await Space.findById(root).lean();
      assert.strictEqual(String(after.parentSpace || ''), '');
    });

    it('rejects a malformed parentSpace with 400', async () => {
      const res = await patchParent(leaf, 'not-an-object-id');
      assert.strictEqual(res.status, 400);
      assert.match(String(res.body.error || ''), /invalid parentspace/i);
    });

    it('allows a legitimate re-parent', async () => {
      const res = await patchParent(leaf, root);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(String(res.body.parentSpace), root);
    });

    it('allows moving a space out to the root', async () => {
      const res = await patchParent(leaf, '');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(String(res.body.parentSpace || ''), '');
    });

    it('leaves patches that do not touch parentSpace alone', async () => {
      const res = await withCsrf(request(app).patch(`/api/spaces/${leaf}`))
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Renamed Leaf' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.title, 'Renamed Leaf');
      assert.strictEqual(String(res.body.parentSpace), mid);
    });
  });
});
