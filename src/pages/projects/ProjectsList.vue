<template>
  <section
    ref="pageSection"
    class="space-y-6 relative"
  >
    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Projects', to: '/projects' }]" />
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          aria-label="Add project"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
          @click="showAddModal = true"
        >
          +
        </button>

        <div class="relative">
          <input
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Search projects..."
            class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 hidden sm:inline-block w-64 pr-8"
          >
          <button
            v-if="searchQuery"
            class="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 px-2 py-1 rounded"
            @click="clearSearch"
          >
            ✕
          </button>
        </div>

        <!-- Search mode is now a project-level setting (Project Settings) -->

        <div class="flex items-center gap-3">
          <label class="text-white/70 text-sm">Filter</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in statusOptions"
              :key="opt.name"
              :aria-pressed="opt.name === statusFilter"
              :class="['px-3 py-1 rounded-full text-sm flex items-center gap-2', opt.name === statusFilter ? 'bg-white/10 ring-2 ring-white/20' : 'bg-white/6']"
              @click="toggleStatus(opt.name)"
            >
              <span class="text-white">{{ opt.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <div />
    </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 overflow-x-auto">
      <table class="min-w-full text-left">
        <thead>
          <tr class="text-sm text-white/70">
            <th class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-2"
                @click="setSort('name')"
              >
                <span>Name</span>
                <span
                  v-if="sortKey === 'name' && sortDir === 1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey === 'name' && sortDir === -1"
                  class="text-xs"
                >▼</span>
                <span
                  v-else
                  class="text-xs opacity-40"
                >⇅</span>
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-2"
                @click="setSort('client')"
              >
                <span>Client</span>
                <span
                  v-if="sortKey === 'client' && sortDir === 1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey === 'client' && sortDir === -1"
                  class="text-xs"
                >▼</span>
                <span
                  v-else
                  class="text-xs opacity-40"
                >⇅</span>
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-2"
                @click="setSort('project_type')"
              >
                <span>Type</span>
                <span
                  v-if="sortKey === 'project_type' && sortDir === 1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey === 'project_type' && sortDir === -1"
                  class="text-xs"
                >▼</span>
                <span
                  v-else
                  class="text-xs opacity-40"
                >⇅</span>
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-2"
                @click="setSort('status')"
              >
                <span>Status</span>
                <span
                  v-if="sortKey === 'status' && sortDir === 1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey === 'status' && sortDir === -1"
                  class="text-xs"
                >▼</span>
                <span
                  v-else
                  class="text-xs opacity-40"
                >⇅</span>
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                class="flex items-center gap-2"
                @click="setSort('startDate')"
              >
                <span>Dates</span>
                <span
                  v-if="sortKey === 'startDate' && sortDir === 1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey === 'startDate' && sortDir === -1"
                  class="text-xs"
                >▼</span>
                <span
                  v-else
                  class="text-xs opacity-40"
                >⇅</span>
              </button>
            </th>
            <th class="px-4 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="mt-2">
          <tr
            v-for="project in pagedProjects"
            :key="project.id"
            class="align-top"
          >
            <td class="px-4 py-3 text-white/90">
              <div class="flex items-center gap-2">
                <span>{{ project.name }}</span>
                <span
                  v-if="project.default"
                  class="w-5 h-5 grid place-items-center rounded-full bg-white/10"
                  aria-label="Default project"
                  title="Default project"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="w-3.5 h-3.5 text-yellow-300"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 3l2.6 5.3 5.8.9-4.2 4.1 1 5.7L12 16.9 6.8 19l1-5.7-4.2-4.1 5.8-.9L12 3z" />
                  </svg>
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-white/90">
              {{ project.client }}
            </td>
            <td class="px-4 py-3 text-white/80">
              {{ project.project_type }}
            </td>
            <td class="px-4 py-3">
              <span class="px-3 py-1 rounded-full text-xs bg-white/10 text-white">{{ project.status || 'unknown' }}</span>
            </td>
            <td class="px-4 py-3 text-white/80">
              {{ formatDate(project.startDate) }} - {{ formatDate(project.endDate) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2 items-center">
                <!-- View icon button -->
                <button
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                  aria-label="View project"
                  :title="`View ${project.name || 'project'}`"
                  @click="openView(project)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
                      stroke-width="1.5"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke-width="1.5"
                    />
                  </svg>
                </button>
                <!-- Edit icon button -->
                <button
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                  aria-label="Edit project"
                  :title="`Edit ${project.name || 'project'}`"
                  @click="openEdit(project)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                      stroke-width="1.5"
                    />
                    <path
                      d="M14.06 6.19l1.77-1.77a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12l-1.77 1.77"
                      stroke-width="1.5"
                    />
                  </svg>
                </button>
                <!-- Delete icon button -->
                <button
                  class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-400/40"
                  aria-label="Delete project"
                  :title="`Delete ${project.name || 'project'}`"
                  @click="confirmDelete(project)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M6 7h12"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                      stroke-width="1.5"
                    />
                    <rect
                      x="6"
                      y="7"
                      width="12"
                      height="14"
                      rx="2"
                      stroke-width="1.5"
                    />
                    <path
                      d="M10 11v6M14 11v6"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
                <!-- Make default: icon button with custom tooltip -->
                <div
                  v-if="!project.default"
                  class="relative inline-block group"
                >
                  <button
                    aria-label="Make default"
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                    @click.prevent="makeDefault(project)"
                  >
                    <!-- star icon -->
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M12 3l2.6 5.3 5.8.9-4.2 4.1 1 5.7L12 16.9 6.8 19l1-5.7-4.2-4.1 5.8-.9L12 3z"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <div
                    role="tooltip"
                    class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                  >
                    Make default
                  </div>
                </div>
                <!-- Default indicator at far right -->
                <div
                  v-if="project.default"
                  class="relative ml-auto inline-block group"
                  aria-hidden="false"
                >
                  <div class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 text-yellow-300 border border-white/8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      class="w-4 h-4"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 3l2.6 5.3 5.8.9-4.2 4.1 1 5.7L12 16.9 6.8 19l1-5.7-4.2-4.1 5.8-.9L12 3z" />
                    </svg>
                  </div>
                  <div
                    role="tooltip"
                    class="pointer-events-none absolute right-0 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                  >
                    Default project
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-3">
      <div class="text-white/70 text-sm">
        Showing <span class="font-medium text-white">{{ startItem }}-{{ endItem }}</span> of <span class="font-medium text-white">{{ totalItems }}</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-white/70 text-sm">Per page</label>
          <select
            v-model.number="pageSize"
            class="rounded-lg bg-white/5 text-white p-1 text-sm"
          >
            <option
              v-for="s in pageSizes"
              :key="s"
              :value="s"
            >
              {{ s }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button
            :disabled="page === 1"
            class="px-2 py-1 rounded bg-white/6 text-white disabled:opacity-40"
            @click="prevPage"
          >
            Prev
          </button>
          <template
            v-for="n in pagesArray"
            :key="n"
          >
            <button
              :class="['px-2 py-1 rounded', n === page ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80']"
              @click="setPage(n)"
            >
              {{ n }}
            </button>
          </template>
          <button
            :disabled="page === totalPages"
            class="px-2 py-1 rounded bg-white/6 text-white disabled:opacity-40"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- View/Edit Modal -->
    <Modal v-model="showViewModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Project {{ editProject?.id || selectedProject?.id }}
        </h3>
      </template>

      <ProjectForm
        v-model="editProject"
        :errors="formErrors"
      />

      <template #footer>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="saveEdit"
          >
            Save
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>

    <!-- Add Modal -->
    <Modal v-model="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Add New Project
        </h3>
      </template>

      <!-- Default slot (Modal doesn't support a #body slot) -->
      <div>
        <!-- Wizard tabs -->
        <div class="mb-4">
          <div class="flex gap-2">
            <button
              :class="['px-3 py-1 rounded', addTab === 'details' ? 'bg-white/10' : 'bg-white/5']"
              @click="addTab = 'details'"
            >
              Details
            </button>
            <button
              :class="['px-3 py-1 rounded', addTab === 'subscription' ? 'bg-white/10' : 'bg-white/5']"
              @click="addTab = 'subscription'"
            >
              Subscription
            </button>
          </div>
        </div>

        <!-- Step: Details -->
        <div v-if="addTab === 'details'">
          <ProjectForm
            v-model="newProject"
            :errors="formErrors"
          />
        </div>

        <!-- Step: Subscription -->
        <div v-else>
          <div class="space-y-4">
            <div>
              <label class="text-white/80 text-sm block mb-2">Choose a plan</label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label class="cursor-pointer">
                  <input
                    v-model="selectedPlan"
                    type="radio"
                    class="hidden"
                    value="basic"
                  >
                  <div :class="['p-3 rounded-lg border', selectedPlan === 'basic' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/10']">
                    <div class="text-white font-medium">Basic</div>
                    <div class="text-white/80 text-sm">$29/mo</div>
                  </div>
                </label>
                <label class="cursor-pointer">
                  <input
                    v-model="selectedPlan"
                    type="radio"
                    class="hidden"
                    value="standard"
                  >
                  <div :class="['p-3 rounded-lg border', selectedPlan === 'standard' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/10']">
                    <div class="text-white font-medium">Standard</div>
                    <div class="text-white/80 text-sm">$49/mo</div>
                  </div>
                </label>
                <label class="cursor-pointer">
                  <input
                    v-model="selectedPlan"
                    type="radio"
                    class="hidden"
                    value="premium"
                  >
                  <div :class="['p-3 rounded-lg border', selectedPlan === 'premium' ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/10']">
                    <div class="text-white font-medium">Premium</div>
                    <div class="text-white/80 text-sm">$79/mo</div>
                  </div>
                </label>
              </div>
            </div>
            <div>
              <label class="text-white/80 text-sm block mb-1">Or provide a specific Stripe priceId</label>
              <input
                v-model="priceIdOverride"
                placeholder="price_xxx (optional)"
                class="w-full rounded bg-white/5 p-2 text-white"
              >
              <p class="text-xs text-white/60 mt-1">
                Leave blank to use one of the plans above or choose "No subscription" by not selecting a plan.
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <div class="flex gap-2">
            <button
              v-if="addTab === 'subscription'"
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
              @click="addTab = 'details'"
            >
              Back
            </button>
            <button
              v-else
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
              @click="goNextFromDetails"
            >
              Next
            </button>
          </div>
          <div class="flex gap-2 items-center">
            <!-- Create only on Subscription step -->
            <button
              v-if="addTab === 'subscription'"
              :disabled="!chosenPriceId || submittingAdd"
              :class="['px-4 py-2 rounded-lg text-white', (!chosenPriceId || submittingAdd) ? 'bg-white/10 opacity-60 cursor-not-allowed' : 'bg-white/6 hover:bg-white/10']"
              @click="createAndMaybeCheckout"
            >
              {{ submittingAdd ? 'Creating…' : 'Create' }}
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
              @click="showAddModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { getAuthHeaders } from '../../utils/auth'
import http from '../../utils/http'

const projectStore = useProjectStore()
const auth = useAuthStore()
const ui = useUiStore()

// Build display list from auth.user.projects (which may contain ids or objects) joined with full projects
const projectsSource = computed(() => {
  const userProjects = auth.user && Array.isArray(auth.user.projects) ? auth.user.projects : null
  if (userProjects && userProjects.length) {
    return userProjects.map(up => {
      // up may be a string id or an object
      if (typeof up === 'string') {
        const full = projectStore.projects.find(p => p.id === up || p._id === up)
        return { ...(full || {}), id: up, default: false }
      }
      // object case: try to merge with full project record when available
      const id = up._id || up.id
  const full = id ? projectStore.projects.find(p => p.id === id || p._id === id) : null
      return { ...(full || {}), ...(up || {}), id: id || (up.id || up._id) }
    })
  }
  // Do not expose the full project store as a fallback — only show projects
  // which the user is explicitly a member of. If the authenticated user has
  // no `projects` entries, return an empty list instead of leaking all projects.
  return []
})

const selectedProject = ref(null)
const showViewModal = ref(false)
const showAddModal = ref(false)
const newProject = ref({
  name: '',
  number: '',
  po_number: '',
  project_type: '',
  industry: '',
  client: '',
  location: '',
  status: 'active',
  building_type: '',
  description: '',
    // removed duplicate `status` key
  settings: [],
  photos: [],
  documents: [],
  team: [],
  commissioning_agent: {},
  logo: '',
  mata: [],
  tags: [],
  startDate: '',
  endDate: '',
})
// Add wizard state
const addTab = ref('details') // 'details' | 'subscription'
const selectedPlan = ref('')
const priceIdOverride = ref('')
const submittingAdd = ref(false)
const chosenPriceId = computed(() => (priceIdOverride.value || PLAN_PRICE_IDS[selectedPlan.value] || ''))
const editProject = ref(null)
const formErrors = ref({})
const pageSection = ref(null)

function validateProject(p) {
  const e = {}
  if (!p.name || !p.name.trim()) e.name = 'Name is required'
  if (!p.client || !p.client.trim()) e.client = 'Client is required'
  return e
}

function goNextFromDetails() {
  const e = validateProject(newProject.value)
  formErrors.value = e
  if (Object.keys(e).length) return
  addTab.value = 'subscription'
}

// Pagination
const page = ref(1)
// Initialize pageSize from the user's profile preference when available
const pageSize = ref((auth && auth.user && auth.user.contact && typeof auth.user.contact.perPage === 'number') ? auth.user.contact.perPage : 5)
const pageSizes = [5, 10, 20]

// Persist per-page (projects) page size preference for the current session
const pageSizeStorageKey = computed(() => `projectsPageSize:${projectStore.currentProjectId || 'global'}`)
function loadPageSizePref() {
  try {
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    if (!raw) {
      try {
        const p = auth.user && auth.user.contact && auth.user.contact.perPage
        const allowed = [5,10,20]
        if (typeof p === 'number' && allowed.includes(p)) {
          pageSize.value = p
        }
      } catch (e) { /* ignore */ }
      return
    }
    const n = parseInt(raw, 10)
    if ([5,10,20].includes(n)) pageSize.value = n
  } catch (e) { /* ignore sessionStorage read errors */ }
}
function persistPageSizePref() { try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore sessionStorage write errors */ } }
watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
watch(pageSize, () => persistPageSizePref())

const statusFilter = ref('All')
const searchQuery = ref('')
const searchMode = computed(() => {
  try {
    const p = projectStore.currentProject && projectStore.currentProject.value ? projectStore.currentProject.value : null
    const m = p && p.searchMode ? String(p.searchMode).toLowerCase() : ''
    return m || 'substring'
  } catch (e) { return 'substring' }
})

function debounce(fn, wait = 200) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

const effectiveSearch = ref('')
const updateEffective = debounce((val) => { effectiveSearch.value = val }, 200)
watch(() => searchQuery.value, (v) => updateEffective(v))

const statusCounts = computed(() => {
  const map = {}
  for (const p of projectsSource.value) {
    const s = p.status || 'Unspecified'
    map[s] = (map[s] || 0) + 1
  }
  return map
})

const statusOptions = computed(() => {
  const entries = Object.entries(statusCounts.value).map(([name, count]) => ({ name, count }))
  return [{ name: 'All', count: projectsSource.value.length }, ...entries]
})

const filteredProjects = computed(() => {
  const q = (effectiveSearch.value || '').trim().toLowerCase()
  const list = (!statusFilter.value || statusFilter.value === 'All')
    ? projectsSource.value
    : projectsSource.value.filter(p => (p.status || '').toLowerCase() === statusFilter.value.toLowerCase())

  if (!q) return list
  const mode = searchMode.value || 'substring'

  function fuzzyMatch(text, pattern) {
    let pi = 0
    for (let i = 0; i < text.length && pi < pattern.length; i++) {
      if (text[i] === pattern[pi]) pi++
    }
    return pi === pattern.length
  }

  return list.filter(p => {
    const fields = [String(p.id || ''), p.name || '', p.client || '', p.project_type || '', p.description || '', (p.tags || []).join(' ')]
      .map(f => f.toLowerCase())

    if (mode === 'exact') return fields.some(f => f === q)
    if (mode === 'fuzzy') return fields.some(f => fuzzyMatch(f, q))
    return fields.some(f => f.includes(q))
  })
})

function toggleStatus(name) { statusFilter.value = (statusFilter.value === name) ? 'All' : name }

function clearSearch() { searchQuery.value = ''; effectiveSearch.value = '' }

// Sorting state for projects table
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

const sortedProjects = computed(() => {
  if (!sortKey.value) return filteredProjects.value
  const arr = [...filteredProjects.value]
  arr.sort((a, b) => {
    let av = a && a[sortKey.value]
    let bv = b && b[sortKey.value]
    if (sortKey.value === 'startDate') {
      av = Date.parse(String(av || '')) || 0
      bv = Date.parse(String(bv || '')) || 0
      return (av - bv) * sortDir.value
    }
    av = String(av || '').toLowerCase()
    bv = String(bv || '').toLowerCase()
    if (av < bv) return -1 * sortDir.value
    if (av > bv) return 1 * sortDir.value
    return 0
  })
  return arr
})

function setSort(key) {
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else { sortKey.value = key; sortDir.value = 1 }
  page.value = 1
}

const totalItems = computed(() => sortedProjects.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))
const pagedProjects = computed(() => sortedProjects.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }
function setPage(n) { if (n >= 1 && n <= totalPages.value) page.value = n }
const pagesArray = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

// Reset page when sorting or pageSize changes
watch([sortedProjects, pageSize], () => {
  page.value = 1
})

function openView(p) { selectedProject.value = p; editProject.value = { ...p }; showViewModal.value = true }
function openEdit(p) { selectedProject.value = p; editProject.value = { ...p }; showViewModal.value = true }

async function saveEdit() {
  const e = validateProject(editProject.value)
  if (Object.keys(e).length) { formErrors.value = e; return }
  try {
    await projectStore.updateProject(editProject.value)
    showViewModal.value = false
    ui.showSuccess('Project updated')
  } catch (err) {
    ui.showError('Failed to update project')
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function addProject() {
  const e = validateProject(newProject.value)
  if (Object.keys(e).length) { formErrors.value = e; return }
  try {
    await projectStore.addProject(newProject.value)
  showAddModal.value = false
    newProject.value = {
      name: '',
      number: '',
      po_number: '',
      project_type: '',
      client: '',
      location: '',
      building_type: '',
      industry: '',
      description: '',
      startDate: '',
      endDate: '',
      tags: []
    }
    ui.showSuccess('Project created')
  } catch (err) {
    ui.showError('Failed to create project')
  }
}

function cancelEdit() { showViewModal.value = false; editProject.value = null }

async function confirmDelete(p) {
  const confirmed = await inlineConfirm({
    title: 'Delete project',
    message: `Delete project "${p?.name || p?.id || ''}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  projectStore
    .deleteProject(p.id)
    .then(() => ui.showSuccess('Project deleted'))
    .catch(() => ui.showError('Failed to delete'))
}

async function makeDefault(project) {
  // Mirror working logic from Topbar: call backend with auth headers and update auth/user + store
  try {
    const userId = auth.user && (auth.user._id || auth.user.id)
  if (!userId) { ui.showError('Not signed in'); return }
    const projectId = project && (project.id || project._id)
  if (!projectId) { ui.showError('Missing project id'); return }

    const { data } = await http.post(
      `/api/projects/${projectId}/set-default`,
      { userId },
      { headers: getAuthHeaders() }
    )

    // Preserve existing token while updating returned user shape
    const incoming = (data && data.user) ? data.user : data
    const preserveToken = auth.token || (auth.user && auth.user.token) || null
    if (incoming) {
      auth.user = Object.assign({}, auth.user || {}, incoming)
      if (preserveToken && auth.user) {
        auth.user.token = preserveToken
      }
  try { localStorage.setItem('user', JSON.stringify(auth.user)) } catch (e) { /* ignore */ }
    }

    if (projectId) projectStore.setCurrentProject(String(projectId))
    ui.showSuccess('Default project updated')
  } catch (err) {
    ui.showError(err?.response?.data?.error || 'Failed to update default project')
  }
}

function formatDate(d) { if (!d) return '' ; try { return new Date(d).toLocaleDateString() } catch (e) { return d } }

// Plan key to priceId mapping (keep in sync with backend config/plans.js)
const PLAN_PRICE_IDS = {
  basic: 'price_1MwoMXHUb4cunvDgueGxHOji',
  standard: 'price_1MwoOMHUb4cunvDgtbBKXDrN',
  premium: 'price_1MwoRJHUb4cunvDgehwhilRg',
}

async function createAndMaybeCheckout() {
  if (submittingAdd.value) return
  // Validate first
  const e = validateProject(newProject.value)
  formErrors.value = e
  if (Object.keys(e).length) { addTab.value = 'details'; return }

  try {
    submittingAdd.value = true
    // Build payload with ISO dates to satisfy backend
    const payload = { ...newProject.value }
    payload.startDate = normalizeToISODate(payload.startDate)
    payload.endDate = normalizeToISODate(payload.endDate)

    // Create the project
    const created = await projectStore.addProject(payload)
    if (!created || !created.id) {
      ui.showError('Project created, but id missing')
      showAddModal.value = false
      return
    }

    // Reset wizard state
    addTab.value = 'details'

    // If a subscription is selected, kick off Stripe checkout
    if (chosenPriceId.value) {
      try {
        const res = await http.post('/api/stripe/create-checkout-session', {
          // Prefer planKey on server; also send priceId for backward-compat
          planKey: selectedPlan.value || undefined,
          priceId: chosenPriceId.value,
          projectId: created.id,
        }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })

        const url = res?.data?.url
        if (url) {
          // Close modal then redirect
          showAddModal.value = false
          window.location.href = url
          return
        }
        ui.showError('Project created, but failed to start checkout')
      } catch (err) {
        ui.showError('Project created, but checkout failed')
      }
    } else {
      // No subscription selected: prevent submission; require plan selection on this step
      ui.showError('Select a subscription plan or enter a priceId to continue')
      addTab.value = 'subscription'
    }
  } catch (err) {
    ui.showError('Failed to create project')
  }
  finally {
    submittingAdd.value = false
  }
}

// Convert 'YYYY-MM-DD' (or other parsable input) to ISO using local components to avoid TZ shift
function normalizeToISODate(val) {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(n => parseInt(n, 10))
    const dt = new Date(y, m - 1, d)
    return isNaN(dt.getTime()) ? '' : dt.toISOString()
  }
  const dt = new Date(val)
  return isNaN(dt.getTime()) ? '' : dt.toISOString()
}

</script>
