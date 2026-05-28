const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Cascade-delete helpers — Space / Equipment / Template / System', function () {
  this.timeout(30000);

  before(async () => {
    if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).startsWith('mongodb')) {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    try { delete require.cache[require.resolve('../index')]; } catch (e) { /* ignore */ }
    require('../index.js');
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

  it('cascadeSpace unsets refs in Equipment/Activity/Issue/Template and pulls from arrays', async () => {
    const { cascadeSpace } = require('../utils/cascadeDelete');
    const Space = require('../models/space');
    const Equipment = require('../models/equipment');
    const Activity = require('../models/activity');
    const Issue = require('../models/issue');
    const Template = require('../models/template');
    const Project = require('../models/project');

    // Layout: grandparent → space-being-deleted → child. The "victim" is in
    // the middle. Refs from above (grandparent.subSpaces[]) and below
    // (child.parentSpace) should both be cleared by cascadeSpace.
    const project = await Project.create({ name: 'P', client: 'C' });
    const grandparent = await Space.create({ project: project._id, title: 'Grandparent' });
    const victim = await Space.create({ project: project._id, title: 'Victim', parentSpace: String(grandparent._id) });
    const child = await Space.create({ project: project._id, title: 'Child', parentSpace: String(victim._id) });
    const eq = await Equipment.create({ projectId: project._id, tag: 'EQ', title: 'EQ-Title', type: 'AHU', spaceId: victim._id });
    const act = await Activity.create({ projectId: project._id, name: 'A', type: 'Cx Meeting', spaceId: victim._id });
    const iss = await Issue.create({ projectId: project._id, title: 'I', description: 'D', spaceId: victim._id });
    const tpl = await Template.create({ projectId: project._id, tag: 'TPL', title: 'TPL-Title', type: 'Checklist', spaceId: victim._id });
    project.spaces = [grandparent._id, victim._id, child._id];
    await project.save();
    grandparent.subSpaces = [victim._id];
    await grandparent.save();

    const r = await cascadeSpace(victim._id);
    assert.strictEqual(r.ok, true);

    assert.strictEqual((await Equipment.findById(eq._id)).spaceId, undefined, 'Equipment.spaceId should be unset');
    assert.strictEqual((await Activity.findById(act._id)).spaceId, undefined, 'Activity.spaceId should be unset');
    assert.strictEqual((await Issue.findById(iss._id)).spaceId, undefined, 'Issue.spaceId should be unset');
    assert.strictEqual((await Template.findById(tpl._id)).spaceId, undefined, 'Template.spaceId should be unset');
    const childAfter = await Space.findById(child._id);
    assert.ok(!childAfter.parentSpace, 'sub-space parentSpace should be unset (becomes top-level orphan)');
    const projectAfter = await Project.findById(project._id);
    const projectSpaceIds = (projectAfter.spaces || []).map((id) => String(id));
    assert.strictEqual(projectSpaceIds.includes(String(victim._id)), false, 'Project.spaces[] should no longer contain the deleted space');
    assert.strictEqual(projectSpaceIds.includes(String(grandparent._id)), true, 'Project.spaces[] should still contain unrelated spaces');
    const grandparentAfter = await Space.findById(grandparent._id);
    const subSpaceIds = (grandparentAfter.subSpaces || []).map((id) => String(id));
    assert.strictEqual(subSpaceIds.includes(String(victim._id)), false, 'grandparent Space.subSpaces[] should no longer contain the victim');
  });

  it('cascadeEquipment pulls Space.equipment[]', async () => {
    const { cascadeEquipment } = require('../utils/cascadeDelete');
    const Space = require('../models/space');
    const Equipment = require('../models/equipment');
    const Project = require('../models/project');

    const project = await Project.create({ name: 'P', client: 'C' });
    const eq = await Equipment.create({ projectId: project._id, tag: 'EQ', title: 'EQ-Title', type: 'AHU' });
    const otherEq = await Equipment.create({ projectId: project._id, tag: 'OTHER', title: 'Other-Title', type: 'AHU' });
    const space = await Space.create({ project: project._id, title: 'S', equipment: [eq._id, otherEq._id] });

    const r = await cascadeEquipment(eq._id);
    assert.strictEqual(r.ok, true);

    const spaceAfter = await Space.findById(space._id);
    const ids = (spaceAfter.equipment || []).map((id) => String(id));
    assert.strictEqual(ids.includes(String(eq._id)), false, 'deleted equipment should be pulled from Space.equipment[]');
    assert.strictEqual(ids.includes(String(otherEq._id)), true, 'unrelated equipment should remain in Space.equipment[]');
  });

  it('cascadeTemplate unsets Equipment.template', async () => {
    const { cascadeTemplate } = require('../utils/cascadeDelete');
    const Template = require('../models/template');
    const Equipment = require('../models/equipment');
    const Project = require('../models/project');

    const project = await Project.create({ name: 'P', client: 'C' });
    const tpl = await Template.create({ projectId: project._id, tag: 'TPL', title: 'TPL-Title', type: 'Checklist' });
    const eq = await Equipment.create({ projectId: project._id, tag: 'EQ', title: 'EQ-Title', type: 'AHU', template: tpl._id });

    const r = await cascadeTemplate(tpl._id);
    assert.strictEqual(r.ok, true);

    const eqAfter = await Equipment.findById(eq._id);
    assert.strictEqual(eqAfter.template, undefined, 'Equipment.template should be unset');
  });

  it('cascadeSystem unsets Issue.systemId and pulls Activity.systems[]', async () => {
    const { cascadeSystem } = require('../utils/cascadeDelete');
    const System = require('../models/system');
    const Issue = require('../models/issue');
    const Activity = require('../models/activity');
    const Project = require('../models/project');

    const project = await Project.create({ name: 'P', client: 'C' });
    const sys = await System.create({ projectId: project._id, name: 'SYS' });
    const iss = await Issue.create({ projectId: project._id, title: 'I', description: 'D', systemId: sys._id });
    const act = await Activity.create({ projectId: project._id, name: 'A', type: 'Cx Meeting', systems: [String(sys._id), 'unrelated-system-tag'] });

    const r = await cascadeSystem(sys._id);
    assert.strictEqual(r.ok, true);

    const issAfter = await Issue.findById(iss._id);
    assert.strictEqual(issAfter.systemId, undefined, 'Issue.systemId should be unset');
    const actAfter = await Activity.findById(act._id);
    assert.deepStrictEqual(actAfter.systems, ['unrelated-system-tag'], 'Activity.systems[] should only retain entries not matching the deleted system');
  });
});
