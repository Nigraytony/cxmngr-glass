#!/usr/bin/env node
/**
 * Issues batch redesign — Step 0 date migration (GATED: run --apply only
 * after Tony reviews the dry-run output; see docs/issues_batch_reports_redesign.md).
 *
 * dateFound / dueDate / closedDate are DATE-ONLY values. This script
 * normalizes every stored value to plain "YYYY-MM-DD":
 *   - "YYYY-MM-DD"                      -> unchanged
 *   - ISO at UTC midnight (T00:00:00Z)  -> its date part (that IS the date)
 *   - other parseable timestamps        -> the calendar date in the project
 *                                          timezone (--tz, default
 *                                          America/New_York)
 *   - unparseable text ("Before startup") -> unchanged, listed for review
 *
 * Usage:
 *   node scripts/migrate_issue_dates.js                 # dry run, all projects
 *   node scripts/migrate_issue_dates.js --project <id>  # dry run, one project
 *   node scripts/migrate_issue_dates.js --apply         # write changes
 * Connection: MONGODB_URI env var or --uri <connection string>.
 *
 * The dry run prints every change as before -> after, highlights issues
 * #1, #13 and #20 explicitly (the spec's sample set), and ends with counts.
 */
const mongoose = require('mongoose')

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const val = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : null
}

const APPLY = flag('apply')
const TZ = val('tz') || 'America/New_York'
const URI = val('uri') || process.env.MONGODB_URI
const PROJECT = val('project')
const FIELDS = ['dateFound', 'dueDate', 'closedDate']
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const UTC_MIDNIGHT = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|\+00:00)$/

function normalize(value) {
  if (value === null || value === undefined) return { action: 'skip' }
  const s = String(value).trim()
  if (!s) return { action: 'skip' }
  if (DATE_ONLY.test(s)) return { action: 'ok' }
  const mid = s.match(UTC_MIDNIGHT)
  if (mid) return { action: 'change', to: mid[1], rule: 'utc-midnight -> date part' }
  const d = new Date(s)
  if (isNaN(d.getTime())) return { action: 'review', note: 'unparseable, left unchanged' }
  // Calendar date in the project timezone.
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return { action: 'change', to: parts, rule: `timestamp -> ${TZ} calendar date` }
}

async function main() {
  if (!URI) {
    console.error('No connection string. Set MONGODB_URI or pass --uri.')
    process.exit(1)
  }
  await mongoose.connect(URI)
  const Issue = require('../models/issue')

  const filter = PROJECT ? { projectId: PROJECT } : {}
  const issues = await Issue.find(filter).select('number projectId dateFound dueDate closedDate title').lean()
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} · ${issues.length} issues · tz=${TZ}\n`)

  const changes = []
  const reviews = []
  let okCount = 0
  for (const i of issues) {
    for (const f of FIELDS) {
      const r = normalize(i[f])
      if (r.action === 'ok') okCount++
      else if (r.action === 'change') changes.push({ id: i._id, number: i.number, field: f, from: String(i[f]), to: r.to, rule: r.rule })
      else if (r.action === 'review') reviews.push({ number: i.number, field: f, value: String(i[f]) })
    }
  }

  const sample = new Set([1, 13, 20])
  console.log('--- Spec sample issues (#1, #13, #20) ---')
  for (const i of issues.filter(x => sample.has(Number(x.number)))) {
    for (const f of FIELDS) {
      const r = normalize(i[f])
      console.log(`#${i.number} ${f}: ${JSON.stringify(i[f])} -> ${r.action === 'change' ? r.to : r.action === 'ok' ? '(unchanged, already date-only)' : r.action}`)
    }
  }

  console.log('\n--- All changes ---')
  for (const chg of changes) console.log(`#${chg.number} ${chg.field}: ${chg.from} -> ${chg.to}   (${chg.rule})`)
  if (reviews.length) {
    console.log('\n--- Needs review (left unchanged) ---')
    for (const r of reviews) console.log(`#${r.number} ${r.field}: ${JSON.stringify(r.value)}`)
  }
  console.log(`\nSummary: ${okCount} values already date-only · ${changes.length} to change · ${reviews.length} to review`)

  if (APPLY && changes.length) {
    const ops = changes.map(chg => ({
      updateOne: { filter: { _id: chg.id }, update: { $set: { [chg.field]: chg.to } } },
    }))
    const res = await Issue.bulkWrite(ops)
    console.log(`\nApplied: ${res.modifiedCount} updates.`)
  } else if (!APPLY) {
    console.log('\nDry run only — re-run with --apply after review.')
  }
  await mongoose.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
