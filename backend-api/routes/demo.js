// Self-serve demo endpoints. The sign-in route lives in routes/users.js
// (POST /api/users/demo-login) so it can reuse the token helpers there.
//
// POST /api/demo/reset — wipes and re-seeds the shared demo project. Protected by
// a shared secret (x-demo-reset-key === DEMO_RESET_KEY). Called by a nightly
// GitHub Actions cron (.github/workflows/demo-reset.yml). Exempted from CSRF in
// middleware/csrf.js so the scheduler can call it without a browser cookie.
//
// POST /api/demo/bootstrap-source — one-time: populate the maintained demo-source
// project from a template library project. Same shared-secret guard.

const express = require('express')
const router = express.Router()
const { seedDemoProject } = require('../utils/demoProject')
const { bootstrapDemoSource } = require('../utils/demoSource')

// Shared-secret guard used by both endpoints (no browser cookie — called by a
// scheduled job / curl). Writes + returns the error response to short-circuit on,
// or null if the request is allowed through.
function denyIfBadKey(req, res) {
  const expected = process.env.DEMO_RESET_KEY
  if (!expected) return res.status(503).json({ error: 'Demo endpoints not configured (DEMO_RESET_KEY unset)' })
  if ((req.get('x-demo-reset-key') || '') !== expected) return res.status(403).json({ error: 'Forbidden' })
  return null
}

router.post('/reset', async (req, res) => {
  try {
    if (denyIfBadKey(req, res)) return
    const result = await seedDemoProject()
    return res.status(200).json(result)
  } catch (err) {
    console.error('[demo.reset] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to reset demo' })
  }
})

// POST /api/demo/bootstrap-source — ONE-TIME: populate the maintained demo-source
// project (the team's "Test Project 1") from a template library project; after this
// the nightly reset clones plant content from it. Body (or env fallbacks):
//   { sourceProjectId?, libraryProjectId? }
//   sourceProjectId  defaults to env DEMO_SOURCE_PROJECT_ID
//   libraryProjectId defaults to env DEMO_TEMPLATE_LIBRARY_PROJECT_ID
// Destructive to the source project's plant content (it starts clean). Keyed.
router.post('/bootstrap-source', async (req, res) => {
  try {
    if (denyIfBadKey(req, res)) return
    const body = req.body || {}
    const sourceId = String(body.sourceProjectId || process.env.DEMO_SOURCE_PROJECT_ID || '').trim()
    const libraryId = String(body.libraryProjectId || process.env.DEMO_TEMPLATE_LIBRARY_PROJECT_ID || '').trim()
    if (!sourceId) return res.status(400).json({ error: 'sourceProjectId required (or set DEMO_SOURCE_PROJECT_ID)' })
    if (!libraryId) return res.status(400).json({ error: 'libraryProjectId required (or set DEMO_TEMPLATE_LIBRARY_PROJECT_ID)' })
    if (sourceId === libraryId) return res.status(400).json({ error: 'sourceProjectId and libraryProjectId must differ' })
    const result = await bootstrapDemoSource(sourceId, libraryId)
    return res.status(200).json({ ok: true, sourceProjectId: sourceId, libraryProjectId: libraryId, ...result })
  } catch (err) {
    console.error('[demo.bootstrap-source] error', err && (err.stack || err.message || err))
    return res.status(500).json({ error: 'Failed to bootstrap demo source' })
  }
})

module.exports = router
