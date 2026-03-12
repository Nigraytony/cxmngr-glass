<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div
        v-if="String(label || '').trim()"
        class="text-sm text-white/70"
      >
        {{ label }}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div
          v-if="showRefresh"
          class="relative inline-block group shrink-0"
        >
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-full bg-white/0 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="disabled || !projectId"
            aria-label="Refresh"
            @click="emit('refresh')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                d="M21 12a9 9 0 1 1-2.64-6.36"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M21 3v6h-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute right-0 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Refresh
          </div>
        </div>

        <div class="relative inline-block group shrink-0">
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-full bg-white/0 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="disabled || !projectId"
            aria-label="Link OPR items"
            @click="openPicker"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute right-0 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Link OPR items
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="oprAddonRequired"
      class="text-xs text-white/60"
    >
      OPR Workshop add-on is required to link OPR items.
    </div>

    <template v-else-if="showSelected">
      <div
        v-if="selectedMetaList.length === 0"
        class="text-xs text-white/60"
      >
        No OPR items linked.
      </div>

      <div
        v-else
        class="flex flex-wrap gap-2"
      >
        <span
          v-for="item in selectedMetaList"
          :key="item.id"
          class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85"
          :title="item.status === 'archived' ? 'Archived OPR item' : ''"
        >
          <span class="inline-flex items-center gap-2 min-w-0">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
              #{{ item.rank }}
            </span>
            <span
              v-if="item.status === 'archived'"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 shrink-0"
            >
              Archived
            </span>
            <span class="truncate max-w-[22rem]">
              {{ item.text }}
            </span>
          </span>
          <button
            type="button"
            class="text-white/60 hover:text-white"
            aria-label="Remove OPR item"
            :disabled="disabled"
            @click="removeOne(item.id)"
          >
            ×
          </button>
        </span>
      </div>
    </template>

    <Modal
      v-model="pickerOpen"
      panel-class="max-w-3xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-3">
          <div class="text-lg font-semibold">
            Link OPR Items
          </div>
          <div class="text-sm text-white/60">
            {{ workingSelectedIds.length }} selected
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <label class="block min-w-[240px]">
            <div class="text-xs text-white/70 mb-1">Category</div>
            <select
              v-model="categoryId"
              class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option
                value=""
                disabled
              >
                Select category…
              </option>
              <option
                v-for="c in categories"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </label>

          <label class="block flex-1 min-w-[220px]">
            <div class="text-xs text-white/70 mb-1">Search</div>
            <input
              v-model="search"
              type="text"
              class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Search items…"
            >
          </label>
        </div>

        <div
          v-if="loading"
          class="text-white/70 text-sm"
        >
          Loading…
        </div>

        <div
          v-else-if="!categoryId"
          class="text-white/70 text-sm"
        >
          Select a category.
        </div>

        <div
          v-else-if="filteredItems.length === 0"
          class="text-white/70 text-sm"
        >
          No OPR items found for this category.
        </div>

        <div
          v-else
          class="max-h-[60vh] overflow-auto rounded-lg border border-white/10 bg-black/10"
        >
          <div
            v-for="it in filteredItems"
            :key="it.id"
            class="px-3 py-2 border-b border-white/10 flex items-start gap-3"
          >
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-white/20 bg-black/20 text-white focus:ring-white/30"
              :checked="workingSelectedSet.has(it.id)"
              :disabled="disabled"
              @change="toggle(it.id)"
            >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
                  #{{ it.rank }}
                </span>
                <span class="text-xs text-white/60 shrink-0">{{ it.score }} pts</span>
              </div>
              <div class="text-white/85 text-sm mt-1 whitespace-pre-wrap">
                {{ it.text }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="pickerOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="disabled"
            @click="applySelection"
          >
            Apply
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import Modal from './Modal.vue'
  import http from '../utils/http'
  import { useUiStore } from '../stores/ui'

type OprCategory = { id: string; name: string; sortOrder?: number }
type OprItem = { id: string; categoryId: string | null; questionId: string | null; sourceAnswerId: string | null; text: string; score: number; rank: number; status: 'active' | 'archived' }

const props = defineProps<{
  projectId: string
  modelValue: string[]
  disabled?: boolean
  label?: string
  showSelected?: boolean
  showRefresh?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
  (e: 'refresh'): void
}>()

const ui = useUiStore()

const disabled = computed(() => Boolean(props.disabled))
const label = computed(() => props.label || 'OPR items')
const showSelected = computed(() => props.showSelected !== false)
const showRefresh = computed(() => props.showRefresh === true)

const categories = ref<OprCategory[]>([])
const items = ref<OprItem[]>([])
const selectedMeta = ref<Record<string, OprItem>>({})
const loading = ref(false)
const oprAddonRequired = ref(false)

const pickerOpen = ref(false)
const categoryId = ref('')
const search = ref('')
const workingSelectedIds = ref<string[]>([])
const workingSelectedSet = computed(() => new Set(workingSelectedIds.value))

const selectedMetaList = computed(() => {
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  const meta = selectedMeta.value || {}
  const list: OprItem[] = ids.map((id) => meta[id]).filter(Boolean)
  // keep stable ordering by rank then id
  return list.sort((a, b) => (Number(a.rank || 0) - Number(b.rank || 0)) || String(a.id).localeCompare(String(b.id)))
})

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = Array.isArray(items.value) ? items.value : []
  return q ? list.filter((i) => String(i.text || '').toLowerCase().includes(q)) : list
})

