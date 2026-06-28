// Accept client-supplied `_id`s on create (offline Phase 1, design decision D2
// in docs/offline_phase1_design.md).
//
// Offline, a client mints an entity's `_id` (a 24-hex ObjectId-compatible value)
// before the server has ever seen it, so cross-entity references are valid
// immediately and check-in replay is idempotent. This helper validates that id
// and makes a create idempotent: replaying a create for an id that already
// exists in the SAME project returns the existing document instead of erroring.
// An id that collides with a DIFFERENT project's document is rejected (it must
// never leak or overwrite another project's data).

const mongoose = require('mongoose')

const ID_TAKEN_CODE = 'ID_TAKEN'
const INVALID_ID_CODE = 'INVALID_ID'
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

/**
 * Resolve an optional client-supplied `_id` from the request body.
 *
 * @returns {Promise<{id: string|null, existing?: object, error?: string}>}
 *   - { id: null }                no client id supplied (let Mongo generate one)
 *   - { error: INVALID_ID_CODE }  malformed id
 *   - { id, existing }            valid id; `existing` is the current doc if taken
 */
async function resolveClientId(Model, req) {
  const raw = req && req.body ? req.body._id : undefined
  if (raw === undefined || raw === null || raw === '') return { id: null }
  const s = String(raw)
  if (!OBJECT_ID_RE.test(s) || !mongoose.isValidObjectId(s)) {
    return { error: INVALID_ID_CODE }
  }
  const existing = await Model.findById(s)
  return { id: s, existing }
}

/**
 * Apply client-id resolution to a create flow. Call BEFORE any side effects
 * (counters, etc.) so an idempotent replay doesn't consume them.
 *
 * @returns {Promise<{ok: true, id: string|null} | {handled: true, status: number, body: object}>}
 *   - { ok: true, id }                 proceed; set the new doc's _id = id (id may be null)
 *   - { handled: true, status, body }   send res.status(status).send(body) and stop
 */
async function applyClientId(Model, req, projectId) {
  const r = await resolveClientId(Model, req)
  if (r.error) {
    return { handled: true, status: 400, body: { error: 'Invalid _id', code: r.error } }
  }
  if (r.existing) {
    const sameProject = String(r.existing.projectId) === String(projectId)
    if (sameProject) {
      // Idempotent replay — the create already landed; return what we have.
      return { handled: true, status: 200, body: r.existing }
    }
    return { handled: true, status: 409, body: { error: 'This id is already in use', code: ID_TAKEN_CODE } }
  }
  return { ok: true, id: r.id }
}

module.exports = { resolveClientId, applyClientId, ID_TAKEN_CODE, INVALID_ID_CODE }
