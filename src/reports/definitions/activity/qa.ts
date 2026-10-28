// Pre-issue QA checks for the Activity report (born in Stage 4 of the
// redesign, docs/activity_report_redesign.md). Pure data-in/warnings-out so
// the checks are testable; shown via components/reports/ReportQaModal.vue.
// This is its own workflow (the Pre-issue QA button on the Activity page) —
// report generation never runs it, and findings are NEVER printed.

import type { QaWarning } from '../../qaTypes'
export type { QaWarning } from '../../qaTypes'

export interface QaInput {
  equipment: any[]
  /** Scoped issues (the ones the report prints). */
  issues: any[]
  /** Photos as the report gathers them (caption/tags/issueRefs merged). */
  photos: Array<{ caption?: string; tags?: string[]; issueRefs?: string[] }>
}

const isOpen = (st: any) => !['closed', 'cancelled'].includes(String(st || '').toLowerCase())

// Topics that matter on a Cx checklist — the overlap test for check #1 uses
// this lexicon rather than raw word matching to keep noise down.
const TOPIC_WORDS = [
  'insulation', 'gauge', 'valve', 'tag', 'nameplate', 'label', 'anchor',
  'vibration', 'grounding', 'ground', 'seal', 'leak', 'filter', 'belt',
  'guard', 'charge', 'refrigerant', 'wiring', 'sensor', 'damper', 'drain',
  'strainer', 'eliminator', 'heater',
]

// Whole words only (plural-tolerant): a substring test made "discharge"
// match the charge topic and "voltage" match tag, flooding the panel with
// false conflicts.
const TOPIC_RES = TOPIC_WORDS.map(w => ({ w, re: new RegExp(`\\b${w}s?\\b`, 'i') }))

function topicsIn(text: string): Set<string> {
  const t = String(text || '')
  return new Set(TOPIC_RES.filter(x => x.re.test(t)).map(x => x.w))
}

function checklistItems(eq: any): Array<{ text: string; done: boolean; section: string }> {
  const out: Array<{ text: string; done: boolean; section: string }> = []
  for (const s of (Array.isArray(eq?.checklists) ? eq.checklists : [])) {
    const items: any[] = Array.isArray(s?.questions) ? s.questions : (Array.isArray(s?.items) ? s.items : [])
    for (const it of items) {
      let done = false
      if (typeof it?.done !== 'undefined') done = !!it.done
      else done = String(it?.answer ?? '').toLowerCase() === 'yes'
      out.push({ text: String(it?.question_text ?? it?.text ?? ''), done, section: String(s?.title || '') })
    }
  }
  return out
}

function attrPairs(obj: any): Array<{ key: string; value: string }> {
  if (Array.isArray(obj)) {
    return obj
      .map((r: any) => ({ key: String(r?.key || '').trim(), value: String(r?.value ?? '').trim() }))
      .filter(p => p.key)
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).map(([k, v]) => ({ key: String(k), value: String(v ?? '') }))
  }
  return []
}

