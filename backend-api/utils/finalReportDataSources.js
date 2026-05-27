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
const OprLinkEvaluation = require('../models/oprLinkEvaluation')
const Task = require('../models/task')
const Activity = require('../models/activity')
const Equipment = require('../models/equipment')
const Issue = require('../models/issue')
const System = require('../models/system')
const FinalReport = require('../models/finalReport')

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
// Phase 1 additions — LEED v4/v4.1/v5 + ASHRAE G0 deliverable views.
//
// These providers turn data already captured elsewhere in the app
// (Activity, Equipment, System, OprLinkEvaluation, Project) into the
// structured tables a LEED-compliant Final Cx Report needs. No new
// per-section data store — every row comes from existing models.
// ---------------------------------------------------------------------------

/**
 * Project Description — renders the existing `project.description` field
 * as a single prose block. Lives behind a data source rather than a
 * prose section so the user can't accidentally edit a project-level
 * field through the Final Report editor.
 * Returns { description, name, client, location, buildingType }
 */
async function fetchProjectDescription({ projectId }) {
  const p = await Project.findById(projectId)
    .select('name client location building_type description startDate endDate')
    .lean()
  return {
    name: (p && p.name) || '',
    client: (p && p.client) || '',
    location: (p && p.location) || '',
    buildingType: (p && p.building_type) || '',
    description: (p && p.description) || '',
    startDate: safeISO(p && p.startDate),
    endDate: safeISO(p && p.endDate),
  }
}

/**
 * Revisions — merges the manual revision log (FinalReport.revisions) with
 * auto-entries derived from each release event. Sorted by date desc.
 * Returns { rows: [{ versionLabel, summary, reviser, date, kind }] }
 */
