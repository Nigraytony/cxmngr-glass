// Seeds a realistic OPR (Owner's Project Requirements) workshop for the demo:
// a finalized workshop with an attendee roster, one finalized question per standard
// category, candidate requirement "answers" from the attendees, ranked-choice votes,
// and the resulting ranked OPR items. This gives the OPR screens real workshop
// history (how the requirements were generated and prioritized), not just a static
// list.
//
// Key facts about the OPR data model (see routes/opr.js):
//  - orgId for the OPR module is simply the projectId (req.oprOrgId = projectId).
//  - Vote scoring: a voter ranks answers 1..5; rank r is worth (6 - r) points.
//    Items are ordered by total score (ties broken by #1 votes, then #2, …, then
//    earliest answer). rankAnswers() below replicates that exactly so the seeded
//    OprItems match what the UI recomputes from the votes.
//  - All OPR collections are wiped by cascadeProject() on each reset, so re-running
//    is safe. The demo "attendee" users are created idempotently (by email) and
//    intentionally persist across resets (cascade is project-scoped, not user-scoped).

const crypto = require('crypto')
const User = require('../models/user')
const OprWorkshop = require('../models/oprWorkshop')
const OprCategory = require('../models/oprCategory')
const OprQuestion = require('../models/oprQuestion')
const OprAnswer = require('../models/oprAnswer')
const OprVote = require('../models/oprVote')
const OprItem = require('../models/oprItem')
const OprWorkshopAttendee = require('../models/oprWorkshopAttendee')

const DAY = 24 * 60 * 60 * 1000
const MIN = 60 * 1000

// Demo OPR attendees (besides the demo user, who facilitates as the Cx Authority).
// Created idempotently by email; they persist across resets.
const ATTENDEES = [
  { email: 'demo.owner@cxma.io', firstName: 'Patricia', lastName: 'Nguyen', company: 'Riverside Health System', role: "Owner's Representative" },
  { email: 'demo.facilities@cxma.io', firstName: 'Marcus', lastName: 'Bell', company: 'Riverside Health System', role: 'Director of Facilities' },
  { email: 'demo.engineer@cxma.io', firstName: 'Sofia', lastName: 'Ramos', company: 'Apex MEP Engineering', role: 'Mechanical Engineer of Record' },
  { email: 'demo.architect@cxma.io', firstName: 'David', lastName: 'Cole', company: 'Lumen Architecture', role: 'Project Architect' },
]

// Category -> facilitation question + candidate requirement statements (answers),
// authored in roughly the priority order the vote pattern below preserves.
const OPR_CONTENT = [
  {
    category: 'Energy & Sustainability',
    prompt: 'What are the owner’s priorities for energy performance and sustainability?',
    answers: [
      'Achieve LEED v4 BD+C Gold certification at a minimum.',
      'Outperform the ASHRAE 90.1-2019 energy cost budget by at least 15%.',
      'Provide whole-building and system-level energy metering with monthly benchmarking.',
      'Specify high-efficiency equipment with verified part-load performance (IPLV).',
    ],
  },
  {
    category: 'Thermal Comfort',
    prompt: 'Define the owner’s expectations for occupant thermal comfort.',
    answers: [
      'Maintain 70–75°F and 30–60% RH in occupied clinical spaces per ASHRAE 55.',
      'Limit space temperature drift to ±2°F from setpoint during occupied hours.',
      'Provide individual zone control for patient rooms and offices.',
      'Eliminate drafts through proper diffuser selection and air balancing.',
    ],
  },
  {
    category: 'Indoor Air Quality',
    prompt: 'What are the owner’s requirements for indoor air quality?',
    answers: [
      'Meet or exceed ASHRAE 62.1 ventilation rates for all occupancy types.',
      'Provide MERV 14 final filtration on all air handling units.',
      'Maintain required pressure relationships for isolation and procedure rooms.',
      'Monitor CO₂ in densely occupied spaces and modulate outdoor air accordingly.',
    ],
  },
  {
    category: 'Controls & Integration',
    prompt: 'Describe the owner’s building automation and systems-integration requirements.',
    answers: [
      'Provide an open-protocol BACnet/IP building automation system.',
      'Integrate chillers, boilers, AHUs, and VAVs to a single graphical front end.',
      'Trend all critical points at 15-minute intervals with one-year retention.',
      'Provide secure remote access to the BAS for authorized facilities staff.',
    ],
  },
  {
    category: 'Systems Reliability',
    prompt: 'What reliability expectations does the owner have for building systems?',
    answers: [
      'Provide N+1 redundancy for central plant chillers and pumps.',
      'Ensure critical clinical areas ride through any single equipment failure.',
      'Design for 99.9% uptime of heating and cooling to patient-care areas.',
      'Specify equipment with documented reliability and service history.',
    ],
  },
  {
    category: 'Maintainability',
    prompt: 'Define the owner’s maintainability and equipment-access requirements.',
    answers: [
      'Provide manufacturer-recommended service clearances at all equipment.',
      'Locate filters, coils, and valves for access without specialized lifts.',
      'Standardize equipment manufacturers to reduce spare-parts inventory.',
      'Label all equipment, valves, and dampers per the project standard.',
    ],
  },
  {
    category: 'Operations & Training',
    prompt: 'What are the owner’s operations and training requirements?',
    answers: [
      'Deliver role-based training for facilities staff before substantial completion.',
      'Provide complete O&M manuals and a systems manual at turnover.',
      'Record all training sessions for future staff onboarding.',
      'Provide a 10-month warranty walkthrough and seasonal testing plan.',
    ],
  },
  {
    category: 'Resiliency / Redundancy',
    prompt: 'Describe the owner’s resiliency and emergency-power requirements.',
    answers: [
      'Support life-safety and critical branches on emergency generator power.',
      'Provide automatic transfer within 10 seconds of normal power loss.',
      'Maintain heating and cooling to critical areas during utility outages.',
      'Provide 72 hours of on-site fuel storage for emergency generation.',
    ],
  },
  {
    category: 'Future Flexibility',
    prompt: 'What are the owner’s expectations for future flexibility and expansion?',
    answers: [
      'Provide 20% spare capacity in the central plant and electrical distribution.',
      'Size ductwork and piping mains to accommodate a future floor build-out.',
      'Provide spare BAS controller capacity and spare I/O points.',
      'Use modular equipment layouts that allow phased replacement.',
    ],
  },
]

