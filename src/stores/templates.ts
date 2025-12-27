import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

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
  tags?: string[]
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
  const errorCode = ref<string | null>(null)

  function normalizeFeatureFlags(raw: any) {
    const out: Record<string, boolean> = {}
    if (!raw || typeof raw !== 'object') return out
    for (const [k, v] of Object.entries(raw)) {
      if (!k) continue
      const key = String(k).toLowerCase()
      if (v === false || v === 'false' || v === 0) { out[key] = false; continue }
      if (v === true || v === 'true' || v === 1) { out[key] = true; continue }
    }
    return out
  }

  function normalizeTierKey(raw: any) {
    const s = String(raw || '').toLowerCase().trim()
    if (!s) return ''
    if (s === 'basic' || s.startsWith('basic') || s.includes('basic')) return 'basic'
    if (s === 'standard' || s.startsWith('standard') || s.includes('standard')) return 'standard'
    if (s === 'premium' || s.startsWith('premium') || s.includes('premium')) return 'premium'
    return ''
  }

  function isTemplatesDisabledForProject(projectId: string) {
    try {
      const projectStore = useProjectStore()
      const pid = String(projectId || '')
      const proj: any =
        (projectStore.currentProject && String((projectStore.currentProject as any).id || (projectStore.currentProject as any)._id) === pid)
          ? projectStore.currentProject
          : (projectStore.projects || []).find((p: any) => String(p.id || p._id) === pid)
      if (!proj) return false

      const flags = normalizeFeatureFlags(proj.subscriptionFeatures)
      const tier = normalizeTierKey(proj.subscriptionTier || proj.subscription || '')
      const inferredPremium = tier === 'premium' || flags.tasks === true || flags.ai === true
      // Templates is premium-only in the current product; treat any non-premium as disabled.
      if (!inferredPremium) return true
      if (Object.prototype.hasOwnProperty.call(flags, 'templates')) return flags.templates === false

      return false
    } catch (e) {
      return false
    }
  }

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
    errorCode.value = null
    try {
      // If we can determine from local project state that Templates aren't in the plan,
      // skip the API call to avoid noisy 403s.
      if (isTemplatesDisabledForProject(projectId)) {
        items.value = []
        error.value = null
        errorCode.value = 'FEATURE_NOT_IN_PLAN'
        return
      }
      const { data } = await axios.get(`${API_BASE}/project/${projectId}`, { headers: getAuthHeaders() })
      items.value = Array.isArray(data) ? data.map((d: any) => ({ ...d, id: d._id })) : []
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
      error.value = e?.response?.data?.error || e?.message || 'Failed to load templates'
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
    // Log to project logs (best-effort, non-blocking)
    try {
      const projectStore = useProjectStore()
      const pid = String(saved.projectId || saved.project || '')
      if (pid) {
        await projectStore.appendProjectLog(pid, { type: 'template.create', message: `Template created: ${saved.tag || saved.title || ''}`, details: { id: saved.id, tag: saved.tag, title: saved.title } })
      }
    } catch (err) { /* non-blocking */ }
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
    // Log to project logs (best-effort, non-blocking)
    try {
      const projectStore = useProjectStore()
      // saved may not include projectId for partial field updates; fall back to cached record
      const cached = byId.value[String(id)]
      const pid = String(saved.projectId || saved.project || (cached && (cached.projectId || (cached as any).project)) || '')
      if (pid) {
        await projectStore.appendProjectLog(pid, { type: 'template.update', message: `Template updated: ${saved.tag || saved.title || id}`, details: { id: saved.id, tag: saved.tag, title: saved.title } })
      }
    } catch (err) { /* non-blocking */ }
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
    // Log field updates to project logs (best-effort)
    try {
      const projectStore = useProjectStore()
      const cached = byId.value[String(id)]
      const pid = String(saved.projectId || saved.project || (cached && (cached.projectId || (cached as any).project)) || '')
      if (pid) {
        await projectStore.appendProjectLog(pid, { type: 'template.update', message: `Template fields updated: ${saved.id || id}`, details: { id, changes: payload } })
      }
    } catch (err) { /* non-blocking */ }
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
    const res = await updateFields(id, { components: payloadList } as any)
    // Log component updates to project logs
    try {
      const projectStore = useProjectStore()
      const tpl = byId.value[id]
      const pid = String((tpl && (tpl.projectId || (tpl as any).project)) || '')
      if (pid) {
        await projectStore.appendProjectLog(pid, { type: 'template.components.update', message: `Template components updated: ${tpl?.tag || tpl?.title || id}`, details: { id, components: payloadList } })
      }
    } catch (err) { /* non-blocking */ }
    return res
  }

  async function remove(id: string) {
    // Fetch record to read projectId for logging
    const existing = byId.value[String(id)]
    let pid = ''
    if (existing) pid = String((existing as any).projectId || (existing as any).project || '')
    await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    items.value = items.value.filter(e => (e.id || (e as any)._id) !== id)
    try {
      if (!pid) {
        // attempt to read from server (best-effort)
        try {
          const { data } = await axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
          pid = String((data && (data.projectId || data.project)) || '')
        } catch (e) { /* ignore */ }
      }
      if (pid) {
        const projectStore = useProjectStore()
        await projectStore.appendProjectLog(pid, { type: 'template.delete', message: `Template deleted: ${id}`, details: { id } })
      }
    } catch (err) { /* non-blocking */ }
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
    // Log duplication created event to project logs
    try {
      const projectStore = useProjectStore()
      const pid = String(created.projectId || created.project || '')
      if (pid) {
        await projectStore.appendProjectLog(pid, { type: 'template.duplicate', message: `Template duplicated: ${created.tag || created.title || ''}`, details: { id: created.id } })
      }
    } catch (err) { /* non-blocking */ }
    return created
  }

  return { items, loading, error, byId, fetchByProject, fetchOne, create, update, updateFields, updateComponents, remove, duplicate }
  return { items, loading, error, errorCode, byId, fetchByProject, fetchOne, create, update, updateFields, updateComponents, remove }
})
