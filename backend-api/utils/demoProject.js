// Self-serve demo project: a single shared demo account + project that prospects
// can log into to explore Cxma. Data is wiped and re-seeded on demand (a nightly
// GitHub Actions cron calls POST /api/demo/reset). See routes/demo.js and
// .github/workflows/demo-reset.yml.
//
// Design notes:
// - One shared demo user (DEMO_USER_EMAIL) and one demo project (DEMO_PROJECT_NAME).
// - The demo project is kept active (isActive=true, tier=premium) so it bypasses
//   subscription gating and shows every feature.
// - Reset reuses cascadeProject() to delete all project-scoped data, then re-seeds
//   a representative dataset. The Project document itself is preserved (stable _id).

const crypto = require('crypto')
const User = require('../models/user')
const Project = require('../models/project')
const Issue = require('../models/issue')
const Equipment = require('../models/equipment')
const System = require('../models/system')
const Space = require('../models/space')
const Task = require('../models/task')
const TaskTemplate = require('../models/taskTemplate')
const Activity = require('../models/activity')
const plans = require('../config/plans')
const standardTeamRoles = require('../config/standardTeamRoles')
const { ensureDefaultProjectRoleTemplates } = require('./defaultProjectRoleTemplates')
const { cascadeProject } = require('./cascadeDelete')
const { importCsvTasks } = require('../routes/tasks')
const { cloneEquipmentContent } = require('./demoSource')
const { seedDemoOpr, ensureAttendees } = require('./demoOpr')

// Name of the task template the demo imports its task list from.
const DEMO_TASK_TEMPLATE_NAME = 'Cx General'

// The maintained demo-source project to clone plant content (spaces/systems/
// templates/equipment) from on every reset. Set in Azure App Settings to the
// "Test Project 1" _id. If unset/empty, the seeder falls back to a small
// hardcoded plant so the demo still works.
const DEMO_SOURCE_PROJECT_ID = String(process.env.DEMO_SOURCE_PROJECT_ID || '').trim()

// Overlay realistic, mid-stream progress on the imported template tasks so the
// demo Gantt reads like an active commissioning project (PRE-DESIGN/DESIGN done,
// CONSTRUCTION in progress, TESTING/OPERATION upcoming) rather than a blank plan.
// Phases are placed on a timeline relative to "today" using the WBS phase number.
function applyDemoTaskOverlay(tasks) {
  const DAY = 24 * 60 * 60 * 1000
  const now = Date.now()
  const at = (offsetDays) => new Date(now + offsetDays * DAY)
  // [startOffset, endOffset] in days relative to today, per top-level WBS phase.
  const PHASE = {
    1: [-220, -180], // PRE-DESIGN
    2: [-180, -110], // DESIGN
    3: [-90, 30], //    CONSTRUCTION (today sits inside this window)
    4: [30, 95], //     TESTING
    5: [95, 200], //    OPERATION
  }
  const phaseOf = (wbs) => { const m = String(wbs || '').match(/^(\d+)/); return m ? Number(m[1]) : null }
  const isTopLevel = (wbs) => /^\d+$/.test(String(wbs || ''))
  const wbsSortKey = (wbs) => String(wbs || '').split('.').map((n) => String(Number(n) || 0).padStart(4, '0')).join('.')

  const setStatus = (t, startOff, endOff) => {
    t.start = at(startOff)
    t.end = at(endOff)
    t.duration = Math.max(1, Math.round(endOff - startOff))
    if (endOff <= 0) { t.status = 'Completed'; t.percentComplete = 100 }
    else if (startOff >= 0) { t.status = 'Not Started'; t.percentComplete = 0 }
    else {
      t.status = 'In Progress'
      t.percentComplete = Math.max(10, Math.min(90, Math.round(((0 - startOff) / (endOff - startOff)) * 100)))
    }
  }

  for (const p of [1, 2, 3, 4, 5]) {
    const [s0, s1] = PHASE[p]
    const inPhase = tasks.filter((t) => phaseOf(t.wbs) === p)
    const headers = inPhase.filter((t) => isTopLevel(t.wbs))
    const subs = inPhase.filter((t) => !isTopLevel(t.wbs)).sort((a, b) => wbsSortKey(a.wbs).localeCompare(wbsSortKey(b.wbs)))
    // Phase header spans the whole phase window.
    for (const h of headers) setStatus(h, s0, s1)
    // Sub-tasks are sequenced evenly across the phase window.
    const span = subs.length ? (s1 - s0) / subs.length : 0
    subs.forEach((t, i) => setStatus(t, s0 + i * span, s0 + (i + 1) * span - 0.5))
  }
}

