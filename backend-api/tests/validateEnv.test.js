const assert = require('assert');
const { validateEnv, REQUIRED_IN_PROD, RECOMMENDED_IN_PROD } = require('../utils/validateEnv');

// Avoid leaking validateEnv's console.warn into test output.
function withSilentWarn(fn) {
  const origWarn = console.warn;
  console.warn = () => {};
  try { return fn(); } finally { console.warn = origWarn; }
}

describe('utils/validateEnv', function () {
  it('no-ops when NODE_ENV !== production', function () {
    const result = validateEnv({ NODE_ENV: 'development' });
    assert.strictEqual(result.prod, false);
    assert.deepStrictEqual(result.missingRecommended, []);
  });

  it('no-ops when NODE_ENV is unset', function () {
    const result = validateEnv({});
    assert.strictEqual(result.prod, false);
  });

  it('throws ENV_VALIDATION_FAILED when a required var is missing in production', function () {
    const env = { NODE_ENV: 'production' };
    // Populate everything except JWT_SECRET, MAIL_FROM.
    env.MONGODB_URI = 'mongodb://localhost:27017/x';
    env.AI_ENCRYPTION_KEY = 'k';
    let caught;
    try { withSilentWarn(() => validateEnv(env)); } catch (e) { caught = e; }
    assert.ok(caught, 'expected validateEnv to throw');
    assert.strictEqual(caught.code, 'ENV_VALIDATION_FAILED');
    assert.deepStrictEqual(caught.missing.sort(), ['JWT_SECRET', 'MAIL_FROM'].sort());
    assert.ok(/JWT_SECRET/.test(caught.message), `expected message to name JWT_SECRET; got: ${caught.message}`);
  });

  it('treats whitespace-only values as missing', function () {
    const env = { NODE_ENV: 'production' };
    for (const k of REQUIRED_IN_PROD) env[k] = '   ';
    let caught;
    try { withSilentWarn(() => validateEnv(env)); } catch (e) { caught = e; }
    assert.ok(caught, 'expected validateEnv to throw on whitespace values');
    assert.deepStrictEqual(caught.missing.sort(), REQUIRED_IN_PROD.slice().sort());
  });

  it('returns ok and reports missing recommended vars when all required are set', function () {
    const env = { NODE_ENV: 'production' };
    for (const k of REQUIRED_IN_PROD) env[k] = 'set';
    const result = withSilentWarn(() => validateEnv(env));
    assert.strictEqual(result.prod, true);
    // Nothing in `env` covers the recommended list → all should be missing.
    assert.deepStrictEqual(result.missingRecommended.sort(), RECOMMENDED_IN_PROD.slice().sort());
  });

  it('returns empty missingRecommended when both required and recommended are set', function () {
    const env = { NODE_ENV: 'production' };
    for (const k of REQUIRED_IN_PROD) env[k] = 'set';
    for (const k of RECOMMENDED_IN_PROD) env[k] = 'set';
    const result = withSilentWarn(() => validateEnv(env));
    assert.strictEqual(result.prod, true);
    assert.deepStrictEqual(result.missingRecommended, []);
  });
});
