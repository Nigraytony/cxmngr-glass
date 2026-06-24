import { defineStore } from 'pinia'
import { ref } from 'vue'

// Remembers the ordered list of issue ids as currently filtered + sorted on the
// Issues list, so the prev/next navigation on the Issue edit page can step through
// the same set the user set up. Persisted to sessionStorage so it survives a reload
// of the edit page (e.g. deep-linking or refreshing while stepping through).
const STORAGE_KEY = 'issuesNavOrder'

export const useIssuesNavStore = defineStore('issuesNav', () => {
  const projectId = ref('')
  const orderedIds = ref<string[]>([])

  function persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: projectId.value, orderedIds: orderedIds.value }))
    } catch (e) { /* ignore storage write errors */ }
  }

  function setOrder(pid: string, ids: any[]) {
    projectId.value = String(pid || '')
    orderedIds.value = (Array.isArray(ids) ? ids : []).map((v) => String(v || '')).filter(Boolean)
    persist()
  }

  function hydrate() {
    if (orderedIds.value.length) return
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const o = JSON.parse(raw)
      projectId.value = String(o?.projectId || '')
      orderedIds.value = Array.isArray(o?.orderedIds) ? o.orderedIds.map((v: any) => String(v || '')).filter(Boolean) : []
    } catch (e) { /* ignore storage read errors */ }
  }

  function clear() {
    projectId.value = ''
    orderedIds.value = []
    try { sessionStorage.removeItem(STORAGE_KEY) } catch (e) { /* ignore */ }
  }

  return { projectId, orderedIds, setOrder, hydrate, clear }
})