const DEMO_USER_EMAIL = String(process.env.DEMO_USER_EMAIL || 'demo@cxma.io').trim().toLowerCase()
const DEMO_PROJECT_NAME = 'Cxma Live Demo — Riverside Medical Center'

// Curated project tag library for the demo (the governed vocabulary used by the tag
// filter and AI auto-tag). The phasing/location tags match what's applied to the demo
// equipment (see PHASE_LOCATION_TAGS) so filtering returns results; the rest are
// standard Cx dimensions that round out the library for the auto-tag demo.
const DEMO_TAG_LIBRARY = [
  'Phase 1', 'Phase 2',
  'Central Plant', 'Boiler Room', 'Cooling Tower Yard', 'Penthouse', 'Building',
  'Critical Path', 'Long Lead', 'Life Safety', 'LEED',
]

function premiumFeatures() {
  try {
    const premium = Array.isArray(plans) ? plans.find((p) => p && p.key === 'premium') : null
    return premium && premium.features ? premium.features : null
  } catch (e) {
    return null
  }
}

// Find or create the shared demo user. Password is random — clients never use it;
// sign-in happens via POST /api/users/demo-login which issues tokens server-side.
async function ensureDemoUser() {
  let user = await User.findOne({ email: DEMO_USER_EMAIL })
  if (!user) {
    user = new User({
      firstName: 'Demo',
      lastName: 'User',
      email: DEMO_USER_EMAIL,
      password: crypto.randomBytes(24).toString('hex'),
      role: 'user',
      status: 'Active',
      contact: { company: 'Cxma Demo' },
    })
    await user.save()
  }
  return user
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000)
}
function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10)
}