// Five voters use these fixed rank permutations of the answer indices — a realistic
// spread (not unanimous) that still preserves the authored priority order.
const VOTE_PERMUTATIONS = [
  [0, 1, 2, 3, 4],
  [0, 1, 3, 2, 4],
  [1, 0, 2, 3, 4],
  [0, 2, 1, 3, 4],
  [0, 1, 2, 4, 3],
]

function computeVoteScore(rank) {
  const r = Number(rank)
  if (!Number.isFinite(r) || r < 1 || r > 5) return 0
  return 6 - r
}

// Replicate routes/opr.js computeResults() so seeded items match the live tally.
function rankAnswers(answers, votes) {
  const byAnswer = new Map(
    answers.map((a) => [String(a._id), { answerId: a._id, text: a.text, createdAt: a.createdAt, score: 0, rankCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }]),
  )
  for (const v of votes) {
    for (const r of v.rankings || []) {
      const id = String(r.answerId)
      const rank = Number(r.rank)
      if (!byAnswer.has(id)) continue
      const it = byAnswer.get(id)
      it.score += computeVoteScore(rank)
      if (rank >= 1 && rank <= 5) it.rankCounts[String(rank)] += 1
    }
  }
  const results = Array.from(byAnswer.values())
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    for (const k of ['1', '2', '3', '4', '5']) {
      const d = (b.rankCounts[k] || 0) - (a.rankCounts[k] || 0)
      if (d) return d
    }
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
  return results.map((r, i) => ({ ...r, rank: i + 1 }))
}

// Idempotently ensure the demo attendee users exist; returns them with _ids.
async function ensureAttendees() {
  const out = []
  for (const a of ATTENDEES) {
    let u = await User.findOne({ email: a.email })
    if (!u) {
      u = await User.create({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        password: crypto.randomBytes(24).toString('hex'),
        role: 'user',
        status: 'Active',
        contact: { company: a.company },
      })
    }
    out.push({ ...a, _id: u._id })
  }
  return out
}

