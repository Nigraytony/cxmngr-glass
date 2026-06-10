// Project onboarding ("setup walkthrough") status.
//
// Derives where a new project owner is in the canonical setup sequence from real
// app state — counts of imported tasks / activities / equipment, plus the
// compliance checklist's Planning items for the OPR/BOD/Cx Plan confirmation step.
//
// Consumed by:
// - GET /api/assistant/setup-status (routes/assistant.js) — drives the UI walkthrough.
// - POST /api/ai/chat (routes/ai.js) — grounds the assistant's proactive guidance.
//
// Pure function (no DB access): the caller supplies counts + the checklist so this
// stays trivially testable.

// The canonical setup steps, in the order an owner should complete them.
// `done(ctx)` derives completion from real state. `agentInstruction` is the prompt
// handed to the agent when the user opts into "do this for me" (null = guidance-only).
const SETUP_STEPS = [
  {
    key: 'importTasks',
    title: 'Import a task template',
    description: 'Bring in a commissioning task list so you can track progress and assignments.',
    link: '/app/tasks?import=1&tab=template',
    agentInstruction: 'Import the standard commissioning task template that matches this project type.',
    done: (ctx) => ctx.counts.tasks > 0,
  },
  {
    key: 'kickoffActivity',
    title: 'Create the OPR / kickoff workshop activity',
    description: 'Track the kickoff meeting and capture agendas, notes, and decisions.',
    link: '/app/activities/new',
    agentInstruction: 'Create an Activity for the commissioning kickoff / OPR workshop.',
    done: (ctx) => ctx.counts.activities > 0,
  },
  {
    key: 'equipment',
    title: 'Populate equipment',
    description: 'Add the major equipment so you can start checklist and functional-test tracking.',
    link: '/app/equipment',
    agentInstruction: "Help me add this project's major equipment (AHUs, chillers, RTUs, etc.).",
    done: (ctx) => ctx.counts.equipment > 0,
  },
  {
    key: 'confirmPlan',
    title: 'Confirm OPR / BOD / Cx Plan',
    description: 'Review and confirm the Owner’s Project Requirements, Basis of Design, and Commissioning Plan.',
    link: '/app/assistant',
    // Judgment step — guidance only, no agent execution.
    agentInstruction: null,
    done: (ctx) => ctx.planningComplete,
  },
]

function toCount(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

// Are all Planning-category checklist items completed? (Empty/absent => not yet.)
function isPlanningComplete(checklist) {
  const items = checklist && Array.isArray(checklist.items) ? checklist.items : []
  const planning = items.filter((it) => String((it && it.category) || '').trim().toLowerCase() === 'planning')
  if (!planning.length) return false
  return planning.every((it) => it && it.completed === true)
}

// counts: { tasks, activities, equipment }
// checklist: the AssistantChecklist doc/object (may be null if no template for type)
function computeSetupStatus(counts, checklist) {
  const ctx = {
    counts: {
      tasks: toCount(counts && counts.tasks),
      activities: toCount(counts && counts.activities),
      equipment: toCount(counts && counts.equipment),
    },
    planningComplete: isPlanningComplete(checklist),
  }

  const steps = SETUP_STEPS.map((s) => ({
    key: s.key,
    title: s.title,
    description: s.description,
    link: s.link,
    done: Boolean(s.done(ctx)),
    canAutomate: Boolean(s.agentInstruction),
    agentInstruction: s.agentInstruction || null,
  }))

  const next = steps.find((s) => !s.done) || null
  const completedCount = steps.filter((s) => s.done).length

  // "In setup" while any of the three count-based steps is still empty — we don't
  // nag established projects just because the manual Cx-plan confirmation is open.
  const inSetup = steps
    .filter((s) => s.key !== 'confirmPlan')
    .some((s) => !s.done)

  return {
    inSetup,
    totalSteps: steps.length,
    completedCount,
    steps,
    nextStep: next ? { key: next.key, title: next.title, link: next.link, canAutomate: next.canAutomate, agentInstruction: next.agentInstruction } : null,
  }
}

module.exports = { computeSetupStatus, SETUP_STEPS }
