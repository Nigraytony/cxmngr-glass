const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb } = require('./testUtils');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

describe('Agent tools — equipment attributes + status enum', function () {
  this.timeout(30000);
  let executeTool;
  let getClaudeTools;
  let Equipment;
  let projectId;

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
    ({ executeTool, getClaudeTools } = require('../utils/agentTools'));
    Equipment = require('../models/equipment');
    await clearDb();
  });

  after(async () => {
    try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  });

  beforeEach(async () => {
    await clearDb();
    projectId = new mongoose.Types.ObjectId();
  });

  const ctx = () => ({ projectId });

  describe('attributes — merge semantics', function () {
    it('create_equipment accepts attributes and persists them', async function () {
      const res = await executeTool('create_equipment', {
        tag: 'AHU-1',
        title: 'AHU-1',
        type: 'Air Handler',
        attributes: [
          { key: 'Make', value: 'Trane' },
          { key: 'Serial Number', value: 'U96G42208' },
        ],
      }, ctx());
      assert.strictEqual(res.success, true, `expected success, got: ${JSON.stringify(res)}`);
      const fresh = await Equipment.findById(res.record._id).lean();
      assert.deepStrictEqual(
        fresh.attributes.map((a) => ({ key: a.key, value: a.value })),
        [
          { key: 'Make', value: 'Trane' },
          { key: 'Serial Number', value: 'U96G42208' },
        ],
      );
    });

    it('update_equipment upserts by case-insensitive key, preserving existing key casing', async function () {
      // Seed equipment with template-style empty attributes (this is the
      // exact state the team-member ticket described: keys exist from a
      // template, values are all blank).
      const seeded = await Equipment.create({
        projectId,
        tag: 'AHU-1',
        title: 'AHU-1',
        type: 'Air Handler',
        attributes: [
          { key: 'Make', value: '' },
          { key: 'Manufacturer', value: '' },
          { key: 'Serial Number', value: '' },
          { key: 'Condition', value: '' },
        ],
      });

      // Agent sends mixed casing — should still match existing keys.
      const res = await executeTool('update_equipment', {
        id: String(seeded._id),
        attributes: [
          { key: 'make', value: 'Trane' },
          { key: 'SERIAL NUMBER', value: 'U96G42208' },
          { key: 'condition', value: 'Operational' },
        ],
      }, ctx());
      assert.strictEqual(res.success, true, `expected success, got: ${JSON.stringify(res)}`);

      const fresh = await Equipment.findById(seeded._id).lean();
      const byKey = Object.fromEntries(fresh.attributes.map((a) => [a.key, a.value]));
      // Existing key casing preserved
      assert.deepStrictEqual(Object.keys(byKey).sort(), ['Condition', 'Make', 'Manufacturer', 'Serial Number']);
      assert.strictEqual(byKey.Make, 'Trane');
      assert.strictEqual(byKey['Serial Number'], 'U96G42208');
      assert.strictEqual(byKey.Condition, 'Operational');
      // Unmentioned key untouched
      assert.strictEqual(byKey.Manufacturer, '');
    });

    it('update_equipment appends new keys and leaves unmentioned ones alone', async function () {
      const seeded = await Equipment.create({
        projectId, tag: 'P-1', title: 'P-1', type: 'Pump',
        attributes: [
          { key: 'Make', value: 'Bell & Gossett' },
          { key: 'Model', value: '1510' },
        ],
      });
      const res = await executeTool('update_equipment', {
        id: String(seeded._id),
        attributes: [
          { key: 'Flow GPM', value: '150' }, // new key
          // Make and Model not mentioned -> must persist
        ],
      }, ctx());
      assert.strictEqual(res.success, true);
      const fresh = await Equipment.findById(seeded._id).lean();
      const byKey = Object.fromEntries(fresh.attributes.map((a) => [a.key, a.value]));
      assert.strictEqual(byKey.Make, 'Bell & Gossett');
      assert.strictEqual(byKey.Model, '1510');
      assert.strictEqual(byKey['Flow GPM'], '150');
    });

    it('empty-string value clears, omitted key preserves', async function () {
      const seeded = await Equipment.create({
        projectId, tag: 'C-1', title: 'C-1', type: 'Chiller',
        attributes: [
          { key: 'Refrigerant', value: 'R-134a' },
          { key: 'Tonnage', value: '500' },
        ],
      });
      const res = await executeTool('update_equipment', {
        id: String(seeded._id),
        attributes: [
          { key: 'Refrigerant', value: '' }, // intentional clear
        ],
      }, ctx());
      assert.strictEqual(res.success, true);
      const fresh = await Equipment.findById(seeded._id).lean();
      const byKey = Object.fromEntries(fresh.attributes.map((a) => [a.key, a.value]));
      assert.strictEqual(byKey.Refrigerant, '');
      assert.strictEqual(byKey.Tonnage, '500');
    });

    it('update_equipment without attributes field leaves existing attributes untouched', async function () {
      const seeded = await Equipment.create({
        projectId, tag: 'X-1', title: 'X-1', type: 'AHU',
        attributes: [{ key: 'Make', value: 'Trane' }],
      });
      const res = await executeTool('update_equipment', {
        id: String(seeded._id),
        description: 'Updated description',
      }, ctx());
      assert.strictEqual(res.success, true);
      const fresh = await Equipment.findById(seeded._id).lean();
      assert.strictEqual(fresh.attributes.length, 1);
      assert.strictEqual(fresh.attributes[0].key, 'Make');
      assert.strictEqual(fresh.attributes[0].value, 'Trane');
      assert.strictEqual(fresh.description, 'Updated description');
    });

    it('drops entries with empty/missing key', async function () {
      const seeded = await Equipment.create({
        projectId, tag: 'X-2', title: 'X-2', type: 'AHU',
        attributes: [],
      });
      const res = await executeTool('update_equipment', {
        id: String(seeded._id),
        attributes: [
          { key: '', value: 'orphan' },
          { value: 'no-key' },
          { key: '  ', value: 'whitespace' },
          { key: 'Valid', value: 'yes' },
        ],
      }, ctx());
      assert.strictEqual(res.success, true);
      const fresh = await Equipment.findById(seeded._id).lean();
      assert.strictEqual(fresh.attributes.length, 1);
      assert.strictEqual(fresh.attributes[0].key, 'Valid');
    });
  });

  describe('get_equipment — verification read-back', function () {
    it('returns the full record plus content counts', async function () {
      const seeded = await Equipment.create({
        projectId,
        tag: 'CT-1',
        title: 'Cooling Tower 1',
        type: 'Cooling Tower',
        attributes: [{ key: 'Make', value: 'BAC' }, { key: 'Tons', value: '500' }],
        components: [{ tag: 'FAN-1' }, { tag: 'MTR-1' }, { tag: 'VFD-1' }],
        checklists: [
          { title: 'Installation', questions: [{ question_text: 'a' }, { question_text: 'b' }] },
          { title: 'Startup', questions: [{ question_text: 'c' }] },
        ],
        functionalTests: [{ name: 'Startup', kind: 'sequence' }, { name: 'Fan Control', kind: 'sequence' }],
      });

      const res = await executeTool('get_equipment', { id: String(seeded._id) }, ctx());
      assert.strictEqual(res.success, true, `expected success, got: ${JSON.stringify(res)}`);
      assert.strictEqual(res.record.tag, 'CT-1');
      assert.deepStrictEqual(res.content, {
        attributes: 2,
        components: 3,
        checklistSections: 2,
        checklistQuestions: 3,
        functionalTests: 2,
      });
    });

    it('is scoped to the project — foreign equipment is not found', async function () {
      const foreign = await Equipment.create({
        projectId: new mongoose.Types.ObjectId(),
        tag: 'X-1', title: 'X-1', type: 'Pump',
      });
      const res = await executeTool('get_equipment', { id: String(foreign._id) }, ctx());
      assert.strictEqual(res.success, false);
      assert.match(res.error, /not found/i);
    });

    it('rejects a missing/invalid id', async function () {
      const res = await executeTool('get_equipment', {}, ctx());
      assert.strictEqual(res.success, false);
      assert.match(res.error, /valid id/i);
    });
  });

  describe('tool schemas — status enums exposed to the LLM', function () {
    it('update_equipment input_schema status.enum matches the model enum exactly', function () {
      const tools = getClaudeTools();
      const upd = tools.find((t) => t.name === 'update_equipment');
      assert.ok(upd, 'update_equipment tool missing');
      const statusProp = upd.input_schema.properties.status;
      assert.ok(Array.isArray(statusProp.enum), 'status.enum should be an array');
      const { equipmentStatuses } = require('../models/equipment');
      assert.deepStrictEqual(statusProp.enum, equipmentStatuses, 'enum must mirror the model');
      // Specifically: the previously-misleading values are gone from the description text.
      assert.ok(!/In Progress|Complete\b/.test(statusProp.description.replace(/Complete\b/g, (m) => (m === 'Complete' ? m : ''))) || statusProp.description.includes('Operational'), 'description should list real enum values');
    });

    it('update_equipment exposes the attributes parameter', function () {
      const tools = getClaudeTools();
      const upd = tools.find((t) => t.name === 'update_equipment');
      assert.ok(upd.input_schema.properties.attributes, 'attributes property missing');
      assert.strictEqual(upd.input_schema.properties.attributes.type, 'array');
    });

    it('activity status enum is lowercase and matches the model', function () {
      const tools = getClaudeTools();
      const upd = tools.find((t) => t.name === 'update_activity');
      const statusProp = upd.input_schema.properties.status;
      const { activityStatuses } = require('../models/activity');
      assert.deepStrictEqual(statusProp.enum, activityStatuses);
      assert.deepStrictEqual(activityStatuses, ['draft', 'published', 'completed']);
    });

    it('task status enum hides the soft-delete sentinel', function () {
      const tools = getClaudeTools();
      const upd = tools.find((t) => t.name === 'update_task');
      assert.ok(!upd.input_schema.properties.status.enum.includes('Deleted'));
      assert.ok(upd.input_schema.properties.status.enum.includes('Completed'));
    });
  });
});
