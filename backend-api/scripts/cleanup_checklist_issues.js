#!/usr/bin/env node
/**
 * Issues batch redesign — checklist-issue cleanup (GATED: run --apply only
 * after Tony reviews the dry-run output; see docs/issues_batch_reports_redesign.md).
 *
 * Issues raised from equipment checklists used to get text dumps instead of
 * structured data:
 *   - titles like  "Checklist: HWP-1 • Sec 1 – Installation Verification • Q8 – …"
 *   - descriptions starting with "Equipment: … Section: … Question: … Answer: NO Notes: …"
 *     (plain lines or wrapped in <p> by the rich-text editor)
 *
 * This script finds those issues, extracts the dump into the structured
 * Issue.source fields (models/issue.js), validates the extraction against the
 * equipment's embedded checklist (equipment.checklists[] / questions[] by
 * number), proposes a clean title + a description stripped of the dump, and
 * prints everything as before -> after. Nothing is written without --apply.
 *
 * Titles that were full dumps carry no human wording to recover, so their
 * replacements are curated per issue in CURATED_TITLES below (dry-run marks
 * them "curated"). An unforeseen dump title with no curated entry is flagged
 * NEEDS-TITLE and the issue is skipped on --apply.
 *
 * Usage:
 *   node scripts/cleanup_checklist_issues.js                 # dry run, all projects
 *   node scripts/cleanup_checklist_issues.js --project <id>  # dry run, one project
 *   node scripts/cleanup_checklist_issues.js --apply         # write changes
 * Connection: MONGODB_URI env var (backend-api/.env) or --uri <connection string>.
 */
const mongoose = require('mongoose')

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const val = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}

const APPLY = flag('apply')
const URI = val('uri') || process.env.MONGODB_URI
const PROJECT = val('project')

