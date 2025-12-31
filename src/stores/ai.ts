import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'

export type AiRole = 'user' | 'assistant'

export interface AiMessage {
  role: AiRole
  content: string
  ts: string
}

export interface SuggestedTag {
  tag: string
  confidence?: number
  reason?: string
}

export const useAiStore = defineStore('ai', () => {
  const open = ref(false)
  const messages = ref<AiMessage[]>([])
  const sending = ref(false)
  const draft = ref('')
  const loadedProjectId = ref<string>('')
  const historyLoaded = ref(false)

  function toggleOpen(val?: boolean) {
    open.value = typeof val === 'boolean' ? val : !open.value
  }

  function clear() {
    messages.value = []
    draft.value = ''
  }

  async function loadHistory(projectId: string, opts?: { limit?: number }) {
    const pid = String(projectId || '').trim()
    if (!pid) throw new Error('projectId is required')
    if (loadedProjectId.value !== pid) {
      messages.value = []
      historyLoaded.value = false
      loadedProjectId.value = pid
    }
    if (historyLoaded.value) return
    const limit = typeof opts?.limit === 'number' ? Math.max(1, Math.min(200, Math.floor(opts.limit))) : 50
    const { data } = await http.get('/api/assistant/chat', { params: { projectId: pid, limit } })
    const rows = Array.isArray(data?.messages) ? data.messages : []
    messages.value = rows.map((m: any) => ({
      role: (m?.role === 'assistant' ? 'assistant' : 'user') as AiRole,
      content: String(m?.content || ''),
      ts: String(m?.ts || new Date().toISOString()),
    }))
    historyLoaded.value = true
  }

  async function persistMessage(projectId: string, role: AiRole, content: string) {
    const pid = String(projectId || '').trim()
    if (!pid) throw new Error('projectId is required')
    const body = { role, content: String(content || '').trim() }
    if (!body.content) return
    await http.post('/api/assistant/chat', body, { params: { projectId: pid } })
  }

  async function send(projectId: string, context?: any) {
    const text = String(draft.value || '').trim()
    if (!text) return
    const pid = String(projectId || '').trim()
    if (!pid) throw new Error('projectId is required')

    if (loadedProjectId.value !== pid || !historyLoaded.value) {
      await loadHistory(pid).catch(() => {
        loadedProjectId.value = pid
        historyLoaded.value = true
      })
    }

    const userMsg: AiMessage = { role: 'user', content: text, ts: new Date().toISOString() }
    messages.value.push(userMsg)
    draft.value = ''

    sending.value = true
    try {
      const payload = {
        projectId: pid,
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
        context: context || null,
      }
      const { data } = await http.post('/api/ai/chat', payload)
      const reply = String(data?.message || '').trim()
      const assistantMsg: AiMessage = { role: 'assistant', content: reply || '(no response)', ts: new Date().toISOString() }
      messages.value.push(assistantMsg)

      try {
        await persistMessage(pid, 'user', userMsg.content)
        await persistMessage(pid, 'assistant', assistantMsg.content)
      } catch (_) {
        // Ignore persistence errors; chat should still work.
      }
    } finally {
      sending.value = false
    }
  }

  async function suggestTags(projectId: string, entityType: string, entity: any, opts?: { existingTags?: string[], allowedTags?: string[] }) {
    const pid = String(projectId || '').trim()
    if (!pid) throw new Error('projectId is required')
    const et = String(entityType || '').trim()
    if (!et) throw new Error('entityType is required')
    const payload = {
      projectId: pid,
      entityType: et,
      entity: entity || {},
      existingTags: Array.isArray(opts?.existingTags) ? opts?.existingTags : undefined,
      allowedTags: Array.isArray(opts?.allowedTags) ? opts?.allowedTags : undefined,
    }
    const { data } = await http.post('/api/ai/suggest-tags', payload)
    const tags = Array.isArray(data?.tags) ? data.tags : []
    return tags as SuggestedTag[]
  }

  return { open, messages, sending, draft, toggleOpen, clear, loadHistory, send, suggestTags }
})
