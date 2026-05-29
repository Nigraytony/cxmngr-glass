const assert = require('assert');
const observability = require('../utils/observability');

function silenced(fn) {
  const origInfo = console.info;
  const origWarn = console.warn;
  console.info = () => {};
  console.warn = () => {};
  try { return fn(); } finally { console.info = origInfo; console.warn = origWarn; }
}

describe('utils/observability', function () {
  beforeEach(() => observability._resetForTests());

  it('initSentry returns null when SENTRY_DSN is unset', function () {
    const result = silenced(() => observability.initSentry({ NODE_ENV: 'production' }));
    assert.strictEqual(result, null);
    assert.strictEqual(observability.getSentry(), null);
  });

  it('initSentry returns null when SENTRY_DSN is whitespace', function () {
    const result = silenced(() => observability.initSentry({ NODE_ENV: 'production', SENTRY_DSN: '   ' }));
    assert.strictEqual(result, null);
  });

  it('requestHandler is a 3-arg passthrough middleware when Sentry is not initialized', function (done) {
    silenced(() => observability.initSentry({}));
    const mw = observability.requestHandler();
    assert.strictEqual(typeof mw, 'function');
    mw({}, {}, done);
  });

  it('errorHandler is a 4-arg passthrough middleware when Sentry is not initialized', function (done) {
    silenced(() => observability.initSentry({}));
    const mw = observability.errorHandler();
    assert.strictEqual(typeof mw, 'function');
    assert.strictEqual(mw.length, 4, 'Express needs an arity-4 error middleware');
    const sentinel = new Error('test-error');
    mw(sentinel, {}, {}, (err) => {
      assert.strictEqual(err, sentinel, 'errorHandler should forward the original error');
      done();
    });
  });

  it('captureException is a no-op when Sentry is not initialized', function () {
    silenced(() => observability.initSentry({}));
    // Should not throw.
    assert.doesNotThrow(() => observability.captureException(new Error('nope'), { context: 'test' }));
  });

  it('flush resolves true when Sentry is not initialized', async function () {
    silenced(() => observability.initSentry({}));
    const r = await observability.flush(100);
    assert.strictEqual(r, true);
  });
});
