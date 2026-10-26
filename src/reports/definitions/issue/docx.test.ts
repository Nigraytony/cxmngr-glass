import { describe, it, expect } from 'vitest'
import { buildIssueDocxHtml, generateIssueReportDocx, esc } from './docx'
import type { IssueReportModel } from './model'

function baseModel(overrides: Partial<IssueReportModel> = {}): IssueReportModel {
  return {
    projectName: 'Pulaski State Prison — Mechanical Upgrades',
    projectNo: 'GDC-24-Pulaski-SP-007-DP',
    clientName: 'GDC',
    eyebrow: 'COMMISSIONING ISSUE · CONSTRUCTION REVIEW',
    number: '13',
    title: 'Refrigerant monitoring system not operational',
    priority: 'Critical',
    statusLabel: 'OPEN',
    closed: false,
    verified: false,
    dueLine: { text: 'Overdue 8 days · due 10/15/2026', red: true },
    assignedTo: 'Randy Frost · BoldAir',
    dueDate: '10/15/2026',
    lifeSafetyNote: 'Chillers are running with no working refrigerant leak detection.',
    facts: [
      { label: 'Assigned to', value: 'Randy Frost · BoldAir' },
      { label: 'Found by', value: 'Nigel Gray · EMCx' },
      { label: 'Equipment', value: 'CH-1 · CH-2', mono: true },
      { label: 'Raised during', value: '' }, // empty -> skipped
    ],
    condition: 'The chillers have been started, but the monitoring system is not yet operational.',
    requiredAction: ['Complete installation and startup.', 'Relocate the sensors next to each chiller.'],
    referenceLine: 'ASHRAE 15 machinery-room detection requirements',
    photos: [],
    photosNote: '',
    oprItems: [{ ref: '#3', text: 'Verify all life-safety systems through documented FPT.', category: 'Systems Reliability' }],
    response: null,
    verification: null,
    history: [
      { date: '10/01/2026 12:42', text: 'Issue raised as Critical, assigned to Randy Frost, due 10/15/2026', by: 'Nigel Gray', bold: true },
      { date: '10/15/2026', text: 'Due date passed, no contractor response recorded', by: 'System', red: true, bold: true },
    ],
    comments: [],
    distribution: 'Randy Frost · BoldAir (assigned) · Mike Christy, GDC',
    runningTitle: 'Pulaski State Prison — Mechanical Upgrades · Issue #13 · Refrigerant monitoring system not operational',
    footerLabel: 'Issue #13 · Status as of 10/26/2026 · Generated in cxma',
    statusAsOf: '10/26/2026',
    ...overrides,
  }
}

describe('buildIssueDocxHtml (Word parity with the PDF model)', () => {
  it('renders the issue sheet: eyebrow, chips, due line, life safety, facts', async () => {
    const { html } = await buildIssueDocxHtml(baseModel())
    expect(html).toContain('COMMISSIONING ISSUE · CONSTRUCTION REVIEW')
    expect(html).toContain('#13')
    expect(html).toContain('CRITICAL')
    expect(html).toContain('[OPEN]')
    expect(html).toContain('Overdue 8 days · due 10/15/2026')
    expect(html).toContain('Life safety.')
    expect(html).toContain('CH-1 · CH-2')
    expect(html).not.toContain('Raised during') // empty fact cell skipped
    expect(html).toContain('Related OPR items')
    expect(html).toContain('Systems Reliability')
  })

  it('prints fill-in blocks when no response/verification is recorded', async () => {
    const { html } = await buildIssueDocxHtml(baseModel())
    expect(html).toContain('Corrective action taken')
    expect(html).toContain('Signature')
    expect(html).toContain('☐ Verified, issue closed')
    expect(html).toContain('Due date passed, no contractor response recorded')
  })

  it('prints recorded response/verification instead of fill-ins', async () => {
    const { html } = await buildIssueDocxHtml(baseModel({
      response: { correctiveAction: 'Sensors relocated; panel started and alarms verified.', completedDate: '10/25/2026', respondedBy: 'Randy Frost · BoldAir' },
      verification: { outcomeLabel: 'Not resolved, remains open', verifiedBy: 'Nigel Gray', verifiedDate: '10/26/2026', notes: 'Alarm test pending' },
    }))
    expect(html).toContain('Sensors relocated')
    expect(html).toContain('Completed 10/25/2026')
    expect(html).toContain('Not resolved, remains open')
    expect(html).not.toContain('Corrective action taken') // fill-in gone
    expect(html).not.toContain('☐')
  })

  it('closed + verified: green CLOSED, verification on page 1, no fill-ins', async () => {
    const { html } = await buildIssueDocxHtml(baseModel({
      closed: true,
      verified: true,
      statusLabel: 'CLOSED',
      dueLine: { text: 'Closed 10/26/2026', red: false },
      verification: { outcomeLabel: 'Verified, issue closed', verifiedBy: 'Nigel Gray', verifiedDate: '10/26/2026', notes: '' },
    }))
    expect(html).toContain('CLOSED')
    expect(html).toContain('Verified, issue closed')
    expect(html).not.toContain('☐')
    expect(html).not.toContain('Corrective action taken')
  })

  it('honors section toggles and skips page 2 when nothing remains', async () => {
    const { html } = await buildIssueDocxHtml(baseModel({ distribution: '', history: [] }), {
      sections: { condition: false, oprItems: false, response: false, verification: false },
    })
    expect(html).not.toContain('Condition observed')
    expect(html).not.toContain('Related OPR items')
    expect(html).not.toContain('Contractor response')
    expect(html).not.toContain('page-break-after:always')
  })

  it('escapes user text and builds header/footer from the model', async () => {
    const { html, header, footer } = await buildIssueDocxHtml(baseModel({ title: 'A & B < C' }))
    expect(html).toContain('A &amp; B &lt; C')
    expect(header).toContain('Issue #13')
    expect(footer).toContain('Status as of 10/26/2026')
    expect(esc('&')).toBe('&amp;')
  })

  it('generates a real, non-trivial .docx blob end-to-end', async () => {
    const blob = await generateIssueReportDocx(baseModel())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(5000)
    expect(blob.type).toContain('wordprocessingml')
  }, 20000)
})
