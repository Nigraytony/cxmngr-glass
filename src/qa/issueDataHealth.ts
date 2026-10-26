// Issues data-health scan (the Issue report redesign's Step 4, repositioned
// as a STANDALONE Issues-module feature per Tony: it must never gate report
// downloads or the save flow — users run it when they want a hygiene pass).
// Pure data-in/warnings-out over the light issues list, so the whole project
// scans instantly client-side; the panel UI lives in IssuesList.vue.
import type { QaWarning } from '../reports/qaTypes'

const DAY = 24 * 60 * 60 * 1000
const STALE_DAYS = 30

function plain(v: any): string {
  return String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const isClosed = (st: any) => ['closed', 'cancelled'].includes(String(st || '').toLowerCase())
const sevOf = (i: any) => String(i?.severity || i?.priority || '').toLowerCase()

/** Words that signal the description is carrying the fix instead of the
 *  Recommendation field (the contractor reads the Recommendation). */
const REC_LANGUAGE = /\b(recommend(?:ed|s)?|should|shall|must|needs? to|has to)\b/i

export function runIssueDataHealth(issues: any[], opts: { now?: Date } = {}): QaWarning[] {
  const now = opts.now || new Date()
  const out: QaWarning[] = []
  for (const i of (Array.isArray(issues) ? issues : [])) {
    const id = String(i?.id || i?._id || '')
    const num = i?.number != null ? `#${i.number}` : '(unnumbered)'
    const open = !isClosed(i?.status)
    const sev = sevOf(i)
    const link = { type: 'issue' as const, id }

    // 1. Recommendation language hiding in the description while the
    //    Recommendation field is EMPTY. Any written recommendation counts —
    //    a short one is a style choice, not a data defect (field feedback:
    //    the earlier under-15-words heuristic produced false alarms).
    const desc = plain(i?.description)
    const rec = plain(i?.recommendation)
    if (open && REC_LANGUAGE.test(desc) && !rec) {
      out.push({
        id: `rec-language:${id}`,
        category: 'rec-language',
        message: `${num}: the description contains recommendation language but the Recommendation field is empty — the contractor reads the Recommendation.`,
        link,
      })
    }

    // 2. Critical / High with no equipment linked.
    const hasEquipment = (Array.isArray(i?.equipmentIds) && i.equipmentIds.length > 0) || !!plain(i?.tag)
    if (open && (sev === 'critical' || sev === 'high') && !hasEquipment) {
      out.push({
        id: `no-equipment:${id}`,
        category: 'no-equipment',
        message: `${num} is ${sev === 'critical' ? 'Critical' : 'High'} priority with no equipment linked.`,
        link,
      })
    }

    // 3. Overdue with no contractor response recorded.
    const due = i?.dueDate ? new Date(i.dueDate) : null
    const hasResponse = !!plain(i?.response?.correctiveAction) || !!plain(i?.resolution)
    if (open && due && !isNaN(due.getTime()) && now.getTime() > due.getTime() && !hasResponse) {
      const days = Math.round((now.getTime() - due.getTime()) / DAY)
      out.push({
        id: `overdue-no-response:${id}`,
        category: 'overdue-no-response',
        message: `${num} is overdue ${days} day${days === 1 ? '' : 's'} with no contractor response recorded.`,
        link,
      })
    }

    // 4. No responsible party.
    if (open && !plain(i?.assignedTo || i?.responsible_person)) {
      out.push({
        id: `unassigned:${id}`,
        category: 'unassigned',
        message: `${num} has no responsible party assigned.`,
        link,
      })
    }

    // 5. Closed without a verification outcome (legacy closes predating the rule).
    if (isClosed(i?.status) && String(i?.status || '').toLowerCase() === 'closed' && !String(i?.verification?.outcome || '').trim()) {
      out.push({
        id: `closed-no-outcome:${id}`,
        category: 'closed-no-outcome',
        message: `${num} was closed without a CxA verification outcome.`,
        link,
      })
    }

    // 6. Stale: open with no activity for a month.
    const updated = i?.updatedAt ? new Date(i.updatedAt) : null
    if (open && updated && !isNaN(updated.getTime())) {
      const days = Math.floor((now.getTime() - updated.getTime()) / DAY)
      if (days >= STALE_DAYS) {
        out.push({
          id: `stale:${id}`,
          category: 'stale',
          message: `${num} is open with no activity for ${days} days.`,
          link,
        })
      }
    }
  }
  return out
}

export const ISSUE_HEALTH_CATEGORIES: Record<string, string> = {
  'rec-language': 'Fix buried in the description',
  'no-equipment': 'High priority without equipment',
  'overdue-no-response': 'Overdue without response',
  unassigned: 'No responsible party',
  'closed-no-outcome': 'Closed without verification',
  stale: 'Stale (30+ days untouched)',
}
