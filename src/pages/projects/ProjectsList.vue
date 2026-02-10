<template>
  <section
    ref="pageSection"
    class="space-y-6 relative"
  >
    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/app' }, { text: 'Projects', to: '/app/projects' }]">
        <template #middle>
          <div class="hidden sm:block">
            <SearchPill
              v-model="searchQuery"
              placeholder="Search projects..."
              @clear="clearSearch"
            />
          </div>
        </template>
      </BreadCrumbs>
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

        <!-- Search mode is now a project-level setting (Project Settings) -->

        <div class="flex items-center gap-3">
          <label class="text-white/70 text-sm">Filter</label>
          <button
            type="button"
            :aria-pressed="includeArchived"
            :class="['px-3 py-1 rounded-full text-sm flex items-center gap-2', includeArchived ? 'bg-white/10 ring-2 ring-white/20' : 'bg-white/6']"
            title="Toggle archived projects"
            @click="toggleIncludeArchived"
          >
            <span class="text-white">Include archived</span>
          </button>
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

    <div
      v-if="!loading"
      class="rounded-2xl p-4 bg-white/10 backdrop-blur-xl overflow-visible"
    >
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
                  v-if="isDefaultProject(project)"
                  class="w-5 h-5 grid place-items-center rounded-full bg-amber-500/10 ring-1 ring-amber-300/20"
                  aria-label="Default project"
                  title="Default project"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="w-3.5 h-3.5 text-amber-400"
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
                <!-- Delete icon button (only show when user may delete) -->
                <button
                  v-if="canDelete(project) && String(project.status || '').toLowerCase() !== 'archived'"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40"
                  aria-label="Archive project"
                  :title="`Archive ${project.name || 'project'}`"
                  @click="confirmArchive(project)"
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
                <!-- Restore icon button (archived only) -->
                <button
                  v-if="canDelete(project) && String(project.status || '').toLowerCase() === 'archived'"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
                  aria-label="Restore project"
                  :title="`Restore ${project.name || 'project'}`"
                  @click="confirmRestore(project)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M3 12a9 9 0 1 0 3-6.7"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M3 4v4h4"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <!-- Make default: icon button with custom tooltip -->
                <div
                  v-if="!isDefaultProject(project)"
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
                  v-if="isDefaultProject(project)"
                  class="relative ml-auto inline-block group"
                  aria-hidden="false"
                >
                  <div class="w-8 h-8 grid place-items-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-300/20 ring-1 ring-amber-300/10">
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

    <div
      v-else
    >
      <Spinner />
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
          Project: {{ editProject?.title || editProject?.name || selectedProject?.title || selectedProject?.name || editProject?.id || selectedProject?.id }}
        </h3>
      </template>

      <ProjectForm
        v-model="editProject"
        :errors="formErrors"
      />

      <template #footer>
        <div class="flex gap-2">
          <button
            v-if="canSave(editProject || selectedProject)"
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
import SearchPill from '../../components/SearchPill.vue'
import Modal from '../../components/Modal.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import Spinner from '../../components/Spinner.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { getAuthHeaders } from '../../utils/auth'
import http from '../../utils/http'

const projectStore = useProjectStore()
const auth = useAuthStore()
const ui = useUiStore()

// Determine the default project id from the authenticated user payload when available
const defaultProjectId = computed(() => {
  try {
    const list = (auth.user && Array.isArray(auth.user.projects)) ? auth.user.projects : []
    const dp = list.find((p) => p && p.default)
    if (dp) return typeof dp === 'string' ? dp : (dp._id || dp.id || null)
  } catch (e) { /* ignore */ }
  return projectStore.currentProjectId || null
})

function isDefaultProject(p) {
  const pid = p && (p.id || p._id)
  return defaultProjectId.value && pid && String(defaultProjectId.value) === String(pid)
}

// Loading state for projects fetch
const loading = ref(true)

// Server-provided paged projects for this view
const serverProjects = ref([])
const serverTotal = ref(0)
const lastFetchFilteredByMember = ref(false)
const projectsSource = computed(() => serverProjects.value)