// Seed the full finalized OPR workshop for `project`. `demoUser` facilitates.
async function seedDemoOpr(project, demoUser, workshopDayOffset = -208) {
  const projectId = project._id
  const orgId = String(projectId)
  const wsDate = new Date(Date.now() + workshopDayOffset * DAY)
  const isoDate = wsDate.toISOString().slice(0, 10)
  const tsFalse = { timestamps: false } // preserve our explicit historical dates

  const attendees = await ensureAttendees()
  // Voter roster: demo user (facilitator) + attendees.
  const voters = [
    { _id: demoUser._id, firstName: demoUser.firstName, lastName: demoUser.lastName, email: demoUser.email, company: 'Cxma Demo', role: 'Commissioning Authority' },
    ...attendees,
  ]

  // Workshop (one per project — unique index on orgId+projectId).
  const [workshop] = await OprWorkshop.create([{
    orgId,
    projectId,
    name: 'OPR & Lessons Learned Workshop',
    date: isoDate,
    location: 'Riverside Medical Center — Conference Room A',
    startTime: '09:00',
    endTime: '15:00',
    description: 'Facilitated workshop to establish the Owner’s Project Requirements across the standard commissioning categories.',
    tags: ['Predesign'],
    startedAt: wsDate,
    endedAt: new Date(wsDate.getTime() + 6 * 60 * MIN),
    createdBy: demoUser._id,
    updatedBy: demoUser._id,
    createdAt: wsDate,
    updatedAt: wsDate,
  }], tsFalse)

  // Attendee roster (approved).
  await OprWorkshopAttendee.insertMany(voters.map((v) => ({
    orgId,
    projectId,
    userId: v._id,
    status: 'approved',
    checkedInAt: wsDate,
    lastSeenAt: wsDate,
    approvedAt: wsDate,
    approvedBy: demoUser._id,
    snapshot: { name: `${v.firstName} ${v.lastName}`, email: v.email, company: v.company, role: v.role },
    createdAt: wsDate,
    updatedAt: wsDate,
  })), tsFalse)

  const counts = { categories: 0, questions: 0, answers: 0, votes: 0, items: 0 }

  for (let c = 0; c < OPR_CONTENT.length; c++) {
    const spec = OPR_CONTENT[c]
    const [category] = await OprCategory.create([{
      orgId, projectId, name: spec.category, sortOrder: c, active: true,
      createdBy: demoUser._id, updatedBy: demoUser._id, createdAt: wsDate, updatedAt: wsDate,
    }], tsFalse)
    counts.categories += 1

    const [question] = await OprQuestion.create([{
      orgId, projectId, categoryId: category._id, prompt: spec.prompt, answerWindowMinutes: 10,
      status: 'finalized',
      openedAt: wsDate,
      closesAt: new Date(wsDate.getTime() + 10 * MIN),
      closedAt: new Date(wsDate.getTime() + 10 * MIN),
      votingOpenedAt: new Date(wsDate.getTime() + 12 * MIN),
      votingClosesAt: new Date(wsDate.getTime() + 22 * MIN),
      votingClosedAt: new Date(wsDate.getTime() + 22 * MIN),
      finalizedAt: new Date(wsDate.getTime() + 25 * MIN),
      lastAnswerSeq: spec.answers.length,
      createdBy: demoUser._id, updatedBy: demoUser._id, createdAt: wsDate, updatedAt: wsDate,
    }], tsFalse)
    counts.questions += 1

    // Answers — round-robin authorship across the voters.
    const answerDocs = await OprAnswer.insertMany(spec.answers.map((text, i) => ({
      orgId, projectId, questionId: question._id,
      authorUserId: voters[(i + 1) % voters.length]._id,
      seq: i + 1, text,
      createdAt: new Date(wsDate.getTime() + (i + 1) * 30 * 1000),
      updatedAt: wsDate,
    })), tsFalse)
    counts.answers += answerDocs.length

    // Votes — each voter ranks the answers per a fixed permutation.
    const voteDocs = await OprVote.insertMany(voters.map((voter, vi) => {
      const perm = VOTE_PERMUTATIONS[vi % VOTE_PERMUTATIONS.length]
      const rankings = []
      let rank = 1
      for (const ansIdx of perm) {
        if (ansIdx < answerDocs.length && rank <= 5) { rankings.push({ answerId: answerDocs[ansIdx]._id, rank }); rank += 1 }
      }
      return {
        orgId, projectId, questionId: question._id, voterUserId: voter._id, rankings,
        createdAt: new Date(wsDate.getTime() + 20 * MIN), updatedAt: wsDate,
      }
    }), tsFalse)
    counts.votes += voteDocs.length

    // Finalized items — ranked exactly as the app would recompute from the votes.
    const ranked = rankAnswers(answerDocs, voteDocs)
    await OprItem.insertMany(ranked.map((r) => ({
      orgId, projectId, categoryId: category._id, questionId: question._id, sourceAnswerId: r.answerId,
      text: r.text, score: r.score, rank: r.rank, status: 'active',
      createdBy: demoUser._id, updatedBy: demoUser._id, createdAt: wsDate, updatedAt: wsDate,
    })), tsFalse)
    counts.items += ranked.length
  }

  return { workshopId: String(workshop._id), attendees: voters.length, ...counts }
}

module.exports = { seedDemoOpr, ensureAttendees, ATTENDEES }
