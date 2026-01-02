<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div>
          <div class="text-lg font-semibold">{{ title || 'Auto-tag this page' }}</div>
          <div class="text-xs text-white/60 mt-1">
            Suggests tags from the project tag library only. Apply selectively.
          </div>
        </div>
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="emit('update:modelValue', false)"
        >
          Close
        </button>
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-if="!canSuggest"
        class="text-sm text-white/80 bg-white/5 border border-white/10 rounded-lg p-3"
      >
        Auto-tagging is unavailable. Make sure the project has AI enabled and a tag library configured.
      </div>

      <div
        v-else-if="!allowedTags.length"
        class="text-sm text-white/80 bg-white/5 border border-white/10 rounded-lg p-3 flex items-start justify-between gap-3"
      >
        <div class="min-w-0">
          <div class="font-medium text-white/90">
            This project has no tag library configured.
          </div>
          <div class="text-xs text-white/70 mt-1">
            Add a few tags first, then re-run auto-tagging. Suggestions are restricted to your project tag library.
          </div>
        </div>
        <button
          class="shrink-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="goToProjectSettings"
        >
          Open Project Settings
        </button>
      </div>

      <div
        v-else
        class="flex items-center justify-between gap-3 flex-wrap"
      >
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm disabled:opacity-50"
            :disabled="busy || !items.length"
            @click="selectAll(true)"
          >
            Select all
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm disabled:opacity-50"
            :disabled="busy || !items.length"
            @click="selectAll(false)"
          >
            Select none
          </button>
          <div class="text-xs text-white/60">
            {{ selectedCount }} selected
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div
            v-if="busy"
            class="text-xs text-white/70"
          >
            {{ progressText }}
          </div>
          <button
            class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 text-sm disabled:opacity-50"
            :disabled="busy || !items.length"
            @click="runSuggestions"
          >
            Suggest tags
          </button>
          <button
            class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 text-sm disabled:opacity-50"
            :disabled="busy || !selectedCount"
            @click="applySelected"
          >
            Apply selected
          </button>
        </div>
      </div>

      <div
        v-if="canSuggest && allowedTags.length"
        class="max-h-[60vh] overflow-auto rounded-lg border border-white/10 bg-white/5"
      >
        <div class="divide-y divide-white/10">
          <div
            v-for="it in items"
            :key="it.id"
            class="p-3"
          >
            <div class="flex items-start gap-3">
              <input
                v-model="selectedIds[it.id]"
                type="checkbox"
                class="mt-1 h-4 w-4 accent-indigo-400"
                :disabled="busy"
              >
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-sm text-white font-medium truncate">
                      {{ it.title || it.id }}
                    </div>
                    <div
                      v-if="it.subtitle"
                      class="text-xs text-white/60 truncate"
                    >
                      {{ it.subtitle }}
                    </div>
                  </div>
                  <div class="text-xs text-white/50 shrink-0">
                    {{ (suggestions[it.id] || []).length ? `${(suggestions[it.id] || []).length} suggested` : '' }}
                  </div>
                </div>

                <div
                  v-if="(it.existingTags || []).length"
                  class="mt-2 flex flex-wrap gap-1"
                >
                  <span class="text-xs text-white/60 mr-1">Existing:</span>
                  <span
                    v-for="t in it.existingTags"
                    :key="t"
                    class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10"
                  >
                    {{ t }}
                  </span>
                </div>

                <div class="mt-2">
                  <div class="text-xs text-white/60 mb-1">
                    Suggestions:
                  </div>
                  <div
                    v-if="(suggestions[it.id] || []).length"
                    class="flex flex-wrap gap-2"
                  >
                    <label
                      v-for="s in suggestions[it.id]"
                      :key="s.tag"
                      class="inline-flex items-center gap-2 text-xs text-white/85"
                    >
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-emerald-400"
                        :disabled="busy || !selectedIds[it.id]"
                        :checked="isTagChecked(it.id, s.tag)"
                        @change="toggleTag(it.id, s.tag, ($event.target as HTMLInputElement).checked)"
                      >
                      <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-100">
                        {{ s.tag }}
                      </span>
                      <span
                        v-if="s.reason"
                        class="text-white/50"
                      >
                        {{ s.reason }}
                      </span>
                    </label>
                  </div>
                  <div
                    v-else
                    class="text-xs text-white/50"
                  >
                    {{ attemptedIds.has(it.id) ? 'No suggestions.' : 'Not generated yet.' }}
                  </div>
                </div>

                <div
                  v-if="errors[it.id]"
                  class="mt-2 text-xs text-red-200"
                >
                  {{ errors[it.id] }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs text-white/60">
          {{ footerHint }}
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
            @click="emit('update:modelValue', false)"
          >
            Close
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from './Modal.vue'
import { useAiStore, type SuggestedTag } from '../stores/ai'
import { useUiStore } from '../stores/ui'

export type BulkAutoTagItem = {
  id: string
  title: string
  subtitle?: string
  existingTags: string[]
  entity: any
}

const props = defineProps<{
  modelValue: boolean
  title?: string
  projectId: string
  entityType: string
  allowedTags: string[]
  items: BulkAutoTagItem[]
  canSuggest: boolean
  applyTags: (id: string, tags: string[]) => Promise<void>
}>()

const emit = defineEmits<{(e: 'update:modelValue', v: boolean): void}>()

const ui = useUiStore()
const ai = useAiStore()
const router = useRouter()

const busy = ref(false)
const progress = ref({ done: 0, total: 0 })

const selectedIds = reactive<Record<string, boolean>>({})
const suggestions = reactive<Record<string, SuggestedTag[]>>({})
const checkedById = reactive<Record<string, Record<string, boolean>>>({})
const errors = reactive<Record<string, string>>({})
const attemptedIds = ref(new Set<string>())

function goToProjectSettings() {
  emit('update:modelValue', false)
  const pid = String(props.projectId || '').trim()
  if (!pid) return
  router.push({ path: `/app/projects/edit/${pid}`, query: { tab: 'settings' } })
}

function normalizeTags(input: any): string[] {
  const arr = Array.isArray(input) ? input : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const t = String(raw || '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

const selectedCount = computed(() => Object.keys(selectedIds).filter((k) => selectedIds[k]).length)
const progressText = computed(() => progress.value.total ? `Suggesting… ${progress.value.done}/${progress.value.total}` : '')
const footerHint = computed(() => props.items.length ? `${props.items.length} item(s) on this page` : 'No items on this page')

function selectAll(val: boolean) {
  for (const it of props.items) selectedIds[it.id] = val
}

function isTagChecked(id: string, tag: string) {
  return Boolean(checkedById[id] && checkedById[id][String(tag || '')])
}

function toggleTag(id: string, tag: string, checked: boolean) {
  if (!checkedById[id]) checkedById[id] = {}
  checkedById[id][String(tag || '')] = checked
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const concurrency = Math.max(1, Math.min(6, Math.floor(limit || 1)))
  let idx = 0
  const runners = new Array(concurrency).fill(0).map(async () => {
    while (idx < items.length) {
      const cur = items[idx++]
      await worker(cur)
    }
  })
  await Promise.all(runners)
}

async function runSuggestions() {
  if (!props.projectId) return
  if (!props.items.length) return
  busy.value = true
  progress.value = { done: 0, total: props.items.length }
  try {
    for (const it of props.items) {
      errors[it.id] = ''
      attemptedIds.value.add(it.id)
    }

    await runWithConcurrency(props.items, 3, async (it) => {
      try {
        const allowed = Array.isArray(props.allowedTags) ? props.allowedTags : []
        const existing = Array.isArray(it.existingTags) ? it.existingTags : []
        const result = await ai.suggestTags(props.projectId, props.entityType, it.entity || {}, { existingTags: existing, allowedTags: allowed })
        const list = Array.isArray(result) ? result : []
        suggestions[it.id] = list
          .filter((s: any) => s && s.tag)
          .slice(0, 12)
        checkedById[it.id] = {}
        for (const s of suggestions[it.id]) checkedById[it.id][s.tag] = true
      } catch (e: any) {
        errors[it.id] = e?.response?.data?.error || e?.message || 'Suggest failed'
        suggestions[it.id] = []
        checkedById[it.id] = {}
      } finally {
        progress.value.done++
      }
    })
  } finally {
    busy.value = false
  }
}

async function applySelected() {
  const selected = props.items.filter((it) => selectedIds[it.id])
  if (!selected.length) return
  busy.value = true
  try {
    for (const it of selected) {
      const existing = normalizeTags(it.existingTags || [])
      const sug = Array.isArray(suggestions[it.id]) ? suggestions[it.id] : []
      const checkedMap = checkedById[it.id] || {}
      const picked = sug
        .map((s) => String(s.tag || '').trim())
        .filter(Boolean)
        .filter((t) => checkedMap[t] === true)

      const merged = normalizeTags([ ...existing, ...picked ])
      if (merged.length === existing.length) continue
      await props.applyTags(it.id, merged)
    }
    ui.showSuccess('Tags updated')
    emit('update:modelValue', false)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to apply tags')
  } finally {
    busy.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  for (const it of props.items) {
    selectedIds[it.id] = true
    errors[it.id] = ''
    if (!suggestions[it.id]) suggestions[it.id] = []
    if (!checkedById[it.id]) checkedById[it.id] = {}
  }
  attemptedIds.value = new Set<string>()
}, { immediate: true })
</script>
