import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { buildEquipmentLogDetails } from '../utils/equipmentLogDiff'

export interface Equipment {
  id?: string
  _id?: string
  number?: string
  tag: string
  title: string
  type: string
  system?: string
  responsible?: string
  template?: string
  status?: 'Ordered' | 'Shipped' | 'In Storage' | 'Installed' | 'Tested' | 'Operational' | 'Not Started'
  attributes?: any
  description?: string
  spaceId?: string | null
  orderDate?: string
  installationDate?: string
  balanceDate?: string
  testDate?: string
  projectId: string
  issues?: string[]
  checklists?: any
  functionalTests?: any
  fptSignatures?: any
  images?: any
  attachments?: any
  components?: Array<{
    id?: string
    tag?: string
    type: string
    title?: string
    attributes?: Record<string, any>
    status?: string
    notes?: string
    issues?: string[]
    createdAt?: string
    updatedAt?: string
    createdBy?: string
    updatedBy?: string
  }>
  history?: any
  labels?: any
  metadata?: any
  createdAt?: string
  updatedAt?: string
}

const API_BASE = `${getApiBase()}/api/equipment`

export const useEquipmentStore = defineStore('equipment', () => {
  const items = ref<Equipment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const byId = computed<Record<string, Equipment>>(() => {
    const m: Record<string, Equipment> = {}
    for (const e of items.value) {
      const id = (e.id || (e as any)._id)
      if (id) m[String(id)] = e
    }
    return m
  })

  async function fetchByProject(projectId: string) {
    if (!projectId) { items.value = []; return }
    const pid = String(projectId)
    // Clear stale items when switching projects
    if (items.value.length && items.value.some(e => String((e as any).projectId || '') !== pid)) {
      items.value = []
    }
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/project/${pid}`, { headers: getAuthHeaders() })
      items.value = Array.isArray(data) ? data.map((d: any) => ({ ...d, id: d._id })) : []
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load equipment'
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
      const eq = { ...data, id: data._id }
      const idx = items.value.findIndex(e => (e.id || (e as any)._id) === id)
      if (idx !== -1) items.value.splice(idx, 1, eq)
      else items.value.push(eq)
      return eq
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load equipment'
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(e: Equipment) {
    const payload: any = { ...e }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
    const { data } = await axios.post(`${API_BASE}`, payload, { headers: getAuthHeaders() })
    const saved = { ...data, id: data._id }
    items.value.push(saved)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('equipment', String(saved.id || (saved as any)._id), {
        type: 'create',
        message: `Equipment created: ${saved.title || saved.tag || ''}`,
        details: buildEquipmentLogDetails(null, saved) || { created: true }
      })
    } catch (e) { /* non-blocking */ }
    return saved
  }

  async function update(e: Equipment & { id: string }) {
    const id = e.id || (e as any)._id
    if (!id) throw new Error('Missing equipment id')
    const prev = items.value.find(x => String(x.id || (x as any)._id || '') === String(id)) || null
    const payload: any = { ...e }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
    let data: any
    try {
      ({ data } = await axios.patch(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
    } catch (err: any) {
      // Fallback to PUT if PATCH is not supported by backend
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        ({ data } = await axios.put(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
      } else {
        throw err
      }
    }
    const saved = { ...data, id: data._id || id }
    const idx = items.value.findIndex(x => (x.id || (x as any)._id) === id)
    if (idx !== -1) items.value[idx] = saved
    else items.value.push(saved)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('equipment', String(saved.id || (saved as any)._id), {
        type: 'update',
        message: `Equipment updated: ${saved.title || saved.tag || ''}`,
        details: buildEquipmentLogDetails(prev, saved) || { updated: true },
        patchKeys: Object.keys(payload || {})
      })
    } catch (e) { /* non-blocking */ }
    return saved
  }

  // Partial update helper (PATCH only). Useful for updating a subset of fields (e.g., attributes).
  async function updateFields(id: string, payload: Partial<Equipment>) {
    if (!id) throw new Error('Missing equipment id')
    let data: any
    try {
      ({ data } = await axios.patch(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        ({ data } = await axios.put(`${API_BASE}/${id}`, payload, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }))
      } else {
        throw err
      }
    }
    const saved = { ...data, id: (data as any)._id || id }
    const idx = items.value.findIndex(x => (x.id || (x as any)._id) === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], ...saved }
    else items.value.push(saved)
    return saved
  }

  async function remove(id: string) {
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(e => (e.id || (e as any)._id) !== id)
    try {
      const { useLogsStore } = await import('./logs')
      const logs = useLogsStore()
      await logs.appendLog('equipment', String(id), { type: 'delete', message: `Equipment deleted: ${id}` })
    } catch (e) { /* non-blocking */ }
  }

  // Duplicate an equipment item, ideally on the server. Falls back to client-side deep copy.
  async function duplicate(id: string, opts?: { tag?: string }) {
    if (!id) throw new Error('Missing equipment id')
    const desiredTag = opts?.tag || ''
    // 1) Try server-side duplicate endpoint if available
    try {
      const { data } = await axios.post(`${API_BASE}/${id}/duplicate`, { tag: desiredTag }, { headers: getAuthHeaders() })
      const saved = { ...data, id: (data as any)._id || (data as any).id }
      if (saved.id && !items.value.some(e => (e.id || (e as any)._id) === saved.id)) items.value.push(saved as Equipment)
      return saved as Equipment
    } catch (err: any) {
      // Continue to fallback on 404/405 or generic failure
    }

    // 2) Fallback: client-side duplication using current record
    // Ensure we have the full record
    let src = byId.value[String(id)]
    if (!src) {
      const fresh = await fetchOne(String(id))
      if (fresh) src = fresh
    }
    if (!src) throw new Error('Source equipment not found')

    // Build deep-ish copy payload, excluding identity fields
    // Avoid creating unused local bindings by shallow-copying and deleting internal fields
    const payloadObj: any = { ...(src as any) }
    delete payloadObj._id
    delete payloadObj.id
    delete payloadObj.number
    delete payloadObj.createdAt
    delete payloadObj.updatedAt
    delete payloadObj.history

    const payload: any = {
      ...payloadObj,
      tag: desiredTag || src.tag,
      // Preserve same project and space
      projectId: src.projectId,
      spaceId: src.spaceId || undefined,
      // Explicitly include nested structures often shown in tabs
      components: Array.isArray(src.components) ? src.components.map(c => ({ ...c })) : undefined,
      // Photos/images and attachments: copy references/metadata
      photos: (src as any).photos ? (src as any).photos.map((p: any) => ({ ...p })) : undefined,
      images: Array.isArray(src.images) ? src.images.map((p: any) => ({ ...p })) : undefined,
      attachments: Array.isArray(src.attachments) ? src.attachments.map((a: any) => ({ ...a })) : undefined,
      checklists: (src as any).checklists ? JSON.parse(JSON.stringify((src as any).checklists)) : undefined,
      functionalTests: (src as any).functionalTests ? JSON.parse(JSON.stringify((src as any).functionalTests)) : undefined,
      // Do not carry over issues by default when duplicating equipment (can be re-linked separately)
      issues: undefined,
      metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : undefined,
      attributes: src.attributes ? JSON.parse(JSON.stringify(src.attributes)) : undefined,
    }

    // Create new equipment using regular create
    const created = await create(payload as Equipment)
    return created
  }

  return { items, loading, error, byId, fetchByProject, fetchOne, create, update, updateFields, remove, duplicate }
})