async function fetchRevisions({ projectId }) {
  const report = await FinalReport.findOne({ projectId })
    .select('revisions releases')
    .lean()
  const manual = Array.isArray(report && report.revisions) ? report.revisions : []
  const releases = Array.isArray(report && report.releases) ? report.releases : []
  const rows = [
    ...manual.map((r) => ({
      versionLabel: r.versionLabel || '',
      summary: r.summary || '',
      reviser: r.reviserName || '',
      date: safeISO(r.date),
      kind: r.kind || 'manual',
    })),
    ...releases.map((r) => ({
      versionLabel: `v${r.version}`,
      summary: r.note || `Locked as ${r.version === 1 ? 'final' : 'release'}`,
      reviser: '',
      date: safeISO(r.releasedAt),
      kind: 'release',
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return { rows, totalCount: rows.length }
}

/**
 * Commissioned Systems / Sampling Methodology — aggregates by System
 * with quantity counts + verification %s. Mirrors the shape of the
 * "Commissioned Systems" table in the ASHRAE G0 sample report
 * (Commissioned System / Quantity / PFPT% / BAS% / TAB% / FPT%).
 *
 * The verification %s are derived from each System's linked equipment:
 *   PFPT  = % of equipment with at least one is_complete checklist section
 *   FPT   = % of equipment with at least one functionalTest item that has
 *           a status (pass/fail/na)
 *   BAS   = % of equipment with system non-empty AND status indicating
 *           commissioned (Operational / Tested / Trained); proxy for "BAS
 *           integration verified" since BAS-specific flags don't exist yet
 *   TAB   = % of equipment with a non-null balanceDate (proxies T&AB
 *           completion)
 *
 * Returns { rows: [{ system, quantity, pfptPct, basPct, tabPct, fptPct }] }
 */
async function fetchCommissionedSystems({ projectId }) {
  const equipment = await Equipment.find({ projectId })
    .select('type system status checklists functionalTests balanceDate')
    .lean()

  // Group by Equipment.type — this matches both the Cx Plan generator
  // (cxPlanTemplate.ts systemsTableInner) and the LEED sample report's
  // "Commissioned Systems / Sampling Methodology" table (rows like "Air
  // Handling Units", "VAV Terminal Units" — equipment categories, not
  // high-level system buckets). Aligning here so the Cx Plan table and
  // the Final Report table are visually identical.
  const groups = new Map()
  const ensure = (key) => {
    if (!groups.has(key)) {
      groups.set(key, { system: key, equipmentList: [] })
    }
    return groups.get(key)
  }
  for (const e of equipment) {
    const key = asString(e.type).trim() || 'Unspecified'
    ensure(key).equipmentList.push(e)
  }

  const rows = [...groups.values()]
    .sort((a, b) => {
      // Unspecified row last; otherwise descending by quantity (most
      // populous types first, matching the Cx Plan template's ordering).
      if (a.system === 'Unspecified') return 1
      if (b.system === 'Unspecified') return -1
      const diff = b.equipmentList.length - a.equipmentList.length
      if (diff !== 0) return diff
      return a.system.localeCompare(b.system)
    })
    .map((g) => {
      const list = g.equipmentList
      const n = list.length || 1 // avoid divide-by-zero in the % calc
      let pfptDone = 0
      let fptDone = 0
      let basDone = 0
      let tabDone = 0
      for (const e of list) {
        const cl = Array.isArray(e.checklists) ? e.checklists : []
        if (cl.some((s) => s && s.is_complete === true)) pfptDone++
        const fpts = Array.isArray(e.functionalTests) ? e.functionalTests : []
        if (
          fpts.some((t) => {
            const st = asString(t && t.status).trim().toLowerCase()
            return st && st !== 'pending' && st !== 'open'
          })
        ) {
          fptDone++
        }
        const status = asString(e.status).trim().toLowerCase()
        if (['operational', 'tested', 'trained'].includes(status)) basDone++
        if (e.balanceDate) tabDone++
      }
      return {
        system: g.system,
        quantity: list.length,
        pfptPct: list.length ? Math.round((pfptDone / n) * 100) : 0,
        basPct: list.length ? Math.round((basDone / n) * 100) : 0,
        tabPct: list.length ? Math.round((tabDone / n) * 100) : 0,
        fptPct: list.length ? Math.round((fptDone / n) * 100) : 0,
      }
    })

  return { rows, totalCount: rows.length }
}

/**
 * Map an Activity.type to a default ASHRAE phase when the activity hasn't
 * been explicitly tagged with `phase`. Hand-curated from the type enum.
 */
function defaultPhaseForType(type) {
  const t = asString(type).trim().toLowerCase()
  switch (t) {
    case 'opr review':
    case 'cx plan':
    case 'assessment':
    case 'schedule integration':
      return 'predesign'
    case 'bod review':
    case 'design review':
    case 'design coordination meeting':
    case 'submittal review':
      return 'design'
    case 'site visit review':
    case 'cx meeting':
    case 'construction checklist':
    case 'construction milestone meeting':
    case 'installation review':
    case 'startup review':
    case 'functional test':
    case 'test and balance review':
    case 'training review':
    case 'owners manual review':
      return 'construction'
    case 'seasonal test':
    case 'warranty review':
      return 'occupancy'
    default:
      return 'construction'
  }
}

/**
 * Cx Activities by Phase — every project Activity grouped into the four
 * ASHRAE G0 phases (Predesign / Design / Construction / Occupancy).
 *
 * Returns { groups: [{ phase, label, rows: [{ name, type, status, startDate, location, descriptionPreview, attendeeCount, milestone, issueCount }] }] }
 */
async function fetchActivitiesByPhase({ projectId }) {
  const activities = await Activity.find({ projectId })
    .sort({ startDate: 1 })
    .lean()
  const buckets = {
    predesign: [],
    design: [],
    construction: [],
    occupancy: [],
  }
  for (const a of activities) {
    const phase = (a.phase && buckets[a.phase])
      ? a.phase
      : defaultPhaseForType(a.type)
    buckets[phase].push({
      _id: a._id,
      name: a.name || '',
      type: a.type || '',
      status: a.status || 'draft',
      startDate: safeISO(a.startDate),
      endDate: safeISO(a.endDate),
      location: a.location || '',
      descriptionPreview: stripHtmlPreview(a.descriptionHtml, 220),
      attendeeCount: Array.isArray(a.attendees) ? a.attendees.length : 0,
      milestone: a.milestone || '',
      issueCount: Array.isArray(a.issues) ? a.issues.length : 0,
    })
  }
  const groups = [
    { phase: 'predesign', label: 'Predesign Phase', rows: buckets.predesign },
    { phase: 'design', label: 'Design Phase', rows: buckets.design },
    { phase: 'construction', label: 'Construction Phase', rows: buckets.construction },
    { phase: 'occupancy', label: 'Occupancy & Operations Phase', rows: buckets.occupancy },
  ]
  return { groups, totalCount: activities.length }
}

/**
 * OPR Coverage — pulls every OPR item on the project and joins it with
 * any OprLinkEvaluation records the team built. Each link evaluation is
 * a tuple of (OPR item, what verified it, pass/fail/na status), so this
 * provider answers: "For each OPR item, how was it verified during Cx?"
 *
 * Used as the headline LEED-audit artifact in the report.
 *
 * Returns { rows: [{ rank, text, category, totalLinks, passLinks, failLinks,
 *           naLinks, unverifiedLinks, overallStatus, links: [...] }], totalCount }
 */
async function fetchOprCoverage({ projectId }) {
  const items = await OprItem.find({ projectId, status: 'active' })
    .sort({ rank: 1 })
    .lean()
  const categoryIds = [...new Set(items.map((i) => String(i.categoryId)).filter(Boolean))]
  const cats = await OprCategory.find({ _id: { $in: categoryIds } })
    .select('name')
    .lean()
  const catName = new Map(cats.map((c) => [String(c._id), c.name]))

  const links = await OprLinkEvaluation.find({ projectId })
    .select('oprItemId contextType contextLabel targetType targetLabel status notes evaluatedAt')
    .lean()
  const linksByItem = new Map()
  for (const l of links) {
    const key = String(l.oprItemId)
    if (!linksByItem.has(key)) linksByItem.set(key, [])
    linksByItem.get(key).push(l)
  }

  const rows = items.map((i) => {
    const itemLinks = linksByItem.get(String(i._id)) || []
    const counts = { pass: 0, fail: 0, na: 0, unverified: 0 }
    for (const l of itemLinks) {
      const st = asString(l.status).trim().toLowerCase()
      if (counts[st] != null) counts[st]++
    }
    // Overall: any fail → fail; only pass → pass; only na → na; no links → unverified
    let overall = 'unverified'
    if (counts.fail > 0) overall = 'fail'
    else if (counts.pass > 0) overall = 'pass'
    else if (counts.na > 0 && itemLinks.length > 0) overall = 'na'
    return {
      rank: i.rank,
      text: i.text || '',
      category: catName.get(String(i.categoryId)) || '',
      totalLinks: itemLinks.length,
      passLinks: counts.pass,
      failLinks: counts.fail,
      naLinks: counts.na,
      unverifiedLinks: counts.unverified,
      overallStatus: overall,
      links: itemLinks.map((l) => ({
        contextType: l.contextType,
        contextLabel: l.contextLabel || '',
        targetType: l.targetType,
        targetLabel: l.targetLabel || '',
        status: l.status,
        notes: l.notes || '',
        evaluatedAt: safeISO(l.evaluatedAt),
      })),
    }
  })

  return {
    rows,
    totalCount: rows.length,
    verifiedCount: rows.filter((r) => r.overallStatus === 'pass').length,
    failedCount: rows.filter((r) => r.overallStatus === 'fail').length,
    naCount: rows.filter((r) => r.overallStatus === 'na').length,
    unverifiedCount: rows.filter((r) => r.overallStatus === 'unverified').length,
  }
}

/**
 * OPR Deviations — narrower view, only OPR items where at least one link
 * evaluation is `fail`. Feeds the "Systems/Assemblies Not Meeting OPR"
 * section directly.
 *
 * Returns { rows: [{ rank, text, category, failLinks, failures: [...] }] }
 */
async function fetchOprDeviations({ projectId }) {
  const coverage = await fetchOprCoverage({ projectId })
  const rows = coverage.rows
    .filter((r) => r.failLinks > 0)
    .map((r) => ({
      rank: r.rank,
      text: r.text,
      category: r.category,
      failLinks: r.failLinks,
      failures: r.links.filter((l) => String(l.status).toLowerCase() === 'fail'),
    }))
  return { rows, totalCount: rows.length }
}

/**
 * FPT Results — rolls up Equipment.functionalTests + System.functionalTests
 * into a per-equipment summary. Each row shows the FPT pass/fail/na/pending
 * counts, last test date, and signature presence so the report reader can
 * see which systems have a completed FPT package.
 *
 * Returns { rows: [{ tag, name, system, total, pass, fail, na, pending,
 *           hasSignatures, lastTestedAt }], totalCount }
 */
async function fetchFptResults({ projectId }) {
  const equipment = await Equipment.find({ projectId })
    .select('tag title system functionalTests fptSignatures testDate')
    .sort({ system: 1, tag: 1 })
    .lean()
  const systems = await System.find({ projectId })
    .select('name functionalTests fptSignatures')
    .lean()

  const rows = []
  const countItems = (items) => {
    const c = { total: 0, pass: 0, fail: 0, na: 0, pending: 0 }
    if (!Array.isArray(items)) return c
    for (const t of items) {
      c.total++
      const st = asString(t && t.status).trim().toLowerCase()
      if (st === 'pass') c.pass++
      else if (st === 'fail') c.fail++
      else if (st === 'na' || st === 'n/a') c.na++
      else c.pending++
    }
    return c
  }
  for (const e of equipment) {
    const c = countItems(e.functionalTests)
    if (c.total === 0) continue
    rows.push({
      tag: e.tag || '',
      name: e.title || '',
      system: e.system || '',
      kind: 'equipment',
      total: c.total,
      pass: c.pass,
      fail: c.fail,
      na: c.na,
      pending: c.pending,
      hasSignatures: Array.isArray(e.fptSignatures) && e.fptSignatures.length > 0,
      lastTestedAt: safeISO(e.testDate),
    })
  }
  for (const s of systems) {
    const c = countItems(s.functionalTests)
    if (c.total === 0) continue
    rows.push({
      tag: '',
      name: s.name || '',
      system: s.name || '',
      kind: 'system',
      total: c.total,
      pass: c.pass,
      fail: c.fail,
      na: c.na,
      pending: c.pending,
      hasSignatures: Array.isArray(s.fptSignatures) && s.fptSignatures.length > 0,
      lastTestedAt: null,
    })
  }
  return { rows, totalCount: rows.length }
}

/**
 * Construction Checklist Summary — rolls up Equipment.checklists +
 * System.checklists. Each row shows total / complete / partial / not
 * started checklist sections per equipment item.
 *
 * Returns { rows: [{ tag, name, system, totalSections, completeSections,
 *           partialSections, notStarted, completionPct }], totalCount }
 */
async function fetchChecklistSummary({ projectId }) {
  const equipment = await Equipment.find({ projectId })
    .select('tag title system checklists')
    .sort({ system: 1, tag: 1 })
    .lean()
  const systems = await System.find({ projectId })
    .select('name checklists')
    .lean()
  const summarise = (sections) => {
    const s = { totalSections: 0, completeSections: 0, partialSections: 0, notStarted: 0 }
    if (!Array.isArray(sections)) return s
    for (const sec of sections) {
      s.totalSections++
      if (sec && sec.is_complete === true) {
        s.completeSections++
        continue
      }
      const qs = Array.isArray(sec && sec.questions) ? sec.questions : []
      const anyAnswered = qs.some(
        (q) => q && (q.is_complete === true || (q.answer != null && q.answer !== '')),
      )
      if (anyAnswered) s.partialSections++
      else s.notStarted++
    }
    return s
  }
  const rows = []
  for (const e of equipment) {
    const s = summarise(e.checklists)
    if (s.totalSections === 0) continue
    rows.push({
      tag: e.tag || '',
      name: e.title || '',
      system: e.system || '',
      kind: 'equipment',
      ...s,
      completionPct: Math.round((s.completeSections / s.totalSections) * 100),
    })
  }
  for (const sys of systems) {
    const s = summarise(sys.checklists)
    if (s.totalSections === 0) continue
    rows.push({
      tag: '',
      name: sys.name || '',
      system: sys.name || '',
      kind: 'system',
      ...s,
      completionPct: Math.round((s.completeSections / s.totalSections) * 100),
    })
  }
  return { rows, totalCount: rows.length }
}

/**
 * Training Verification — Activities of type "Training Review" with their
 * attendee rosters. Sign-in sheets live as Activity attachments and don't
 * need to be surfaced here — the renderer just notes their presence.
 *
 * Returns { rows: [{ name, topic, date, instructor, attendees: [...],
 *           attendeeCount, attachmentCount }], totalCount }
 */
async function fetchTrainingSessions({ projectId }) {
  const sessions = await Activity.find({
    projectId,
    type: 'Training Review',
  })
    .sort({ startDate: 1 })
    .lean()
  return {
    rows: sessions.map((s) => ({
      _id: s._id,
      name: s.name || '',
      topic: s.name || '',
      date: safeISO(s.startDate),
      location: s.location || '',
      status: s.status || 'draft',
      attendees: Array.isArray(s.attendees) ? s.attendees : [],
      attendeeCount: Array.isArray(s.attendees) ? s.attendees.length : 0,
      attachmentCount: Array.isArray(s.attachments) ? s.attachments.length : 0,
      descriptionPreview: stripHtmlPreview(s.descriptionHtml, 200),
    })),
    totalCount: sessions.length,
  }
}

/**
 * Recommendations for Optimization — Issues where `recommendation` is
 * non-empty, grouped by system. The CxA writes recommendations on
 * individual issues as they go (existing Issue.recommendation field);
 * the Final Report aggregates them into the LEED-required Recommendations
 * section without re-authoring.
 *
 * Returns { groups: [{ system, rows: [{ number, title, recommendation,
 *           severity, status, location }] }] }
 */
async function fetchRecommendations({ projectId }) {
  const issues = await Issue.find({
    projectId,
    recommendation: { $exists: true, $ne: '' },
  })
    .select('number title recommendation severity status system location closedDate')
    .sort({ system: 1, number: 1 })
    .lean()
  const groupsMap = new Map()
  for (const i of issues) {
    const sys = asString(i.system).trim() || 'General'
    if (!groupsMap.has(sys)) groupsMap.set(sys, [])
    groupsMap.get(sys).push({
      number: typeof i.number === 'number' ? i.number : null,
      title: i.title || '',
      recommendation: i.recommendation || '',
      severity: i.severity || '',
      status: i.status || '',
      location: i.location || '',
      closedDate: i.closedDate || '',
    })
  }
  const groups = [...groupsMap.entries()]
    .sort(([a], [b]) => (a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b)))
    .map(([system, rows]) => ({ system, rows }))
  return { groups, totalCount: issues.length }
}

/**
 * 10-Month Warranty Review — Activities tagged with phase='occupancy' or
 * of type "Warranty Review". Each row shows the review date, narrative,
 * and linked issues (which captures findings during the review).
 *
 * Returns { rows: [{ name, date, location, status, descriptionPreview,
 *           issueCount, attachmentCount }], totalCount }
 */
async function fetchWarrantyReview({ projectId }) {
  const reviews = await Activity.find({
    projectId,
    $or: [
      { phase: 'occupancy' },
      { type: 'Warranty Review' },
    ],
  })
    .sort({ startDate: 1 })
    .lean()
  return {
    rows: reviews.map((a) => ({
      _id: a._id,
      name: a.name || '',
      type: a.type || '',
      date: safeISO(a.startDate),
      location: a.location || '',
      status: a.status || 'draft',
      descriptionPreview: stripHtmlPreview(a.descriptionHtml, 280),
      issueCount: Array.isArray(a.issues) ? a.issues.length : 0,
      attachmentCount: Array.isArray(a.attachments) ? a.attachments.length : 0,
    })),
    totalCount: reviews.length,
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
  // Existing (PR A) ---------------------------------------------------------
  opr: fetchOpr,
  tasks: fetchTasks,
  activities: fetchActivities,
  // 'scoped-systems' = high-level project scope progress (counts + 3-state status).
  // 'equipment' = grouped roster used for the Operating Condition section.
  'scoped-systems': fetchScopedSystems,
  equipment: fetchEquipment,
  issues: fetchIssues,
  team: fetchTeam,
  // Phase 1 additions -------------------------------------------------------
  'project-description': fetchProjectDescription,
  revisions: fetchRevisions,
  'commissioned-systems': fetchCommissionedSystems,
  'activities-by-phase': fetchActivitiesByPhase,
  'opr-coverage': fetchOprCoverage,
  'opr-deviations': fetchOprDeviations,
  'fpt-results': fetchFptResults,
  'checklist-summary': fetchChecklistSummary,
  'training-sessions': fetchTrainingSessions,
  recommendations: fetchRecommendations,
  'warranty-review': fetchWarrantyReview,
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
