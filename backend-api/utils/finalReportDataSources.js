/**
 * Data source providers for Final Cx Report sections.
 *
 * Each provider takes (projectId, config) and returns a plain JSON shape that
 * the frontend can render directly as a table — no transformation logic should
 * be needed on the client.
 *
 * Provider contract:
 *   async fetch({ projectId, config }) => { rows: [...], meta?: { ... } }
 *
 * Some providers (equipment) return a grouped shape `{ groups: [...] }` instead
 * of `rows` — see per-provider JSDoc.
 *
 * PR A ships 6 providers: opr, tasks, activities, equipment, issues, team.
 * Phase 2 will add: design-reviews, checklists, fpts, progress-reports,
 * deferred-tests, attachments.
 */
const mongoose = require('mongoose')

const Project = require('../models/project')
const OprItem = require('../models/oprItem')
const OprCategory = require('../models/oprCategory')
const Task = require('../models/task')
const Activity = require('../models/activity')
const Equipment = require('../models/equipment')
const Issue = require('../models/issue')

function asString(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function safeISO(d) {
  try {
    if (!d) return null
    return new Date(d).toISOString()
  } catch (_) {
    return null
  }
}

/**
 * OPR — active items only, sorted by rank ascending, joined to category name.
 * Returns { rows: [{ rank, text, score, category }], totalCount }
 */
async function fetchOpr({ projectId }) {
  const items = await OprItem.find({ projectId, status: 'active' })
    .sort({ rank: 1 })
    .lean()
  const categoryIds = [...new Set(items.map((i) => String(i.categoryId)).filter(Boolean))]
  const cats = await OprCategory.find({ _id: { $in: categoryIds } })
    .select('name')
    .lean()
  const catName = new Map(cats.map((c) => [String(c._id), c.name]))
  return {
    rows: items.map((i) => ({
      rank: i.rank,
      text: i.text || '',
      score: typeof i.score === 'number' ? i.score : 0,
      category: catName.get(String(i.categoryId)) || '',
    })),
    totalCount: items.length,
  }
}

/**
 * Tasks — top-level WBS items only (parentId is null/falsy), rendered as
 * milestones. The full WBS tree stays in the Tasks page.
 * Returns { rows: [{ wbs, name, start, end, percentComplete, status }] }
 */
async function fetchTasks({ projectId }) {
  const tasks = await Task.find({
    projectId,
    deleted: { $ne: true },
    $or: [{ parentId: null }, { parentId: { $exists: false } }, { parentId: '' }],
  })
    .sort({ wbs: 1, start: 1 })
    .lean()
  return {
    rows: tasks.map((t) => ({
      wbs: t.wbs || '',
      name: t.name || '',
      start: safeISO(t.start),
      end: safeISO(t.end),
      percentComplete: typeof t.percentComplete === 'number' ? t.percentComplete : 0,
      status: t.status || 'Not Started',
    })),
    totalCount: tasks.length,
  }
}

/**
 * Activities — every activity on the project, chronological. Includes a
 * lightweight HTML-stripped description preview for the table cell.
 * Returns { rows: [{ name, type, status, startDate, endDate, location, descriptionPreview, issueCount }] }
 */
async function fetchActivities({ projectId }) {
  const activities = await Activity.find({ projectId })
    .sort({ startDate: 1 })
    .lean()
  return {
    rows: activities.map((a) => ({
      _id: a._id,
      name: a.name || '',
      type: a.type || '',
      status: a.status || 'draft',
      startDate: safeISO(a.startDate),
      endDate: safeISO(a.endDate),
      location: a.location || '',
      descriptionPreview: stripHtmlPreview(a.descriptionHtml, 280),
      issueCount: Array.isArray(a.issues) ? a.issues.length : 0,
    })),
    totalCount: activities.length,
  }
}

/**
 * Scoped Systems — flat table of every piece of equipment in the project scope,
 * with checklist/FPT counts and a derived 3-state progress status.
 *
 * This is the high-level "what work is left" view (vs Operating Condition,
 * which is a status-per-equipment snapshot). The status is computed from
 * checklist section completion and FPT item status:
 *   - Not Started: nothing defined OR nothing yet completed
 *   - In Progress: some work done, not all
 *   - Complete:    every checklist section and FPT item has been signed off
 *
 * Returns { rows: [{ tag, name, system, checklistsCount, fptsCount, status }], totalCount }
 */
async function fetchScopedSystems({ projectId }) {
  const list = await Equipment.find({ projectId })
    .select('tag title type system status checklists functionalTests')
    .sort({ system: 1, tag: 1 })
    .lean()
  return {
    rows: list.map((e) => {
      const checklists = Array.isArray(e.checklists) ? e.checklists : []
      const fpts = Array.isArray(e.functionalTests) ? e.functionalTests : []
      return {
        tag: e.tag || '',
        name: e.title || '',
        system: e.system || '',
        type: e.type || '',
        equipmentStatus: e.status || '',
        checklistsCount: checklists.length,
        fptsCount: fpts.length,
        status: deriveScopedSystemProgress(checklists, fpts),
      }
    }),
    totalCount: list.length,
  }
}

/**
 * Map equipment's checklist + FPT completion into one of three buckets.
 * Exported for tests via _providers if we need to assert the heuristic.
 */
function deriveScopedSystemProgress(checklists, fpts) {
  const cTotal = checklists.length
  const fTotal = fpts.length
  if (cTotal === 0 && fTotal === 0) return 'Not Started'

  let cDone = 0
  for (const s of checklists) {
    if (!s) continue
    if (s.is_complete === true) {
      cDone++
      continue
    }
    // Treat a section as done if every question has an answer or is_complete flag.
    const qs = Array.isArray(s.questions) ? s.questions : []
    if (qs.length > 0) {
      const allAnswered = qs.every(
        (q) => q && (q.is_complete === true || (q.answer != null && q.answer !== '')),
      )
      if (allAnswered) cDone++
    }
  }

  let fDone = 0
  for (const t of fpts) {
    if (!t) continue
    // FPT items expose a `status` (pass/fail/na) once they've been signed off.
    const st = t.status == null ? '' : String(t.status).trim().toLowerCase()
    if (st && st !== 'pending' && st !== 'open') fDone++
  }

  const done = cDone + fDone
  const total = cTotal + fTotal
  if (done === 0) return 'Not Started'
  if (done >= total) return 'Complete'
  return 'In Progress'
}

/**
 * Equipment — grouped by system. Each group includes tag/title/type/status/location
 * for the rows belonging to that system. Equipment without a system goes into a
 * synthetic "Unassigned" group.
 * Returns { groups: [{ system, rows: [...] }], totalCount }
 */
async function fetchEquipment({ projectId }) {
  const list = await Equipment.find({ projectId })
    .select('tag title type system status location')
    .sort({ system: 1, tag: 1 })
    .lean()
  const groupsMap = new Map()
  for (const e of list) {
    const sys = asString(e.system).trim() || 'Unassigned'
    if (!groupsMap.has(sys)) groupsMap.set(sys, [])
    groupsMap.get(sys).push({
      tag: e.tag || '',
      title: e.title || '',
      type: e.type || '',
      status: e.status || '',
      location: e.location || '',
    })
  }
  // Stable order: Unassigned last
  const groups = [...groupsMap.entries()]
    .sort(([a], [b]) => {
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1
      return a.localeCompare(b)
    })
    .map(([system, rows]) => ({ system, rows }))
  return { groups, totalCount: list.length }
}

/**
 * Issues — every issue on the project, sorted by issue number ascending
 * (per the user's explicit preference). Renders the typical
 * commissioning issue-log fields.
 * Returns { rows: [{ number, title, severity, status, ... }] }
 */
async function fetchIssues({ projectId }) {
  const issues = await Issue.find({ projectId })
    .select(
      'number title severity status system location dateFound closedDate assignedTo resolution dueDate',
    )
    // Sort by numeric `number` asc; nulls go last
    .sort({ number: 1 })
    .lean()
  return {
    rows: issues.map((i) => ({
      number: typeof i.number === 'number' ? i.number : null,
      title: i.title || '',
      severity: i.severity || '',
      status: i.status || '',
      system: i.system || '',
      location: i.location || '',
      // 'Found By' dropped per user feedback — replaced by closed-date in the
      // final report; foundBy is still visible on the issue detail page.
      dateFound: i.dateFound || '',
      closedDate: i.closedDate || '',
      assignedTo: i.assignedTo || '',
      dueDate: i.dueDate || '',
      resolution: i.resolution || '',
    })),
    totalCount: issues.length,
  }
}

/**
 * Team — pulled from the embedded Project.team array. We re-read the project
 * because the route's lean lookup may have trimmed unrelated fields.
 * Returns { rows: [{ firstName, lastName, email, company, role }], commissioningAgent }
 */
async function fetchTeam({ projectId }) {
  const project = await Project.findById(projectId)
    .select('team commissioning_agent')
    .lean()
  const team = Array.isArray(project && project.team) ? project.team : []
  return {
    rows: team
      .filter((m) => m && (m.email || m.firstName || m.lastName))
      .map((m) => ({
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        email: m.email || '',
        company: m.company || '',
        role: m.role || '',
        status: m.status || '',
      })),
    commissioningAgent: project && project.commissioning_agent
      ? {
          firstName: project.commissioning_agent.firstName || '',
          lastName: project.commissioning_agent.lastName || '',
          email: project.commissioning_agent.email || '',
          company: project.commissioning_agent.company || '',
          phone: project.commissioning_agent.phone || '',
        }
      : null,
    totalCount: team.length,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtmlPreview(html, maxLen = 280) {
  if (!html) return ''
  const text = String(html)
    .replace(/<[^>]*>/g, ' ') // drop tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

const PROVIDERS = {
  opr: fetchOpr,
  tasks: fetchTasks,
  activities: fetchActivities,
  // 'scoped-systems' = high-level project scope progress (counts + 3-state status).
  // 'equipment' = grouped roster used for the Operating Condition section.
  'scoped-systems': fetchScopedSystems,
  equipment: fetchEquipment,
  issues: fetchIssues,
  team: fetchTeam,
}

/**
 * Look up and execute a provider by key. Returns null for unknown keys
 * (route layer turns this into a 400 if a section references a missing source).
 */
async function fetchDataSource(key, { projectId, config } = {}) {
  const provider = PROVIDERS[asString(key).trim().toLowerCase()]
  if (!provider) return null
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error('Invalid projectId for data source')
  }
  return provider({ projectId, config: config || {} })
}

module.exports = {
  fetchDataSource,
  // Exported individually so tests can exercise them without the dispatcher
  _providers: PROVIDERS,
}