// Replacement titles for issues whose title is the raw dump (keyed by
// "<projectId>:<issue number>"). Reviewed by Tony before --apply.
const CURATED_TITLES = {
  // GDC - Pulaski State Prison
  '69ebd00d507b53087f5e2244:5': 'AS-1 supported by pipe instead of building structure',
  '69ebd00d507b53087f5e2244:15': 'HWP-1 missing suction pressure gauge',
  '69ebd00d507b53087f5e2244:16': 'HWP-2 missing suction pressure gauge',
  '69ebd00d507b53087f5e2244:17': 'SCHWP-2 missing suction pressure gauge',
  '69ebd00d507b53087f5e2244:18': 'PCHWP-1 missing manual isolation valve on discharge',
  '69ebd00d507b53087f5e2244:19': 'PCHWP-2 missing manual isolation valve on discharge',
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Strip HTML to plain text, one line per block element. */
function htmlToLines(html) {
  const s = String(html || '')
  if (!/<[a-z][^>]*>/i.test(s)) return s.split(/\r?\n/)
  return s
    .replace(/<\s*(?:p|div|br|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .split(/\r?\n/)
}

/** "Sec 1 – Installation Verification" -> { num, title } */
function parseSection(s) {
  const m = String(s || '').trim().match(/^Sec(?:tion)?\.?\s*(\d+)\s*(?:[–—-]\s*(.*))?$/i)
  if (m) return { num: Number(m[1]), title: (m[2] || '').trim() }
  return { num: null, title: String(s || '').trim() }
}

/**
 * Dump title: "Checklist: TAG • Sec N – Title • QM – Question".
 * Returns null when the title is not a dump. `human` is set when the title
 * starts with "Checklist:" but the remainder is ordinary wording.
 */
function parseTitle(title) {
  const t = String(title || '').trim()
  const m = t.match(/^Checklist:\s*(.+)$/i)
  if (!m) return null
  const rest = m[1].trim()
  if (!rest.includes('•')) return { human: rest }
  const parts = rest.split('•').map((p) => p.trim())
  const out = { tag: parts[0] || '' }
  for (const p of parts.slice(1)) {
    const sec = p.match(/^Sec(?:tion)?\.?\s*(\d+)\s*(?:[–—-]\s*(.*))?$/i)
    if (sec) { out.secNum = Number(sec[1]); out.secTitle = (sec[2] || '').trim(); continue }
    const q = p.match(/^Q\.?\s*(\d+)\s*(?:[–—-]\s*(.*))?$/i)
    if (q) { out.qNum = Number(q[1]); out.qText = (q[2] || '').trim() }
  }
  return out
}

const DUMP_KEYS = ['Equipment', 'Asset', 'Section', 'Question', 'Answer', 'Notes']
const KEY_RE = new RegExp(`(?:^|\\s)(${DUMP_KEYS.join('|')}):\\s*`, 'g')

/** Split one line containing several "Key: value" segments into {key: value}. */
function splitInlineDump(line) {
  const hits = []
  KEY_RE.lastIndex = 0
  let m
  while ((m = KEY_RE.exec(line))) hits.push({ key: m[1], start: m.index, valueStart: KEY_RE.lastIndex })
  const out = {}
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].start : line.length
    out[hits[i].key] = line.slice(hits[i].valueStart, end).trim()
  }
  return out
}

/**
 * Pull the dump out of a description. Returns { fields, prose } where prose
 * is the description text with the dump removed.
 */
function parseDescription(description) {
  const lines = htmlToLines(description).map((l) => l.trim())
  const fields = {}
  const prose = []
  for (const line of lines) {
    if (!line) continue
    KEY_RE.lastIndex = 0
    const first = KEY_RE.exec(line)
    const startsWithKey = first && first.index === 0
    const keyCount = (line.match(new RegExp(`(?:^|\\s)(?:${DUMP_KEYS.join('|')}):`, 'g')) || []).length
    if (startsWithKey || keyCount >= 2) {
      Object.assign(fields, splitInlineDump(line))
    } else {
      prose.push(line)
    }
  }
  if (fields.Equipment === undefined && fields.Asset !== undefined) fields.Equipment = fields.Asset
  return { fields, prose: prose.join('\n\n').trim() }
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------------------

async function main() {
  if (!URI) {
    console.error('No connection string. Set MONGODB_URI or pass --uri.')
    process.exit(1)
  }
  await mongoose.connect(URI)
  const db = mongoose.connection.db

  const filter = {
    ...(PROJECT ? { projectId: new mongoose.Types.ObjectId(PROJECT) } : {}),
    $or: [
      { title: /^Checklist:/i },
      { description: /(?:Equipment|Asset):\s*\S[\s\S]*?Section:/ },
    ],
  }
  const issues = await db.collection('issues').find(filter).sort({ projectId: 1, number: 1 }).toArray()
  const projectNames = {}
  for (const p of await db.collection('projects').find({}).project({ name: 1 }).toArray()) {
    projectNames[String(p._id)] = p.name
  }
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} · ${issues.length} checklist-dump issues\n`)

  const updates = []
  const problems = []

  for (const issue of issues) {
    const pid = String(issue.projectId)
    const head = `#${issue.number} (${projectNames[pid] || pid})`
    const fromTitle = parseTitle(issue.title) || {}
    const { fields, prose } = parseDescription(issue.description)
    const secFromDesc = parseSection(fields.Section)

    const tag = (fromTitle.tag || fields.Equipment || issue.tag || '').trim()
    const secNum = fromTitle.secNum ?? secFromDesc.num
    const secTitle = fromTitle.secTitle || secFromDesc.title || ''
    let qNum = fromTitle.qNum ?? null
    let qText = fromTitle.qText || (fields.Question || '').replace(/\?+\s*$/, '').trim()
    const answer = (fields.Answer || '').trim().toLowerCase()
    const notes = (fields.Notes || '').trim()

    // Validate against the equipment's embedded checklist.
    let equipment = null
    let checklist = null
    let question = null
    let valid = []
    if (tag) {
      equipment = await db.collection('equipment').findOne(
        { projectId: issue.projectId, tag },
        { projection: { tag: 1, 'checklists.number': 1, 'checklists.title': 1, 'checklists.type': 1, 'checklists.questions.number': 1, 'checklists.questions.question_text': 1, 'checklists.questions.answer': 1 } }
      )
      if (!equipment) valid.push(`no equipment with tag "${tag}"`)
    } else valid.push('no equipment tag found')
    if (equipment) {
      const cls = equipment.checklists || []
      checklist = secNum != null ? cls.find((c) => Number(c.number) === secNum) : null
      if (!checklist && secTitle) checklist = cls.find((c) => norm(c.title) === norm(secTitle))
      if (!checklist) valid.push(`no checklist "Sec ${secNum} – ${secTitle}" on ${tag}`)
      else if (secTitle && norm(checklist.title) !== norm(secTitle)) valid.push(`checklist title mismatch ("${checklist.title}")`)
    }
    if (checklist) {
      const qs = checklist.questions || []
      // Older checklists store number: null on questions; the UI displays
      // position+1 (ChecklistPanel.vue), so resolve numbers the same way.
      const displayNum = (q, idx) => (q.number ?? idx + 1)
      let qIdx = qNum != null ? qs.findIndex((q, idx) => Number(displayNum(q, idx)) === qNum) : -1
      if (qIdx < 0 && qText) {
        qIdx = qs.findIndex((q) => {
          const a = norm(q.question_text); const b = norm(qText)
          return a && b && (a === b || a.startsWith(b) || b.startsWith(a))
        })
      }
      question = qIdx >= 0 ? qs[qIdx] : null
      if (question) {
        const dn = Number(displayNum(question, qIdx))
        if (qNum != null && dn !== qNum) valid.push(`question number mismatch (Q${dn})`)
        qNum = dn
        qText = String(question.question_text || qText).replace(/\?+\s*$/, '').trim()
      } else if (qNum != null || qText) valid.push(`question not found on checklist`)
    }

    // Proposed title.
    let newTitle = issue.title
    let titleNote = 'kept (already human)'
    if (fromTitle.human !== undefined) {
      newTitle = fromTitle.human
      titleNote = 'stripped "Checklist:" prefix'
    } else if (fromTitle.tag !== undefined) {
      const curated = CURATED_TITLES[`${pid}:${issue.number}`]
      if (curated) { newTitle = curated; titleNote = 'curated' }
      else { titleNote = 'NEEDS-TITLE (dump title, no curated replacement — skipped on apply)' }
    }

    // Proposed description: prose with the dump removed; the Notes value is
    // the prose when nothing else remains.
    let newDesc = prose || notes
    if (!newDesc) newDesc = String(issue.description || '').trim()

    const source = {
      sourceType: 'checklist',
      ...(equipment ? { equipmentId: equipment._id } : {}),
      equipmentTag: tag,
      ...(secNum != null ? { checklistNumber: secNum } : {}),
      checklistTitle: (checklist && checklist.title) || secTitle,
      checklistType: (checklist && checklist.type) || '',
      ...(qNum != null ? { questionNumber: qNum } : {}),
      questionText: qText,
      answer: answer || String((question && question.answer) || ''),
    }

    console.log(`================ ${head} ================`)
    console.log(`title:  ${JSON.stringify(issue.title)}`)
    console.log(`   ->   ${JSON.stringify(newTitle)}   [${titleNote}]`)
    console.log(`source: ${tag} · Sec ${secNum ?? '?'} – ${source.checklistTitle}${qNum != null ? ` · Q${qNum}` : ''}${qText ? ` – ${qText}` : ''}${source.answer ? ` · answer: ${source.answer.toUpperCase()}` : ''}`)
    console.log(`        checklistType: ${source.checklistType || '(unknown)'} · equipmentId: ${equipment ? equipment._id : '(none)'}`)
    const descChanged = newDesc !== String(issue.description || '').trim()
    console.log(`desc:   ${descChanged ? 'STRIPPED to -> ' + JSON.stringify(newDesc) : '(unchanged)'}`)
    if (valid.length) console.log(`VERIFY: ${valid.join(' · ')}`)
    console.log('')

    if (titleNote.startsWith('NEEDS-TITLE')) {
      problems.push(`${head}: dump title with no curated replacement`)
      continue
    }
    const set = {
      title: newTitle,
      description: newDesc,
      origin: 'checklist',
      source,
      updatedAt: new Date().toISOString(),
    }
    const update = { $set: set }
    if (equipment) update.$addToSet = { equipmentIds: equipment._id }
    updates.push({ updateOne: { filter: { _id: issue._id }, update } })
    if (valid.length) problems.push(`${head}: ${valid.join(' · ')}`)
  }

  console.log(`Summary: ${issues.length} issues matched · ${updates.length} would be updated · ${problems.length} warnings`)
  for (const p of problems) console.log('  ⚠ ' + p)

  if (APPLY && updates.length) {
    const res = await db.collection('issues').bulkWrite(updates)
    console.log(`\nApplied: ${res.modifiedCount} updates.`)
  } else if (!APPLY) {
    console.log('\nDry run only — re-run with --apply after review.')
  }
  await mongoose.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
