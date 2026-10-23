import { describe, it, expect } from 'vitest'
import { buildActivityDocxHtml, generateActivityReportDocx, blocksHtml, runsHtml, esc } from './docx'
import type { ActivityReportModel } from './model'

function baseModel(overrides: Partial<ActivityReportModel> = {}): ActivityReportModel {
  return {
    reportId: 'SV-03',
    eyebrow: 'COMMISSIONING SITE VISIT REPORT · SV-03',
    title: 'GDC - Pulaski State Prison',
    subtitle: 'Site Visit #3 · Wednesday, July 1, 2026 · Mechanical Building',
    issuedDate: '10/23/2026',
    footerLabel: 'SV-03 · Rev 0 · Issued 10/23/2026',
    runningTitle: 'GDC - Pulaski State Prison · SV-03 · 7/1/2026',
    metaStrip: [
      { label: 'Project No.', value: '2760', mono: true },
      { label: 'Prepared by', value: 'Nigel Gray' },
    ],
    kpis: [
      { value: '7', label: 'Equipment reviewed' },
      { value: '6', label: 'Open issues · 2 high', warn: true },
    ],
    summaryItems: ['Chillers set and piped but not anchored.', 'Suction gauges missing on three pumps.'],
    nextVisit: 'Week of July 13',
    sessions: [
      {
        name: 'Cx site walk',
        meta: ['9:00 – 10:00 AM', 'EMCx'],
        bullets: [],
        blocks: [
          { kind: 'paragraph', runs: [{ text: 'CT-1 nameplate ' }, { text: 'now installed', bold: true }, { text: '.' }] },
          { kind: 'bullet', depth: 0, marker: '•', runs: [{ text: 'Insulation damaged ' }, { text: '→ Issues #2, #3', accent: true }] },
          { kind: 'bullet', depth: 0, marker: '1.', runs: [{ text: 'First numbered point' }] },
          { kind: 'subheading', text: 'RFIs' },
          { kind: 'paragraph', runs: [{ text: 'RFI #18 resolved. ' }, { text: 'Closed', green: true }] },
        ],
      },
    ],
    actionItems: [
      { id: 'A-1', action: 'Repair chiller insulation', owner: 'BoldAir / Trane', due: 'Before startup', ref: '#2 #3', done: false },
      { id: 'A-2', action: 'Anchor chillers', owner: 'BoldAir', due: '', ref: '—', done: true },
    ],
    issues: [
      {
        number: '2', tag: 'CH-1', title: 'Evaporator insulation damaged',
        description: 'Torn and gouged at the shell transition.',
        recommendation: 'Replace with matching elastomeric per Spec 236416.',
        severity: 'High', status: 'Open',
        metaLine: 'Site walk · Raised 07/01/2026 · Resp. BoldAir / Trane',
      },
      {
        number: '16', tag: 'HWP-2', title: 'Suction gauge not installed',
        description: 'Same condition as #15.', recommendation: '',
        severity: 'Medium', status: 'Open', metaLine: 'Checklist · Resp. BoldAir', sameAs: '15',
      },
    ],
    issueCounts: { high: 1, medium: 1, low: 0, fromWalk: 1, fromChecklists: 1 },
    observations: ['HW pumps have check valves only; submitted to Pond for clarification.'],
    equipmentRows: [
      { tag: 'CH-1', name: 'Chiller 1', makeModel: 'Trane CVHF062', pfcDone: 19, pfcTotal: 27, fptDone: 0, fptTotal: 9, openIssues: 1, worstSeverity: 'High' },
      { tag: 'SCHWP-1', name: 'Sec. CHW pump', makeModel: 'Taco FI5013', pfcDone: 26, pfcTotal: 28, fptDone: 0, fptTotal: 0, openIssues: 0, worstSeverity: null },
    ],
    remainingByTrade: [{ trade: 'Mechanical', count: 5, items: ['CT-1: drift eliminators', 'CT-1: blowdown drain'] }],
    photos: [],
    heroPhoto: null,
    attendees: [
      { name: 'Mike Christy', org: 'GDC · MEP Manager', present: true },
      { name: 'Fred Hastings', org: 'GDC', present: false },
    ],
    revisionRows: [{ rev: '0', date: '10/23/2026', description: 'Issued for distribution', by: 'N. Gray' }],
    preparedBy: 'Nigel Gray, EMCx',
    reviewedBy: '',
    ...overrides,
  }
}

