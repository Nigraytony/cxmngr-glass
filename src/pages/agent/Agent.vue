<template>
  <div class="flex flex-col h-full min-h-0">

    <!-- Header -->
    <div class="shrink-0 px-6 py-4 border-b border-white/10 flex items-center gap-3">
      <span class="text-2xl">👷‍♀️</span>
      <div>
        <h1 class="text-white font-semibold text-lg leading-tight">Agent</h1>
        <p v-if="currentProjectName" class="text-white/50 text-xs truncate">{{ currentProjectName }}</p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <span
          v-if="aiStatus === 'ready'"
          class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300"
        >
          Ready
        </span>
        <span
          v-else-if="aiStatus === 'loading'"
          class="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/50"
        >
          Loading…
        </span>
        <span
          v-else-if="aiStatus === 'unavailable'"
          class="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300"
        >
          Unavailable
        </span>
        <button
          v-if="agent.messages.length > 0"
          type="button"
          title="Clear conversation"
          class="text-white/40 hover:text-white/70 transition-colors"
          @click="clearConversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- No project selected -->
    <div v-if="!currentProjectId" class="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <span class="text-5xl opacity-40">👷‍♀️</span>
      <p class="text-white/60 text-center text-sm max-w-xs">
        Select a project from the dashboard to start using the Agent.
      </p>
    </div>

    <!-- Not available (no AI configured or not premium) -->
    <div v-else-if="aiStatus === 'unavailable'" class="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <span class="text-5xl opacity-40">👷‍♀️</span>
      <p class="text-white/60 text-center text-sm max-w-xs">
        {{ unavailableReason }}
      </p>
      <RouterLink
        :to="{ name: 'project-settings', params: { id: currentProjectId } }"
        class="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
      >
        Project Settings → AI
      </RouterLink>
    </div>

    <!-- Chat area -->
    <template v-else>
      <!-- Messages -->
      <div
        ref="messagesEl"
        class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
        <!-- Empty state -->
        <div
          v-if="!agent.loadingHistory && agent.messages.length === 0"
          class="flex flex-col items-center justify-center h-full gap-6 py-12"
        >
          <span class="text-6xl opacity-30">👷‍♀️</span>
          <div class="text-center max-w-sm space-y-2">
            <p class="text-white/70 text-sm font-medium">What can I help you with?</p>
            <p class="text-white/40 text-xs">
              I can create, list, update, and delete tasks, activities, equipment, issues, spaces, templates, and systems.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-2 w-full max-w-sm">
            <button
              v-for="hint in examplePrompts"
              :key="hint"
              type="button"
              class="text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 transition-colors"
              @click="useHint(hint)"
            >
              {{ hint }}
            </button>
          </div>
        </div>

        <!-- Loading history -->
        <div v-else-if="agent.loadingHistory" class="flex items-center justify-center py-8">
          <span class="text-white/30 text-sm">Loading conversation…</span>
        </div>

        <!-- Message list -->
        <template v-else>
          <div
            v-for="msg in agent.messages"
            :key="msg.id"
            class="flex gap-3"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- Agent avatar -->
            <div
              v-if="msg.role === 'assistant'"
              class="shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm mt-0.5"
            >
              👷‍♀️
            </div>

            <div class="flex flex-col gap-1.5 max-w-[82%]">
              <!-- Bubble -->
              <div
                class="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                :class="msg.role === 'user'
                  ? 'bg-indigo-600/70 text-white rounded-br-sm border border-indigo-400/20'
                  : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/10'"
              >
                <!-- Typing indicator -->
                <span v-if="msg.pending" class="flex gap-1 items-center py-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 0ms" />
                  <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 150ms" />
                  <span class="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style="animation-delay: 300ms" />
                </span>
                <!-- Message content -->
                <div
                  v-else
                  class="whitespace-pre-wrap break-words agent-message-content"
                  v-html="renderMarkdown(msg.content)"
                />
              </div>

              <!-- Tool result cards -->
              <div
                v-if="msg.toolResults && msg.toolResults.length > 0"
                class="flex flex-wrap gap-1.5"
              >
                <template v-for="(tr, ti) in msg.toolResults" :key="ti">
                  <!-- List result -->
                  <div
                    v-if="tr.records !== null && tr.records !== undefined"
                    class="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                    :class="tr.success
                      ? 'bg-white/8 border-white/15 text-white/60'
                      : 'bg-red-500/10 border-red-400/20 text-red-300'"
                  >
                    <span>{{ tr.label }}</span>
                    <span v-if="tr.success && tr.count !== null" class="text-white/40">({{ tr.count }})</span>
                    <span v-if="!tr.success" class="text-red-300">— {{ tr.error }}</span>
                  </div>
                  <!-- Delete result -->
                  <div
                    v-else-if="tr.deleted"
                    class="text-[11px] px-2.5 py-1 rounded-full border bg-white/8 border-white/15 text-white/60 flex items-center gap-1.5"
                  >
                    <span>{{ tr.label }}</span>
                    <span v-if="tr.name" class="text-white/40 truncate max-w-[120px]">{{ tr.name }}</span>
                  </div>
                  <!-- Create/update result with link -->
                  <RouterLink
                    v-else-if="tr.link"
                    :to="tr.link"
                    class="text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors"
                    :class="tr.success
                      ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border-red-400/20 text-red-300'"
                  >
                    <span>{{ tr.label }}</span>
                    <span v-if="tr.name" class="truncate max-w-[120px]">{{ tr.name }}</span>
                    <svg v-if="tr.success" class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14"/></svg>
                  </RouterLink>
                  <!-- Error without link -->
                  <div
                    v-else-if="!tr.success"
                    class="text-[11px] px-2.5 py-1 rounded-full border bg-red-500/10 border-red-400/20 text-red-300"
                  >
                    {{ tr.label }} failed: {{ tr.error }}
                  </div>
                </template>
              </div>
            </div>

            <!-- User avatar spacer -->
            <div
              v-if="msg.role === 'user'"
              class="shrink-0 w-7 h-7 rounded-full bg-indigo-500/30 border border-indigo-400/20 flex items-center justify-center text-xs font-medium text-white mt-0.5"
            >
              {{ userInitial }}
            </div>
          </div>
        </template>
      </div>

      <!-- Input bar -->
      <div class="shrink-0 px-4 pb-4 pt-2 border-t border-white/10">
        <!-- Attached file chips -->
        <div v-if="attachedFiles.length" class="flex flex-wrap gap-1.5 mb-2">
          <div
            v-for="(f, i) in attachedFiles"
            :key="i"
            class="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="truncate max-w-[160px]">{{ f.name }}</span>
            <span class="text-indigo-300/60">{{ formatFileSize(f.size) }}</span>
            <button type="button" class="hover:text-white" @click="removeFile(i)">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <p v-if="attachError" class="text-amber-300 text-[11px] mb-2">{{ attachError }}</p>
        <form class="flex gap-2 items-end" @submit.prevent="handleSend">
          <input
            ref="fileInputEl"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            class="hidden"
            @change="onFileChange"
          />
          <button
            type="button"
            :disabled="agent.sending || aiStatus !== 'ready' || attachedFiles.length >= MAX_FILES"
            class="shrink-0 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Attach PDF drawings (max 3, 10 MB each)"
            @click="fileInputEl?.click()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref="inputEl"
            v-model="draft"
            rows="2"
            :placeholder="attachedFiles.length ? 'Tell me what to build from these drawings (or press Send to analyse)…' : 'Ask me anything about this project…'"
            :disabled="agent.sending || aiStatus !== 'ready'"
            class="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25
                   text-sm px-4 py-3 focus:outline-none focus:border-white/25 focus:bg-white/8 transition
                   disabled:opacity-40 disabled:cursor-not-allowed"
            style="max-height: 200px; overflow-y: auto; field-sizing: content; color-scheme: dark;"
            @keydown.enter.exact.prevent="handleSend"
            @keydown.enter.shift.exact="draft += '\n'"
            @input="autoGrow"
          />
          <button
            type="submit"
            :disabled="(!draft.trim() && !attachedFiles.length) || agent.sending || aiStatus !== 'ready'"
            class="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                   disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            title="Send (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <p class="text-white/25 text-[11px] mt-1.5 px-1">Enter to send · Shift+Enter for new line · Attach PDFs to build from drawings</p>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import { useAgentStore } from '../../stores/agent'
import http from '../../utils/http'

const projectStore = useProjectStore()
const authStore = useAuthStore()
const agent = useAgentStore()

const draft = ref('')
const messagesEl = ref(null)
const inputEl = ref(null)
const fileInputEl = ref(null)
const attachedFiles = ref([])
const attachError = ref('')
const aiStatus = ref('loading') // 'loading' | 'ready' | 'unavailable'
const unavailableReason = ref('')

const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024

const currentProjectId = computed(() =>
  projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
)
const currentProjectName = computed(() => {
  const proj = projectStore.currentProject ||
    (projectStore.projects || []).find((p) => String(p.id || p._id) === currentProjectId.value)
  return proj ? String(proj.name || '') : ''
})
const userInitial = computed(() => {
  const name = String(authStore.user?.name || authStore.user?.email || '?')
  return name.charAt(0).toUpperCase()
})

const examplePrompts = [
  'Analyse the attached drawings and build out the project',
  'List all open issues on this project',
  'Create a task called Pre-functional walkthrough',
  'Show me all equipment in the HVAC system',
]

// ---------------------------------------------------------------------------
// AI status check
// ---------------------------------------------------------------------------

async function checkAiStatus() {
  const pid = currentProjectId.value
  if (!pid) { aiStatus.value = 'unavailable'; unavailableReason.value = 'No project selected.'; return }
  aiStatus.value = 'loading'
  try {
    const { data } = await http.get('/api/ai/status', { params: { projectId: pid } })
    if (data && data.ai && data.ai.canChat) {
      aiStatus.value = 'ready'
      unavailableReason.value = ''
    } else {
      aiStatus.value = 'unavailable'
      const reason = data && data.ai && data.ai.reason
      if (reason === 'FEATURE_NOT_IN_PLAN') unavailableReason.value = 'The Agent requires a Premium plan.'
      else if (reason === 'AI_DISABLED') unavailableReason.value = 'AI is disabled for this project. Enable it in Project Settings → AI.'
      else if (reason === 'AI_NOT_CONFIGURED') unavailableReason.value = 'No AI key is configured. Add one in Project Settings → AI.'
      else unavailableReason.value = 'AI is not available for this project.'
    }
  } catch (e) {
    aiStatus.value = 'unavailable'
    unavailableReason.value = 'Could not reach the server to check AI status.'
  }
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

async function handleSend() {
  const text = draft.value.trim()
  const files = attachedFiles.value.slice()
  if (!text && !files.length) return
  if (agent.sending || aiStatus.value !== 'ready') return
  draft.value = ''
  attachedFiles.value = []
  attachError.value = ''
  resetInputHeight()
  await agent.send(currentProjectId.value, text, files)
  await scrollToBottom()
}

function onFileChange(e) {
  const picked = Array.from(e.target.files || [])
  e.target.value = '' // allow re-selecting the same file
  attachError.value = ''
  for (const f of picked) {
    if (attachedFiles.value.length >= MAX_FILES) { attachError.value = `Max ${MAX_FILES} PDFs per message.`; break }
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { attachError.value = `${f.name} is not a PDF.`; continue }
    if (f.size > MAX_FILE_BYTES) { attachError.value = `${f.name} exceeds 10 MB.`; continue }
    attachedFiles.value.push(f)
  }
}

function removeFile(i) {
  attachedFiles.value.splice(i, 1)
  if (!attachedFiles.value.length) attachError.value = ''
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function useHint(hint) {
  draft.value = hint
  nextTick(() => inputEl.value?.focus())
}

// ---------------------------------------------------------------------------
// Scroll to bottom
// ---------------------------------------------------------------------------

async function scrollToBottom() {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

// ---------------------------------------------------------------------------
// Textarea auto-grow
// ---------------------------------------------------------------------------

function autoGrow() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = `${Math.min(inputEl.value.scrollHeight, 140)}px`
}

function resetInputHeight() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

function clearConversation() {
  agent.clear()
}

// ---------------------------------------------------------------------------
// Simple markdown renderer (bold, italic, code, lists, line breaks)
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(text) {
  if (!text) return ''
  let html = escapeHtml(String(text))

  // Code blocks (``` ... ```)
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="text-xs bg-black/30 rounded p-2 my-1 overflow-x-auto"><code>$1</code></pre>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="text-xs bg-black/30 rounded px-1">$1</code>')
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Unordered lists
  html = html.replace(/^[ \t]*[-*•] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)/g, '<ul class="space-y-0.5 my-1">$1</ul>')
  // Numbered lists
  html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
  // Line breaks
  html = html.replace(/\n/g, '<br>')

  return html
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

watch(currentProjectId, async (pid) => {
  if (!pid) { aiStatus.value = 'unavailable'; return }
  agent.clear()
  await checkAiStatus()
  if (aiStatus.value === 'ready') {
    await agent.loadHistory(pid)
    await scrollToBottom()
  }
}, { immediate: true })

watch(() => agent.messages.length, async () => {
  await scrollToBottom()
})

onMounted(() => {
  nextTick(() => inputEl.value?.focus())
})
</script>

<style scoped>
.agent-message-content :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.agent-message-content :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.agent-message-content :deep(pre) {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
