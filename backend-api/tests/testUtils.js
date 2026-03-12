const mongoose = require('mongoose')

const CSRF_TOKEN = 'test-csrf'
function withCsrf(req) {
  return req.set('X-CSRF-Token', CSRF_TOKEN)
}

async function clearDb() {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return
    const cols = await mongoose.connection.db.collections()
    for (const c of cols) {
      // eslint-disable-next-line no-await-in-loop
      await c.deleteMany({})
    }
  } catch (e) {
    // ignore cleanup errors
  }
}

module.exports = { clearDb, CSRF_TOKEN, withCsrf }
