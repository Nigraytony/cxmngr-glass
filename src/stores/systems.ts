import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'

export interface SystemRecord {
  id?: string
  _id?: string
  projectId: string
  tag?: string
  name: string
  type?: string
  description?: string
  parentSystem?: string | null
  equipmentIds?: string[]
  issueIds?: string[]
  oprItemIds?: string[]
  checklists?: any
  functionalTests?: any
  fptSignatures?: any
  tags?: string[]
  attributes?: Array<{ key: string; value: string }>
  metadata?: any
  createdAt?: string
  updatedAt?: string
}

const API_BASE = `${getApiBase()}/api/systems`

export const useSystemsStore = defineStore('systems', () => {
  const items = ref<SystemRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)

  const byId = computed<Record<string, SystemRecord>>(() => {
    const m: Record<string, SystemRecord> = {}
    for (const s of items.value) {
      const id = s.id || (s as any)._id
      if (id) m[String(id)] = s
    }
    return m
  })

  async function fetchByProject(projectId: string) {
    if (!projectId) { items.value = []; return }
    const pid = String(projectId)
    // Clear stale items when switching projects
    if (items.value.length && items.value.some(s => String((s as any).projectId || '') !== pid)) {
      items.value = []
    }
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/project/${pid}`, { headers: getAuthHeaders() })
      const list = Array.isArray(data) ? data : []
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
      items.value = []
      error.value = e?.response?.data?.error || e?.message || 'Failed to load systems'
      errorCode.value = e?.response?.data?.code || null
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
      const sys = { ...data, id: data._id }
      const idx = items.value.findIndex(s => (s.id || (s as any)._id) === id)
      if (idx !== -1) items.value.splice(idx, 1, sys)
      else items.value.push(sys)
      return sys
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load system'
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(payload: SystemRecord) {
    const body: any = { ...payload }
    if (body.id) delete body.id
    if (body._id) delete body._id
    const { data } = await axios.post(`${API_BASE}`, body, { headers: getAuthHeaders() })
    const saved = { ...data, id: data._id }
    items.value.push(saved)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('systems', String(saved.id || (saved as any)._id), { type: 'create', message: `System created: ${saved.name || saved.tag || ''}`, details: saved })
    } catch (e) { /* non-blocking */ }
    return saved
  }

  async function update(payload: SystemRecord & { id: string }) {
    const id = payload.id || (payload as any)._id
    if (!id) throw new Error('Missing system id')
    const body: any = { ...payload }
    if (body.id) delete body.id
    if (body._id) delete body._id

    let data: any
    try {
      ({ data } = await axios.patch(`${API_BASE}/${id}`, body, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        ({ data } = await axios.put(`${API_BASE}/${id}`, body, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
      } else {
        throw err
      }
    }

    const saved = { ...data, id: data._id || id }
    const idx = items.value.findIndex(s => (s.id || (s as any)._id) === id)
    if (idx !== -1) items.value[idx] = saved
    else items.value.push(saved)

    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('systems', String(saved.id || (saved as any)._id), { type: 'update', message: `System updated: ${saved.name || saved.tag || ''}`, details: payload, patchKeys: Object.keys(body || {}) })
    } catch (e) { /* non-blocking */ }

    return saved
  }

  async function updateFields(id: string, payload: Partial<SystemRecord>) {
    if (!id) throw new Error('Missing system id')
    const body: any = { ...payload }
    if (body.id) delete body.id
    if (body._id) delete body._id
    const { data } = await axios.patch(`${API_BASE}/${id}`, body, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
    const saved = { ...data, id: data._id || id }
    const idx = items.value.findIndex(s => (s.id || (s as any)._id) === id)
    if (idx !== -1) items.value[idx] = saved
    else items.value.push(saved)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('systems', String(saved.id || (saved as any)._id), { type: 'update', message: `System updated: ${saved.name || saved.tag || ''}`, details: payload, patchKeys: Object.keys(body || {}) })
    } catch (e) { /* non-blocking */ }
    return saved
  }

  async function remove(id: string) {
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(s => (s.id || (s as any)._id) !== id)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('systems', String(id), { type: 'delete', message: `System deleted: ${id}` })
    } catch (e) { /* non-blocking */ }
  }

  return { items, loading, error, errorCode, byId, fetchByProject, fetchOne, create, update, updateFields, remove }
})
