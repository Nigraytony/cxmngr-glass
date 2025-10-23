<template>
  <section class="space-y-6 relative" ref="pageSection">
    <Toast :message="toast.message" v-model:show="toast.show" :top="toastTop" />

    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Projects', to: '/projects' }]" />
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button @click="showAddModal = true" aria-label="Add project" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10">
          +
        </button>

        <div class="relative">
          <input v-model="searchQuery" ref="searchInput" placeholder="Search projects..." class="rounded-lg p-2 bg-white/5 text-white/80 hidden sm:inline-block pr-10" />
          <button v-if="searchQuery" @click="clearSearch" class="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 px-2 py-1 rounded">✕</button>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-white/70 text-sm">Mode</label>
          <select v-model="searchMode" class="rounded-lg bg-white/5 text-white p-1 text-sm">
            <option value="substring">Substring</option>
            <option value="exact">Exact</option>
            <option value="fuzzy">Fuzzy</option>
          </select>
        </div>

        <div class="flex items-center gap-3">
          <label class="text-white/70 text-sm">Filter</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="opt in statusOptions" :key="opt.name" @click="toggleStatus(opt.name)" :aria-pressed="opt.name === statusFilter" :class="['px-3 py-1 rounded-full text-sm flex items-center gap-2', opt.name === statusFilter ? 'bg-white/10 ring-2 ring-white/20' : 'bg-white/6']">
              <span class="text-white">{{ opt.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <div></div>
    </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 overflow-x-auto">
      <table class="min-w-full text-left">
        <thead>
          <tr class="text-sm text-white/70">
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Client</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Dates</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="mt-2">
          <tr v-for="project in pagedProjects" :key="project.id" class="align-top">
            <td class="px-4 py-3 text-white/90">
              <div class="flex items-center gap-2">
                <span>{{ project.name }}</span>
                <span v-if="project.default" class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">Default</span>
              </div>
            </td>
            <td class="px-4 py-3 text-white/90">{{ project.client }}</td>
            <td class="px-4 py-3 text-white/80">{{ project.project_type }}</td>
            <td class="px-4 py-3"><span class="px-3 py-1 rounded-full text-xs bg-white/10 text-white">{{ project.status || 'unknown' }}</span></td>
            <td class="px-4 py-3 text-white/80">{{ formatDate(project.startDate) }} - {{ formatDate(project.endDate) }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button @click="openView(project)" class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8">View</button>
                <button @click="openEdit(project)" class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8">Edit</button>
                <button @click="confirmDelete(project)" class="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm border border-red-400/40">Delete</button>
                <button v-if="!project.default" @click.prevent="makeDefault(project)" class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8">Make default</button>
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
          <select v-model.number="pageSize" class="rounded-lg bg-white/5 text-white p-1 text-sm">
            <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button @click="prevPage" :disabled="page === 1" class="px-2 py-1 rounded bg-white/6 text-white disabled:opacity-40">Prev</button>
          <template v-for="n in pagesArray" :key="n">
            <button @click="setPage(n)" :class="['px-2 py-1 rounded', n === page ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80']">{{ n }}</button>
          </template>
          <button @click="nextPage" :disabled="page === totalPages" class="px-2 py-1 rounded bg-white/6 text-white disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>

    <!-- View/Edit Modal -->
    <Modal v-model="showViewModal">
      <template #header>
        <h3 class="text-lg font-semibold">Project {{ editProject?.id || selectedProject?.id }}</h3>
      </template>

      <ProjectForm v-model="editProject" :errors="formErrors" />

      <template #footer>
        <div class="flex gap-2">
          <button @click="saveEdit" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Save</button>
          <button @click="cancelEdit" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Cancel</button>
        </div>
      </template>
    </Modal>

    <!-- Add Modal -->
    <Modal v-model="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">Add New Project</h3>
      </template>
      <template #body>
        <div>
          <div class="mb-4">
            <div class="flex gap-2">
              <button :class="['px-3 py-1 rounded', addTab === 'details' ? 'bg-white/10' : 'bg-white/5']" @click="addTab = 'details'">Details</button>
              <button :class="['px-3 py-1 rounded', addTab === 'billing' ? 'bg-white/10' : 'bg-white/5']" @click="addTab = 'billing'">Billing</button>
            </div>
          </div>

          <div v-if="addTab === 'details'">
            <ProjectForm v-model="newProject" />
          </div>

          <div v-else>
            <div class="space-y-3">
              <div>
                <label class="text-white/80 text-sm block mb-1">Select plan</label>
                <select v-model="selectedPlan" class="w-full rounded bg-white/5 p-2 text-white">
                  <option value="">No subscription (skip for now)</option>
                  <option value="basic">Basic — $29/mo</option>
                  <option value="standard">Standard — $49/mo</option>
                  <option value="premium">Premium — $79/mo</option>
                </select>
              </div>

              <div>
                <label class="text-white/80 text-sm block mb-1">Or provide a specific priceId</label>
                <input v-model="priceIdOverride" placeholder="price_xxx (optional)" class="w-full rounded bg-white/5 p-2 text-white" />
              </div>
            </div>
          </div>
        </div>
      </template>

        <template #footer>
          <div class="flex gap-2">
            <button @click="createAndMaybeCheckout" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Create</button>
            <button @click="showAddModal = false" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Cancel</button>
          </div>
        </template>
    </Modal>

  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import Toast from '../../components/Toast.vue'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'

const projectStore = useProjectStore()
const auth = useAuthStore()

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
  return projectStore.projects
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
  status: '',
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
const editProject = ref(null)
const formErrors = ref({})
const toast = ref({ show: false, message: '' })
const toastTop = ref('4rem')
const pageSection = ref(null)

function computeToastTop() {
  nextTick(() => {
    const hdr = document.querySelector('.page-header')
    const rect = hdr ? hdr.getBoundingClientRect() : { bottom: 64 }
    toastTop.value = `${rect.bottom + 12}px`
  })
}

onMounted(() => {
  computeToastTop()
  window.addEventListener('resize', computeToastTop)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', computeToastTop)
})

function showToast(message, opts = {}) {
  toast.value.message = message
  toast.value.show = true
  computeToastTop()
  const ms = opts.duration || 2500
  setTimeout(() => { toast.value.show = false }, ms)
}

function validateProject(p) {
  const e = {}
  if (!p.name || !p.name.trim()) e.name = 'Name is required'
  if (!p.client || !p.client.trim()) e.client = 'Client is required'
  return e
}

// Pagination
const page = ref(1)
const pageSize = ref(5)
const pageSizes = [5, 10, 20]

const statusFilter = ref('All')
const searchQuery = ref('')
const searchMode = ref('substring')

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

const totalItems = computed(() => filteredProjects.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))
const pagedProjects = computed(() => filteredProjects.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }
function setPage(n) { if (n >= 1 && n <= totalPages.value) page.value = n }
const pagesArray = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

function openView(p) { selectedProject.value = p; editProject.value = { ...p }; showViewModal.value = true }
function openEdit(p) { selectedProject.value = p; editProject.value = { ...p }; showViewModal.value = true }

async function saveEdit() {
  const e = validateProject(editProject.value)
  if (Object.keys(e).length) { formErrors.value = e; return }
  try {
    await projectStore.updateProject(editProject.value)
    showViewModal.value = false
    showToast('Project updated')
  } catch (err) {
    showToast('Failed to update project')
  }
}

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
    showToast('Project created')
  } catch (err) {
    showToast('Failed to create project')
  }
}

