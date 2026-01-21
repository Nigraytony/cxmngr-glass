<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm text-white/70">
        {{ label }}
      </div>
      <button
        type="button"
        class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="disabled || !projectId"
        @click="openPicker"
      >
        Link OPR items
      </button>
    </div>

    <div
      v-if="oprAddonRequired"
      class="text-xs text-white/60"
    >
      OPR Workshop add-on is required to link OPR items.
    </div>

    <div
      v-else-if="selectedMetaList.length === 0"
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
              <option value="" disabled>
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
  import axios from 'axios'
  import Modal from './Modal.vue'
  import { getApiBase } from '../utils/api'
  import { getAuthHeaders } from '../utils/auth'
  import { useUiStore } from '../stores/ui'

type OprCategory = { id: string; name: string; sortOrder?: number }
type OprItem = { id: string; categoryId: string | null; questionId: string | null; sourceAnswerId: string | null; text: string; score: number; rank: number; status: 'active' | 'archived' }

const props = defineProps<{
  projectId: string
  modelValue: string[]
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const ui = useUiStore()

const disabled = computed(() => Boolean(props.disabled))
const label = computed(() => props.label || 'OPR items')

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
  const { data } = await axios.get(`${getApiBase()}/api/projects/${props.projectId}/opr/categories`, { headers: getAuthHeaders() })
  categories.value = Array.isArray(data) ? data : []
  if (!categoryId.value) categoryId.value = String(categories.value[0]?.id || '')
}

async function fetchItems(category: string) {
  if (!props.projectId || !category) { items.value = []; return }
  const { data } = await axios.get(`${getApiBase()}/api/projects/${props.projectId}/opr/items`, {
    headers: getAuthHeaders(),
    params: { categoryId: category },
  })
  items.value = Array.isArray(data) ? data : []
}

async function fetchSelectedMeta() {
  const ids = Array.isArray(props.modelValue) ? props.modelValue : []
  if (!props.projectId || ids.length === 0) { selectedMeta.value = {}; return }
  const { data } = await axios.get(`${getApiBase()}/api/projects/${props.projectId}/opr/items`, {
    headers: getAuthHeaders(),
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
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load OPR items', { duration: 6000 })
  } finally {
    loading.value = false
  }
}

function openPicker() {
  workingSelectedIds.value = Array.isArray(props.modelValue) ? props.modelValue.slice() : []
  pickerOpen.value = true
  if (!categories.value.length) hydrate()
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
  await hydrate()
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
  await fetchSelectedMeta()
})

onMounted(async () => {
  await hydrate()
})
</script>

