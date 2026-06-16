import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '../utils/http'

/**
 * Pinia store for the Cx Final Report (one per project).
 *
 * Backend lives at /api/projects/:projectId/final-report — see
 * backend-api/routes/finalReports.js for the contract this store mirrors.
 */

export type FinalReportSection = {
  _id?: string
  key: string
  title: string
  order: number
  type: 'prose' | 'data'
  enabled: boolean
  contentHtml: string
  dataSource: string | null
  dataConfig: Record<string, any>
  pageBreakBefore: boolean
  includeInToc: boolean
}

export type FinalReportRelease = {
  version: number
  releasedAt: string
  releasedBy: string
  pdfBlobUrl: string | null
  note: string
}

export type FinalReportCoverLogoSource = 'commissioning_agent' | 'client' | 'custom' | 'none'
export type FinalReportCover = {
  title: string
  subtitle: string
  logoSource: FinalReportCoverLogoSource
  customLogoUrl: string | null
  ownerLogoBlobUrl: string | null
  showProjectImage: boolean
}

export type FinalReportPermissions = {
  canEdit: boolean
  canLock: boolean
  canUnlock: boolean
}

export type FinalReport = {
  _id: string
  projectId: string
  status: 'draft' | 'in_review' | 'final'
  lockedAt: string | null
  lockedBy: string | null
  currentVersion: number
  sections: FinalReportSection[]
  cover: FinalReportCover
  releases: FinalReportRelease[]
  createdAt: string
  updatedAt: string
  permissions: FinalReportPermissions | null
}

/** Data returned from POST /sections/:key/refresh — shape varies per source. */
export type DataSourceResult = {
  key: string
  dataSource: string
  data: any
}