/** Numbers found near a unit keyword ("700 tons", "608 RLA", "480V"). */
function numbersWithUnit(text: string, unit: RegExp): number[] {
  const out: number[] = []
  const re = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${unit.source})`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(String(text || ''))) !== null) {
    const n = parseFloat(m[1].replace(',', ''))
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

const UNIT_CHECKS: Array<{ label: string; unit: RegExp }> = [
  { label: 'tons', unit: /tons?\b/ },
  { label: 'RLA/FLA', unit: /(?:rla|fla)\b/ },
  { label: 'gpm', unit: /gpm\b/ },
  { label: 'hp', unit: /hp\b/ },
  { label: 'kW', unit: /kw\b/ },
  { label: 'V', unit: /v(?:olts?|ac)?\b/ },
]

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(a, b)

export function runActivityQaChecks(input: QaInput): QaWarning[] {
  const warnings: QaWarning[] = []
  const eqs = input.equipment || []
  const openIssues = (input.issues || []).filter((i: any) => isOpen(i?.status))

  // 1. Checklist item checked "yes" while an open issue covers the same topic.
  for (const eq of eqs) {
    const tag = String(eq?.tag || '')
    const eqId = String(eq?.id || eq?._id || '')
    const eqIssues = openIssues.filter((i: any) => String(i?.tag || '').toLowerCase() === tag.toLowerCase())
    if (!eqIssues.length) continue
    for (const item of checklistItems(eq)) {
      if (!item.done) continue
      const itemTopics = topicsIn(item.text)
      if (!itemTopics.size) continue
      for (const iss of eqIssues) {
        const issTopics = topicsIn(`${iss?.title || ''} ${iss?.description || ''}`)
        const overlap = [...itemTopics].find(t => issTopics.has(t))
        if (overlap) {
          warnings.push({
            id: `clvi:${tag}:${iss?.number}:${overlap}`,
            category: 'checklist-vs-issue',
            message: `${tag}: PFC marks "${item.text.slice(0, 60)}" done while open Issue #${iss?.number} mentions ${overlap}.`,
            link: { type: 'equipment', id: eqId },
          })
          break // one warning per checklist item is enough
        }
      }
    }
  }

  // 2. FPT expected values vs the equipment's own attributes.
  for (const eq of eqs) {
    const tag = String(eq?.tag || '')
    const eqId = String(eq?.id || eq?._id || '')
    const attrText = attrPairs(eq?.attributes).map(p => `${p.key} ${p.value}`).join(' ')
    const tests: any[] = Array.isArray(eq?.functionalTests) ? eq.functionalTests : []
    const expectedText = tests
      .map((t: any) => (Array.isArray(t?.rows) ? t.rows.map((r: any) => String(r?.expected ?? '')).join(' ') : ''))
      .join(' ')
    if (!expectedText.trim()) continue
    for (const u of UNIT_CHECKS.slice(0, 3)) { // tons / RLA-FLA / gpm are nameplate-grade
      const attrNums = numbersWithUnit(attrText, u.unit)
      const expNums = numbersWithUnit(expectedText, u.unit)
      if (!attrNums.length || !expNums.length) continue
      const mismatch = expNums.every(e => !attrNums.some(a => near(a, e, 0.1)))
      if (mismatch) {
        warnings.push({
          id: `fpt:${tag}:${u.label}`,
          category: 'fpt-expected',
          message: `${tag}: FPT expected ${u.label} (${expNums.join('/')}) don't match the nameplate attributes (${attrNums.join('/')}). Template values?`,
          link: { type: 'equipment', id: eqId },
        })
      }
    }
  }

  // 3. Equipment attributes vs component values on the same unit.
  for (const eq of eqs) {
    const tag = String(eq?.tag || '')
    const eqId = String(eq?.id || eq?._id || '')
    const attrText = attrPairs(eq?.attributes).map(p => `${p.key} ${p.value}`).join(' ')
    const compText = (Array.isArray(eq?.components) ? eq.components : [])
      .map((cp: any) => attrPairs(cp?.attributes).map(p => `${p.key} ${p.value}`).join(' '))
      .join(' ')
    if (!compText.trim()) continue
    for (const u of UNIT_CHECKS.slice(3)) { // hp / kW / V live on components
      const attrNums = numbersWithUnit(attrText, u.unit)
      const compNums = numbersWithUnit(compText, u.unit)
      if (!attrNums.length || !compNums.length) continue
      const mismatch = attrNums.every(a => !compNums.some(cn => near(a, cn, 0.15)))
      if (mismatch) {
        warnings.push({
          id: `avc:${tag}:${u.label}`,
          category: 'attr-vs-component',
          message: `${tag}: attribute ${u.label} (${attrNums.join('/')}) disagrees with component data (${compNums.join('/')}).`,
          link: { type: 'equipment', id: eqId },
        })
      }
    }
  }

  // 4. Identical serial / shop order / job numbers across different equipment.
  {
    const idAttr = /serial|shop\s*order|job\s*(?:no|number|#)/i
    const byValue = new Map<string, Array<{ tag: string; key: string }>>()
    for (const eq of eqs) {
      const tag = String(eq?.tag || '')
      for (const p of attrPairs(eq?.attributes)) {
        if (!idAttr.test(p.key)) continue
        const v = p.value.replace(/\s+/g, '').toLowerCase()
        if (v.length < 4) continue
        const list = byValue.get(v) || []
        list.push({ tag, key: p.key })
        byValue.set(v, list)
      }
    }
    for (const [v, list] of byValue) {
      const tags = [...new Set(list.map(x => x.tag))]
      if (tags.length > 1) {
        warnings.push({
          id: `dup:${v}`,
          category: 'duplicate-identifiers',
          message: `${tags.join(', ')} share the same ${list[0].key.replace(/[\s:]+$/, '')} (${v}).`,
        })
      }
    }
  }

  // 5. Issues missing a recommendation or responsible party.
  for (const iss of openIssues) {
    const missing: string[] = []
    if (!String(iss?.recommendation || '').trim()) missing.push('recommendation')
    if (!String(iss?.assignedTo || '').trim()) missing.push('responsible party')
    if (missing.length) {
      warnings.push({
        id: `ifld:${iss?.number}`,
        category: 'issue-fields',
        message: `Issue #${iss?.number} (${iss?.tag || 'no tag'}) is missing: ${missing.join(', ')}.`,
        link: { type: 'issue', id: String(iss?.id || iss?._id || '') },
      })
    }
  }

  // 6. Photos without a caption, or with no equipment tag / issue link.
  {
    const photos = input.photos || []
    const noCaption = photos.filter(p => !String(p?.caption || '').trim()).length
    if (noCaption) {
      warnings.push({
        id: 'photo:caption',
        category: 'photo-meta',
        message: `${noCaption} photo${noCaption === 1 ? '' : 's'} ha${noCaption === 1 ? 's' : 've'} no caption.`,
        link: { type: 'photos', id: '' },
      })
    }
    const unlinked = photos.filter(p => !(p?.tags && p.tags.length) && !(p?.issueRefs && p.issueRefs.length)).length
    if (unlinked) {
      warnings.push({
        id: 'photo:links',
        category: 'photo-meta',
        message: `${unlinked} photo${unlinked === 1 ? '' : 's'} ha${unlinked === 1 ? 's' : 've'} no equipment tag or issue link.`,
        link: { type: 'photos', id: '' },
      })
    }
  }

  return warnings
}
