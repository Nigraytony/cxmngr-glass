// People/company display names, shared by the reports AND the Issues list
// UI. Dependency-free on purpose (like labels.ts) so the list page can show
// short names without pulling the report model into its bundle.

/** Company display name via the project's short-name map, else suffix-stripped. */
export function shortCompany(name: string, map: Record<string, string> = {}): string {
  const full = String(name || '').trim()
  if (!full) return ''
  for (const [k, v] of Object.entries(map)) {
    if (k.trim().toLowerCase() === full.toLowerCase()) return String(v)
  }
  const stripped = full.replace(/[,.]?\s*(LLC|L\.L\.C\.|Inc|Incorporated|Corp|Corporation|Co|Company|Ltd)\.?$/i, '').trim().replace(/[,.]+$/, '')
  return stripped || full
}

/** "Name (Company)" / "Name - Company" -> "Name · ShortCo". */
export function formatPerson(raw: any, map: Record<string, string> = {}): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)\s*[(–-]\s*([^)]+?)\)?$/)
  if (m && m[2] && m[1]) {
    return `${m[1].trim()} · ${shortCompany(m[2], map)}`
  }
  return s
}