export const useFinalReportStore = defineStore('finalReport', () => {
  const report = ref<FinalReport | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  /**
   * Cache of refreshed data-section payloads. Keyed by section.key. The
   * editor pulls from here so re-renders don't re-hit the backend, but
   * refreshSection() drops in fresh data on demand.
   */
  const sectionData = ref<Record<string, any>>({})

  const isLocked = computed(
    () => report.value?.status === 'in_review' || report.value?.status === 'final',
  )
  const canEdit = computed(() => Boolean(report.value?.permissions?.canEdit) && !isLocked.value)
  const canLock = computed(() => Boolean(report.value?.permissions?.canLock))
  const canUnlock = computed(() => Boolean(report.value?.permissions?.canUnlock))

  function setError(e: any, fallback: string) {
    const msg =
      (e && e.response && e.response.data && e.response.data.error) || (e && e.message) || fallback
    error.value = String(msg)
    return error.value
  }

  async function load(projectId: string): Promise<FinalReport> {
    if (!projectId) throw new Error('projectId is required')
    loading.value = true
    error.value = null
    try {
      const { data } = await http.get<FinalReport>(`/api/projects/${projectId}/final-report`)
      report.value = data
      return data
    } catch (e) {
      setError(e, 'Failed to load Final Report')
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Save sections + cover. Rejects (and surfaces error) when the report is
   * locked — the backend returns 409 with code FINAL_REPORT_LOCKED.
   */
  async function save(payload: {
    sections?: FinalReportSection[]
    cover?: FinalReportCover
  }): Promise<FinalReport> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    saving.value = true
    error.value = null
    try {
      const { data } = await http.put<FinalReport>(
        `/api/projects/${projectId}/final-report`,
        payload,
      )
      report.value = data
      return data
    } catch (e) {
      setError(e, 'Failed to save Final Report')
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Pull live data for a single data section. Caches in sectionData; the
   * caller can read from store.sectionData[key] after this resolves.
   */
  async function refreshSection(key: string): Promise<DataSourceResult> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    error.value = null
    try {
      const { data } = await http.post<DataSourceResult>(
        `/api/projects/${projectId}/final-report/sections/${encodeURIComponent(key)}/refresh`,
      )
      sectionData.value = { ...sectionData.value, [key]: data.data }
      return data
    } catch (e) {
      setError(e, `Failed to refresh ${key}`)
      throw e
    }
  }

  /**
   * Pull all data sections in parallel. Used by the "Refresh All Data"
   * button in the report toolbar.
   */
  async function refreshAllSections(): Promise<void> {
    const sections = (report.value?.sections || []).filter(
      (s) => s.type === 'data' && s.enabled && s.dataSource,
    )
    await Promise.allSettled(sections.map((s) => refreshSection(s.key)))
  }

  async function lock(status: 'in_review' | 'final', note = ''): Promise<FinalReport> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    saving.value = true
    error.value = null
    try {
      const { data } = await http.post<FinalReport>(
        `/api/projects/${projectId}/final-report/lock`,
        { status, note },
      )
      report.value = data
      return data
    } catch (e) {
      setError(e, 'Failed to lock report')
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Generate a preview PDF for the current draft. Returns a short-lived
   * SAS URL the caller can open in a new tab to download. Synchronous on
   * the wire — the backend can take 30-60 seconds for a large report.
   */
  async function generatePdf(): Promise<{ url: string; sizeBytes: number; generatedAt: string }> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    saving.value = true
    error.value = null
    try {
      const { data } = await http.post<{ url: string; sizeBytes: number; generatedAt: string }>(
        `/api/projects/${projectId}/final-report/pdf`,
        {},
        { timeout: 180_000 }, // 3 min — Puppeteer + Azure can be slow
      )
      return data
    } catch (e) {
      setError(e, 'Failed to generate PDF')
      throw e
    } finally {
      saving.value = false
    }
  }

  /**
   * Sign the PDF for a specific released version (immutable, generated at
   * lock-final time). Used for "Download released PDF" on locked reports.
   */
  async function getReleasePdfUrl(version: number): Promise<string> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    error.value = null
    try {
      const { data } = await http.get<{ url: string }>(
        `/api/projects/${projectId}/final-report/releases/${version}/pdf`,
      )
      return data.url
    } catch (e) {
      setError(e, 'Failed to fetch release PDF')
      throw e
    }
  }

  async function unlock(): Promise<FinalReport> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    saving.value = true
    error.value = null
    try {
      const { data } = await http.post<FinalReport>(
        `/api/projects/${projectId}/final-report/unlock`,
      )
      report.value = data
      return data
    } catch (e) {
      setError(e, 'Failed to unlock report')
      throw e
    } finally {
      saving.value = false
    }
  }

  /** Add a manual entry to the revision log, then refresh the Revisions section. */
  async function addRevision(entry: { versionLabel?: string; summary?: string; reviserName?: string; date?: string }): Promise<void> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    error.value = null
    try {
      await http.post(`/api/projects/${projectId}/final-report/revisions`, entry)
      await refreshSection('revisions')
    } catch (e) {
      setError(e, 'Failed to add revision')
      throw e
    }
  }

  /** Remove a manual revision-log entry, then refresh the Revisions section. */
  async function deleteRevision(revisionId: string): Promise<void> {
    const projectId = report.value?.projectId
    if (!projectId) throw new Error('Report not loaded')
    error.value = null
    try {
      await http.delete(`/api/projects/${projectId}/final-report/revisions/${encodeURIComponent(revisionId)}`)
      await refreshSection('revisions')
    } catch (e) {
      setError(e, 'Failed to delete revision')
      throw e
    }
  }

  function reset() {
    report.value = null
    sectionData.value = {}
    error.value = null
  }

  return {
    report,
    loading,
    saving,
    error,
    sectionData,
    isLocked,
    canEdit,
    canLock,
    canUnlock,
    load,
    save,
    refreshSection,
    refreshAllSections,
    lock,
    unlock,
    generatePdf,
    getReleasePdfUrl,
    addRevision,
    deleteRevision,
    reset,
  }
})
