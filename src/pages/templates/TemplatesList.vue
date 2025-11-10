<template>
  <section
    ref="pageSection"
    class="space-y-6 relative"
  >
    <!-- header with breadcrumbs -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Templates', to: '/templates' }
        ]"
        title="Templates"
      />
    </div>

    <!-- toolbar -->
    <div class="flex flex-wrap items-center gap-2 gap-y-2 min-w-0">
      <div class="relative inline-block group">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Add template"
          :title="projectStore.currentProjectId ? 'Add template' : 'Select a project'"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
          @click="openCreate()"
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
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          {{ projectStore.currentProjectId ? 'Add template' : 'Select a project to add templates' }}
        </div>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="Search by tag, title or type"
        class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-64"
      >
      <div class="flex items-center gap-2">
        <label class="text-white/70 text-sm">Type</label>
        <div
          ref="typeMenuRef"
          class="relative"
        >
          <button
            :aria-expanded="showTypeMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
            @click="toggleTypeMenu"
          >
            <span class="flex items-center gap-2">
              <span>{{ typeFilter || 'All' }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ typeCount(typeFilter || 'All') }}</span>
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
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in typeOptions"
                :key="opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', (typeFilter || 'All') === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                @click="typeFilter = (opt.name === 'All' ? '' : opt.name); closeTypeMenu()"
              >
                <span>{{ opt.name }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-white/70 text-sm">System</label>
        <div
          ref="systemMenuRef"
          class="relative"
        >
          <button
            :aria-expanded="showSystemMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
            @click="toggleSystemMenu"
          >
            <span class="flex items-center gap-2">
              <span>{{ systemFilterLabel }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ systemCount(systemFilter || 'All') }}</span>
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
            v-if="showSystemMenu"
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in systemOptions"
                :key="opt.value || opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', systemFilterKey === (opt.name === 'All' ? 'All' : String(opt.value).toLowerCase()) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                @click="systemFilter = (opt.name === 'All' ? '' : String(opt.value || '')); closeSystemMenu()"
              >
                <span>{{ opt.name }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-white/70 text-sm">Status</label>
        <div
          ref="statusMenuRef"
          class="relative"
        >
          <button
            :aria-expanded="showStatusMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
            @click="toggleStatusMenu"
          >
            <span class="flex items-center gap-2">
              <span>{{ statusFilter || 'All' }}</span>
              <span :class="statusBadgeClass(statusFilter || 'All') + ' text-xs px-2 py-0.5 rounded-full'">{{ statusCount(statusFilter || 'All') }}</span>
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
            v-if="showStatusMenu"
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in statusOptions"
                :key="opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', (statusFilter || 'All') === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                @click="statusFilter = (opt.name === 'All' ? '' : opt.name); closeStatusMenu()"
              >
                <span class="inline-flex items-center gap-2">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full"
                    :class="statusDotClass(opt.name)"
                  />
                  <span>{{ opt.name }}</span>
                </span>
                <span :class="statusBadgeClass(opt.name) + ' text-xs px-2 py-0.5 rounded-full'">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- list -->
    <div class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2 min-w-0 overflow-x-auto">
      <div class="grid grid-cols-12 px-2 py-2 text-white/70 text-sm">
        <div class="col-span-1">
          Tag
        </div>
        <div class="col-span-3">
          Title
        </div>
        <div class="col-span-2">
          Type
        </div>
        <div class="col-span-2">
          System
        </div>
        <div class="col-span-2">
          Location
        </div>
        <div class="col-span-1">
          Status
        </div>
        <div class="col-span-1 text-right">
          Actions
        </div>
      </div>
      <div class="divide-y divide-white/10">
        <div
          v-for="t in paged"
          :key="t.id"
          class="grid grid-cols-12 items-center px-2 py-2 text-white/90"
        >
          <div
            class="col-span-1 truncate"
            :title="t.tag"
          >
            {{ t.tag || '-' }}
          </div>
          <div
            class="col-span-3 truncate"
            :title="t.title"
          >
            {{ t.title }}
          </div>
          <div class="col-span-2 truncate">
            {{ t.type }}
          </div>
          <div class="col-span-2 truncate">
            {{ t.system || '-' }}
          </div>
          <div
            class="col-span-2 truncate"
            :title="spaceName(t.spaceId)"
          >
            {{ spaceName(t.spaceId) || '-' }}
          </div>
          <div class="col-span-1 truncate">
            {{ t.status || '-' }}
          </div>
          <div class="col-span-1 flex items-center justify-end gap-2">
            <RouterLink
              :to="{ name: 'template-edit', params: { id: t.id || (t as any)._id } }"
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Open"
              :title="'Open ' + (t.title || t.tag)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
                stroke-width="1.5"
              /><circle
                cx="12"
                cy="12"
                r="3"
                stroke-width="1.5"
              /></svg>
            </RouterLink>
            <button
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Duplicate"
              title="Duplicate"
              @click="duplicateTemplate(t)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <rect
                  x="9"
                  y="3"
                  width="12"
                  height="12"
                  rx="2"
                  stroke-width="1.5"
                />
                <rect
                  x="3"
                  y="9"
                  width="12"
                  height="12"
                  rx="2"
                  stroke-width="1.5"
                />
              </svg>
            </button>
            <button
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Edit"
              @click="openEdit(t)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                stroke-width="1.5"
              /><path
                d="M14.06 6.19l1.77-1.77a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12l-1.77 1.77"
                stroke-width="1.5"
              /></svg>
            </button>
            <button
              class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
              aria-label="Delete"
              @click="confirmRemove(t)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M6 7h12"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                stroke-width="1.5"
              /><rect
                x="6"
                y="7"
                width="12"
                height="14"
                rx="2"
                stroke-width="1.5"
              /><path
                d="M10 11v6M14 11v6"
                stroke-width="1.5"
                stroke-linecap="round"
              /></svg>
            </button>
          </div>
        </div>
        <div
          v-if="!templates.length && !loading"
          class="p-6 text-white/60 text-center"
        >
          No templates yet.
        </div>
        <div
          v-else-if="!filtered.length && !loading"
          class="p-6 text-white/60 text-center"
        >
          No matching templates.
        </div>
        <div
          v-if="loading"
          class="p-6 text-white/60 text-center"
        >
          Loading…
        </div>
      </div>
      <!-- pagination controls -->
      <div
        v-if="filtered.length"
        class="flex items-center justify-between px-2 py-3 text-white/70 text-sm"
      >
        <div class="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            v-model.number="pageSize"
            class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
          >
            <option
              v-for="s in pageSizes"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
          <span class="ml-2">{{ startItem }}–{{ endItem }} of {{ filtered.length }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            :disabled="page === 1"
            class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
            @click="prevPage"
          >
            Prev
          </button>
          <span class="px-2">Page {{ page }} / {{ totalPages }}</span>
          <button
            :disabled="page === totalPages"
            class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/50"
    >
      <div class="w-[640px] max-w-[95vw] rounded-xl border border-white/20 bg-white/10 backdrop-blur p-4 text-white">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">
            {{ editing ? 'Edit Template' : 'Create Template' }}
          </h2>
          <button
            class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            @click="closeModal"
          >
            ✕
          </button>
        </div>
        <form @submit.prevent="save">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-white/70">Tag</label>
              <input
                v-model="form.tag"
                type="text"
                required
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
            </div>
            <div>
              <label class="text-sm text-white/70">Type</label>
              <select
                v-model="form.type"
                required
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
                <option
                  v-for="opt in modalTypeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.text }}
                </option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-sm text-white/70">Title</label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
            </div>
            <div>
              <label class="text-sm text-white/70">System</label>
              <select
                v-model="form.system"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
                <option
                  v-for="opt in modalSystemOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.text }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-sm text-white/70">Status</label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
                <option
                  v-for="s in statuses"
                  :key="s"
                  :value="s"
                >
                  {{ s }}
                </option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-sm text-white/70">Space</label>
              <select
                v-model="form.spaceId"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
                <option :value="''">
                  None
                </option>
                <option
                  v-for="p in parentOptions"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.title }} ({{ p.type }})
                </option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-sm text-white/70">Description</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/20"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-3 py-2 rounded bg-white/20 border border-white/30 hover:bg-white/30"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useTemplatesStore, type Template } from '../../stores/templates'