function cancelEdit() { showViewModal.value = false; editProject.value = null }

function confirmDelete(p) {
  if (!confirm('Delete this project?')) return
  projectStore.deleteProject(p.id).then(() => showToast('Project deleted')).catch(() => showToast('Failed to delete'))
}

async function makeDefault(project) {
  // Build updated projects array based on auth.user.projects shape
  try {
    const auth = useAuthStore()
    const uid = auth.user?._id || auth.user?.id
    if (!uid) throw new Error('Not authenticated')

  const userProjList = Array.isArray(auth.user && auth.user.projects) ? auth.user.projects : []
    const selectedId = project.id || project._id

    const updated = userProjList.map(up => {
      if (typeof up === 'string') {
        // preserve id shape but convert to object to include default flag
        return up === selectedId ? { _id: up, default: true } : { _id: up, default: false }
      }
      // object entry: set default flag accordingly
      const id = up._id || up.id
      return { ...up, default: (id === selectedId) }
    })

    // Prefer calling backend endpoint that updates only the default flag for safety
    try {
      const res = await fetch(`/api/projects/${selectedId}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auth.user?._id || auth.user?.id })
      })
      if (!res.ok) { showToast('Failed to update default project'); return }
      const data = await res.json()

      // Backend now returns { user } (sanitized). If present, replace auth.user with the returned user
      if (data && data.user) {
        // preserve existing token in the auth store
        const existingToken = auth.token
        auth.user = data.user
        // keep token separate in localStorage
        localStorage.setItem('user', JSON.stringify(auth.user))
        if (existingToken) localStorage.setItem('token', existingToken)
        // sync selected project
        if (selectedId) projectStore.setCurrentProject(selectedId)
        showToast('Default project updated')
      } else if (data && data.projects) {
        // fallback for older response shape
        const ok2 = await auth.updateUser({ projects: data.projects })
        if (ok2) {
          if (selectedId) projectStore.setCurrentProject(selectedId)
          showToast('Default project updated')
        } else {
          showToast('Failed to update default project')
        }
      } else {
        showToast('Failed to update default project')
      }
    } catch (err) {
      showToast('Failed to update default project')
    }
  } catch (err) {
    showToast('Failed to update default project')
  }
}

function formatDate(d) { if (!d) return '' ; try { return new Date(d).toLocaleDateString() } catch { return d } }

</script>
