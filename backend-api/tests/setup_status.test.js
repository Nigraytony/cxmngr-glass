const assert = require('assert')

// Pure helper tests — no DB, no HTTP, no network.
const { computeSetupStatus, SETUP_STEPS } = require('../utils/setupStatus')

describe('computeSetupStatus', function () {
  it('treats an empty project as in setup with importTasks next', function () {
    const s = computeSetupStatus({ tasks: 0, activities: 0, equipment: 0 }, null)
    assert.strictEqual(s.inSetup, true)
    assert.strictEqual(s.completedCount, 0)
    assert.ok(s.nextStep)
    assert.strictEqual(s.nextStep.key, 'importTasks')
    assert.strictEqual(s.totalSteps, SETUP_STEPS.length)
  })

  it('advances nextStep as count-based steps are satisfied', function () {
    let s = computeSetupStatus({ tasks: 5, activities: 0, equipment: 0 }, null)
    assert.strictEqual(s.steps[0].done, true)
    assert.strictEqual(s.nextStep.key, 'kickoffActivity')

    s = computeSetupStatus({ tasks: 5, activities: 1, equipment: 0 }, null)
    assert.strictEqual(s.nextStep.key, 'equipment')
  })

  it('once counts are present, inSetup is false and confirmPlan is the remaining step', function () {
    const checklist = { items: [{ category: 'Planning', completed: false }, { category: 'Design', completed: true }] }
    const s = computeSetupStatus({ tasks: 3, activities: 1, equipment: 2 }, checklist)
    assert.strictEqual(s.inSetup, false)
    assert.strictEqual(s.nextStep.key, 'confirmPlan')
    // confirmPlan is a judgment step — not automatable.
    assert.strictEqual(s.nextStep.canAutomate, false)
    assert.strictEqual(s.nextStep.agentInstruction, null)
  })

  it('count-based steps are automatable', function () {
    const s = computeSetupStatus({ tasks: 0, activities: 0, equipment: 0 }, null)
    const importStep = s.steps.find((x) => x.key === 'importTasks')
    assert.strictEqual(importStep.canAutomate, true)
    assert.ok(importStep.agentInstruction && importStep.agentInstruction.length > 0)
  })

  it('confirmPlan completes only when all Planning items are done', function () {
    const counts = { tasks: 3, activities: 1, equipment: 2 }

    // No planning items at all => not complete.
    let s = computeSetupStatus(counts, { items: [{ category: 'Design', completed: true }] })
    assert.strictEqual(s.steps.find((x) => x.key === 'confirmPlan').done, false)

    // Some planning incomplete => not complete.
    s = computeSetupStatus(counts, { items: [{ category: 'Planning', completed: true }, { category: 'Planning', completed: false }] })
    assert.strictEqual(s.steps.find((x) => x.key === 'confirmPlan').done, false)

    // All planning complete => done, nothing left.
    s = computeSetupStatus(counts, { items: [{ category: 'Planning', completed: true }] })
    assert.strictEqual(s.steps.find((x) => x.key === 'confirmPlan').done, true)
    assert.strictEqual(s.nextStep, null)
    assert.strictEqual(s.completedCount, s.totalSteps)
  })

  it('coerces missing/garbage counts to zero', function () {
    const s = computeSetupStatus({ tasks: undefined, activities: 'x', equipment: -3 }, null)
    assert.strictEqual(s.inSetup, true)
    assert.strictEqual(s.nextStep.key, 'importTasks')
  })
})
