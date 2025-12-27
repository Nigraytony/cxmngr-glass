<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between px-3 py-2 border-b border-white/10">
      <div class="text-sm font-medium text-white/90">
        AI Assistant
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80"
          @click="ai.clear()"
        >
          Clear
        </button>
        <button
          type="button"
          class="w-8 h-8 grid place-items-center rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-white/80"
          aria-label="Close AI"
          @click="ai.toggleOpen(false)"
        >
          ×
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-2 space-y-2">
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useAiStore } from '../stores/ai'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const projectStore = useProjectStore()
const ai = useAiStore()
const ui = useUiStore()

const projectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''))
const context = computed(() => ({
  routeName: route.name || null,
  routePath: route.path || null,
  projectId: projectId.value || null,
}))

async function onSend() {
  try {
    await ai.send(projectId.value, context.value)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to send AI message')
  }
}
</script>

