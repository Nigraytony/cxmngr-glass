import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

export interface AssistantChecklistItem {
  id: string
  category?: string
  title: string
  description?: string
  guidance?: string
  platformGuidance?: string
  platformLinks?: Array<{
    title: string
    to: string
    note?: string
  }>
  sourceTitle?: string
  sourceUrl?: string
  completed?: boolean
  completedAt?: string | null
  completedBy?: string | null
}

export interface AssistantChecklistProgress {
  total: number
  completed: number
  percent: number
}

export interface AssistantChecklist {
  id: string
  projectId: string
  projectType: string
  templateKey: string
  progress: AssistantChecklistProgress
  items: AssistantChecklistItem[]
}

const API_BASE = `${getApiBase()}/api/assistant`

export const useAssistantChecklistStore = defineStore('assistantChecklist', () => {
  const checklist = ref<AssistantChecklist | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)

  const hasProject = computed(() => {
    const projectStore = useProjectStore()
    return Boolean(projectStore.currentProjectId || localStorage.getItem('selectedProjectId'))
  })

  async function fetchChecklist(projectId?: string) {
    const projectStore = useProjectStore()
    const pid = String(projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    if (!pid) {
      checklist.value = null
      return
    }
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/checklist`, { params: { projectId: pid }, headers: getAuthHeaders() })
      checklist.value = data || null
    } catch (e: any) {
      const status = e?.response?.status
      const code = e?.response?.data?.code || null
      errorCode.value = code
      if (status === 422 && code === 'CHECKLIST_TEMPLATE_NOT_AVAILABLE') {
        checklist.value = null
        error.value = e?.response?.data?.error || 'Checklist template not available'
        return
      }
      error.value = e?.response?.data?.error || e?.message || 'Failed to load assistant checklist'
      checklist.value = null
    } finally {
      loading.value = false
    }
  }

  async function setItemCompleted(itemId: string, completed: boolean) {
    const current = checklist.value
    if (!current?.id) return
    const iid = String(itemId || '').trim()
    if (!iid) return
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.patch(
        `${API_BASE}/checklist/${current.id}/items/${encodeURIComponent(iid)}`,
        { completed },
        { headers: getAuthHeaders() }
      )
      checklist.value = data || null
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.message || 'Failed to update checklist item'
    } finally {
      loading.value = false
    }
  }

  return {
    checklist,
    loading,
    error,
    errorCode,
    hasProject,
    fetchChecklist,
    setItemCompleted,
  }
})
