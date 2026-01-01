<template>
  <Modal
    :model-value="assistant.open"
    panel-class="max-w-4xl h-[calc(100vh-3rem)] flex flex-col overflow-hidden"
    main-class="mb-0 flex-1 min-h-0 overflow-hidden"
    @update:model-value="assistant.setOpen"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-lg font-semibold text-white">
            Assistant
          </div>
          <div class="text-xs text-white/60">
            {{ headerSubtitle }}
          </div>
          <div
            v-if="assistant.context.projectId"
            class="mt-1 text-[11px] text-white/60"
          >
            <span class="text-white/40">AI:</span>
            <span v-if="aiStatusLoading">checking…</span>
            <span v-else-if="aiStatus">
              {{ aiLabel }}
            </span>
            <span v-else>—</span>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 px-3 h-9 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-sm text-white/80"
          @click="openFullAssistant"
        >
          Open full Assistant
        </button>
      </div>
    </template>

    <div class="flex flex-col gap-3 h-full min-h-0">
      <div
        v-if="!assistant.introDismissed"
        class="rounded-xl border border-white/10 bg-black/40 p-4 text-white/80"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="text-sm leading-relaxed">
            The Assistant helps guide you through commissioning workflows (LEED/ASHRAE/Cx), generate recommended tasks, and provide trusted links to official documentation. CXMA does not store or reproduce copyrighted standards text.
          </div>
          <button
            type="button"
            class="text-white/60 hover:text-white/80"
            aria-label="Dismiss"
            @click="assistant.dismissIntro()"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        v-if="!assistant.context.projectId"
        class="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70"
      >
        Select a project to use the Assistant.
      </div>

      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0 h-full"
      >
        <div class="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 min-h-0 h-full overflow-y-auto">
          <div class="text-sm font-semibold text-white/90">
            Suggested actions
          </div>
          <div class="mt-1 text-sm text-white/70">
            Quick shortcuts based on this project.
          </div>

          <div class="mt-3 space-y-2">
            <button
              type="button"
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-sm text-white/85 text-left"
              @click="openFullAssistant"
            >
              Open compliance checklist
              <div class="mt-0.5 text-[11px] text-white/50">
                View and track commissioning compliance items.
              </div>
            </button>

            <button
              type="button"
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-sm text-white/85 text-left disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!features.tasks"
              @click="openTasksImport('template')"
            >
              Import tasks from a template
              <div class="mt-0.5 text-[11px] text-white/50">
                Uses task templates tagged for "{{ assistant.projectType || 'this project type' }}".
              </div>
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-sm text-white/85 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!features.tasks"
                @click="openTasksImport('upload-csv')"
              >
                Import CSV
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-sm text-white/85 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!features.tasks"
                @click="openTasksImport('upload-xml')"
              >
                Import XML
              </button>
            </div>

            <div
              v-if="!features.tasks"
              class="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/60"
            >
              Tasks aren’t enabled on this subscription plan. Upgrade the project to unlock task importing.
            </div>
          </div>

          <div class="mt-4 text-xs text-white/50">
            Project type: {{ assistant.projectType || '—' }}
          </div>
        </div>

        <div class="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 overflow-hidden min-h-0 h-full">
          <div class="h-full min-h-0 flex flex-col">
            <div
              v-if="aiStatusLoading"
              class="p-4 text-sm text-white/70"
            >
              Loading AI status…
            </div>

            <div
              v-else-if="!aiStatus || !aiStatus.ai"
              class="p-4"
            >
              <AssistantHelper />
            </div>

            <div
              v-else-if="aiStatus.ai.canChat === false"
              class="p-4"
            >
              <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-50">
                <div class="font-semibold">
                  AI is not ready for this project
                </div>
                <div class="mt-1 text-sm text-amber-100/90">
                  <span v-if="aiStatus.ai.reason === 'FEATURE_NOT_IN_PLAN'">Upgrade to the Premium plan to enable AI.</span>
                  <span v-else-if="aiStatus.ai.reason === 'AI_DISABLED'">AI is disabled for this project.</span>
                  <span v-else>AI needs an API key (project key or server key fallback) to operate.</span>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    v-if="aiStatus.ai.reason === 'FEATURE_NOT_IN_PLAN'"
                    type="button"
                    class="px-3 h-9 rounded-lg bg-white/15 border border-white/20 hover:bg-white/20 text-sm text-white"
                    @click="openProjectSettings('subscription', 'ai')"
                  >
                    View plans
                  </button>
                  <button
                    v-else
                    type="button"
                    class="px-3 h-9 rounded-lg bg-white/15 border border-white/20 hover:bg-white/20 text-sm text-white"
                    @click="openProjectSettings('settings')"
                  >
                    Open AI settings
                  </button>
                </div>
              </div>
            </div>

            <AssistantChat
              v-else
              class="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-3 h-10 rounded-lg bg-white/10 border border-white/15 hover:bg-white/15 text-white/80"
          @click="assistant.close()"
        >
          Close
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '../Modal.vue'
import { useAssistantStore } from '../../stores/assistant'
import AssistantChat from './AssistantChat.vue'
import AssistantHelper from './AssistantHelper.vue'
import http from '../../utils/http'

