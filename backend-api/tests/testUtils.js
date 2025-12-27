const mongoose = require('mongoose')

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

module.exports = { clearDb }
