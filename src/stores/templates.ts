import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'

export interface Template {
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

const API_BASE = `${getApiBase()}/api/templates`

export const useTemplatesStore = defineStore('templates', () => {
  const items = ref<Template[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const byId = computed<Record<string, Template>>(() => {
    const m: Record<string, Template> = {}
    for (const e of items.value) {
      const id = (e.id || (e as any)._id)
      if (id) m[String(id)] = e
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
      error.value = e?.response?.data?.error || e?.message || 'Failed to load templates'
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
      const rec = { ...data, id: data._id }
      const idx = items.value.findIndex(e => (e.id || (e as any)._id) === id)
      if (idx !== -1) items.value.splice(idx, 1, rec)
      else items.value.push(rec)
      return rec
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to load template'
      return null
    } finally {
      loading.value = false
    }
  }

  async function create(e: Template) {
    const payload: any = { ...e }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
    const { data } = await axios.post(`${API_BASE}`, payload, { headers: getAuthHeaders() })
    const saved = { ...data, id: data._id }
    items.value.push(saved)
    return saved
  }

  async function update(e: Template & { id: string }) {
    const id = e.id || (e as any)._id
    if (!id) throw new Error('Missing template id')
    const payload: any = { ...e }
    if (payload.id) delete payload.id
    if (payload._id) delete payload._id
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
    const saved = { ...data, id: data._id || id }
    const idx = items.value.findIndex(x => (x.id || (x as any)._id) === id)
    if (idx !== -1) items.value[idx] = saved
    else items.value.push(saved)
    return saved
  }

  async function updateFields(id: string, payload: Partial<Template>) {
    if (!id) throw new Error('Missing template id')
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

  // Convenience helper: update only components with normalization identical to Equipment
  async function updateComponents(id: string, components: NonNullable<Template['components']>) {
    if (!id) throw new Error('Missing template id')
    const payloadList = (components || []).map((c: any) => {
      let attrs: any = c?.attributes || {}
      if (Array.isArray(attrs)) {
        // convert array of {key,value} to object
        const out: Record<string, any> = {}
        for (const it of attrs) { if (it && (it.key || it.title)) out[String(it.key ?? it.title)] = it.value ?? '' }
        attrs = out
      }
      return {
        id: c?.id,
        tag: c?.tag || '',
        type: c?.type,
        title: c?.title,
        attributes: attrs,
        status: c?.status || '',
        notes: c?.notes || '',
        issues: Array.isArray(c?.issues) ? c.issues : undefined
      }
    })
    return await updateFields(id, { components: payloadList } as any)
  }

  async function remove(id: string) {
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(e => (e.id || (e as any)._id) !== id)
  }

  async function duplicate(id: string, opts?: { tag?: string }) {
    if (!id) throw new Error('Missing template id')
    const desiredTag = opts?.tag || ''
    // Try server-side duplicate if available (may not exist)
    try {
      const { data } = await axios.post(`${API_BASE}/${id}/duplicate`, { tag: desiredTag }, { headers: getAuthHeaders() })
      const saved = { ...data, id: (data as any)._id || (data as any).id }
      if (saved.id && !items.value.some(e => (e.id || (e as any)._id) === saved.id)) items.value.push(saved as Template)
      return saved as Template
    } catch (err: any) {
      // ignore and fallback
    }

    // Fallback: client-side duplication
    let src = byId.value[String(id)]
    if (!src) {
      const fresh = await fetchOne(String(id))
      if (fresh) src = fresh
    }
    if (!src) throw new Error('Source template not found')

    const { _id, id: _rid, number, createdAt, updatedAt, history, ...rest } = src as any
    const payload: any = {
      ...rest,
      tag: desiredTag || src.tag,
      projectId: src.projectId,
      spaceId: src.spaceId || undefined,
      components: Array.isArray(src.components) ? src.components.map((c: any) => ({ ...c })) : undefined,
      photos: (src as any).photos ? (src as any).photos.map((p: any) => ({ ...p })) : undefined,
      images: Array.isArray(src.images) ? src.images.map((p: any) => ({ ...p })) : undefined,
      attachments: Array.isArray(src.attachments) ? src.attachments.map((a: any) => ({ ...a })) : undefined,
      checklists: (src as any).checklists ? JSON.parse(JSON.stringify((src as any).checklists)) : undefined,
      functionalTests: (src as any).functionalTests ? JSON.parse(JSON.stringify((src as any).functionalTests)) : undefined,
      issues: undefined,
      metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : undefined,
      attributes: src.attributes ? JSON.parse(JSON.stringify(src.attributes)) : undefined,
    }
    const created = await create(payload as Template)
    return created
  }

  return { items, loading, error, byId, fetchByProject, fetchOne, create, update, updateFields, updateComponents, remove, duplicate }
})