async function fetchProjectsPage() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      perPage: pageSize.value,
    }
    // include status filter when set (server should honor this)
    if (statusFilter.value && statusFilter.value !== 'All') params.status = statusFilter.value
    if (effectiveSearch.value) params.search = effectiveSearch.value
    if (sortKey.value) {
      params.sortBy = sortKey.value
      params.sortDir = sortDir.value === 1 ? 'asc' : 'desc'
    }
    if (includeArchived.value) params.includeArchived = true
    // Prefer server-side filtering by membership when possible
    lastFetchFilteredByMember.value = false
    try {
      const memberId = auth?.user && (auth.user._id || auth.user.id)
      if (memberId) {
        params.memberId = memberId
        lastFetchFilteredByMember.value = true
      }
    } catch (e) { /* ignore */ }

    const res = await http.get('/api/projects', { params, headers: getAuthHeaders() })
    const data = res && res.data ? res.data : {}
    if (Array.isArray(data.items)) {
      serverProjects.value = data.items.map(p => ({ ...(p || {}), id: p._id || p.id }))
    } else if (Array.isArray(data)) {
      serverProjects.value = data.map(p => ({ ...(p || {}), id: p._id || p.id }))
    } else {
      serverProjects.value = []
    }
    serverTotal.value = Number(data.total ?? data.count ?? serverProjects.value.length)
  } catch (e) {
    serverProjects.value = []
    serverTotal.value = 0
  } finally {
    loading.value = false
  }
}

// Fetch when page, pageSize, sort, or search changes (debounced)
const debouncedFetch = debounce(() => { fetchProjectsPage().catch(() => {}) }, 150)

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
     status: 'Active',
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
// Initialize pageSize default; we'll load the user's preference (profile or session) below
const pageSize = ref(5)
const pageSizes = [5, 10, 20]

// Re-fetch projects when paging/sort/search changes. `page` is declared above.
// Watcher will be attached after sorting refs are declared to avoid TDZ errors.

// Persist per-page (projects) page size preference for the current session
const pageSizeStorageKey = computed(() => `projectsPageSize:${projectStore.currentProjectId || 'global'}`)
function loadPageSizePref() {
  try {
    const allowed = [5, 10, 20]
    // Prefer the user's profile setting when available
    const p = auth?.user?.contact?.perPage
    if (typeof p === 'number' && allowed.includes(p)) {
      pageSize.value = p
      return
    }

    // Otherwise fall back to a session-stored preference
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    if (raw) {
      const n = parseInt(raw, 10)
      if (allowed.includes(n)) {
        pageSize.value = n
      }
    }
  } catch (e) { /* ignore sessionStorage read errors */ }
}
function persistPageSizePref() { try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore sessionStorage write errors */ } }
watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
// If the user's profile perPage is updated (Profile -> Settings), prefer that value
watch(() => auth.user && auth.user.contact && auth.user.contact.perPage, (v) => {
  try {
    const allowed = [5, 10, 20]
    if (typeof v === 'number' && allowed.includes(v)) {
      pageSize.value = v
    }
  } catch (e) { /* ignore */ }
})
watch(pageSize, () => persistPageSizePref())

const statusFilter = ref('All')
const includeArchived = ref(false)
const searchQuery = ref('')

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

// Note: server-side paging provides the current page in `projectsSource`.
// Client-side filtering/sorting was removed in favor of server-driven queries.

function toggleStatus(name) { statusFilter.value = (statusFilter.value === name) ? 'All' : name }
function toggleIncludeArchived() {
  includeArchived.value = !includeArchived.value
  // If archived are excluded, clear any archived status filter to avoid empty results.
  if (!includeArchived.value && String(statusFilter.value).toLowerCase() === 'archived') {
    statusFilter.value = 'All'
  }
  page.value = 1
}

function clearSearch() { searchQuery.value = ''; effectiveSearch.value = '' }

// Sorting state for projects table
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

// Attach debounced fetch watcher after sort refs to ensure they exist
watch([() => page.value, () => pageSize.value, () => sortKey.value, () => sortDir.value, () => effectiveSearch.value, () => statusFilter.value, () => includeArchived.value], () => debouncedFetch(), { immediate: true })

// sortedProjects/client-side sorting removed; server returns sorted results when requested.

function setSort(key) {
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else { sortKey.value = key; sortDir.value = 1 }
  page.value = 1
}

// Server-driven totals and paging. If we asked the server to filter by memberId
// then `serverTotal` is authoritative. Otherwise compute total from filtered results.
const totalItems = computed(() => {
  if (lastFetchFilteredByMember.value) return Number(serverTotal.value || 0)
  // compute total from client-side filtered serverProjects
  return pagedProjects.value.length ? Math.max(pagedProjects.value.length, 0) : 0
})
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))


// Always use server-provided page results, but ensure we only display projects
// where the current user is a team member. Server is preferred to filter by
// member when available, but we also apply a client-side filter as a fallback.
function isUserMemberOfProject(p) {
  try {
    const uid = auth?.user && (auth.user._id || auth.user.id)
    if (!uid) return false
    const team = Array.isArray(p.team) ? p.team : []
    return team.some(m => (m._id || m.id || m) && String(m._id || m.id || m) === String(uid))
  } catch (e) { return false }
}