// Build the representative sample dataset for the demo project.
async function seedChildren(project, user) {
  const projectId = project._id

  // --- Plant content: spaces, systems, equipment (+ their linked templates) ---
  // Preferred path: clone from the maintained demo-source project so the demo's
  // equipment/templates stay in sync with what the team curates in the UI (and the
  // "batch edit from template" link survives). Falls back to a small hardcoded set
  // when DEMO_SOURCE_PROJECT_ID isn't configured or the source has no equipment yet.
  let spaceDocs = []
  let systemCount = 0
  let equipmentDocs = []
  if (DEMO_SOURCE_PROJECT_ID) {
    try {
      const cloned = await cloneEquipmentContent(DEMO_SOURCE_PROJECT_ID, projectId)
      if (cloned && cloned.equipment.length) {
        spaceDocs = cloned.spaces
        systemCount = cloned.systems.length
        equipmentDocs = cloned.equipment
      }
    } catch (e) {
      console.error('[demoProject] clone from demo source failed; using fallback plant', e && (e.message || e))
    }
  }
  if (!equipmentDocs.length) {
    const fallbackSpaces = await Space.insertMany([
      { project: projectId, tag: 'BLDG-A', title: 'Riverside Medical Center', type: 'Building', description: '120,000 sf acute-care facility' },
      { project: projectId, tag: 'L1', title: 'Level 1 — Diagnostics', type: 'Floor' },
      { project: projectId, tag: 'MER-1', title: 'Mechanical Room 1', type: 'Room', description: 'Penthouse mechanical' },
    ])
    const merId = fallbackSpaces[2] && fallbackSpaces[2]._id
    const fallbackSystems = await System.insertMany([
      { projectId, tag: 'AIR', name: 'Air Distribution System', type: 'Mechanical', description: 'Central air handling and distribution' },
      { projectId, tag: 'CHW', name: 'Chilled Water Plant', type: 'Mechanical' },
      { projectId, tag: 'HHW', name: 'Heating Hot Water Plant', type: 'Mechanical' },
    ])
    const sampleChecklist = [
      { name: 'Installation Verification', items: [
        { text: 'Equipment matches submittal', status: 'Pass' },
        { text: 'Clearances per manufacturer', status: 'Pass' },
        { text: 'Labeling complete', status: 'Pending' },
      ] },
    ]
    const sampleFpt = [
      { step: 1, description: 'Verify unit starts in Auto', expected: 'Unit starts', result: 'Pass' },
      { step: 2, description: 'Verify economizer modulates', expected: 'Damper modulates to setpoint', result: 'Fail' },
    ]
    spaceDocs = fallbackSpaces
    systemCount = fallbackSystems.length
    equipmentDocs = await Equipment.insertMany([
      { projectId, tag: 'AHU-1', title: 'Air Handling Unit 1', type: 'Air Handling Unit', system: 'Air Distribution System', status: 'Ready for FPT', location: 'Mechanical Room 1', spaceId: merId, checklists: sampleChecklist, functionalTests: sampleFpt },
      { projectId, tag: 'AHU-2', title: 'Air Handling Unit 2', type: 'Air Handling Unit', system: 'Air Distribution System', status: 'Installed', location: 'Mechanical Room 1', spaceId: merId },
      { projectId, tag: 'CH-1', title: 'Chiller 1', type: 'Chiller', system: 'Chilled Water Plant', status: 'Operational' },
    ])
  }

  // --- Phasing / location tags on equipment (drives the tag filter demo) ---
  const PHASE_LOCATION_TAGS = {
    'BLDG-A': ['Phase 2', 'Building'],
    CUP: ['Phase 1', 'Central Plant'],
    'BLR-RM': ['Phase 1', 'Boiler Room'],
    'CT-YARD': ['Phase 1', 'Cooling Tower Yard'],
    'MECH-PH': ['Phase 2', 'Penthouse'],
    'MER-1': ['Phase 2', 'Penthouse'],
    L1: ['Phase 2', 'Building'],
  }
  const spaceTagById = new Map(spaceDocs.map((s) => [String(s._id), s.tag]))
  const tagOps = equipmentDocs.map((e) => ({
    updateOne: {
      filter: { _id: e._id },
      update: { $set: { tags: PHASE_LOCATION_TAGS[spaceTagById.get(String(e.spaceId))] || ['Phase 1'] } },
    },
  }))
  if (tagOps.length) { try { await Equipment.bulkWrite(tagOps) } catch (e) { /* best-effort tagging */ } }

  // --- Tasks: imported from the "Cx General" task template (same code path as the
  //     app's "Import tasks from template"), then given a realistic progress overlay. ---
  let taskDocs = []
  try {
    const tpl = await TaskTemplate.findOne({ name: DEMO_TASK_TEMPLATE_NAME, isActive: true }).lean()
    if (tpl && String(tpl.csv || '').trim()) {
      await importCsvTasks({ projectId, csv: tpl.csv })
      const imported = await Task.find({ projectId, deleted: { $ne: true } }).lean()
      applyDemoTaskOverlay(imported)
      if (imported.length) {
        await Task.bulkWrite(imported.map((t) => ({
          updateOne: {
            filter: { _id: t._id },
            update: { $set: { status: t.status, percentComplete: t.percentComplete, start: t.start, end: t.end, duration: t.duration } },
          },
        })))
      }
      taskDocs = imported
    }
  } catch (e) {
    console.error('[demoProject] task template import failed; using fallback', e && (e.message || e))
  }
  if (!taskDocs.length) {
    // Fallback if the Cx General template is unavailable.
    taskDocs = await Task.insertMany([
      { projectId, taskId: 'T-100', name: 'Functional testing — air handling', status: 'In Progress', percentComplete: 45, start: daysFromNow(-7), end: daysFromNow(7) },
      { projectId, taskId: 'T-101', name: 'Draft final commissioning report', status: 'Not Started', percentComplete: 0, start: daysFromNow(21), end: daysFromNow(35) },
    ])
  }

  // --- Activities: a typical general-Cx set, placed on the same Predesign →
  //     Operation timeline as the tasks; status reflects recency (past = completed,
  //     just-now = published, upcoming = draft); linked to their tasks where they map. ---
  // { name, type, start (day offset), days (duration), desc, linkWbs? }
  const activitySpecs = [
    { name: 'Project Kickoff Meeting', type: 'Cx Meeting', start: -215, days: 0, desc: 'Commissioning kickoff with the owner and design team — roles, communication protocols, schedule, and the overall Cx process.' },
    { name: 'OPR and LL Workshop', type: 'OPR Review', start: -208, days: 1, desc: 'Facilitated workshop to develop the Owner&rsquo;s Project Requirements and capture lessons learned from comparable facilities.' },
    { name: '50% Design Review', type: 'Design Review', start: -160, days: 1, desc: 'Cx review of the 50% design documents against the OPR and Basis of Design; comments logged to the issues log.', linkWbs: '2.5' },
    { name: '100% Design Review', type: 'Design Review', start: -125, days: 1, desc: 'Cx review of the 100% construction documents, including Cx specification integration and pre-functional checklist coverage.', linkWbs: '2.9' },
    { name: 'Design Phase Closeout Meeting', type: 'Cx Meeting', start: -112, days: 0, desc: 'Design-phase closeout — OPR/BoD conformance confirmed and the updated Cx Plan issued for construction.' },
    { name: 'Cx Construction Kickoff Meeting', type: 'Cx Meeting', start: -88, days: 0, desc: 'Construction-phase Cx kickoff with the GC and trades — PFC checklist process, FPT expectations, and the issue workflow.' },
    { name: 'Site Visit 1', type: 'Site Visit Review', start: -72, days: 0, desc: 'Construction observation and installation verification for early commissioned equipment.', linkWbs: '3.6.1' },
    { name: 'Submittal Review', type: 'Submittal Review', start: -60, days: 2, desc: 'Review of equipment submittals for commissioned systems against the OPR and contract documents.', linkWbs: '3.4' },
    { name: 'Site Visit 2', type: 'Site Visit Review', start: -45, days: 0, desc: 'Installation verification and pre-functional checklist progress for mechanical and electrical systems.', linkWbs: '3.6.2' },
    { name: 'Site Visit 3', type: 'Site Visit Review', start: -12, days: 0, desc: 'Field verification of controls installation and point-to-point readiness ahead of functional testing.', linkWbs: '3.6.3' },
    { name: 'Site Visit 4', type: 'Site Visit Review', start: 18, days: 0, desc: 'Final pre-functional verification and readiness review prior to functional performance testing.', linkWbs: '3.6.4' },
    { name: 'Equipment Startup', type: 'Startup Review', start: 26, days: 1, desc: 'Witness equipment startup and manufacturer commissioning for major mechanical and electrical equipment.' },
    { name: 'Test & Balance Review', type: 'Test and Balance Review', start: 40, days: 1, desc: 'Review of the TAB report and spot-verification of air and water balancing against design.' },
    { name: 'Functional Performance Testing', type: 'Functional Test', start: 55, days: 2, desc: 'Execution of functional performance tests across systems, documenting pass/fail results and deficiencies.', linkWbs: '4.2' },
    { name: 'Training Review', type: 'Training Review', start: 72, days: 0, desc: 'Verify owner training delivery and content against the OPR and the project training requirements.', linkWbs: '4.4' },
    { name: 'Operation & Maintenance Manual Review', type: 'Owners Manual Review', start: 85, days: 1, desc: 'Review of O&amp;M manuals for completeness, accuracy, and alignment with the installed equipment.', linkWbs: '4.3' },
    { name: 'Systems Manual Review', type: 'Owners Manual Review', start: 90, days: 1, desc: 'Review of the Systems Manual for operational guidance, sequences of operation, and ongoing Cx recommendations.' },
    { name: 'Transition Meeting', type: 'Cx Meeting', start: 100, days: 0, desc: 'Transition meeting handing systems to facilities staff with open-item tracking and the seasonal testing plan.' },
    { name: 'Warranty Review', type: 'Warranty Review', start: 150, days: 1, desc: '10-month warranty-period review of system performance and resolution of outstanding issues.', linkWbs: '5.3' },
    { name: 'Lessons Learned Workshop', type: 'Cx Meeting', start: 185, days: 0, desc: 'Closeout lessons-learned workshop capturing what worked and recommendations for future projects.' },
  ]
  const activityStatusFor = (endOff) => (endOff <= -20 ? 'completed' : (endOff <= 5 ? 'published' : 'draft'))
  const activityDocs = await Activity.insertMany(activitySpecs.map((a) => ({
    projectId,
    name: a.name,
    type: a.type,
    status: activityStatusFor(a.start + (a.days || 0)),
    createdBy: user._id,
    startDate: daysFromNow(a.start),
    endDate: daysFromNow(a.start + (a.days || 0)),
    descriptionHtml: `<p>${a.desc}</p>`,
  })))
  // Link activities to their corresponding tasks (task.activityId) where they map.
  const activityIdByName = new Map(activityDocs.map((d) => [d.name, String(d._id)]))
  const taskLinkOps = activitySpecs
    .filter((a) => a.linkWbs)
    .map((a) => ({ updateOne: { filter: { projectId, wbs: a.linkWbs }, update: { $set: { activityId: activityIdByName.get(a.name) } } } }))
  if (taskLinkOps.length) { try { await Task.bulkWrite(taskLinkOps) } catch (e) { /* best-effort linking */ } }

  // --- Issues (deficiency log): spread across systems / severity / status, dated to
  //     the project timeline and linked to the activity each was found in. Filtered to
  //     equipment tags that actually exist in whichever plant seeded above. ---
  const equipTags = new Set(equipmentDocs.map((e) => e.tag))
  const actId = (name) => activityIdByName.get(name) || undefined
  const issueSpecs = [
    // Logged during 50% Design Review
    { tag: 'CH-1', off: -160, activity: '50% Design Review', type: 'Design Review', severity: 'Medium', status: 'Closed', system: 'Chilled Water Plant', closeOff: -120, title: 'Chiller plant lacks N+1 redundancy', description: '50% design shows two chillers sized at 100% with no standby capacity for critical cooling.', recommendation: 'Add a standby chiller or confirm the OPR redundancy requirement.', resolution: 'Standby chiller added in the 100% design set.' },
    { tag: 'VAV-1-1', off: -160, activity: '50% Design Review', type: 'Design Review', severity: 'Low', status: 'Closed', system: 'Air Distribution System', closeOff: -120, title: 'VAV minimum airflow settings not scheduled', description: 'VAV schedule omits minimum primary airflow and reheat setpoints.', resolution: 'Schedule updated with minimum airflow and reheat setpoints.' },
    // Logged during 100% Design Review
    { tag: 'AHU-1', off: -125, activity: '100% Design Review', type: 'Design Review', severity: 'Medium', status: 'Closed', system: 'Building Automation System (BAS)', closeOff: -95, title: 'BAS points list incomplete for air handlers', description: 'Controls drawings are missing several AHU monitoring points required by the sequence of operations.', resolution: 'Points list completed and coordinated with the sequences.' },
    { tag: 'CT-1', off: -125, activity: '100% Design Review', type: 'Design Review', severity: 'Low', status: 'Closed', system: 'Condenser Water System', closeOff: -95, title: 'Condenser water treatment not specified', description: 'No water-treatment system is specified for the condenser water loop.', resolution: 'Chemical treatment system added to the specification.' },
    // Logged during Submittal Review
    { tag: 'CH-2', off: -60, activity: 'Submittal Review', type: 'Submittal Review', severity: 'Low', status: 'Closed', system: 'Chilled Water Plant', closeOff: -40, title: 'Chiller submittal missing IPLV data', description: 'Chiller submittal does not include the IPLV performance needed to confirm energy compliance.', resolution: 'Manufacturer provided IPLV data; confirmed compliant.' },
    { tag: 'PCHWP-1', off: -60, activity: 'Submittal Review', type: 'Submittal Review', severity: 'Medium', status: 'Open', system: 'Chilled Water Plant', title: 'Pump VFD harmonic filter not included', description: 'CHW pump VFD submittal omits the harmonic mitigation required by the electrical specification.', recommendation: 'Confirm a harmonic filter or line reactor is provided.' },
    // Logged during Site Visit 1
    { tag: 'B-1', off: -72, activity: 'Site Visit 1', type: 'Installation Review', severity: 'Medium', status: 'Open', system: 'Heating Hot Water Plant', title: 'Boiler service clearance less than required', description: 'Installed B-1 front clearance is less than the manufacturer-required tube-pull dimension.', recommendation: 'Relocate the boiler or obtain a manufacturer clearance variance.' },
    { tag: 'AHU-2', off: -72, activity: 'Site Visit 1', type: 'Installation Review', severity: 'Low', status: 'Closed', system: 'Air Distribution System', closeOff: -40, title: 'Missing equipment nameplate', description: 'AHU-2 lacks a permanent engraved nameplate.', resolution: 'Nameplate installed and verified.' },
    // Logged during Site Visit 2
    { tag: 'CT-1', off: -45, activity: 'Site Visit 2', type: 'Installation Review', severity: 'Critical', status: 'In Progress', system: 'Condenser Water System', title: 'Cooling tower fan VFD faults on start', description: 'CT-1 fan VFD trips on overcurrent during stage-up; standing water observed in the basin.', recommendation: 'Investigate VFD parameters and the basin makeup valve.' },
    { tag: 'SCHWP-1', off: -45, activity: 'Site Visit 2', type: 'Installation Review', severity: 'Low', status: 'Open', system: 'Chilled Water Plant', title: 'CHW piping insulation incomplete', description: 'Sections of secondary CHW piping near SCHWP-1 are uninsulated.', recommendation: 'Complete insulation prior to functional testing.' },
    // Logged during Site Visit 3
    { tag: 'AHU-1', off: -12, activity: 'Site Visit 3', type: 'Functional Test', severity: 'High', status: 'Open', system: 'Air Distribution System', due: 5, title: 'Economizer damper not modulating', description: 'Outside-air damper stuck at minimum during the pre-functional free-cooling check.', recommendation: 'Recalibrate the actuator and re-test.' },
    { tag: 'AHU-1', off: -12, activity: 'Site Visit 3', type: 'Functional Test', severity: 'Comment', status: 'Open', system: 'Air Distribution System', title: 'Supply air temperature sensor reads 4°F high', description: 'AHU-1 SAT sensor shows a calibration offset versus the reference instrument.', recommendation: 'Field-calibrate the SAT sensor.' },
  ]
  const issueDocs = []
  let n = 0
  for (const d of issueSpecs) {
    if (!equipTags.has(d.tag)) continue
    n += 1
    const issue = {
      projectId, number: n, tag: d.tag, title: d.title, description: d.description,
      severity: d.severity, status: d.status, system: d.system, type: d.type,
      foundBy: 'Demo User', dateFound: isoDay(daysFromNow(d.off)), activityId: actId(d.activity),
    }
    if (d.recommendation) issue.recommendation = d.recommendation
    if (d.due != null) issue.dueDate = isoDay(daysFromNow(d.due))
    if (d.status === 'Closed') {
      issue.closedDate = isoDay(daysFromNow(d.closeOff != null ? d.closeOff : d.off + 20))
      issue.closedBy = 'Demo User'
      issue.resolution = d.resolution || 'Resolved and verified.'
    }
    issueDocs.push(await Issue.create(issue))
  }

  // --- OPR: a finalized workshop with attendees, questions, ranked-choice votes,
  //     and the resulting OPR items (so the OPR screens show real history). ---
  let opr = null
  try {
    opr = await seedDemoOpr(project, user)
  } catch (e) {
    console.error('[demoProject] OPR seed failed', e && (e.message || e))
  }

  return {
    spaces: spaceDocs.map((d) => d._id),
    systems: systemCount,
    equipment: equipmentDocs.map((d) => d._id),
    issues: issueDocs.map((d) => d._id),
    tasks: taskDocs.map((d) => d._id),
    activities: activityDocs.map((d) => d._id),
    lastIssueNumber: n,
    opr,
  }
}

