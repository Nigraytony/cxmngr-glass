import { describe, it, expect } from 'vitest'
import { runActivityQaChecks } from '../../src/reports/definitions/activity/qa'

// Check #1 (checklist item done vs open issue on the same topic) matches
// whole topic words only. The old substring test made "discharge" hit the
// charge topic and "voltage" hit tag, flooding the panel with false
// conflicts (33 findings on a 20-issue project).

const eq = (tag: string, questionText: string) => ({
  id: 'e1',
  tag,
  checklists: [{ title: 'Sec 1', questions: [{ question_text: questionText, answer: 'yes' }] }],
})
const issue = (tag: string, description: string) => ({
  number: 15, tag, status: 'Open', title: 'Some issue', description,
  recommendation: 'Fix it', assignedTo: 'Mech',
})

const checklistFindings = (equipment: any, iss: any) =>
  runActivityQaChecks({ equipment: [equipment], issues: [iss], photos: [] })
    .filter(w => w.category === 'checklist-vs-issue')

describe('activity QA topic matching', () => {
  it('does not match charge inside discharge', () => {
    const found = checklistFindings(
      eq('HWP-1', 'Suction and discharge piping properly supported'),
      issue('HWP-1', 'Pressure reading unstable at the discharge connection')
    )
    expect(found).toHaveLength(0)
  })

  it('does not match tag inside voltage', () => {
    const found = checklistFindings(
      eq('CT-1', 'Voltage reading at disconnect matches nameplate'),
      issue('CT-1', 'No equipment tag installed. It should read CT-1.')
    )
    expect(found).toHaveLength(0)
  })

  it('still flags a genuine topic overlap, tolerating plurals', () => {
    const found = checklistFindings(
      eq('AS-1', 'Isolation valves installed on inlet and outlet'),
      issue('AS-1', 'No isolation valve installed on the outlet side')
    )
    expect(found).toHaveLength(1)
    expect(found[0].message).toContain('valve')
  })
})
