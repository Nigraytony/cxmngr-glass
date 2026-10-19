// The one report-settings shape (Phase 3). Sections are an ORDERED list of
// { key, enabled } — the renderer draws enabled sections in this order — and
// supersede the legacy `include: Record<key, boolean>` bag, which
// normalizeReportSettings still migrates from. Persistence:
//   - entity reports: stored on the record (Activity settings.report,
//     Equipment reportSettings)
//   - list exports: per-project localStorage via reportSettingsStorageKey
// Global sessionStorage keys are retired.

export interface ReportSection {
  key: string
  enabled: boolean
}

export interface CoverSettings {
  enabled: boolean
  title: string
  subtitle: string
  byLine: string
  imageDataUrl: string
}

export interface ReportSettings {
  sections: ReportSection[]
  cover: CoverSettings
  toc: boolean
  photoLimit: number
}

/** A report's available sections, in default order. */
export interface SectionDef {
  key: string
  label: string
  /** Default enabled state (true when omitted). */
  enabled?: boolean
}

export const DEFAULT_COVER: CoverSettings = {
  enabled: false,
  title: '',
  subtitle: '',
  byLine: '',
  imageDataUrl: '',
}

export interface ReportSettingsDefaults {
  photoLimit?: number
  toc?: boolean
  cover?: Partial<CoverSettings>
}

export function defaultReportSettings(defs: SectionDef[], opts?: ReportSettingsDefaults): ReportSettings {
  return {
    sections: defs.map(d => ({ key: d.key, enabled: d.enabled !== false })),
    cover: { ...DEFAULT_COVER, ...(opts?.cover || {}) },
    toc: !!opts?.toc,
    photoLimit: typeof opts?.photoLimit === 'number' ? opts.photoLimit : 6,
  }
}

/**
 * Normalize anything previously stored — the new ordered shape, or the legacy
 * `include` boolean bag — into ReportSettings against this report's section
 * defs. Unknown stored keys are dropped; sections missing from storage are
 * appended in default order with their default state.
 */
export function normalizeReportSettings(raw: any, defs: SectionDef[], opts?: ReportSettingsDefaults): ReportSettings {
  const base = defaultReportSettings(defs, opts)
  if (!raw || typeof raw !== 'object') return base

  const known = new Map(defs.map(d => [d.key, d]))
  let sections: ReportSection[]
  if (Array.isArray(raw.sections) && raw.sections.length) {
    const seen = new Set<string>()
    sections = []
    for (const s of raw.sections) {
      const key = String(s?.key || '')
      if (!key || !known.has(key) || seen.has(key)) continue
      seen.add(key)
      sections.push({ key, enabled: s?.enabled !== false })
    }
    for (const d of defs) {
      if (!seen.has(d.key)) sections.push({ key: d.key, enabled: d.enabled !== false })
    }
  } else if (raw.include && typeof raw.include === 'object') {
    sections = defs.map(d => ({
      key: d.key,
      enabled: typeof raw.include[d.key] === 'boolean' ? raw.include[d.key] : d.enabled !== false,
    }))
  } else {
    sections = base.sections
  }

  const rawCover = (raw.cover && typeof raw.cover === 'object') ? raw.cover : {}
  return {
    sections,
    cover: {
      ...base.cover,
      ...rawCover,
      enabled: typeof rawCover.enabled === 'boolean' ? rawCover.enabled : base.cover.enabled,
    },
    toc: typeof raw.toc === 'boolean' ? raw.toc : base.toc,
    photoLimit: Number.isFinite(Number(raw.photoLimit)) ? Math.max(0, Number(raw.photoLimit)) : base.photoLimit,
  }
}

/** The enabled section keys, in render order. */
export function enabledSectionKeys(s: ReportSettings): string[] {
  return (s?.sections || []).filter(x => x.enabled).map(x => x.key)
}

export function sectionEnabled(s: ReportSettings, key: string): boolean {
  const row = (s?.sections || []).find(x => x.key === key)
  return row ? row.enabled : false
}

// ---------------------------------------------------------------------------
// Per-project localStorage persistence (list exports and similar)
// ---------------------------------------------------------------------------

export function reportSettingsStorageKey(entity: string, projectId: string): string {
  return `report:${entity}:${projectId}`
}

export function loadStoredReportSettings(storageKey: string): any | null {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function storeReportSettings(storageKey: string, s: ReportSettings): void {
  try { localStorage.setItem(storageKey, JSON.stringify(s)) } catch (e) { /* ignore */ }
}