// Idempotently (re)build the demo project: ensure user + project, wipe all
// project-scoped data, then re-seed. Returns a summary of what was created.
async function seedDemoProject() {
  const user = await ensureDemoUser()

  let project = await Project.findOne({ name: DEMO_PROJECT_NAME })
  const features = premiumFeatures()
  if (!project) {
    project = new Project({
      name: DEMO_PROJECT_NAME,
      client: 'Riverside Health System',
      project_type: 'Healthcare',
      location: 'Riverside, CA',
      description: 'Explore Cxma with a fully populated sample commissioning project. This is a shared demo — data resets nightly.',
      status: 'Active',
      isActive: true,
      subscriptionTier: 'premium',
      ...(features ? { subscriptionFeatures: features } : {}),
      leedTarget: 'v5',
      teamRoleOptions: standardTeamRoles.slice(),
    })
  }

  // Wipe any existing project-scoped data (idempotent reset).
  const wipe = await cascadeProject(project._id)

  // Reset core fields + ownership so the demo is always pristine and unlocked.
  project.status = 'Active'
  project.deleted = false
  project.isActive = true
  project.subscriptionTier = 'premium'
  project.tags = DEMO_TAG_LIBRARY.slice() // curated tag library for the tag filter + AI auto-tag
  if (features) project.subscriptionFeatures = features
  // Team = demo user (admin) + the OPR workshop attendees (members), so the roster
  // matches the people who appear in the OPR history.
  let attendees = []
  try { attendees = await ensureAttendees() } catch (e) { /* best-effort */ }
  project.team = [
    {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      company: (user.contact && user.contact.company) || 'Cxma Demo',
      role: 'admin',
      status: 'Active',
    },
    ...attendees.map((a) => ({
      _id: a._id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      company: a.company,
      role: 'member',
      status: 'Active',
    })),
  ]
  try { ensureDefaultProjectRoleTemplates(project, { standardRoles: standardTeamRoles }) } catch (e) { /* best-effort */ }
  await project.save()

  // Re-seed sample data and wire the project's reference arrays.
  const seeded = await seedChildren(project, user)
  // seedChildren imports tasks via the shared importer, which updates the project's
  // task refs and bumps its version — so write the reference arrays with an atomic
  // update (not project.save()) to avoid an optimistic-concurrency VersionError.
  await Project.findByIdAndUpdate(project._id, {
    $set: {
      spaces: seeded.spaces,
      equipment: seeded.equipment,
      issues: seeded.issues,
      tasks: seeded.tasks,
      activities: seeded.activities,
      lastIssueNumber: seeded.lastIssueNumber,
    },
  })

  // Ensure the demo user has the project as their default.
  const has = Array.isArray(user.projects) && user.projects.some((p) => String(p._id) === String(project._id))
  if (!has) {
    user.projects = [{ _id: project._id, role: 'admin', default: true }]
    await user.save()
  }

  return {
    ok: true,
    projectId: String(project._id),
    wiped: wipe && wipe.counts ? wipe.counts : null,
    seeded: {
      spaces: seeded.spaces.length,
      systems: seeded.systems,
      equipment: seeded.equipment.length,
      issues: seeded.issues.length,
      tasks: seeded.tasks.length,
      activities: seeded.activities.length,
      opr: seeded.opr,
    },
  }
}

module.exports = {
  DEMO_USER_EMAIL,
  DEMO_PROJECT_NAME,
  ensureDemoUser,
  seedDemoProject,
}
