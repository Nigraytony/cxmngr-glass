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
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/project/${projectId}`, { headers: getAuthHeaders() })
      items.value = Array.isArray(data) ? data.map((d: any) => ({ ...d, id: d._id })) : []
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load spaces'
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
    const { data } = await axios.post(`${API_BASE}`, payload, { headers: getAuthHeaders() })
    const saved = { ...data, id: data._id }
    items.value.push(saved)
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
    return items.value[idx]
  }

  async function remove(id: string) {
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(s => (s.id || (s as any)._id) !== id)
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

  return { items, loading, error, byId, fetchByProject, fetchOne, create, update, remove, buildTree }
})