async function fetchCategories() {
  if (!props.projectId) return
  const { data } = await http.get(`/api/projects/${props.projectId}/opr/link/categories`)
  categories.value = Array.isArray(data) ? data : []
  if (!categoryId.value) categoryId.value = String(categories.value[0]?.id || '')
}

async function fetchItems(category: string) {
  if (!props.projectId || !category) { items.value = []; return }
  const { data } = await http.get(`/api/projects/${props.projectId}/opr/link/items`, {
    params: { categoryId: category },
  })
  items.value = Array.isArray(data) ? data : []
}

async function fetchSelectedMeta() {
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  if (!props.projectId || ids.length === 0) { selectedMeta.value = {}; return }
  const { data } = await http.get(`/api/projects/${props.projectId}/opr/link/items`, {
    params: { ids: ids.join(','), includeArchived: 1 },
  })
  const map: Record<string, OprItem> = {}
  if (Array.isArray(data)) {
    for (const it of data) {
      if (it && it.id) map[String(it.id)] = it
    }
  }
  selectedMeta.value = map
}

async function hydrate() {
  return hydrateWith({ userInitiated: false })
}

async function hydrateWith(opts: { userInitiated: boolean }) {
  oprAddonRequired.value = false
  loading.value = true
  try {
    await fetchCategories()
    await fetchItems(categoryId.value)
    await fetchSelectedMeta()
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'OPR_ADDON_REQUIRED' || e?.response?.status === 402) {
      oprAddonRequired.value = true
      categories.value = []
      items.value = []
      selectedMeta.value = {}
      return
    }
    // Avoid noisy toasts when this component mounts inside other UIs (e.g. checklists).
    // Only show errors when the user explicitly opens the picker.
    if (opts && opts.userInitiated) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to load OPR items', { duration: 6000 })
    }
  } finally {
    loading.value = false
  }
}

function openPicker() {
  workingSelectedIds.value = Array.isArray(props.modelValue) ? props.modelValue.slice() : []
  pickerOpen.value = true
  if (!categories.value.length) hydrateWith({ userInitiated: true })
}

function toggle(id: string) {
  const list = workingSelectedIds.value.slice()
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  workingSelectedIds.value = list
}

function applySelection() {
  emit('update:modelValue', workingSelectedIds.value.slice())
  pickerOpen.value = false
}

function removeOne(id: string) {
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  emit('update:modelValue', ids.filter((x) => String(x) !== String(id)))
}

watch(() => props.projectId, async () => {
  // Reset cached OPR data when switching projects.
  categories.value = []
  items.value = []
  selectedMeta.value = {}
  oprAddonRequired.value = false

  // If the picker is open, refresh (user is actively interacting).
  if (pickerOpen.value) await hydrateWith({ userInitiated: true })

  // If there are already-linked ids, best-effort hydrate their meta silently.
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  if (props.projectId && ids.length) {
    try { await fetchSelectedMeta() } catch (e) { /* silent */ }
  }
}, { immediate: true })

watch(categoryId, async (c) => {
  if (!pickerOpen.value) return
  try {
    loading.value = true
    await fetchItems(c)
  } finally {
    loading.value = false
  }
})

watch(() => props.modelValue, async () => {
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  if (!props.projectId || ids.length === 0) {
    selectedMeta.value = {}
    return
  }
  try {
    await fetchSelectedMeta()
  } catch (e) {
    // Silent: linking metadata isn't user-initiated; avoid toasts.
  }
})
</script>
