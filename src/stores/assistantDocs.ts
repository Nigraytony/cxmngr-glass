import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

export interface AssistantDocLink {
  title: string
  url: string
  note?: string
}

export interface AssistantDocsResponse {
  projectType: string
  itemId: string | null
  docsAvailable?: boolean
  docs: AssistantDocLink[]
  general: AssistantDocLink[]
  message?: string
  code?: string
}

const API_BASE = `${getApiBase()}/api/assistant`

export const useAssistantDocsStore = defineStore('assistantDocs', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const docs = ref<AssistantDocsResponse | null>(null)

  async function fetchDocs(opts?: { projectId?: string, itemId?: string }) {
    const projectStore = useProjectStore()
    const pid = String(opts?.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    const itemId = String(opts?.itemId || '').trim()
    if (!pid) {
      docs.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/docs`, {
        params: { projectId: pid, ...(itemId ? { itemId } : {}) },
        headers: getAuthHeaders(),
      })
      docs.value = data || null
    } catch (e: any) {
      docs.value = null
      error.value = e?.response?.data?.error || e?.message || 'Failed to load documentation'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    docs,
    fetchDocs,
  }
})
