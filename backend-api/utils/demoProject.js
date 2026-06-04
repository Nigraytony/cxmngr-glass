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
const Activity = require('../models/activity')
const plans = require('../config/plans')
const standardTeamRoles = require('../config/standardTeamRoles')
const { ensureDefaultProjectRoleTemplates } = require('./defaultProjectRoleTemplates')
const { cascadeProject } = require('./cascadeDelete')

const DEMO_USER_EMAIL = String(process.env.DEMO_USER_EMAIL || 'demo@cxma.io').trim().toLowerCase()
const DEMO_PROJECT_NAME = 'Cxma Live Demo — Riverside Medical Center'

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

  // --- Spaces ---
  const spaceDocs = await Space.insertMany([
    { project: projectId, tag: 'BLDG-A', title: 'Riverside Medical Center', type: 'Building', description: '120,000 sf acute-care facility' },
    { project: projectId, tag: 'L1', title: 'Level 1 — Diagnostics', type: 'Floor' },
    { project: projectId, tag: 'MER-1', title: 'Mechanical Room 1', type: 'Room', description: 'Penthouse mechanical' },
  ])
  const merId = spaceDocs[2] && spaceDocs[2]._id

  // --- Systems ---
  const systemDocs = await System.insertMany([
    { projectId, tag: 'HVAC', name: 'HVAC — Air Handling', type: 'Mechanical', description: 'Central air handling and distribution' },
    { projectId, tag: 'CHW', name: 'Chilled Water Plant', type: 'Mechanical' },
    { projectId, tag: 'ELEC', name: 'Normal & Emergency Power', type: 'Electrical' },
  ])

  // --- Equipment ---
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
  const equipmentDocs = await Equipment.insertMany([
    { projectId, tag: 'AHU-1', title: 'Air Handling Unit 1', type: 'Air Handler', system: 'HVAC — Air Handling', status: 'Ready for FPT', location: 'Mechanical Room 1', spaceId: merId, checklists: sampleChecklist, functionalTests: sampleFpt },
    { projectId, tag: 'AHU-2', title: 'Air Handling Unit 2', type: 'Air Handler', system: 'HVAC — Air Handling', status: 'Installed', location: 'Mechanical Room 1', spaceId: merId },
    { projectId, tag: 'CH-1', title: 'Chiller 1', type: 'Chiller', system: 'Chilled Water Plant', status: 'Operational' },
    { projectId, tag: 'RTU-1', title: 'Rooftop Unit 1', type: 'Rooftop Unit', system: 'HVAC — Air Handling', status: 'Has Issues' },
    { projectId, tag: 'ATS-1', title: 'Automatic Transfer Switch', type: 'Electrical Gear', system: 'Normal & Emergency Power', status: 'Tested' },
  ])

  // --- Issues (deficiency log) ---
  const issuesData = [
    { tag: 'AHU-1', title: 'Economizer damper not modulating', description: 'Outside-air damper stuck at minimum during free-cooling FPT.', severity: 'High', status: 'Open', system: 'HVAC — Air Handling', type: 'Functional Test', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-12)), dueDate: isoDay(daysFromNow(5)), recommendation: 'Recalibrate actuator and re-test.' },
    { tag: 'RTU-1', title: 'Condensate overflow at RTU-1', description: 'Secondary drain pan shows standing water; primary trap suspected blocked.', severity: 'Critical', status: 'In Progress', system: 'HVAC — Air Handling', type: 'Installation Review', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-8)), dueDate: isoDay(daysFromNow(2)) },
    { tag: 'CH-1', title: 'Chilled water delta-T below design', description: 'Measured 6°F vs 12°F design at full load.', severity: 'Medium', status: 'Open', system: 'Chilled Water Plant', type: 'Test and Balance Review', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-20)) },
    { tag: 'AHU-2', title: 'Missing equipment label', description: 'AHU-2 lacks permanent engraved nameplate.', severity: 'Low', status: 'Closed', system: 'HVAC — Air Handling', type: 'Installation Review', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-30)), closedDate: isoDay(daysFromNow(-5)), closedBy: 'Demo User', resolution: 'Nameplate installed and verified.' },
    { tag: 'ATS-1', title: 'Generator transfer time exceeds 10s', description: 'ATS-1 transfer measured 14s; spec requires ≤10s for life-safety branch.', severity: 'High', status: 'Pending', system: 'Normal & Emergency Power', type: 'Functional Test', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-3)) },
    { tag: 'AHU-1', title: 'Supply air temp sensor reads 4°F high', description: 'SAT sensor calibration offset vs reference instrument.', severity: 'Comment', status: 'Open', system: 'HVAC — Air Handling', type: 'Functional Test', foundBy: 'Demo User', dateFound: isoDay(daysFromNow(-1)) },
  ]
  const issueDocs = []
  let n = 0
  for (const d of issuesData) {
    n += 1
    const doc = await Issue.create({ projectId, number: n, ...d })
    issueDocs.push(doc)
  }

  // --- Tasks ---
  const taskDocs = await Task.insertMany([
    { projectId, taskId: 'T-100', name: 'Construction checklist review — AHUs', status: 'Completed', percentComplete: 100, start: daysFromNow(-25), end: daysFromNow(-18) },
    { projectId, taskId: 'T-101', name: 'Functional testing — air handling', status: 'In Progress', percentComplete: 45, start: daysFromNow(-7), end: daysFromNow(7) },
    { projectId, taskId: 'T-102', name: 'Chilled water plant FPT', status: 'Not Started', percentComplete: 0, start: daysFromNow(7), end: daysFromNow(21) },
    { projectId, taskId: 'T-103', name: 'Emergency power transfer test', status: 'Pending', percentComplete: 10, start: daysFromNow(-2), end: daysFromNow(10) },
    { projectId, taskId: 'T-104', name: 'Draft final commissioning report', status: 'Not Started', percentComplete: 0, start: daysFromNow(21), end: daysFromNow(35) },
  ])

  // --- Activities ---
  const activityDocs = await Activity.insertMany([
    { projectId, name: 'Design Review — 100% CDs', type: 'Design Review', status: 'completed', createdBy: user._id, startDate: daysFromNow(-60), endDate: daysFromNow(-58), descriptionHtml: '<p>Reviewed mechanical and electrical construction documents against the OPR.</p>' },
    { projectId, name: 'Site Visit — Installation Verification', type: 'Site Visit Review', status: 'published', createdBy: user._id, startDate: daysFromNow(-14), endDate: daysFromNow(-14) },
    { projectId, name: 'Functional Testing — Air Handling', type: 'Functional Test', status: 'draft', createdBy: user._id, startDate: daysFromNow(-7), endDate: daysFromNow(7) },
  ])

  return {
    spaces: spaceDocs.map((d) => d._id),
    systems: systemDocs.length,
    equipment: equipmentDocs.map((d) => d._id),
    issues: issueDocs.map((d) => d._id),
    tasks: taskDocs.map((d) => d._id),
    activities: activityDocs.map((d) => d._id),
    lastIssueNumber: n,
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
  if (features) project.subscriptionFeatures = features
  project.team = [{
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    company: (user.contact && user.contact.company) || 'Cxma Demo',
    role: 'admin',
    status: 'Active',
  }]
  try { ensureDefaultProjectRoleTemplates(project, { standardRoles: standardTeamRoles }) } catch (e) { /* best-effort */ }
  await project.save()

  // Re-seed sample data and wire the project's reference arrays.
  const seeded = await seedChildren(project, user)
  project.spaces = seeded.spaces
  project.equipment = seeded.equipment
  project.issues = seeded.issues
  project.tasks = seeded.tasks
  project.activities = seeded.activities
  project.lastIssueNumber = seeded.lastIssueNumber
  await project.save()

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
    },
  }
}

module.exports = {
  DEMO_USER_EMAIL,
  DEMO_PROJECT_NAME,
  ensureDemoUser,
  seedDemoProject,
}
