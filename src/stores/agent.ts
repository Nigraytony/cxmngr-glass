import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'
import { getApiBase } from '../utils/api'
import { useAuthStore } from './auth'
import { ASSISTANT_MOODS, type AssistantMood } from './ai'

function coerceMood(v: unknown): AssistantMood {
  const s = typeof v === 'string' ? v.toLowerCase() : ''
  return (ASSISTANT_MOODS as readonly string[]).includes(s) ? (s as AssistantMood) : 'neutral'
}

// Read the double-submit CSRF token the same way the axios interceptor does
// (api.ts) — value from the `csrf` cookie, or a random seed if absent.
function csrfToken(): string {
  try {
    const all = String(document.cookie || '')
    for (const part of all.split(';')) {
      const [k, ...rest] = part.trim().split('=')
      if (k === 'csrf') return decodeURIComponent(rest.join('=') || '')
    }
  } catch (e) { /* ignore */ }
  try {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  }
}

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
  // Transient narrator line shown while streaming (e.g. "Creating template…").
  status?: string
  mood?: AssistantMood
}

// One Server-Sent Event from POST /api/agent/chat.
interface StreamEvent {
  type: 'status' | 'tool' | 'done' | 'error'
  text?: string
  entry?: ToolResult
  message?: string
  mood?: string
  toolResults?: ToolResult[]
  error?: string
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

  // Update the in-flight assistant message by id (immutably, so Vue re-renders).
  function patchMessage(id: string, patch: Partial<AgentMessage>) {
    messages.value = messages.value.map((m) => (m.id === id ? { ...m, ...patch } : m))
  }

  // POST the turn and consume the SSE stream, updating the pending message as
  // status/tool/done events arrive. Retries once after a token refresh on 401.
  async function streamChat(projectId: string, trimmed: string, files: File[] | undefined, pendingId: string) {
    const hasFiles = Array.isArray(files) && files.length > 0
    const url = `${getApiBase()}/api/agent/chat`

    const buildRequest = (): RequestInit => {
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'X-CSRF-Token': csrfToken(),
      }
      try {
        const auth = useAuthStore() as unknown as { accessToken?: string }
        if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`
      } catch (e) { /* cookie auth only */ }

      let body: BodyInit
      if (hasFiles) {
        const form = new FormData()
        form.append('projectId', projectId)
        form.append('message', trimmed)
        for (const f of files!) form.append('files', f)
        body = form // browser sets the multipart Content-Type + boundary
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({ projectId, message: trimmed })
      }
      return { method: 'POST', credentials: 'include', headers, body }
    }

    let resp = await fetch(url, buildRequest())

    // Session expired mid-send: refresh once and retry.
    if (resp.status === 401) {
      let refreshed = false
      try {
        const auth = useAuthStore() as unknown as { refresh?: () => Promise<unknown> }
        if (typeof auth?.refresh === 'function') refreshed = Boolean(await auth.refresh())
      } catch (e) { /* ignore */ }
      if (refreshed) resp = await fetch(url, buildRequest())
    }

    const ctype = resp.headers.get('content-type') || ''
    if (!resp.ok || !ctype.includes('text/event-stream') || !resp.body) {
      // Server answered with JSON (an error, or a non-streaming fallback).
      let msg = `Request failed (${resp.status})`
      let payload: { message?: string; mood?: string; toolResults?: ToolResult[]; error?: string } | null = null
      try { payload = await resp.json() } catch (e) { /* not json */ }
      if (resp.ok && payload && typeof payload.message === 'string') {
        // Graceful degradation: buffered JSON reply.
        patchMessage(pendingId, {
          content: String(payload.message || ''),
          toolResults: Array.isArray(payload.toolResults) ? payload.toolResults : [],
          mood: coerceMood(payload.mood),
          status: '',
          pending: false,
        })
        return
      }
      if (payload && payload.error) msg = payload.error
      throw new Error(msg)
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalised = false

    const handle = (ev: StreamEvent) => {
      if (ev.type === 'status') {
        patchMessage(pendingId, { status: String(ev.text || '') })
      } else if (ev.type === 'tool' && ev.entry) {
        const existing = messages.value.find((m) => m.id === pendingId)?.toolResults || []
        patchMessage(pendingId, { toolResults: [...existing, ev.entry] })
      } else if (ev.type === 'done') {
        patchMessage(pendingId, {
          content: String(ev.message || ''),
          toolResults: Array.isArray(ev.toolResults)
            ? ev.toolResults
            : (messages.value.find((m) => m.id === pendingId)?.toolResults || []),
          mood: coerceMood(ev.mood),
          status: '',
          pending: false,
        })
        finalised = true
      } else if (ev.type === 'error') {
        throw new Error(String(ev.error || 'Agent error'))
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const dataLines = frame.split('\n').filter((l) => l.startsWith('data:'))
        if (!dataLines.length) continue // heartbeat comment (": ping")
        const json = dataLines.map((l) => l.slice(5).trim()).join('\n')
        let ev: StreamEvent
        try { ev = JSON.parse(json) } catch (e) { continue }
        handle(ev)
      }
      if (finalised) break
    }

    // Stream closed without an explicit done — finalise what we have.
    if (!finalised) {
      patchMessage(pendingId, { pending: false, status: '' })
    }
  }

  async function send(projectId: string, content: string, files?: File[]) {
    const trimmed = content.trim()
    const hasFiles = Array.isArray(files) && files.length > 0
    if (!projectId || sending.value) return
    if (!trimmed && !hasFiles) return

    error.value = ''

    // Optimistically add the user message (with a lightweight attachment marker)
    const attachSuffix = hasFiles ? ` (📎 ${files!.length} file${files!.length === 1 ? '' : 's'} attached)` : ''
    const displayText = trimmed || 'Please analyse the attached file(s).'
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
      status: '',
    }
    messages.value = [...messages.value, pendingMsg]

    sending.value = true
    try {
      await streamChat(projectId, trimmed, files, pendingId)
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Request failed'
      error.value = errMsg
      patchMessage(pendingId, {
        content: `Sorry, something went wrong: ${errMsg}`,
        toolResults: [],
        status: '',
        pending: false,
        mood: 'sad' as AssistantMood,
      })
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
