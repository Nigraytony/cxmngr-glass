import { defineStore } from 'pinia'
import axios from 'axios'
import { ref } from 'vue'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

export interface Issue {
  _id?: string
  id?: string
  projectId: string
  number?: number
  tag?: string
  title: string
  description: string
  type?: string
  dateFound?: string
  foundBy?: string
  dueDate?: string
  assignedTo?: string
  labels?: string[]
  severity?: 'Low' | 'Medium' | 'High'
  status?: 'Open' | 'In Progress' | 'Closed'
  closedDate?: string
  closedBy?: string
  system?: string
  location?: string
  recommendation?: string
  resolution?: string
  assetId?: string
  activityId?: string
  photos?: string[]
  documents?: string[]
  comments?: string[]
  logs?: string[]
  createdAt?: string
  updatedAt?: string
}

import { getApiBase } from '../utils/api'
const API_BASE = `${getApiBase()}/api/issues`

export const useIssuesStore = defineStore('issues', () => {
  const issues = ref<Issue[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function authHeaders() {
    return getAuthHeaders()
  }

  function normalize(issue: any): Issue & any {
    if (!issue) return issue
    // map backend fields to the UI's expected keys for compatibility
    const mapped = { ...issue, id: issue._id || issue.id }
    // severity (Low/Medium/High) -> priority (UI expects strings like 'High', 'Medium')
    if (!mapped.priority && mapped.severity) mapped.priority = mapped.severity
    // assignedTo -> responsible_person
    if (!mapped.responsible_person && mapped.assignedTo) mapped.responsible_person = mapped.assignedTo
    return mapped
  }

  // fetchIssues optionally accepts a projectId; if omitted it will use the currentProjectId from project store
  // Note: backend defaults to 25 items/page; we request a larger page size so project-scoped UIs
  // (ActivityEdit/EquipmentEdit) can see the full set of issues without pagination.
  async function fetchIssues(projectId?: string) {
    loading.value = true
    error.value = null
    try {
      // determine projectId: explicit param wins, otherwise use project store, otherwise localStorage
      const projectStore = useProjectStore()
      const pid = projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || undefined
      // If no project id is available, do not fetch global issues — return empty list.
      if (!pid) {
        issues.value = []
        return issues.value
      }

      const res = await axios.get(API_BASE, { params: { projectId: pid, page: 1, perPage: 200 }, headers: authHeaders() })
      const payload = res.data || []
      // Support both legacy array response and new paginated shape { items, total, ... }
      const items = Array.isArray(payload)
        ? payload
        : (Array.isArray((payload as any).items) ? (payload as any).items : [])
      issues.value = items.map(normalize)
      return issues.value
    } catch (err: any) {
      console.error('fetchIssues error', err)
      error.value = err.message || 'Failed to fetch issues'
      issues.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchIssue(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.get(`${API_BASE}/${id}`, { headers: authHeaders() })
      const it = normalize(res.data)
      const key = String((it as any).id || (it as any)._id || id)
      if (key) {
        const idx = issues.value.findIndex(x => String((x as any).id || (x as any)._id || '') === key)
        if (idx === -1) issues.value.push(it as any)
        else issues.value.splice(idx, 1, it as any)
      }
      return it
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch issue'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createIssue(payload: Partial<Issue>) {
    loading.value = true
    error.value = null
    try {
      if (!payload.projectId) throw new Error('projectId is required to create an issue')
      const res = await axios.post(API_BASE, payload, { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
      const ni = normalize(res.data)
      issues.value.unshift(ni)
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('issues', String(ni.id || (ni as any)._id), { type: 'create', message: `Issue created: ${ni.title || ''}`, details: ni })
      } catch (e) { /* non-blocking */ }
      return ni
    } catch (err: any) {
      // Surface subscription/payment errors explicitly so the UI can show a CTA
      if (err?.response?.status === 402) {
        const subErr: any = new Error(err.response.data?.error || 'Subscription required')
        subErr.status = 402
        subErr.isSubscriptionError = true
        error.value = subErr.message
        throw subErr
      }
      error.value = err.message || 'Failed to create issue'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateIssue(id: string, payload: Partial<Issue>) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.patch(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
      const updated = normalize(res.data)
      const idx = issues.value.findIndex(i => (i.id || i._id) === (updated.id || updated._id))
      if (idx !== -1) issues.value.splice(idx, 1, updated)
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('issues', String(updated.id || updated._id), { type: 'update', message: `Issue updated: ${updated.title || ''}`, details: payload })
      } catch (e) { /* non-blocking */ }
      return updated
    } catch (err: any) {
      if (err?.response?.status === 402) {
        const subErr: any = new Error(err.response.data?.error || 'Subscription required')
        subErr.status = 402
        subErr.isSubscriptionError = true
        error.value = subErr.message
        throw subErr
      }
      error.value = err.message || 'Failed to update issue'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteIssue(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.delete(`${API_BASE}/${id}`, { headers: authHeaders() })
      const removed = normalize(res.data)
      issues.value = issues.value.filter(i => (i.id || i._id) !== (removed.id || removed._id) && (i.id || i._id) !== id)
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('issues', String(id), { type: 'delete', message: `Issue deleted: ${id}` })
      } catch (e) { /* non-blocking */ }
      return removed
    } catch (err: any) {
        if (err?.response?.status === 402) {
          const subErr: any = new Error(err.response.data?.error || 'Subscription required')
          subErr.status = 402
          subErr.isSubscriptionError = true
          error.value = subErr.message
          throw subErr
        }
        error.value = err.message || 'Failed to delete issue'
        throw err
    } finally {
      loading.value = false
    }
  }

  return {
    issues,
    loading,
    error,
    fetchIssues,
    fetchIssue,
    createIssue,
    updateIssue,
    deleteIssue,
  }
})
