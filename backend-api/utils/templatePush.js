// Structure-only propagation from a Template to the Equipment instances built
// from it ("Push changes").
//
// The governing rule: the template owns the *shape* of the work — which checklist
// questions exist, which FPT steps exist, which components and attribute keys
// exist. The instance owns everything *recorded into* that shape (answers, test
// results, measured values) and its own identity (title, description, status,
// system, location). A push re-shapes an instance without disturbing a single
// thing anyone typed into it.
//
// This replaces an earlier client-side push that copied the template's identity
// fields onto each instance and replaced the embedded arrays wholesale, silently
// destroying recorded commissioning data on every push.
//
// Matching is by `number` first, then by normalized text (question_text / name /
// step / title / tag). That way re-wording a question in the template keeps the
// recorded answer attached to it. Questions the template no longer contains are
// dropped, along with their answers — the template defines the checklist.

// Sections/questions/tests carry no stable ids, so identity is number-then-text.
function normText(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normNumber(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

function deepCopy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

// Matches template items against the instance's existing items, consuming each
// match so two template items can never bind to the same recorded answer.
function createMatcher(existingItems, textFields) {
  const pool = (Array.isArray(existingItems) ? existingItems : []).map((item) => ({ item, taken: false }));
  return function match(templateItem) {
    const wanted = templateItem && typeof templateItem === 'object' ? templateItem : {};

    const num = normNumber(wanted.number);
    if (num) {
      const hit = pool.find((e) => !e.taken && normNumber(e.item && e.item.number) === num);
      if (hit) { hit.taken = true; return hit.item; }
    }

    for (const field of textFields) {
      const text = normText(wanted[field]);
      if (!text) continue;
      const hit = pool.find((e) => !e.taken && normText(e.item && e.item[field]) === text);
      if (hit) { hit.taken = true; return hit.item; }
    }

    return null;
  };
}

// Copy the instance-owned fields back onto the template-shaped item.
// `always`: recorded results — the instance's value wins even when empty, and a
//   brand-new item starts clean rather than inheriting the template's stray value.
// `ifSet`: defaults — the instance wins only when it actually holds something,
//   otherwise the template's value stands.
function overlay(target, source, spec) {
  const always = (spec && spec.always) || [];
  const ifSet = (spec && spec.ifSet) || [];
  const src = source && typeof source === 'object' ? source : null;

  for (const key of always) {
    if (src && Object.prototype.hasOwnProperty.call(src, key)) target[key] = deepCopy(src[key]);
    else delete target[key];
  }
  for (const key of ifSet) {
    if (src && hasValue(src[key])) target[key] = deepCopy(src[key]);
  }
  return target;
}

const SECTION_RESULT = {
  always: ['status', 'is_complete', 'notes', 'documents', 'photos', 'issues', 'settings', 'meta'],
  ifSet: ['responsible', 'oprItemIds'],
};

const QUESTION_RESULT = {
  always: [
    'answer', 'cx_answer', 'cx_answered_by', 'cx_answered_at',
    'status', 'answered_by', 'answered_at', 'is_complete', 'notes',
  ],
  ifSet: ['oprItemIds'],
};

const FPT_RESULT = {
  always: ['pass', 'notes', 'status', 'is_complete', 'performed_by', 'performed_at', 'result'],
  ifSet: ['oprItemIds'],
};

const FPT_STEP_RESULT = {
  always: ['actual', 'pass', 'notes', 'status', 'is_complete'],
  ifSet: [],
};

const COMPONENT_RESULT = {
  always: ['status', 'notes', 'issues'],
  ifSet: [],
};

// Template owns section/question text; instance owns every recorded answer.
function mergeChecklists(templateChecklists, instanceChecklists) {
  const templateSections = Array.isArray(templateChecklists) ? templateChecklists : [];
  const matchSection = createMatcher(instanceChecklists, ['title']);

  return templateSections.map((section) => {
    const merged = deepCopy(section) || {};
    const previous = matchSection(section);
    overlay(merged, previous, SECTION_RESULT);

    const templateQuestions = Array.isArray(section && section.questions) ? section.questions : [];
    const previousQuestions = Array.isArray(previous && previous.questions) ? previous.questions : [];
    const matchQuestion = createMatcher(previousQuestions, ['question_text']);

    merged.questions = templateQuestions.map((question) => (
      overlay(deepCopy(question) || {}, matchQuestion(question), QUESTION_RESULT)
    ));

    return merged;
  });
}

// Template owns test names, step text and the results-grid columns; the instance
// owns pass/fail, per-step actuals and every recorded row of the results grid.
function mergeFunctionalTests(templateTests, instanceTests) {
  const templateList = Array.isArray(templateTests) ? templateTests : [];
  const matchTest = createMatcher(instanceTests, ['name']);

  return templateList.map((test) => {
    const merged = deepCopy(test) || {};
    const previous = matchTest(test);
    overlay(merged, previous, FPT_RESULT);

    const templateSteps = Array.isArray(test && test.rows) ? test.rows : [];
    const previousSteps = Array.isArray(previous && previous.rows) ? previous.rows : [];
    if (templateSteps.length) {
      const matchStep = createMatcher(previousSteps, ['step']);
      merged.rows = templateSteps.map((step) => (
        overlay(deepCopy(step) || {}, matchStep(step), FPT_STEP_RESULT)
      ));
    }

    const templateTable = test && typeof test.table === 'object' && test.table ? test.table : null;
    if (templateTable) {
      const previousTable = previous && typeof previous.table === 'object' && previous.table ? previous.table : null;
      merged.table = Object.assign({}, deepCopy(templateTable), {
        rows: Array.isArray(previousTable && previousTable.rows) ? deepCopy(previousTable.rows) : [],
      });
    }

    return merged;
  });
}

// Component attributes are stored as an object map on equipment but may arrive
// from the template as a key/value array. Normalize both, then let the instance's
// recorded values stand and add only the keys it is missing.
function mergeComponentAttributes(templateAttrs, instanceAttrs) {
  const toMap = (value) => {
    if (Array.isArray(value)) {
      const out = {};
      for (const pair of value) {
        const key = String((pair && pair.key) || '').trim();
        if (key) out[key] = pair ? pair.value : '';
      }
      return out;
    }
    return value && typeof value === 'object' ? Object.assign({}, value) : {};
  };

  const merged = toMap(instanceAttrs);
  const fromTemplate = toMap(templateAttrs);
  const existingLower = new Set(Object.keys(merged).map((k) => k.toLowerCase()));
  for (const key of Object.keys(fromTemplate)) {
    if (existingLower.has(key.toLowerCase())) continue;
    merged[key] = fromTemplate[key];
  }
  return merged;
}

function mergeComponents(templateComponents, instanceComponents) {
  const templateList = Array.isArray(templateComponents) ? templateComponents : [];
  const matchComponent = createMatcher(instanceComponents, ['tag', 'title']);

  return templateList.map((component) => {
    const merged = deepCopy(component) || {};
    const previous = matchComponent(component);
    overlay(merged, previous, COMPONENT_RESULT);
    merged.attributes = mergeComponentAttributes(component && component.attributes, previous && previous.attributes);
    return merged;
  });
}

// Attribute *keys* sync; attribute *values* are instance data (Make, Model,
// Serial Number...) and are never touched. Keys the instance holds but the
// template has dropped are kept — a push must not delete recorded values.
function mergeAttributeKeys(templateAttrs, instanceAttrs) {
  const merged = (Array.isArray(instanceAttrs) ? instanceAttrs : [])
    .map((attr) => {
      const entry = {
        key: String((attr && attr.key) || ''),
        value: String(attr && attr.value != null ? attr.value : ''),
      };
      // `attributes` is a real subdocument array, so carry the existing _id through.
      // Without it Mongoose mints a new id for every entry on every push, churning
      // the array identity even when nothing about it actually changed.
      if (attr && attr._id) entry._id = attr._id;
      return entry;
    })
    .filter((attr) => !!attr.key);

  const seen = new Set(merged.map((attr) => attr.key.toLowerCase()));
  for (const attr of (Array.isArray(templateAttrs) ? templateAttrs : [])) {
    const key = String((attr && attr.key) || '').trim().slice(0, 80);
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    merged.push({ key, value: String(attr && attr.value != null ? attr.value : '').slice(0, 500) });
  }
  return merged;
}

// The complete set of fields a push may write. Everything absent from this
// object — title, description, status, type, system, spaceId, tag, dates,
// photos, attachments, fptSignatures — is instance-owned and deliberately
// left alone.
function buildInstanceUpdate(template, equipment) {
  const tpl = template || {};
  const eq = equipment || {};
  return {
    checklists: mergeChecklists(tpl.checklists, eq.checklists),
    functionalTests: mergeFunctionalTests(tpl.functionalTests, eq.functionalTests),
    components: mergeComponents(tpl.components, eq.components),
    attributes: mergeAttributeKeys(tpl.attributes, eq.attributes),
  };
}

module.exports = {
  buildInstanceUpdate,
  mergeChecklists,
  mergeFunctionalTests,
  mergeComponents,
  mergeAttributeKeys,
};