// Determine whether the current user may delete the given project.
function canDelete(p) {
  try {
    const me = auth && auth.user ? auth.user : null
    if (!me) return false
    // Global roles allowed
    if (me.role === 'globaladmin' || me.role === 'superadmin') return true
    const userId = me._id || me.id
    const userEmail = me.email ? String(me.email).toLowerCase() : null
    const team = Array.isArray(p.team) ? p.team : []
    const member = team.find((t) => {
      if (!t) return false
      try {
        if (t._id && String(t._id) === String(userId)) return true
        if (t.email && userEmail && String(t.email).toLowerCase() === userEmail) return true
      } catch (e) {
        return false
      }
      return false
    })
    if (!member) return false
    return (member.role === 'admin' || member.role === 'globaladmin')
  } catch (e) {
    return false
  }
}

// Determine whether the current user may save/edit the given project.
function canSave(p) {
  try {
    const me = auth && auth.user ? auth.user : null
    if (!me) return false
    if (me.role === 'globaladmin' || me.role === 'superadmin') return true
    const userId = me._id || me.id
    const userEmail = me.email ? String(me.email).toLowerCase() : null
    const team = Array.isArray(p && p.team) ? p.team : []
    const member = team.find((t) => {
      if (!t) return false
      try {
        if (t._id && String(t._id) === String(userId)) return true
        if (t.email && userEmail && String(t.email).toLowerCase() === userEmail) return true
      } catch (e) {
        return false
      }
      return false
    })
    if (!member) return false
    // Allow admin or manager to edit projects (manager may have limited editing rights)
    return (member.role === 'admin' || member.role === 'manager' || member.role === 'globaladmin')
  } catch (e) {
    return false
  }
}

const pagedProjects = computed(() => {
  const arr = Array.isArray(serverProjects.value) ? serverProjects.value : []
  // If server already filtered by memberId, the array should already be correct.
  // Otherwise apply client-side filter to ensure membership constraint.
  if (lastFetchFilteredByMember.value) return arr
  return arr.filter(isUserMemberOfProject)
})

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }
function setPage(n) { if (n >= 1 && n <= totalPages.value) page.value = n }
const pagesArray = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

// Reset page when page size or client-side filters change
watch([() => pageSize.value], () => { page.value = 1 })
watch(() => statusFilter.value, () => { page.value = 1 })

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
    console.error('Project update failed:', err)
    const msg = err && err.response && err.response.data && err.response.data.error ? err.response.data.error : (err && err.message ? err.message : 'Failed to update project')
    ui.showError(msg)
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

async function confirmArchive(p) {
  const confirmed = await inlineConfirm({
    title: 'Archive project',
    message: `Archive project "${p?.name || p?.id || ''}"? You can restore it later if billing is active.`,
    confirmText: 'Archive',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  try {
    await projectStore.archiveProject(p.id)
    ui.showSuccess('Project archived')
    await fetchProjectsPage()
  } catch (e) {
    ui.showError(e?.response?.data?.error || 'Failed to archive')
  }
}

async function confirmRestore(p) {
  const confirmed = await inlineConfirm({
    title: 'Restore project',
    message: `Restore project "${p?.name || p?.id || ''}"? This requires an active paid subscription (no trial).`,
    confirmText: 'Restore',
    cancelText: 'Cancel',
    variant: 'default'
  })
  if (!confirmed) return
  try {
    await projectStore.restoreProject(p.id)
    ui.showSuccess('Project restored')
    await fetchProjectsPage()
  } catch (e) {
    const code = e?.response?.data?.code
    if (code === 'SUBSCRIPTION_REQUIRED') {
      ui.showError('Subscription required to restore. Go to Project Settings → Subscription to re-subscribe.')
    } else {
      ui.showError(e?.response?.data?.error || 'Failed to restore')
    }
  }
}

async function makeDefault(project) {
  // Mirror working logic from Topbar: call backend with auth headers and update auth/user + store
  try {
    if (!getAuthHeaders()?.Authorization) { ui.showError('Not signed in'); return }
    const projectId = project && (project.id || project._id)
  if (!projectId) { ui.showError('Missing project id'); return }

    const { data } = await http.post(
      `/api/projects/${projectId}/set-default`,
      {},
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
    // Persist selected plan on the project so feature gating is correct immediately,
    // even before Stripe has linked an active subscription.
    if (chosenPriceId.value) {
      payload.stripePriceId = chosenPriceId.value
    }

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
