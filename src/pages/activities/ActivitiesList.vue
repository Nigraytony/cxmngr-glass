<template>
  <div class="space-y-4">
    <!-- Breadcrumbs at top -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Activities', to: '/activities' }
        ]"
      />
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <!-- New Activity round button placed left of Search -->
      <RouterLink
        :to="{ name: 'activity-edit', params: { id: 'new' } }"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
        aria-label="Add activity"
        title="Add activity"
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
      </RouterLink>
      <div>
        <label class="block text-white/70 text-sm">Search</label>
        <input
          v-model="q"
          type="text"
          placeholder="Search by name or type"
          class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-64"
        >
      </div>
      <div>
        <label class="block text-white/70 text-sm">Type</label>
        <div
          ref="typeMenuRef"
          class="relative"
        >
          <button
            :aria-expanded="showTypeMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[16rem] justify-between"
            @click="toggleTypeMenu"
          >
            <span class="flex items-center gap-2">
              <span>{{ typeFilterLabel }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ typeCount(typeFilterLabel) }}</span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-3 h-3 ml-1"
            ><path
              d="M6 9l6 6 6-6"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
          </button>
          <div
            v-if="showTypeMenu"
            class="absolute left-0 mt-2 w-80 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in typeOptions"
                :key="opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2 whitespace-nowrap', (typeFilterLabel === opt.name) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                @click="applyTypeFilter(opt.name)"
              >
                <span>{{ opt.name }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        class="px-3 py-2 rounded bg-white/10 text-white border border-white/20"
        @click="refresh()"
      >
        Refresh
      </button>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-if="!projectStore.currentProjectId">
        <div class="p-6 text-center text-white/80 w-full">
          <div class="text-lg font-semibold">
            No project selected
          </div>
          <div class="mt-2 text-sm">
            Select a project from the user menu or Projects page to view its activities.
          </div>
        </div>
      </template>
      <template v-else>
        <RouterLink
          v-for="a in filtered"
          :key="a.id"
          :to="{ name: 'activity-edit', params: { id: a.id || a._id } }"
          class="group relative block p-4 rounded-xl bg-white/10 border border-white/20 text-white/90 transition-all duration-200 ease-out hover:bg-white/12 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 overflow-hidden"
        >
          <!-- subtle hover overlay -->
          <div class="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <!-- bottom gradient like photo thumbnails -->
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div class="relative">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                {{ a.name }}
              </h2>
              <!-- optional chevron icon to indicate clickable card -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="w-4 h-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <path
                  d="M9 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="text-sm text-white/70 mt-1">
              Type: {{ a.type }}
            </div>
            <div class="text-xs text-white/60">
              Start: {{ fmt(a.startDate) }} · End: {{ fmt(a.endDate) }}
            </div>
            <div class="mt-2 flex -space-x-2">
              <img
                v-for="(p,idx) in (a.photos || []).slice(0,3)"
                :key="idx"
                :src="p.data"
                class="w-10 h-10 object-cover rounded-md border border-white/20"
              >
            </div>
          </div>
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue'
import { useActivitiesStore } from '../../stores/activities'
import { useProjectStore } from '../../stores/project'
import lists from '../../lists.js'
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const store = useActivitiesStore()
const projectStore = useProjectStore()
const q = ref('')
const typeFilter = ref<string>('')

onMounted(async () => {
  await store.fetchActivities().catch(() => {})
})

function fmt(d?: string) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) }
}

// Styled Type dropdown state and options (like Issues filters)
const showTypeMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const typeFilterLabel = computed(() => typeFilter.value || 'All')
const typeCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = { All: store.activities.length }
  for (const a of store.activities as any[]) {
    const t = (a && a.type) ? String(a.type) : 'Unknown'
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
})
const typeOptions = computed(() => {
  const opts = (lists.activityOptions || []).filter((o: any) => o && o.value)
  const rest = opts.map((o: any) => ({ name: String(o.value), count: typeCounts.value[String(o.value)] || 0 }))
  return [{ name: 'All', count: typeCounts.value['All'] }, ...rest]
})
function typeCount(name: string) { return typeCounts.value[name] || 0 }
function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function applyTypeFilter(name: string) { typeFilter.value = name === 'All' ? '' : name; closeTypeMenu() }
function onClickOutside(e: MouseEvent) {
  const el = typeMenuRef.value
  if (!el) return
  const target = e.target as Node
  if (!el.contains(target)) closeTypeMenu()
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const searchMode = computed(() => {
  try {
    const p: any = projectStore.currentProject || null
    const m = p && p.searchMode ? String(p.searchMode).toLowerCase() : ''
    return m || 'substring'
  } catch (e) { return 'substring' }
})

function fuzzyMatch(text: string, pattern: string) {
  let pi = 0
  for (let i = 0; i < text.length && pi < pattern.length; i++) {
    if (text[i] === pattern[pi]) pi++
  }
  return pi === pattern.length
}

const filtered = computed(() => {
  let list = store.activities
  // activities in store are already filtered by current project in fetchActivities()
  if (!q.value) return list
  const s = q.value.toLowerCase()
  const mode = searchMode.value
  const base = typeFilter.value ? list.filter((a: any) => String(a.type || '').toLowerCase() === String(typeFilter.value).toLowerCase()) : list
  return base.filter((a: any) => {
    const fields = [(a.name || ''), (a.type || '')].map(f => f.toLowerCase())
    if (mode === 'exact') return fields.some(f => f === s)
    if (mode === 'fuzzy') return fields.some(f => fuzzyMatch(f, s))
    return fields.some(f => f.includes(s))
  }) as any
})

function refresh() {
  // Always fetch for the current project (store handles project scoping)
  store.fetchActivities().catch(() => {})
}
</script>

<style scoped>
</style>
