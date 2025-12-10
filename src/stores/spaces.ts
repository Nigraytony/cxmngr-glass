import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'

export interface Space {
  id?: string
  _id?: string
  tag?: string
  title: string
  type: string // e.g., Building, Floor, Room, Area, Level, Corridor, Roof
  description?: string
  project: string // projectId
  projectId?: string
  parentSpace?: string | null // parent Space id
  attributes?: Array<{ key: string; value: string }>
  attachments?: any
  settings?: any
  notes?: string
  metaData?: any
  createdAt?: string
  updatedAt?: string
}

const API_BASE = `${getApiBase()}/api/spaces`

export const useSpacesStore = defineStore('spaces', () => {
  const items = ref<Space[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)

  const byId = computed<Record<string, Space>>(() => {
    const m: Record<string, Space> = {}
    for (const s of items.value) {
      const id = (s.id || (s as any)._id)
      if (id) m[String(id)] = s
    }
    return m
  })

  async function fetchByProject(projectId: string) {
    if (!projectId) { items.value = []; return }
    const pid = String(projectId)
    // Clear stale items when switching projects
    if (items.value.length && items.value.some(s => String((s as any).project || (s as any).projectId || '') !== pid)) {
      items.value = []
    }
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/project/${pid}`, { headers: getAuthHeaders() })
      // Support both legacy array response and new paginated shape { items, total, types, typeCounts }
      const payload = data || []
      const list = Array.isArray(payload)
        ? payload
        : (Array.isArray((payload as any).items) ? (payload as any).items : [])
      items.value = list.map((d: any) => ({ ...d, id: d._id }))
    } catch (e: any) {
      if (e?.response?.status === 403 && (e?.response?.data?.code === 'FEATURE_NOT_IN_PLAN')) {
        items.value = []
        error.value = null
        errorCode.value = 'FEATURE_NOT_IN_PLAN'
        return
      }
      if (e?.response?.status === 404 && (e?.response?.data?.code === 'PROJECT_NOT_FOUND')) {
        items.value = []
        error.value = 'Project not found'
        errorCode.value = 'PROJECT_NOT_FOUND'
        return
      }
      error.value = e?.response?.data?.error || e?.message || 'Failed to load spaces'
      errorCode.value = e?.response?.data?.code || null
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string) {
    if (!id) return null
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
      const sp = { ...data, id: data._id }
      const idx = items.value.findIndex(s => (s.id || (s as any)._id) === id)
      if (idx !== -1) items.value.splice(idx, 1, sp)
      else items.value.push(sp)
      return sp
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load space'
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(space: Space) {
    const payload: any = { ...space }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
    // Normalize projectId -> project for backend
    if (!payload.project && payload.projectId) {
      payload.project = payload.projectId
    }
    const { data } = await axios.post(`${API_BASE}`, payload, { headers: getAuthHeaders() })
    const saved = { ...data, id: data._id }
    items.value.push(saved)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('spaces', String(saved.id || (saved as any)._id), { type: 'create', message: `Space created: ${saved.title || saved.tag || ''}`, details: saved })
    } catch (e) { /* non-blocking */ }
    return saved
  }

  async function update(space: Space & { id: string }) {
    const id = space.id || (space as any)._id
    if (!id) throw new Error('Missing space id')
    const payload: any = { ...space }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
    const { data } = await axios.patch(`${API_BASE}/${id}`, payload, { headers: getAuthHeaders() })
    const idx = items.value.findIndex(s => (s.id || (s as any)._id) === id)
    if (idx !== -1) items.value[idx] = { ...data, id: data._id }
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('spaces', String(id), { type: 'update', message: `Space updated: ${data?.title || id}`, details: space })
    } catch (e) { /* non-blocking */ }
    return items.value[idx]
  }

  async function remove(id: string) {
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(s => (s.id || (s as any)._id) !== id)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('spaces', String(id), { type: 'delete', message: `Space deleted: ${id}` })
    } catch (e) { /* non-blocking */ }
  }

  function buildTree() {
    const nodes = items.value.map(s => ({ ...s })) as any[]
    const map: Record<string, any> = {}
    for (const n of nodes) {
      const id = n.id || n._id
      if (id) {
        map[String(id)] = n
        n.children = []
      }
    }
    const roots: any[] = []
    for (const n of nodes) {
      const pid = n.parentSpace
      if (pid && map[String(pid)]) {
        map[String(pid)].children.push(n)
      } else {
        roots.push(n)
      }
    }
    return roots
  }

  return { items, loading, error, errorCode, byId, fetchByProject, fetchOne, create, update, remove, buildTree }
})