const assistant = useAssistantStore()
const router = useRouter()

function normalizeFeatureFlags(raw: any) {
  const out: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!k) continue
    const key = String(k).toLowerCase()
    if (v === false || v === 'false' || v === 0) { out[key] = false; continue }
    if (v === true || v === 'true' || v === 1) { out[key] = true; continue }
  }
  return out
}

const DEFAULT_FEATURES = {
  tasks: false,
}
const PLAN_FEATURES: Record<string, any> = {
  basic: { tasks: false },
  standard: { tasks: false },
  premium: { tasks: true },
}

const features = computed(() => {
  const proj: any = assistant.currentProject || {}
  const tierKey = String(assistant.tierKey || '').toLowerCase().trim()
  const tierFlags = tierKey && PLAN_FEATURES[tierKey] ? normalizeFeatureFlags(PLAN_FEATURES[tierKey]) : {}
  const projectFlags = normalizeFeatureFlags(proj.subscriptionFeatures)
  return { ...DEFAULT_FEATURES, ...tierFlags, ...projectFlags }
})

const headerSubtitle = computed(() => {
  const pName = assistant.currentProject?.name ? String(assistant.currentProject.name) : ''
  const tier = assistant.tierKey ? String(assistant.tierKey).toUpperCase() : ''
  const ctx = assistant.context?.routeName ? String(assistant.context.routeName) : ''
  const bits = []
  if (pName) bits.push(pName)
  if (tier) bits.push(tier)
  if (ctx) bits.push(`Context: ${ctx}`)
  return bits.join(' • ') || 'Project helper'
})

const aiStatusLoading = ref(false)
const aiStatus = ref<any | null>(null)

const aiLabel = computed(() => {
  const ai = aiStatus.value?.ai || null
  if (!ai) return '—'
  const provider = String(ai.provider || '').toLowerCase()
  const providerName = provider === 'gemini' ? 'Gemini' : provider === 'claude' ? 'Claude' : 'OpenAI'
  const model = String(ai.model || '').trim()
  const source = ai.keySource === 'project' ? 'Project key' : ai.keySource === 'server' ? 'Server key' : 'No key'
  return `${providerName}${model ? ` • ${model}` : ''} • ${source}`
})

async function fetchAiStatus() {
  const projectId = String(assistant.context?.projectId || '').trim()
  if (!projectId) {
    aiStatus.value = null
    return
  }
  aiStatusLoading.value = true
  try {
    const { data } = await http.get('/api/ai/status', { params: { projectId } })
    aiStatus.value = data || null
  } catch (_) {
    aiStatus.value = null
  } finally {
    aiStatusLoading.value = false
  }
}

watch(() => assistant.open, (v) => {
  if (v) void fetchAiStatus()
})
watch(() => assistant.context?.projectId, () => {
  if (assistant.open) void fetchAiStatus()
})

function openFullAssistant() {
  assistant.close()
  router.push({ name: 'assistant' })
}

function openProjectSettings(tab: 'settings' | 'subscription', upgradeFeature?: string) {
  const projectId = String(assistant.context?.projectId || '').trim()
  assistant.close()
  router.push({
    name: 'project-settings',
    params: { id: projectId || undefined },
    query: { tab, ...(upgradeFeature ? { upgrade: upgradeFeature } : {}) },
  })
}

function openTasksImport(tab: 'template' | 'upload-csv' | 'upload-xml') {
  if (!features.value.tasks) return
  assistant.close()
  const templateQ = assistant.projectType ? String(assistant.projectType).trim() : ''
  router.push({
    name: 'tasks',
    query: {
      import: '1',
      tab,
      ...(tab === 'template' && templateQ ? { templateQ } : {}),
    },
  })
}
</script>