import lists from '../../lists.js'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'

const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const templatesStore = useTemplatesStore()
const ui = useUiStore()

const statuses = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']

const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const systemFilter = ref('')
const modalOpen = ref(false)
const editing = ref(false)
const form = ref<Template>({ tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: '' })

// Custom dropdown menus state and refs
const showTypeMenu = ref(false)
const showSystemMenu = ref(false)
const showStatusMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const systemMenuRef = ref<HTMLElement | null>(null)
const statusMenuRef = ref<HTMLElement | null>(null)

function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function toggleSystemMenu() { showSystemMenu.value = !showSystemMenu.value }
function closeSystemMenu() { showSystemMenu.value = false }
function toggleStatusMenu() { showStatusMenu.value = !showStatusMenu.value }
function closeStatusMenu() { showStatusMenu.value = false }

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  const tEl = typeMenuRef.value
  const sEl = systemMenuRef.value
  const stEl = statusMenuRef.value
  if (tEl && !tEl.contains(target)) closeTypeMenu()
  if (sEl && !sEl.contains(target)) closeSystemMenu()
  if (stEl && !stEl.contains(target)) closeStatusMenu()
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

const templates = computed(() => templatesStore.items)
const loading = computed(() => templatesStore.loading)

const parentMap = computed(() => spacesStore.byId)
function spaceName(spaceId?: string | null) {
  const pid = spaceId ? String(spaceId) : ''
  return pid && parentMap.value[pid] ? parentMap.value[pid].title : ''
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  const sys = systemFilter.value
  return templates.value.filter(e => {
    if (t && e.type !== t) return false
    if (s && e.status !== s) return false
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

const parentOptions = computed(() => spacesStore.items)

const filterTypeOptions = computed(() => {
  const base: Array<{ value: string; text: string }> = [{ value: '', text: 'All' }]
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  const seen = new Set<string>()
  for (const opt of arr) {
    if (!opt || !opt.value) continue
    if (seen.has(opt.value)) continue
    seen.add(String(opt.value))
    base.push({ value: String(opt.value), text: String(opt.text ?? opt.value) })
  }
  return base
})

const modalTypeOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  return arr.filter((opt: any) => opt && opt.value).map((opt: any) => ({ value: String(opt.value), text: String(opt.text ?? opt.value) }))
})

const modalSystemOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.systemOptions || []
  return arr
    .filter((opt: any) => opt && (opt.value !== undefined))
    .map((opt: any) => ({ value: opt.value === null ? '' : String(opt.value), text: String(opt.text ?? opt.value) }))
})

const preSystemFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  return templates.value.filter(e => {
    if (t && e.type !== t) return false
    if (s && e.status !== s) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

const systemCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const e of preSystemFiltered.value) {
    const key = String(e.system || '').toLowerCase()
    if (!key) continue
    m[key] = (m[key] || 0) + 1
  }
  return m
})

const systemOptions = computed<Array<{ name: string; value: string; count: number }>>(() => {
  const opts: Array<{ name: string; value: string; count: number }> = []
  const mappingArr: Array<any> = (lists as any)?.systemOptions || []
  const labelFor = (valLower: string) => {
    const found = mappingArr.find((o: any) => o && o.value !== undefined && String(o.value).toLowerCase() === valLower)
    return found ? String(found.text ?? found.value) : valLower
  }
  for (const [valLower, count] of Object.entries(systemCounts.value)) {
    if (!valLower || !count) continue
    opts.push({ name: labelFor(valLower), value: valLower, count })
  }
  opts.sort((a, b) => a.name.localeCompare(b.name))
  return [{ name: 'All', value: 'All', count: preSystemFiltered.value.length }, ...opts]
})
const systemFilterKey = computed(() => (systemFilter.value ? String(systemFilter.value).toLowerCase() : 'All'))
const systemFilterLabel = computed(() => {
  if (!systemFilter.value) return 'All'
  const val = String(systemFilter.value).toLowerCase()
  const found = (systemOptions.value || []).find(o => o && o.value === val)
  return found ? found.name : systemFilter.value
})
function systemCount(nameOrVal: string) {
  if (nameOrVal === 'All') return preSystemFiltered.value.length
  const val = String(nameOrVal).toLowerCase()
  return systemCounts.value[val] || 0
}

const preTypeFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const sys = systemFilter.value
  const s = statusFilter.value
  return templates.value.filter(e => {
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (s && e.status !== s) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})
const typeCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const e of preTypeFiltered.value) {
    const key = String(e.type || '')
    if (!key) continue
    m[key] = (m[key] || 0) + 1
  }
  return m
})
const typeOptions = computed<Array<{ name: string; count: number }>>(() => {
  const opts: Array<{ name: string; count: number }> = []
  for (const [name, count] of Object.entries(typeCounts.value)) {
    if (!name || !count) continue
    opts.push({ name, count })
  }
  opts.sort((a, b) => a.name.localeCompare(b.name))
  return [{ name: 'All', count: preTypeFiltered.value.length }, ...opts]
})
function typeCount(name: string) {
  const opt = (typeOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}

const preStatusFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const sys = systemFilter.value
  return templates.value.filter(e => {
    if (t && e.type !== t) return false
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})
const statusCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const e of preStatusFiltered.value) {
    const key = String(e.status || '')
    if (!key) continue
    m[key] = (m[key] || 0) + 1
  }
  return m
})
const statusOptions = computed<Array<{ name: string; count: number }>>(() => {
  const opts: Array<{ name: string; count: number }> = []
  for (const [name, count] of Object.entries(statusCounts.value)) {
    if (!name || !count) continue
    opts.push({ name, count })
  }
  const order = statuses.slice()
  opts.sort((a, b) => {
    const ia = order.indexOf(a.name)
    const ib = order.indexOf(b.name)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.name.localeCompare(b.name)
  })
  return [{ name: 'All', count: preStatusFiltered.value.length }, ...opts]
})
function statusCount(name: string) {
  const opt = (statusOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}
function statusDotClass(s: string) {
  const key = String(s || '').toLowerCase()
  if (key === 'ordered') return 'bg-sky-500'
  if (key === 'shipped') return 'bg-indigo-500'
  if (key === 'in storage') return 'bg-amber-500'
  if (key === 'installed') return 'bg-emerald-500'
  if (key === 'tested') return 'bg-cyan-500'
  if (key === 'operational') return 'bg-green-500'
  if (key === 'not started') return 'bg-gray-500'
  return 'bg-white/30'
}
function statusBadgeClass(s: string) {
  if (!s || s === 'All') return 'bg-white/10 text-white/80'
  const key = String(s || '').toLowerCase()
  if (key === 'ordered') return 'bg-sky-500 text-white'
  if (key === 'shipped') return 'bg-indigo-500 text-white'
  if (key === 'in storage') return 'bg-amber-500 text-black'
  if (key === 'installed') return 'bg-emerald-500 text-white'
  if (key === 'tested') return 'bg-cyan-500 text-black'
  if (key === 'operational') return 'bg-green-600 text-white'
  if (key === 'not started') return 'bg-gray-500 text-white'
  return 'bg-white/10 text-white/80'
}

// pagination state
const page = ref(1)
const pageSize = ref(10)
const pageSizes = [10, 20, 50, 100]
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
const startItem = computed(() => filtered.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const endItem = computed(() => Math.min(filtered.value.length, page.value * pageSize.value))
function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }

function openCreate() {
  editing.value = false
  form.value = { tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: projectStore.currentProjectId || '' }
  modalOpen.value = true
}

function openEdit(e: Template) {
  editing.value = true
  form.value = { ...e, id: e.id || (e as any)._id }
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

async function save() {
  try {
    if (!form.value.title || !form.value.tag || !form.value.type) throw new Error('Tag, Title and Type are required')
    if (!form.value.projectId) form.value.projectId = projectStore.currentProjectId || ''
    if (editing.value && form.value.id) {
      await templatesStore.update(form.value as Template & { id: string })
      ui.showSuccess('Template updated')
    } else {
      await templatesStore.create(form.value as Template)
      ui.showSuccess('Template created')
    }
    modalOpen.value = false
  } catch (e: any) {
    console.error(e)
  }
}

async function confirmRemove(e: Template) {
  if (!e.id) e.id = (e as any)._id
  if (!e.id) return
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({
    title: 'Delete template',
    message: `Delete "${e.title || e.tag || 'this template'}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  await templatesStore.remove(String(e.id))
  ui.showSuccess('Template deleted')
}

watch(() => projectStore.currentProjectId, async (id) => {
  if (id) {
    await spacesStore.fetchByProject(String(id))
    await templatesStore.fetchByProject(String(id))
    page.value = 1
  }
}, { immediate: true })

watch([filtered, pageSize], () => {
  page.value = 1
})

function nextDuplicateTag(tag: string): string {
  const s = String(tag || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)-(\d+)$/)
  const base = m ? m[1] : s
  let n = m ? (isFinite(parseInt(m[2], 10)) ? parseInt(m[2], 10) + 1 : 1) : 1
  const existing = new Set((templates.value || []).map(it => String(it?.tag || '').trim()).filter(Boolean))
  let candidate = `${base}-${n}`
  while (existing.has(candidate)) { n += 1; candidate = `${base}-${n}` }
  return candidate
}

async function duplicateTemplate(e: Template) {
  try {
    const srcId = String(e.id || (e as any)._id || '')
    const projectId = String((e as any).projectId || projectStore.currentProjectId || '')
    if (!projectId || !srcId) { ui.showError('Missing project or item'); return }
    const newTag = nextDuplicateTag(String(e.tag || ''))
    let created: any = null
    const hasStoreDuplicate = typeof (templatesStore as any).duplicate === 'function'
    if (hasStoreDuplicate) {
      created = await (templatesStore as any).duplicate(srcId, { tag: newTag })
    } else {
      let src: any = (templatesStore as any).byId?.[srcId]
      if (!src) src = await templatesStore.fetchOne(srcId)
      if (!src) throw new Error('Source template not found')
      const { _id, id, number, createdAt, updatedAt, history, ...rest } = src
      const payload: any = {
        ...rest,
        tag: newTag,
        projectId: src.projectId,
        spaceId: src.spaceId || undefined,
        components: Array.isArray(src.components) ? src.components.map((c: any) => ({ ...c })) : undefined,
        photos: (src as any).photos ? (src as any).photos.map((p: any) => ({ ...p })) : undefined,
        images: Array.isArray(src.images) ? src.images.map((p: any) => ({ ...p })) : undefined,
        attachments: Array.isArray(src.attachments) ? src.attachments.map((a: any) => ({ ...a })) : undefined,
        checklists: (src as any).checklists ? JSON.parse(JSON.stringify((src as any).checklists)) : undefined,
        functionalTests: (src as any).functionalTests ? JSON.parse(JSON.stringify((src as any).functionalTests)) : undefined,
        issues: undefined,
        metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : undefined,
        attributes: src.attributes ? JSON.parse(JSON.stringify(src.attributes)) : undefined,
      }
      created = await templatesStore.create(payload as Template)
    }
    if (created) ui.showSuccess(`Duplicated as ${created.tag}`)
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to duplicate')
  }
}
</script>
