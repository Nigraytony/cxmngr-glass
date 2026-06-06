// Cascade-delete helpers.
//
// When a Project / Space / Equipment / Template / System is removed we also
// clean up sibling documents and array references so the rest of the app
// never reads orphaned IDs. Without this every list-by-projectId query and
// every $lookup join risks pulling in records whose parents are long gone.
//
// All helpers are best-effort: failures are logged, not thrown. The caller
// has already removed (or is about to remove) the parent — partial cleanup
// is still preferable to leaving orphans behind.

const mongoose = require('mongoose')
const { deleteAllProjectMedia } = require('./entityMedia')

function toObjectIdOrNull(id) {
  try {
    if (id instanceof mongoose.Types.ObjectId) return id
    if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(String(id))
  } catch (_) { /* fall through */ }
  return null
}

async function safeDelete(modelName, filter) {
  try {
    const Model = mongoose.model(modelName)
    const r = await Model.deleteMany(filter)
    return r && typeof r.deletedCount === 'number' ? r.deletedCount : 0
  } catch (e) {
    console.warn('[cascade] deleteMany failed', modelName, e && e.message)
    return -1
  }
}

async function safeUpdate(modelName, filter, update) {
  try {
    const Model = mongoose.model(modelName)
    const r = await Model.updateMany(filter, update)
    return r && typeof r.modifiedCount === 'number' ? r.modifiedCount : 0
  } catch (e) {
    console.warn('[cascade] updateMany failed', modelName, e && e.message)
    return -1
  }
}

// Delete every project-scoped document. Mongoose strict mode means filters
// that don't match a declared field will silently match zero — these lists
// were inventoried against the model files at the time of writing.
async function cascadeProject(projectId) {
  const pid = toObjectIdOrNull(projectId)
  const pidStr = String(projectId)
  if (!pid) return { ok: false, error: 'invalid projectId' }

  // Models that declare projectId as ObjectId.
  const objectIdScoped = [
    'Action', 'Activity', 'AssistantChatMessage', 'AssistantChecklist', 'DocFile', 'DocFolder',
    'Equipment', 'FinalReport', 'Invitation', 'Issue',
    'OprAnswer', 'OprCategory', 'OprItem', 'OprLinkEvaluation', 'OprParticipant',
    'OprQuestion', 'OprVote', 'OprWorkshop', 'OprWorkshopAttendee',
    'ProjectAddOnPurchase', 'System', 'Task', 'Template',
  ]
  // Models that store projectId as a string (legacy / non-Mongoose-managed shape).
  const stringScoped = ['Charge', 'Invoice']
  // Role has an optional projectId — only project-scoped role templates match;
  // global roles (projectId null/missing) are preserved automatically.
  const optionalObjectIdScoped = ['Role']
  // Space is the odd one out — uses `project` instead of `projectId`.
  const projectField = ['Space']

  const counts = {}
  // Delete the underlying Azure blobs BEFORE the DocFile/DocFolder records are
  // removed below (otherwise the blob names are lost and the blobs orphan).
  counts._mediaBlobs = await deleteAllProjectMedia(pid)
  for (const name of objectIdScoped) counts[name] = await safeDelete(name, { projectId: pid })
  for (const name of optionalObjectIdScoped) counts[name] = await safeDelete(name, { projectId: pid })
  for (const name of stringScoped) counts[name] = await safeDelete(name, { projectId: pidStr })
  for (const name of projectField) counts[name] = await safeDelete(name, { project: pid })

  return { ok: true, counts }
}

// Clear refs in siblings when a Space is removed.
async function cascadeSpace(spaceId) {
  const sid = toObjectIdOrNull(spaceId)
  if (!sid) return { ok: false, error: 'invalid spaceId' }
  const counts = {}
  counts.Equipment_spaceId = await safeUpdate('Equipment', { spaceId: sid }, { $unset: { spaceId: 1 } })
  counts.Activity_spaceId = await safeUpdate('Activity', { spaceId: sid }, { $unset: { spaceId: 1 } })
  counts.Issue_spaceId = await safeUpdate('Issue', { spaceId: sid }, { $unset: { spaceId: 1 } })
  counts.Template_spaceId = await safeUpdate('Template', { spaceId: sid }, { $unset: { spaceId: 1 } })
  counts.Project_spacesArray = await safeUpdate('Project', { spaces: sid }, { $pull: { spaces: sid } })
  // sub-spaces become top-level orphans rather than pointing at a dead parent.
  // parentSpace is typed String in the model, so compare against the stringified id.
  counts.Space_parentSpace = await safeUpdate('Space', { parentSpace: String(sid) }, { $unset: { parentSpace: 1 } })
  counts.Space_subSpacesArray = await safeUpdate('Space', { subSpaces: sid }, { $pull: { subSpaces: sid } })
  return { ok: true, counts }
}

// Pull a deleted Equipment from any Space.equipment[] arrays.
// (Project.equipment[] is already pulled in routes/equipment.js delete handler.)
async function cascadeEquipment(equipmentId) {
  const eid = toObjectIdOrNull(equipmentId)
  if (!eid) return { ok: false, error: 'invalid equipmentId' }
  const counts = {}
  counts.Space_equipmentArray = await safeUpdate('Space', { equipment: eid }, { $pull: { equipment: eid } })
  return { ok: true, counts }
}

// Unset Equipment.template refs when a Template is removed.
// (Project.templates[] is already pulled in routes/templates.js delete handler.)
async function cascadeTemplate(templateId) {
  const tid = toObjectIdOrNull(templateId)
  if (!tid) return { ok: false, error: 'invalid templateId' }
  const counts = {}
  counts.Equipment_template = await safeUpdate('Equipment', { template: tid }, { $unset: { template: 1 } })
  return { ok: true, counts }
}

// Unset Issue.systemId and pull Activity.systems[] entries when a System is removed.
// Activity.systems is typed [String] but is sometimes populated with ObjectId
// strings — we match the stringified id to cover both shapes.
async function cascadeSystem(systemId) {
  const sid = toObjectIdOrNull(systemId)
  if (!sid) return { ok: false, error: 'invalid systemId' }
  const counts = {}
  counts.Issue_systemId = await safeUpdate('Issue', { systemId: sid }, { $unset: { systemId: 1 } })
  counts.Activity_systemsArray = await safeUpdate('Activity', { systems: String(sid) }, { $pull: { systems: String(sid) } })
  return { ok: true, counts }
}

module.exports = {
  cascadeProject,
  cascadeSpace,
  cascadeEquipment,
  cascadeTemplate,
  cascadeSystem,
}
