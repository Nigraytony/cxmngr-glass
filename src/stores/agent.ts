import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'

export interface ToolResult {
  tool: string
  label: string
  success: boolean
  record?: Record<string, unknown> | null
  records?: Record<string, unknown>[] | null
  count?: number | null
  link?: string | null
  name?: string | null
  deleted?: boolean
  error?: string | null
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolResults?: ToolResult[]
  createdAt: Date
  pending?: boolean
}

export const useAgentStore = defineStore('agent', () => {
  const messages = ref<AgentMessage[]>([])
  const sending = ref(false)
  const loadingHistory = ref(false)
  const error = ref('')
  const loadedProjectId = ref('')

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function loadHistory(projectId: string) {
    if (!projectId) return
    if (loadedProjectId.value === projectId) return
    loadingHistory.value = true
    error.value = ''
    try {
      const { data } = await http.get('/api/agent/history', { params: { projectId, limit: 50 } })
      const raw = Array.isArray(data && data.messages) ? data.messages : []
      messages.value = raw.map((m: Record<string, unknown>) => ({
        id: String(m._id || generateId()),
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: String(m.content || ''),
        toolResults: [],
        createdAt: m.createdAt ? new Date(m.createdAt as string) : new Date(),
      }))
      loadedProjectId.value = projectId
    } catch (e) {
      // Non-fatal — start with empty history
      messages.value = []
      loadedProjectId.value = projectId
    } finally {
      loadingHistory.value = false
    }
  }

  async function send(projectId: string, content: string, files?: File[]) {
    const trimmed = content.trim()
    const hasFiles = Array.isArray(files) && files.length > 0
    if (!projectId || sending.value) return
    if (!trimmed && !hasFiles) return

    error.value = ''

    // Optimistically add the user message (with a lightweight attachment marker)
    const attachSuffix = hasFiles ? ` (📎 ${files!.length} PDF${files!.length === 1 ? '' : 's'} attached)` : ''
    const displayText = trimmed || 'Please analyse the attached drawing(s).'
    const userMsg: AgentMessage = {
      id: generateId(),
      role: 'user',
      content: displayText + attachSuffix,
      createdAt: new Date(),
    }
    messages.value = [...messages.value, userMsg]

    // Add a pending assistant message (typing indicator)
    const pendingId = generateId()
    const pendingMsg: AgentMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      pending: true,
    }
    messages.value = [...messages.value, pendingMsg]

    sending.value = true
    try {
      let data: { message?: string; toolResults?: ToolResult[] }
      if (hasFiles) {
        const form = new FormData()
        form.append('projectId', projectId)
        form.append('message', trimmed)
        for (const f of files!) form.append('pdf', f)
        const resp = await http.post('/api/agent/chat', form)
        data = resp.data
      } else {
        const resp = await http.post('/api/agent/chat', { projectId, message: trimmed })
        data = resp.data
      }

      // Replace the pending message with the real reply
      messages.value = messages.value.map((m) =>
        m.id === pendingId
          ? {
              id: generateId(),
              role: 'assistant' as const,
              content: String(data.message || ''),
              toolResults: Array.isArray(data.toolResults) ? data.toolResults : [],
              createdAt: new Date(),
              pending: false,
            }
          : m
      )
    } catch (e: unknown) {
      const errMsg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (e instanceof Error ? e.message : 'Request failed')
      error.value = errMsg

      // Replace pending with error message
      messages.value = messages.value.map((m) =>
        m.id === pendingId
          ? {
              id: generateId(),
              role: 'assistant' as const,
              content: `Sorry, something went wrong: ${errMsg}`,
              toolResults: [],
              createdAt: new Date(),
              pending: false,
            }
          : m
      )
    } finally {
      sending.value = false
    }
  }

  function clear() {
    messages.value = []
    loadedProjectId.value = ''
    error.value = ''
  }

  return {
    messages,
    sending,
    loadingHistory,
    error,
    loadedProjectId,
    loadHistory,
    send,
    clear,
  }
})
