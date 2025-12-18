export type DiffEntry = { from: any; to: any }
export type EquipmentLogDetails = {
  changes?: Record<string, DiffEntry>
  counts?: Record<string, DiffEntry>
}

function summarizeString(v: string) {
  const s = String(v)
  if (s.length <= 220) return s
  return `${s.slice(0, 220)}… (${s.length} chars)`
}

function summarizeValue(v: any) {
  if (v == null) return v
  if (typeof v === 'string') return summarizeString(v)
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (Array.isArray(v)) {
    const n = v.length
    if (n <= 12) return v
    return { count: n, sample: v.slice(0, 5) }
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v)
    if (keys.length <= 16) return v
    return { keys: keys.length, sampleKeys: keys.slice(0, 12) }
  }
  try {
    return String(v)
  } catch {
    return undefined
  }
}

function safeEq(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return false
  if (ta === 'string' || ta === 'number' || ta === 'boolean') return a === b
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function countFor(v: any): number {
  if (Array.isArray(v)) return v.length
  if (v && typeof v === 'object') return Object.keys(v).length
  return 0
}

export function buildEquipmentLogDetails(prev: any, next: any): EquipmentLogDetails | undefined {
  const p = prev && typeof prev === 'object' ? prev : {}
  const n = next && typeof next === 'object' ? next : {}

  const fieldKeys = [
    'tag',
    'title',
    'type',
    'system',
    'status',
    'spaceId',
    'space',
    'description',
    'responsible',
    'template',
    'labels',
    'attributes',
  ]

  const changes: Record<string, DiffEntry> = {}
  for (const k of fieldKeys) {
    const a = (p as any)[k]
    const b = (n as any)[k]
    if (!safeEq(a, b)) {
      changes[k] = { from: summarizeValue(a), to: summarizeValue(b) }
    }
  }

  const countsKeys: Array<{ key: string; label: string }> = [
    { key: 'photos', label: 'photos' },
    { key: 'attachments', label: 'attachments' },
    { key: 'issues', label: 'issues' },
    { key: 'components', label: 'components' },
    { key: 'checklists', label: 'checklists' },
    { key: 'functionalTests', label: 'functionalTests' },
    { key: 'fptSignatures', label: 'fptSignatures' },
  ]

  const counts: Record<string, DiffEntry> = {}
  for (const { key, label } of countsKeys) {
    const a = countFor((p as any)[key])
    const b = countFor((n as any)[key])
    if (a !== b) counts[label] = { from: a, to: b }
  }

  const out: EquipmentLogDetails = {}
  if (Object.keys(changes).length) out.changes = changes
  if (Object.keys(counts).length) out.counts = counts
  return (out.changes || out.counts) ? out : undefined
}

