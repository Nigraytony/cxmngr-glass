import { describe, it, expect } from 'vitest'
import { buildActivityReportHtml, generateActivityDocxBlob, type ActivityDocxData } from './activityReportDocx'

function baseData(overrides: Partial<ActivityDocxData> = {}): ActivityDocxData {
  return {
    include: {
      coverPage: false, toc: false, info: true, description: true,
      photos: false, issues: true, attachments: false,
      equipmentList: true, equipmentReports: false,
    },
    activityName: 'Cx Meeting/Site Visit - 2',
    activityType: 'Site Visit Review',
    startDate: '2026-06-04',
    endDate: '2026-06-04',
    location: 'River Intake',
    projectName: 'GDC - Pulaski State Prison',
    descriptionHtml: '<h1>Cx Meeting Notes</h1><p>Date:</p><ul><li>Item A</li><li>Item B</li></ul>',
    equipment: [
      { tag: 'AHU-1', title: 'Air Handler 1', status: 'Installed', manufacturer: 'Trane', condition: 'Good' },
    ],
    issues: [
      { number: 1, type: 'assessment', source: 'Activity', title: 'CIPer access', description: 'Gated by contractor', recommendation: 'Factory reset', status: 'Open' },
      { number: 2, type: 'assessment', source: 'Activity', title: 'Touchscreen', description: 'Inoperable', recommendation: 'Update firmware', status: 'Closed' },
    ],
    ...overrides,
  }
}

describe('buildActivityReportHtml', () => {
  it('includes only the enabled sections', () => {
    const { html } = buildActivityReportHtml(baseData())
    expect(html).toContain('<h2>Info</h2>')
    expect(html).toContain('<h2>Description</h2>')
    expect(html).toContain('<h2>Equipment List</h2>')
    expect(html).toContain('<h2>Issues</h2>')
    // Disabled sections absent
    expect(html).not.toContain('<h2>Photos</h2>')
    expect(html).not.toContain('<h2>Attachments</h2>')
    expect(html).not.toContain('<h2>Equipment Reports</h2>')
  })

  it('embeds the rich description HTML verbatim (editable lists/headings)', () => {
    const { html } = buildActivityReportHtml(baseData())
    expect(html).toContain('<h1>Cx Meeting Notes</h1>')
    expect(html).toContain('<li>Item A</li>')
  })

  it('renders the issues table with all columns and a row per issue', () => {
    const { html } = buildActivityReportHtml(baseData())
    expect(html).toContain('<th')
    expect(html).toContain('Recommendation')
    expect(html).toContain('CIPer access')
    expect(html).toContain('Touchscreen')
    // closed rows get a gray background
    expect(html).toMatch(/background:#ececec/)
  })

  it('renders the equipment list row', () => {
    const { html } = buildActivityReportHtml(baseData())
    expect(html).toContain('AHU-1')
    expect(html).toContain('Trane')
  })

  it('escapes user text to avoid breaking the document', () => {
    const { html } = buildActivityReportHtml(baseData({
      issues: [{ number: 3, type: 'x', source: 'Activity', title: 'A & B < C', description: '', recommendation: '', status: 'Open' }],
    }))
    expect(html).toContain('A &amp; B &lt; C')
  })

  it('emits a cover page with a page break when enabled', () => {
    const data = baseData()
    data.include.coverPage = true
    data.cover = { title: 'Site Visit Report', subtitle: 'GDC', byLine: 'Nigel' }
    const { html } = buildActivityReportHtml(data)
    expect(html).toContain('Site Visit Report')
    expect(html).toMatch(/page-break-after:always/)
  })

  it('builds a header from logos and a footer with the activity name', () => {
    const { header, footer } = buildActivityReportHtml(baseData({
      logos: { client: { dataUrl: 'data:image/png;base64,AAAA' }, cxa: null },
    }))
    expect(header).toContain('data:image/png;base64,AAAA')
    expect(footer).toContain('Cx Meeting/Site Visit - 2')
  })

  it('renders a full equipment report with all sub-sections', () => {
    const data = baseData()
    data.include.equipmentReports = true
    data.equipmentReports = [{
      tag: 'AHU-1', title: 'Air Handler 1', type: 'Air Handler', system: 'HVAC', status: 'Installed', spaceName: 'MER-1',
      descriptionHtml: '<p>Penthouse unit</p>',
      attributes: [{ key: 'Manufacturer', value: 'Trane' }],
      components: [{ header: 'F-1 — Supply Fan', type: 'Fan', status: 'OK', attributes: [{ key: 'HP', value: '10' }], notes: 'belt ok' }],
      photos: [{ dataUrl: 'data:image/png;base64,AAAA' }],
      checklists: [{ title: 'Pre-Functional', items: [
        { done: 'yes', question: 'Installed per submittal?', notes: '' },
        { done: 'na', question: 'VFD present?', notes: 'no VFD' },
        { done: 'no', question: 'Labeled?', notes: 'pending' },
      ] }],
      functionalTests: [{ title: '#1 Economizer', status: 'FAIL', description: 'damper stuck', notes: 'recheck', rows: [{ step: '1', expected: 'opens', actual: 'stuck' }] }],
      signatures: [{ name: 'Nigel Gray', role: 'CxA', title: 'PE', date: '2026-06-04' }],
      issues: [{ number: 5, type: 'FPT', source: 'AHU-1', title: 'Damper', description: 'stuck', recommendation: 'recalibrate', status: 'Open' }],
      attachments: [{ filename: 'cutsheet.pdf' }],
      include: { info: true, attributes: true, components: true, photos: true, checklists: true, fpt: true, signatures: true, issues: true, attachments: true },
    }]
    const { html } = buildActivityReportHtml(data)
    expect(html).toContain('<h2>Equipment Reports</h2>')
    expect(html).toContain('AHU-1 &mdash; Air Handler 1'.replace('&mdash;', '—'))
    expect(html).toContain('<h4>Info</h4>')
    expect(html).toContain('<h4>Checklists</h4>')
    expect(html).toContain('Installed per submittal?')
    expect(html).toContain('N/A') // the na checklist item
    expect(html).toContain('<h4>Functional Tests</h4>')
    expect(html).toContain('#1 Economizer')
    expect(html).toContain('FAIL')
    expect(html).toContain('<h4>Signatures</h4>')
    expect(html).toContain('Nigel Gray')
    expect(html).toContain('<h4>Components</h4>')
    expect(html).toContain('F-1 &mdash; Supply Fan'.replace('&mdash;', '—'))
  })

  it('omits equipment sub-sections turned off in include', () => {
    const data = baseData()
    data.include.equipmentReports = true
    data.equipmentReports = [{
      tag: 'P-1', title: 'Pump', status: 'OK',
      checklists: [{ title: 'X', items: [{ done: 'yes', question: 'q', notes: '' }] }],
      include: { info: true, checklists: false, fpt: false, signatures: false, issues: false, attachments: false, attributes: false, components: false, photos: false },
    }]
    const { html } = buildActivityReportHtml(data)
    expect(html).toContain('P-1')
    expect(html).not.toContain('<h4>Checklists</h4>')
  })

  it('generates a real, non-trivial .docx blob end-to-end', async () => {
    const blob = await generateActivityDocxBlob(baseData())
    expect(blob).toBeInstanceOf(Blob)
    // A valid docx (zip with the Word parts) is comfortably over a few KB — proves
    // the html-to-docx conversion actually ran and produced a document.
    expect(blob.size).toBeGreaterThan(5000)
    expect(blob.type).toContain('wordprocessingml')
  }, 20000)
})
