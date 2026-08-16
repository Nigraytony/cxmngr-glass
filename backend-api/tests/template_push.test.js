const request = require('supertest');
const mongoose = require('mongoose');
const assert = require('assert');
const { clearDb, withCsrf } = require('./testUtils');
const {
  buildInstanceUpdate,
  mergeChecklists,
  mergeFunctionalTests,
  mergeComponents,
  mergeAttributeKeys,
} = require('../utils/templatePush');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// The rule under test throughout: the template owns the SHAPE of the work, the
// instance owns everything RECORDED into it. A push must never destroy an answer,
// a test result, a measured attribute value, or the instance's own identity.
describe('Template "Push changes" — structure-only propagation', function () {
  this.timeout(30000);

  describe('merge rules (unit)', () => {
    describe('mergeChecklists', () => {
      it('keeps recorded answers when the template re-words a question', () => {
        const template = [{
          number: 1,
          title: 'Pre-Start',
          questions: [{ number: 3, question_text: 'Verify damper full travel', answer: '' }],
        }];
        const instance = [{
          number: 1,
          title: 'Pre-Start',
          questions: [{
            number: 3,
            question_text: 'Verify damper travel',
            answer: 'yes',
            notes: 'checked twice',
            cx_answer: 'accepted',
          }],
        }];

        const merged = mergeChecklists(template, instance);
        const q = merged[0].questions[0];
        assert.strictEqual(q.question_text, 'Verify damper full travel', 'template wording wins');
        assert.strictEqual(q.answer, 'yes', 'recorded answer survives the re-wording');
        assert.strictEqual(q.notes, 'checked twice');
        assert.strictEqual(q.cx_answer, 'accepted');
      });

      it('matches on normalized text when the question has no number', () => {
        const template = [{ title: 'Pre-Start', questions: [{ question_text: '  Verify   Damper Travel ' }] }];
        const instance = [{ title: 'Pre-Start', questions: [{ question_text: 'verify damper travel', answer: 'no' }] }];

        const merged = mergeChecklists(template, instance);
        assert.strictEqual(merged[0].questions[0].answer, 'no');
      });

      it('gives a newly added question a clean slate', () => {
        // The template carries a stray answer; a question the instance has never
        // seen must arrive blank rather than inheriting it.
        const template = [{
          title: 'Pre-Start',
          questions: [
            { number: 1, question_text: 'Existing', answer: 'template-stray' },
            { number: 2, question_text: 'Brand new', answer: 'template-stray' },
          ],
        }];
        const instance = [{ title: 'Pre-Start', questions: [{ number: 1, question_text: 'Existing', answer: 'yes' }] }];

        const merged = mergeChecklists(template, instance);
        assert.strictEqual(merged[0].questions[0].answer, 'yes');
        assert.strictEqual(merged[0].questions[1].answer, undefined, 'new question must not inherit a template answer');
      });

      it('drops questions the template no longer contains', () => {
        const template = [{ title: 'Pre-Start', questions: [{ number: 1, question_text: 'Kept' }] }];
        const instance = [{
          title: 'Pre-Start',
          questions: [
            { number: 1, question_text: 'Kept', answer: 'yes' },
            { number: 2, question_text: 'Retired', answer: 'no' },
          ],
        }];

        const merged = mergeChecklists(template, instance);
        assert.strictEqual(merged[0].questions.length, 1);
        assert.strictEqual(merged[0].questions[0].question_text, 'Kept');
      });

      it('never binds two template questions to the same recorded answer', () => {
        // Duplicate wording in the template must not clone one answer onto both.
        const template = [{ title: 'S', questions: [{ question_text: 'Same' }, { question_text: 'Same' }] }];
        const instance = [{ title: 'S', questions: [{ question_text: 'Same', answer: 'yes' }] }];

        const merged = mergeChecklists(template, instance);
        assert.strictEqual(merged[0].questions[0].answer, 'yes');
        assert.strictEqual(merged[0].questions[1].answer, undefined);
      });

      it('preserves section-level recorded state and instance responsible', () => {
        const template = [{ number: 1, title: 'Pre-Start', responsible: 'Template Role', questions: [] }];
        const instance = [{
          number: 1,
          title: 'Pre-Start',
          responsible: 'Jane on site',
          status: 'In Progress',
          notes: 'section note',
          photos: [{ name: 'p.jpg' }],
          questions: [],
        }];

        const merged = mergeChecklists(template, instance);
        assert.strictEqual(merged[0].responsible, 'Jane on site', 'instance assignment wins when set');
        assert.strictEqual(merged[0].status, 'In Progress');
        assert.strictEqual(merged[0].notes, 'section note');
        assert.deepStrictEqual(merged[0].photos, [{ name: 'p.jpg' }]);
      });

      it('falls back to the template responsible when the instance has none', () => {
        const template = [{ title: 'S', responsible: 'Template Role', questions: [] }];
        const instance = [{ title: 'S', questions: [] }];
        assert.strictEqual(mergeChecklists(template, instance)[0].responsible, 'Template Role');
      });

      it('returns an empty list for a template with no checklists', () => {
        assert.deepStrictEqual(mergeChecklists(undefined, [{ title: 'S', questions: [] }]), []);
      });
    });

    describe('mergeFunctionalTests', () => {
      it('keeps pass/fail, per-step actuals and the recorded results grid', () => {
        const template = [{
          number: 1,
          name: 'Airflow verification',
          description: 'Updated procedure text',
          rows: [{ step: 'Set damper to 100%', expected: '2000 CFM' }],
          table: { columns: [{ key: 'cfm', name: 'CFM' }], rows: [] },
        }];
        const instance = [{
          number: 1,
          name: 'Airflow verification',
          description: 'Old procedure text',
          pass: true,
          notes: 'witnessed by AHJ',
          rows: [{ step: 'Set damper to 100%', expected: '2000 CFM', actual: '1980 CFM', pass: true }],
          table: { columns: [{ key: 'cfm', name: 'CFM' }], rows: [{ cfm: '1980' }, { cfm: '2010' }] },
        }];

        const merged = mergeFunctionalTests(template, instance);
        assert.strictEqual(merged[0].description, 'Updated procedure text', 'template procedure wins');
        assert.strictEqual(merged[0].pass, true, 'recorded pass survives');
        assert.strictEqual(merged[0].notes, 'witnessed by AHJ');
        assert.strictEqual(merged[0].rows[0].actual, '1980 CFM', 'recorded actual survives');
        assert.strictEqual(merged[0].rows[0].pass, true);
        assert.deepStrictEqual(merged[0].table.rows, [{ cfm: '1980' }, { cfm: '2010' }], 'results grid survives');
        assert.deepStrictEqual(merged[0].table.columns, [{ key: 'cfm', name: 'CFM' }]);
      });

      it('adopts new results-grid columns while keeping recorded rows', () => {
        const template = [{
          name: 'T',
          table: { columns: [{ key: 'cfm' }, { key: 'temp' }], rows: [] },
        }];
        const instance = [{ name: 'T', table: { columns: [{ key: 'cfm' }], rows: [{ cfm: '1980' }] } }];

        const merged = mergeFunctionalTests(template, instance);
        assert.deepStrictEqual(merged[0].table.columns, [{ key: 'cfm' }, { key: 'temp' }]);
        assert.deepStrictEqual(merged[0].table.rows, [{ cfm: '1980' }]);
      });

      it('starts a brand-new test with no results', () => {
        const template = [{ name: 'New test', pass: true, table: { columns: [{ key: 'a' }], rows: [{ a: 'stray' }] } }];
        const merged = mergeFunctionalTests(template, []);
        assert.strictEqual(merged[0].pass, undefined, 'new test must not inherit a template pass');
        assert.deepStrictEqual(merged[0].table.rows, [], 'new test must not inherit template result rows');
      });

      it('adds a new step without disturbing the recorded one', () => {
        const template = [{
          name: 'T',
          rows: [{ step: 'One', expected: 'a' }, { step: 'Two', expected: 'b' }],
        }];
        const instance = [{ name: 'T', rows: [{ step: 'One', expected: 'a', actual: 'measured' }] }];

        const merged = mergeFunctionalTests(template, instance);
        assert.strictEqual(merged[0].rows.length, 2);
        assert.strictEqual(merged[0].rows[0].actual, 'measured');
        assert.strictEqual(merged[0].rows[1].actual, undefined);
      });
    });

    describe('mergeAttributeKeys', () => {
      it('adds template keys without touching recorded values', () => {
        // The reported failure mode: template values are blank placeholders, so a
        // wholesale copy wiped every entered Make / Model / Serial.
        const template = [
          { key: 'Manufacturer', value: '' },
          { key: 'Model', value: '' },
          { key: 'Serial Number', value: '' },
        ];
        const instance = [
          { key: 'Manufacturer', value: 'Trane' },
          { key: 'Model', value: 'XYZ-9' },
        ];

        const merged = mergeAttributeKeys(template, instance);
        assert.strictEqual(merged.find((a) => a.key === 'Manufacturer').value, 'Trane');
        assert.strictEqual(merged.find((a) => a.key === 'Model').value, 'XYZ-9');
        assert.strictEqual(merged.find((a) => a.key === 'Serial Number').value, '', 'new key arrives blank');
      });

      it('matches keys case-insensitively and keeps the instance casing', () => {
        const merged = mergeAttributeKeys([{ key: 'MANUFACTURER', value: '' }], [{ key: 'Manufacturer', value: 'Trane' }]);
        assert.strictEqual(merged.length, 1);
        assert.strictEqual(merged[0].key, 'Manufacturer');
        assert.strictEqual(merged[0].value, 'Trane');
      });

      it('keeps instance keys the template has dropped', () => {
        const merged = mergeAttributeKeys([], [{ key: 'Field Note', value: 'important' }]);
        assert.deepStrictEqual(merged, [{ key: 'Field Note', value: 'important' }]);
      });
    });

    describe('mergeComponents', () => {
      it('keeps per-component status/notes and recorded attribute values', () => {
        const template = [{ tag: 'C-1', title: 'Fan', attributes: { Make: '', Size: '' }, status: '', notes: '' }];
        const instance = [{ tag: 'C-1', title: 'Fan', attributes: { Make: 'Greenheck' }, status: 'Installed', notes: 'on roof' }];

        const merged = mergeComponents(template, instance);
        assert.strictEqual(merged[0].status, 'Installed');
        assert.strictEqual(merged[0].notes, 'on roof');
        assert.strictEqual(merged[0].attributes.Make, 'Greenheck');
        assert.strictEqual(merged[0].attributes.Size, '', 'new component attribute key is added blank');
      });
    });

    describe('buildInstanceUpdate', () => {
      it('writes only the four structural fields and nothing else', () => {
        const update = buildInstanceUpdate(
          { title: 'TPL', description: 'tpl desc', status: 'Not Started', checklists: [], functionalTests: [] },
          { title: 'AHU-1', description: 'roof unit', status: 'Operational' },
        );
        assert.deepStrictEqual(
          Object.keys(update).sort(),
          ['attributes', 'checklists', 'components', 'functionalTests'],
        );
      });
    });
  });

  describe('POST /api/templates/:id/push (integration)', () => {
    let app;
    let Template;
    let Equipment;
    let token;
    let projectId;
    let templateId;

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
      Template = require('../models/template');
      Equipment = require('../models/equipment');
      await clearDb();
    });

    after(async () => {
      try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
    });

    // Template: one checklist question and one FPT step.
    const templateChecklists = () => ([{
      number: 1,
      title: 'Pre-Start',
      questions: [{ number: 1, question_text: 'Verify damper full travel', answer: '' }],
    }]);
    const templateTests = () => ([{
      number: 1,
      name: 'Airflow verification',
      rows: [{ step: 'Set damper to 100%', expected: '2000 CFM' }],
    }]);

    beforeEach(async () => {
      await clearDb();

      const reg = await withCsrf(request(app).post('/api/users/register'))
        .send({ email: 'push@example.com', password: 'password123', firstName: 'P', lastName: 'U', company: 'TestCo' });
      assert.strictEqual(reg.status, 201);
      token = reg.body.accessToken;

      const proj = await withCsrf(request(app).post('/api/projects'))
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Push Project', client: 'Client' });
      assert.strictEqual(proj.status, 201);
      projectId = String(proj.body._id);

      const tpl = await Template.create({
        tag: 'AHU-TPL',
        title: 'Air Handling Unit',
        type: 'AHU',
        projectId,
        description: 'Generic AHU template',
        status: 'Not Started',
        attributes: [{ key: 'Manufacturer', value: '' }, { key: 'Model', value: '' }],
        checklists: templateChecklists(),
        functionalTests: templateTests(),
      });
      templateId = String(tpl._id);
    });

    async function makeInstance(overrides) {
      const eq = await Equipment.create(Object.assign({
        tag: 'AHU-1',
        title: 'AHU-1 Penthouse',
        type: 'AHU',
        projectId,
        template: templateId,
        description: 'Serves floors 3-5',
        status: 'Operational',
        system: 'HVAC',
        attributes: [{ key: 'Manufacturer', value: 'Trane' }],
        checklists: [{
          number: 1,
          title: 'Pre-Start',
          questions: [{ number: 1, question_text: 'Verify damper travel', answer: 'yes', notes: 'ok' }],
        }],
        functionalTests: [{
          number: 1,
          name: 'Airflow verification',
          pass: true,
          rows: [{ step: 'Set damper to 100%', expected: '2000 CFM', actual: '1980 CFM' }],
        }],
        fptSignatures: [{ title: 'CxA', person: 'Jane' }],
      }, overrides || {}));
      return String(eq._id);
    }

    function push(equipmentIds) {
      return withCsrf(request(app).post(`/api/templates/${templateId}/push`))
        .set('Authorization', `Bearer ${token}`)
        .send({ equipmentIds });
    }

    it('leaves the instance\'s own identity fields untouched', async () => {
      const eqId = await makeInstance();
      const res = await push([eqId]);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pushed, 1);

      const after = await Equipment.findById(eqId).lean();
      assert.strictEqual(after.title, 'AHU-1 Penthouse', 'title must not revert to the template');
      assert.strictEqual(after.description, 'Serves floors 3-5', 'description must not revert to the template');
      assert.strictEqual(after.status, 'Operational', 'commissioning status must not reset');
      assert.strictEqual(after.system, 'HVAC');
      assert.strictEqual(after.tag, 'AHU-1');
    });

    it('keeps recorded answers, results and attribute values', async () => {
      const eqId = await makeInstance();
      assert.strictEqual((await push([eqId])).status, 200);

      const after = await Equipment.findById(eqId).lean();
      const q = after.checklists[0].questions[0];
      assert.strictEqual(q.question_text, 'Verify damper full travel', 'template wording is adopted');
      assert.strictEqual(q.answer, 'yes', 'recorded answer survives');
      assert.strictEqual(q.notes, 'ok');

      assert.strictEqual(after.functionalTests[0].pass, true, 'recorded pass survives');
      assert.strictEqual(after.functionalTests[0].rows[0].actual, '1980 CFM', 'recorded actual survives');

      const manufacturer = after.attributes.find((a) => a.key === 'Manufacturer');
      assert.strictEqual(manufacturer.value, 'Trane', 'entered attribute value survives');
      assert.strictEqual(after.attributes.find((a) => a.key === 'Model').value, '', 'new template key is added blank');

      assert.deepStrictEqual(after.fptSignatures, [{ title: 'CxA', person: 'Jane' }], 'signatures are untouched');
    });

    it('propagates a newly added checklist question', async () => {
      const eqId = await makeInstance();
      await Template.updateOne({ _id: templateId }, {
        $set: {
          checklists: [{
            number: 1,
            title: 'Pre-Start',
            questions: [
              { number: 1, question_text: 'Verify damper full travel', answer: '' },
              { number: 2, question_text: 'Verify belt tension', answer: '' },
            ],
          }],
        },
      });

      assert.strictEqual((await push([eqId])).status, 200);

      const after = await Equipment.findById(eqId).lean();
      const questions = after.checklists[0].questions;
      assert.strictEqual(questions.length, 2);
      assert.strictEqual(questions[0].answer, 'yes', 'existing answer kept');
      assert.strictEqual(questions[1].question_text, 'Verify belt tension');
      assert.ok(!questions[1].answer, 'the new question arrives unanswered');
    });

    it('pushes to several instances independently', async () => {
      const a = await makeInstance({ tag: 'AHU-1', title: 'First' });
      const b = await makeInstance({
        tag: 'AHU-2',
        title: 'Second',
        checklists: [{ number: 1, title: 'Pre-Start', questions: [{ number: 1, question_text: 'Verify damper travel', answer: 'no' }] }],
      });

      const res = await push([a, b]);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pushed, 2);

      const afterA = await Equipment.findById(a).lean();
      const afterB = await Equipment.findById(b).lean();
      assert.strictEqual(afterA.title, 'First');
      assert.strictEqual(afterB.title, 'Second');
      assert.strictEqual(afterA.checklists[0].questions[0].answer, 'yes');
      assert.strictEqual(afterB.checklists[0].questions[0].answer, 'no', 'each instance keeps its own answer');
    });

    it('skips equipment that is not linked to this template', async () => {
      const linked = await makeInstance();
      const unlinked = await Equipment.create({
        tag: 'AHU-9', title: 'Unlinked', type: 'AHU', projectId, checklists: [],
      });

      const res = await push([linked, String(unlinked._id)]);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pushed, 1);
      assert.deepStrictEqual(res.body.skipped, [String(unlinked._id)]);

      const after = await Equipment.findById(unlinked._id).lean();
      assert.deepStrictEqual(after.checklists, [], 'an unlinked item is never written to');
      assert.strictEqual(after.template, undefined, 'a push must not adopt a stray id');
    });

    it('rejects a request with no equipmentIds', async () => {
      const res = await push([]);
      assert.strictEqual(res.status, 400);
      assert.match(String(res.body.error || ''), /equipmentIds is required/i);
    });

    it('rejects a malformed equipment id', async () => {
      const res = await push(['not-an-object-id']);
      assert.strictEqual(res.status, 400);
      assert.match(String(res.body.error || ''), /invalid equipmentid/i);
    });

    it('404s for a template that does not exist', async () => {
      const ghost = new mongoose.Types.ObjectId();
      const res = await withCsrf(request(app).post(`/api/templates/${ghost}/push`))
        .set('Authorization', `Bearer ${token}`)
        .send({ equipmentIds: [String(new mongoose.Types.ObjectId())] });
      assert.strictEqual(res.status, 404);
    });

    it('is idempotent — a second push changes nothing', async () => {
      const eqId = await makeInstance();
      assert.strictEqual((await push([eqId])).status, 200);
      const first = await Equipment.findById(eqId).lean();
      assert.strictEqual((await push([eqId])).status, 200);
      const second = await Equipment.findById(eqId).lean();

      assert.deepStrictEqual(second.checklists, first.checklists);
      assert.deepStrictEqual(second.functionalTests, first.functionalTests);
      assert.deepStrictEqual(second.attributes, first.attributes);
    });
  });
});
