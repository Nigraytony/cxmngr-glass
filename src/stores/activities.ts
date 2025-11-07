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

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref<Activity[]>([])
  const current = ref<Activity | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function normalize(a: any): Activity & any {
    if (!a) return a
    return { ...a, id: a._id || a.id }
  }

  async function fetchActivities(projectId?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.get(API_BASE, { headers: getAuthHeaders() })
      const list = (res.data || []).map(normalize)
      // If a projectId is provided or selected, filter client-side
      const projectStore = useProjectStore()
      const pid = projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  activities.value = pid ? list.filter((a: any) => String(a.projectId) === String(pid)) : list
      return activities.value
    } catch (e: any) {
      console.error('fetchActivities error', e)
      error.value = e.message || 'Failed to fetch activities'
      activities.value = []
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchActivity(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
      current.value = normalize(res.data)
      return current.value
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch activity'
      throw e
    } finally {
      loading.value = false
    }
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

  return { activities, current, loading, error, fetchActivities, fetchActivity, createActivity, updateActivity, uploadPhotos, removePhoto, updatePhotoCaption, downloadReport }
})
