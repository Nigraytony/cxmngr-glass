import { defineStore } from 'pinia'
import axios from 'axios'
import { ref } from 'vue'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

export interface ActivityPhoto {
  filename?: string
  data?: string
  contentType?: string
  size?: number
  uploadedBy?: string
  uploadedByName?: string
  uploadedByAvatar?: string
  caption?: string
  createdAt?: string
}

export interface Activity {
  _id?: string
  id?: string
  name: string
  descriptionHtml?: string
  type?: string
  startDate?: string
  endDate?: string
  projectId: string
  issues?: string[]
  comments?: Array<{ userId: string; text: string; createdAt?: string }>
  photos?: ActivityPhoto[]
  attachments?: any[]
  reviewer?: any
  location?: string
  systems?: string[]
  metadata?: any
  labels?: string[]
  createdAt?: string
  updatedAt?: string
}

import { getApiBase } from '../utils/api'
const API_BASE = `${getApiBase()}/api/activities`
const API_PHOTOS = `${API_BASE}`

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref<Activity[]>([])
  const current = ref<Activity | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)

  function normalize(a: any): Activity & any {
    if (!a) return a
    return { ...a, id: a._id || a.id }
  }

  function isDeletedActivity(a: any): boolean {
    if (!a) return false
    if (a.deleted === true || a.isDeleted === true || a.softDeleted === true) return true
    const status = String(a.status || a.state || '').toLowerCase()
    if (status.includes('deleted')) return true
    return false
  }

  async function fetchActivities(projectId?: string) {
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      // determine projectId: explicit param wins, otherwise use project store, otherwise localStorage
      const projectStore = useProjectStore()
      const pid = projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || undefined

      // If no project is selected, do not fetch global activities — return empty list
      if (!pid) {
        activities.value = []
        return activities.value
      }

      const res = await axios.get(API_BASE, { params: { projectId: pid, light: true }, headers: getAuthHeaders() })
      const list = (res.data || []).map(normalize).filter(a => !isDeletedActivity(a))
      activities.value = list
      return activities.value
    } catch (e: any) {
      // If plan disables activities, backend returns 403 FEATURE_NOT_IN_PLAN; treat as empty without throwing
      if (e?.response?.status === 403 && (e?.response?.data?.code === 'FEATURE_NOT_IN_PLAN')) {
        activities.value = []
        error.value = null
        errorCode.value = 'FEATURE_NOT_IN_PLAN'
        return activities.value
      }
      if (e?.response?.status === 404 && (e?.response?.data?.code === 'PROJECT_NOT_FOUND')) {
        activities.value = []
        error.value = 'Project not found'
        errorCode.value = 'PROJECT_NOT_FOUND'
        return activities.value
      }
      error.value = e.message || 'Failed to fetch activities'
      errorCode.value = e?.response?.data?.code || null
      activities.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchActivity(id: string, opts?: { light?: boolean; includePhotos?: boolean }) {
    loading.value = true
    error.value = null
    try {
      const params: any = {}
      if (opts?.light) params.light = true
      if (opts?.includePhotos) params.includePhotos = true
      const res = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders(), params })
      current.value = normalize(res.data)
      return current.value
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchActivityPhotos(id: string) {
    const res = await axios.get(`${API_PHOTOS}/${id}/photos`, { headers: getAuthHeaders() })
    const photos = res.data || []
    if (current.value && (current.value.id === id || (current.value as any)._id === id)) {
      current.value = { ...(current.value as any), photos }
    }
    return photos
  }

  async function createActivity(payload: Partial<Activity>) {
    loading.value = true
    error.value = null
    try {
      if (!payload.projectId) throw new Error('projectId is required')
      const res = await axios.post(API_BASE, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
      const created = normalize(res.data)
      activities.value.unshift(created)
      current.value = created
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('activities', String(created.id || created._id), { type: 'create', message: `Activity created: ${created.name || ''}`, details: created })
      } catch (e) { /* non-blocking */ }
      try {
        const projectStore = useProjectStore()
        const pid = String(created.projectId || (created as any).project || '')
        if (pid) {
          await projectStore.appendProjectLog(pid, { type: 'activity.create', message: `Activity created: ${created.name || ''}`, details: { id: created.id || created._id, name: created.name } })
        }
      } catch (e) { /* non-blocking */ }
      return created
    } catch (e: any) {
      error.value = e.message || 'Failed to create activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateActivity(id: string, payload: Partial<Activity>) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.patch(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
      const updated = normalize(res.data)
      current.value = updated
      const idx = activities.value.findIndex(a => (a.id || a._id) === (updated.id || updated._id))
      if (idx !== -1) activities.value.splice(idx, 1, updated)
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('activities', String(updated.id || updated._id), { type: 'update', message: `Activity updated: ${updated.name || ''}`, details: payload })
      } catch (e) { /* non-blocking */ }
      try {
        const projectStore = useProjectStore()
        const pid = String(updated.projectId || (updated as any).project || '')
        if (pid) {
          await projectStore.appendProjectLog(pid, { type: 'activity.update', message: `Activity updated: ${updated.name || ''}`, details: { id: updated.id || updated._id, changes: payload } })
        }
      } catch (e) { /* non-blocking */ }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function uploadPhotos(id: string, files: FileList | File[]) {
    const fd = new FormData()
    const arr = Array.from(files as any)
    for (const f of arr) fd.append('photos', f as Blob)
    const res = await axios.post(`${API_BASE}/${id}/photos`, fd, { headers: { ...getAuthHeaders() } })
    const updated = normalize(res.data)
    current.value = updated
    const idx = activities.value.findIndex(a => (a.id || a._id) === (updated.id || updated._id))
    if (idx !== -1) activities.value.splice(idx, 1, updated)
    return updated
  }

  async function removePhoto(id: string, index: number) {
    // Prefer dedicated endpoint to avoid sending large base64 payloads
    const res = await axios.delete(`${API_BASE}/${id}/photos/${index}`, { headers: { ...getAuthHeaders() } })
    const updated = normalize(res.data)
    current.value = updated
    const idx = activities.value.findIndex(a => (a.id || a._id) === (updated.id || updated._id))
    if (idx !== -1) activities.value.splice(idx, 1, updated)
    return updated
  }

  async function updatePhotoCaption(id: string, index: number, caption: string) {
    const res = await axios.patch(`${API_BASE}/${id}/photos/${index}`, { caption }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
    const updated = normalize(res.data)
    current.value = updated
    const idx = activities.value.findIndex(a => (a.id || a._id) === (updated.id || updated._id))
    if (idx !== -1) activities.value.splice(idx, 1, updated)
    return updated
  }

  async function downloadReport(id: string) {
    const res = await axios.get(`${API_BASE}/${id}/report`, { headers: getAuthHeaders(), responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-${id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteActivity(id: string) {
    loading.value = true
    error.value = null
    try {
      if (!id) throw new Error('Missing activity id')
      // try to find existing record to capture projectId/name for logging
      const existing = activities.value.find(a => String(a.id || a._id) === String(id)) || current.value
      let pid = existing ? String(existing.projectId || (existing as any).project || '') : ''
      const name = existing ? (existing.name || '') : ''
      const config: any = { headers: getAuthHeaders() }
      if (pid) config.params = { projectId: pid }
      await axios.delete(`${API_BASE}/${id}`, config)
      activities.value = activities.value.filter(a => String(a.id || a._id) !== String(id))
      if (current.value && String(current.value.id || current.value?._id) === String(id)) current.value = null

      // resource-specific logs
      try {
        const { useLogsStore } = await import('./logs')
        const logs = useLogsStore()
        await logs.appendLog('activities', String(id), { type: 'delete', message: `Activity deleted: ${name || id}`, details: { id } })
      } catch (e) { /* non-blocking */ }

      // project-level logs
      try {
        if (!pid) {
          // best-effort: try to fetch the activity to get projectId
          try {
            const { data } = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
            pid = String((data && (data.projectId || data.project)) || '')
          } catch (_) { /* ignore */ }
        }
        if (pid) {
          const projectStore = useProjectStore()
          await projectStore.appendProjectLog(pid, { type: 'activity.delete', message: `Activity deleted: ${name || id}`, details: { id } })
        }
      } catch (e) { /* non-blocking */ }

      return true
    } catch (e: any) {
      error.value = e?.message || 'Failed to delete activity'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { activities, current, loading, error, errorCode, fetchActivities, fetchActivity, fetchActivityPhotos, createActivity, updateActivity, uploadPhotos, removePhoto, updatePhotoCaption, downloadReport, deleteActivity }
})
