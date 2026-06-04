// Self-serve demo endpoints. The sign-in route lives in routes/users.js
// (POST /api/users/demo-login) so it can reuse the token helpers there.
//
// POST /api/demo/reset — wipes and re-seeds the shared demo project. Protected by
// a shared secret (x-demo-reset-key === DEMO_RESET_KEY). Called by a nightly
// GitHub Actions cron (.github/workflows/demo-reset.yml). Exempted from CSRF in
// middleware/csrf.js so the scheduler can call it without a browser cookie.

const express = require('express')
const router = express.Router()
const { seedDemoProject } = require('../utils/demoProject')

router.post('/reset', async (req, res) => {
  try {
    const expected = process.env.DEMO_RESET_KEY
    if (!expected) {
      return res.status(503).json({ error: 'Demo reset not configured (DEMO_RESET_KEY unset)' })
    }
    const provided = req.get('x-demo-reset-key') || ''
    if (provided !== expected) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await seedDemoProject()
    return res.status(200).json(result)
  } catch (err) {
    console.error('[demo.reset] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to reset demo' })
  }
})

module.exports = router
