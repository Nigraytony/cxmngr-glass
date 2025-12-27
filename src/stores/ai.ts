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

  function toggleOpen(val?: boolean) {
    open.value = typeof val === 'boolean' ? val : !open.value
  }

  function clear() {
    messages.value = []
    draft.value = ''
  }

  async function send(projectId: string, context?: any) {
    const text = String(draft.value || '').trim()
    if (!text) return
    const pid = String(projectId || '').trim()
    if (!pid) throw new Error('projectId is required')

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
      messages.value.push({ role: 'assistant', content: reply || '(no response)', ts: new Date().toISOString() })
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

  return { open, messages, sending, draft, toggleOpen, clear, send, suggestTags }
})
