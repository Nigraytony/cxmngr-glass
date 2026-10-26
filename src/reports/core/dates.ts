// Shared date formatting for reports (Issues batch redesign Step 0, the
// read-time slice). dateFound / dueDate / closedDate are DATE-ONLY values:
// a bare "YYYY-MM-DD" must never be run through `new Date(...)` +
// toLocaleDateString, which parses it as UTC midnight and prints the
// PREVIOUS day in US timezones (the 10/15 → 10/14 bug). The full audit +
// storage migration is a separate, gated step; every renderer formats
// through these helpers in the meantime.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?(?:Z|\+00:00)$)/

/** Format a date-only value (M/D/YYYY) without any timezone shift. */
export function formatDateOnly(v: any): string {
  if (!v) return ''
  const s = String(v).trim()
  const m = s.match(DATE_ONLY)
  if (m) return `${Number(m[2])}/${Number(m[3])}/${m[1]}`
  const d = new Date(v)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US')
}

/** The date-only value as a LOCAL-midnight Date (for overdue comparisons). */
export function dateOnlyToLocal(v: any): Date | null {
  if (!v) return null
  const s = String(v).trim()
  const m = s.match(DATE_ONLY)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

/** Whole days `now` is past the date-only value (negative = still ahead). */
export function daysPast(v: any, now: Date = new Date()): number | null {
  const d = dateOnlyToLocal(v)
  if (!d) return null
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((startOfToday.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}
