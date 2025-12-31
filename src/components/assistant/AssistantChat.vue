<template>
  <div class="h-full min-h-0 flex flex-col">
    <div class="flex items-center justify-between px-3 py-2 border-b border-white/10">
      <div class="text-sm font-medium text-white/90">
        Chat
      </div>
      <button
        type="button"
        class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80"
        @click="ai.clear()"
      >
        Clear
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
      <div
        v-if="ai.messages.length === 0"
        class="text-xs text-white/60 leading-relaxed"
      >
        Ask about next steps, summarize a page, draft an issue description, or generate checklists.
      </div>
      <div
        v-for="(m, idx) in ai.messages"
        :key="idx"
        class="max-w-[95%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap"
        :class="m.role === 'user' ? 'ml-auto bg-white/15 border border-white/20 text-white' : 'mr-auto bg-black/40 border border-white/10 text-white/90'"
      >
        {{ m.content }}
      </div>
      <div
        v-if="ai.sending"
        class="text-xs text-white/60"
      >
        Thinking…
      </div>
    </div>

    <div class="p-3 border-t border-white/10">
      <form
        class="flex items-end gap-2"
        @submit.prevent="onSend"
      >
        <textarea
          v-model="ai.draft"
          rows="2"
          placeholder="Message…"
          class="flex-1 resize-none px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-white/40 text-white text-sm"
          @keydown.enter.exact.prevent="onSend"
        />
        <button
          type="submit"
          class="h-10 px-3 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="ai.sending || !projectId"
        >
          Send
        </button>
      </form>
      <div class="mt-1 text-[11px] text-white/50">
        Enter sends. Shift+Enter for a new line.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '../../stores/project'
import { useAssistantStore } from '../../stores/assistant'
import { useAssistantChecklistStore } from '../../stores/assistantChecklist'
import { useAssistantDocsStore } from '../../stores/assistantDocs'
import { useAiStore } from '../../stores/ai'
import { useUiStore } from '../../stores/ui'

const route = useRoute()
const projectStore = useProjectStore()
const assistant = useAssistantStore()
const checklistStore = useAssistantChecklistStore()
const docsStore = useAssistantDocsStore()
const ai = useAiStore()
const ui = useUiStore()

const projectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''))
const selectedChecklistItem = computed(() => {
  const entityType = assistant.context?.entityType ? String(assistant.context.entityType) : ''
  const entityId = assistant.context?.entityId ? String(assistant.context.entityId) : ''
  if (entityType !== 'assistantChecklistItem' || !entityId) return null
  const items = checklistStore.checklist?.items || []
  const it = items.find((x: any) => x && String(x.id) === entityId) || null
  if (!it) return null
  return {
    id: String(it.id || ''),
    category: it.category ? String(it.category) : '',
    title: it.title ? String(it.title) : '',
    description: it.description ? String(it.description) : '',
    guidance: it.guidance ? String(it.guidance) : '',
  }
})

const trustedLinks = computed(() => {
  const d = docsStore.docs
  const docs = Array.isArray(d?.docs) ? d!.docs : []
  const general = Array.isArray(d?.general) ? d!.general : []
  const compact = (arr: any[]) => arr
    .map((x) => ({ title: String(x?.title || ''), url: String(x?.url || '') }))
    .filter((x) => x.title && x.url)
    .slice(0, 8)
  return {
    docs: compact(docs),
    general: compact(general),
  }
})

const context = computed(() => ({
  // Always include basic route context
  routeName: route.name || null,
  routePath: route.path || null,
  projectId: projectId.value || null,
  // Include assistant context (e.g., selected item) if available
  assistant: {
    ...(assistant.context || {}),
    projectType: assistant.projectType || null,
    tier: assistant.tierKey || null,
    selectedChecklistItem: selectedChecklistItem.value,
    trustedLinks: trustedLinks.value,
  },
}))

async function ensureHistoryLoaded() {
  if (!projectId.value) return
  try {
    await ai.loadHistory(projectId.value, { limit: 60 })
  } catch (e: any) {
    // Non-fatal; still allow chat to operate.
    // eslint-disable-next-line no-console
    console.warn('Failed to load assistant chat history', e?.response?.data || e?.message || e)
  }
}

async function onSend() {
  try {
    await ai.send(projectId.value, context.value)
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to send AI message'
    const reqId = e?.response?.data?.reqId
    ui.showError(reqId ? `${msg} (reqId: ${reqId})` : msg)
  }
}

onMounted(() => { void ensureHistoryLoaded() })
watch(projectId, () => { void ensureHistoryLoaded() })
</script>