describe('buildActivityDocxHtml (Word parity with the PDF model)', () => {
  it('renders all six sections from the shared model', async () => {
    const { html } = await buildActivityDocxHtml(baseModel())
    expect(html).toContain('COMMISSIONING SITE VISIT REPORT · SV-03')
    expect(html).toContain('Summary of findings')
    expect(html).toContain('Meeting minutes')
    expect(html).toContain('Action items')
    expect(html).toContain('Issues log')
    expect(html).toContain('Equipment status')
    expect(html).toContain('Attendance &amp; distribution')
    expect(html).toContain('Revision &amp; sign-off')
  })

  it('omits sections that are disabled or empty', async () => {
    const { html } = await buildActivityDocxHtml(baseModel({ summaryItems: [], actionItems: [], observations: [], issues: [] }), {
      sections: { minutes: false, equipment: false },
    })
    expect(html).not.toContain('Meeting minutes')
    expect(html).not.toContain('Equipment status')
    expect(html).not.toContain('Summary of findings')
    expect(html).not.toContain('Issues log')
  })

  it('honors rich formatting: bold runs, numbered + bulleted lists, accents', async () => {
    const { html } = await buildActivityDocxHtml(baseModel())
    expect(html).toContain('<strong>now installed</strong>')
    expect(html).toContain('<ul')
    expect(html).toContain('<ol')
    expect(html).toContain('→ Issues #2, #3')
    expect(html).toMatch(/color:#b45309[^>]*>.*→ Issues/) // accent ref
    expect(html).toMatch(/color:#15803d[^>]*>.*Closed/) // green Closed
    expect(html).toContain('RFIs') // subheading
  })

  it('renders the issues log with severity chips, Fix lead and duplicate collapse', async () => {
    const { html } = await buildActivityDocxHtml(baseModel())
    expect(html).toContain('HIGH')
    expect(html).toContain('<strong>Fix:</strong>')
    expect(html).toContain('Same condition as #15.')
    expect(html).toContain('Observation (not a deficiency)')
  })

  it('renders the equipment matrix with counts and the action items table', async () => {
    const { html } = await buildActivityDocxHtml(baseModel())
    expect(html).toContain('19/27')
    expect(html).toContain('0/9')
    expect(html).toContain('A-1')
    expect(html).toContain('Before startup')
    expect(html).toContain('Remaining PFC items by trade')
  })

  it('escapes user text', async () => {
    const { html } = await buildActivityDocxHtml(baseModel({ title: 'A & B < C' }))
    expect(html).toContain('A &amp; B &lt; C')
  })

  it('builds header/footer from the model', async () => {
    const { header, footer } = await buildActivityDocxHtml(baseModel())
    expect(header).toContain('GDC - Pulaski State Prison · SV-03')
    expect(footer).toContain('SV-03 · Rev 0 · Issued 10/23/2026')
  })

  it('generates a real, non-trivial .docx blob end-to-end', async () => {
    const blob = await generateActivityReportDocx(baseModel())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(5000)
    expect(blob.type).toContain('wordprocessingml')
  }, 20000)
})

describe('blocksHtml / runsHtml helpers', () => {
  it('nests deeper bullets inside the parent list item', () => {
    const html = blocksHtml([
      { kind: 'bullet', depth: 0, marker: '•', runs: [{ text: 'parent' }] },
      { kind: 'bullet', depth: 1, marker: '•', runs: [{ text: 'child' }] },
      { kind: 'bullet', depth: 0, marker: '•', runs: [{ text: 'sibling' }] },
    ])
    expect(html).toMatch(/<li[^>]*>parent<ul[^>]*><li[^>]*>child<\/li><\/ul><\/li>/)
    expect(html).toContain('sibling')
  })

  it('splits a ul/ol marker change into separate lists', () => {
    const html = blocksHtml([
      { kind: 'bullet', depth: 0, marker: '•', runs: [{ text: 'a' }] },
      { kind: 'bullet', depth: 0, marker: '1.', runs: [{ text: 'b' }] },
    ])
    expect(html).toMatch(/<ul[^>]*><li[^>]*>a<\/li><\/ul><ol[^>]*><li[^>]*>b<\/li><\/ol>/)
  })

  it('applies italic inside bold and escapes within runs', () => {
    expect(runsHtml([{ text: 'x<y', bold: true, italic: true }])).toBe('<strong><em>x&lt;y</em></strong>')
    expect(esc('&')).toBe('&amp;')
  })
})
