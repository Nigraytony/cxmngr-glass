import { describe, it, expect } from 'vitest'
import { runIssueDataHealth } from './issueDataHealth'

const NOW = new Date('2026-10-26T12:00:00Z')
const scan = (issues: any[]) => runIssueDataHealth(issues, { now: NOW })
const cats = (issues: any[]) => scan(issues).map(w => w.category)

function base(overrides: any = {}) {
  return {
    _id: 'i1',
    number: 13,
    status: 'Open',
    severity: 'Medium',
    assignedTo: 'Randy Frost (BoldAir)',
    description: 'Panel installed but not started.',
    recommendation: 'Complete the installation, startup and alarm verification of the refrigerant monitoring system, then submit the startup report to the CxA before chiller operation.',
    equipmentIds: ['e1'],
    updatedAt: '2026-10-20T00:00:00Z',
    ...overrides,
  }
}

describe('runIssueDataHealth', () => {
  it('clean issue produces no findings', () => {
    expect(scan([base()])).toEqual([])
  })

  it('flags recommendation language only when the Recommendation field is EMPTY', () => {
    const found = cats([base({ description: 'We recommend starting the system ASAP.', recommendation: '' })])
    expect(found).toContain('rec-language')
    // ANY written recommendation clears it — even a short one (a short
    // recommendation is a style choice, not a data defect)
    expect(cats([base({ description: 'We recommend starting the system ASAP.', recommendation: 'Fix it.' })])).not.toContain('rec-language')
    expect(cats([base({ description: 'We recommend starting the system ASAP.' })])).not.toContain('rec-language')
  })

  it('flags Critical/High with no equipment linked (tag counts as linked)', () => {
    expect(cats([base({ severity: 'Critical', equipmentIds: [] })])).toContain('no-equipment')
    expect(cats([base({ severity: 'High', equipmentIds: [], tag: 'CH-1' })])).not.toContain('no-equipment')
    expect(cats([base({ severity: 'Low', equipmentIds: [] })])).not.toContain('no-equipment')
  })

  it('flags overdue without a contractor response; response or legacy resolution clears it', () => {
    expect(cats([base({ dueDate: '2026-10-14' })])).toContain('overdue-no-response')
    expect(cats([base({ dueDate: '2026-10-14', response: { correctiveAction: 'Done.' } })])).not.toContain('overdue-no-response')
    expect(cats([base({ dueDate: '2026-10-14', resolution: 'Replaced sensor.' })])).not.toContain('overdue-no-response')
    expect(cats([base({ dueDate: '2026-12-01' })])).not.toContain('overdue-no-response')
  })

  it('flags missing responsible party on open issues only', () => {
    expect(cats([base({ assignedTo: '' })])).toContain('unassigned')
    expect(cats([base({ assignedTo: '', status: 'Closed', verification: { outcome: 'verified_closed' } })])).not.toContain('unassigned')
  })

  it('flags closed without a verification outcome (legacy closes), not cancellations', () => {
    expect(cats([base({ status: 'Closed' })])).toContain('closed-no-outcome')
    expect(cats([base({ status: 'Closed', verification: { outcome: 'accepted_as_is' } })])).not.toContain('closed-no-outcome')
    expect(cats([base({ status: 'Cancelled' })])).not.toContain('closed-no-outcome')
  })

  it('flags open issues untouched for 30+ days', () => {
    expect(cats([base({ updatedAt: '2026-09-01T00:00:00Z' })])).toContain('stale')
    expect(cats([base({ updatedAt: '2026-10-20T00:00:00Z' })])).not.toContain('stale')
  })

  it('warning ids are stable per issue + category (dismissals survive rescans)', () => {
    const a = scan([base({ assignedTo: '' })])
    const b = scan([base({ assignedTo: '' })])
    expect(a.map(w => w.id)).toEqual(b.map(w => w.id))
    expect(a[0].link).toEqual({ type: 'issue', id: 'i1' })
  })
})
