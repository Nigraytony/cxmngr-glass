<template>
  <!-- Make this section the positioning context for the toast so it spans the RouterView area (right side without the sidebar) -->
  <section class="space-y-6 relative" ref="pageSection">
    <!-- Toast component: overlays content, top computed from header height -->
    <Toast :message="toast.message" v-model:show="toast.show" :top="toastTop" />
    <div>
        <BreadCrumbs :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Issues', to: '/issues' }
        ]" class="mt-1 text-white/70" />
    </div>

      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="relative inline-block group">
            <button :disabled="!projectStore.currentProjectId" @click="showAddModal = true" aria-label="Add issue" aria-describedby="add-issue-tooltip" :title="!projectStore.currentProjectId ? 'Select a project first' : 'Add issue'" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
            </button>

            <!-- Styled tooltip: visible on hover and focus -->
            <div id="add-issue-tooltip" role="tooltip" class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100">
              {{ projectStore.currentProjectId ? 'Add issue' : 'Select a project to add issues' }}
            </div>
          </div>

        <!-- Search input -->
        <div class="relative">
          <input v-model="searchQuery" ref="searchInput" placeholder="Search issues..." class="rounded-lg p-2 bg-white/5 text-white/80 hidden sm:inline-block pr-10" />
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
              <button
                v-for="opt in priorityOptions"
                :key="opt.name"
                @click="togglePriority(opt.name)"
                :aria-pressed="opt.name === priorityFilter"
                :class="[
                  priorityClass(opt.name) + (opt.name === priorityFilter ? ' ring-2 ring-white/20' : ''),
                  'px-3 py-1 rounded-full text-sm flex items-center gap-2'
                ]">
                <span :class="opt.name.toLowerCase().includes('medium') ? 'text-black' : 'text-white'">{{ opt.name }}</span>
                <span :class="['text-xs px-2 py-0.5 rounded-full', opt.name.toLowerCase().includes('medium') ? 'bg-white/20 text-black' : 'bg-white/10 text-white/80']">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- right-side placeholder (keeps layout consistent) -->
        <div></div>
      </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 overflow-x-auto">
      <table class="min-w-full text-left">
        <thead>
          <tr class="text-sm text-white/70">
            <th class="px-4 py-3">#</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Description</th>
            <th class="px-4 py-3">Priority</th>
            <th class="px-4 py-3">Responsible</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="mt-2">
          <tr v-for="issue in pagedIssues" :key="issue.id" class="align-top">
            <td class="px-4 py-3 text-white">{{ issue.number }}</td>
            <td class="px-4 py-3 text-white/90">{{ issue.type }}</td>
            <td class="px-4 py-3 text-white/70 max-w-xl">
              {{ truncate(issue.description, 250) }}
            </td>
            <td class="px-4 py-3">
              <span :class="priorityClass(issue.priority) + ' px-3 py-1 rounded-full text-xs font-medium'">{{ issue.priority }}</span>
            </td>
            <td class="px-4 py-3 text-white/90">{{ issue.responsible_person }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button @click="openView(issue)" class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8">View</button>
                <button @click="openAssign(issue)" class="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/8">Assign</button>
                <button @click="openClose(issue)" class="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm border border-red-400/40">Close</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination controls -->
    <div class="flex items-center justify-between mt-3">
      <div class="text-white/70 text-sm">
        Showing
        <span class="font-medium text-white">{{ startItem }}-{{ endItem }}</span>
        of <span class="font-medium text-white">{{ totalItems }}</span>
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
    
    <!-- View Issue Modal -->
    <Modal v-model="showViewModal">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Issue #{{ editIssue?.id || selectedIssue?.id }}</h3>
      </template>

      <!-- Use the reusable IssueForm for editing; pass validation errors -->
      <IssueForm v-model="editIssue" :errors="formErrors" />

      <template #footer>
        <div class="flex gap-2">
          <button @click="saveEdit" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Save</button>
          <button @click="cancelEdit" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Cancel</button>
        </div>
      </template>
    </Modal>

    <!-- Assign Modal -->
    <Modal v-model="showAssignModal">
      <template #header>
        <h3 class="text-lg font-semibold">Assign Issue #{{ selectedIssue?.id }}</h3>
      </template>
      <div>
        <label class="block text-white/80 mb-2">Responsible person</label>
        <input v-model="assignName" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button @click="confirmAssign" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Save</button>
          <button @click="showAssignModal = false" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Cancel</button>
        </div>
      </template>
    </Modal>

    <!-- Close Confirm Modal -->
    <Modal v-model="showCloseModal">
      <template #header>
        <h3 class="text-lg font-semibold">Close Issue #{{ selectedIssue?.id }}</h3>
      </template>
      <div>
        <p class="text-white/80">Are you sure you want to close this issue?</p>
        <p class="text-white/70 mt-2">{{ selectedIssue?.title || selectedIssue?.type }} — {{ truncate(selectedIssue?.description, 200) }}</p>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button @click="confirmClose" class="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/40">Close issue</button>
          <button @click="showCloseModal = false" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Cancel</button>
        </div>
      </template>
    </Modal>

    <!-- Add Issue Modal -->
    <Modal v-model="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">Add New Issue</h3>
      </template>
      <IssueForm v-model="newIssue" />
      <template #footer>
        <div class="flex gap-2">
          <button @click="addIssue" class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Create</button>
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
import IssueForm from '../../components/IssueForm.vue'
import Toast from '../../components/Toast.vue'
import { useIssuesStore } from '../../stores/issues'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'

const issuesStore = useIssuesStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()

function truncate(text, n) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

function priorityClass(p) {
  const key = (p || '').toLowerCase()
  if (key.includes('critical') || key === 'critical') return 'bg-red-600 text-white'
  if (key.includes('high')) return 'bg-red-500 text-white'
  if (key.includes('medium')) return 'bg-yellow-500 text-black'
  if (key.includes('low')) return 'bg-green-500 text-white'
  return 'bg-white/6 text-white'
}

const selectedIssue = ref(null)
const showViewModal = ref(false)
const showAssignModal = ref(false)
const assignName = ref('')
const showAddModal = ref(false)
const newIssue = ref({ type: '', description: '', priority: 'Medium', responsible_person: '' })
const editIssue = ref(null)
const formErrors = ref({})
const toast = ref({ show: false, message: '' })
const toastTop = ref('4rem')
const pageSection = ref(null)
const headerEl = ref(null)

function computeToastTop() {
  // measure the header / breadcrumbs area and set toastTop a bit below it
  nextTick(() => {
    const hdr = headerEl.value || document.querySelector('.page-header')
    const rect = hdr ? hdr.getBoundingClientRect() : { bottom: 64 }
    // place toast 12px below header bottom relative to the pageSection
    toastTop.value = `${rect.bottom + 12}px`
  })
}

onMounted(async () => {
  computeToastTop()
  window.addEventListener('resize', computeToastTop)
  // fetch issues for current project on mount
  try { await issuesStore.fetchIssues() } catch (e) {}
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', computeToastTop)
})

function showToast(message, opts = {}) {
  toast.value.message = message
  toast.value.show = true
  computeToastTop()
  // optional duration override
  const ms = opts.duration || 2500
  setTimeout(() => { toast.value.show = false }, ms)
}

function validateIssue(obj) {
  const e = {}
  if (!obj.type || !obj.type.trim()) e.type = 'Type is required'
  if (!obj.description || obj.description.trim().length < 10) e.description = 'Description must be at least 10 characters'
  if (!obj.priority) e.priority = 'Priority is required'
  if (!obj.responsible_person || !obj.responsible_person.trim()) e.responsible_person = 'Responsible person is required'
  return e
}

// Pagination
const page = ref(1)
const pageSize = ref(5)
const pageSizes = [5, 10, 20]

const priorityFilter = ref('All')
const searchQuery = ref('')
const searchMode = ref('substring')

// Debounce helper (small local utility)
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
const priorityCounts = computed(() => {
  const map = {}
  for (const i of issuesStore.issues) {
    const p = (i.priority || 'Unspecified')
    map[p] = (map[p] || 0) + 1
  }
  return map
})

const priorityOptions = computed(() => {
  const entries = Object.entries(priorityCounts.value).map(([name, count]) => ({ name, count }))
  // Sort commonly used priorities first
  const order = ['Critical', 'High', 'Medium', 'Low']
  entries.sort((a, b) => {
    const ia = order.indexOf(a.name) === -1 ? order.length : order.indexOf(a.name)
    const ib = order.indexOf(b.name) === -1 ? order.length : order.indexOf(b.name)
    if (ia !== ib) return ia - ib
    return b.count - a.count
  })
  // Add 'All' at the start
  return [{ name: 'All', count: issuesStore.issues.length }, ...entries]
})

const filteredIssues = computed(() => {
  const q = (effectiveSearch.value || '').trim().toLowerCase()
  const list = (!priorityFilter.value || priorityFilter.value === 'All')
    ? issuesStore.issues
    : issuesStore.issues.filter(i => (i.priority || '').toLowerCase() === priorityFilter.value.toLowerCase())

  if (!q) return list
  const mode = searchMode.value || 'substring'

  function fuzzyMatch(text, pattern) {
    // simple subsequence fuzzy match: check chars in order
    let pi = 0
    for (let i = 0; i < text.length && pi < pattern.length; i++) {
      if (text[i] === pattern[pi]) pi++
    }
    return pi === pattern.length
  }

  return list.filter(i => {
    const fields = [
      String(i.id || ''),
      i.type || '',
      i.description || '',
      i.responsible_person || '',
      i.priority || ''
    ].map(f => f.toLowerCase())

    if (mode === 'exact') {
      return fields.some(f => f === q)
    }
    if (mode === 'fuzzy') {
      return fields.some(f => fuzzyMatch(f, q))
    }
    // default substring
    return fields.some(f => f.includes(q))
  })
})

function clearSearch() {
  searchQuery.value = ''
  effectiveSearch.value = ''
}

// Keyboard shortcuts: '/' focuses search, Escape clears
function keyHandler(e) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    const el = document.querySelector('input[placeholder="Search issues..."]')
    if (el) el.focus()
  }
  if (e.key === 'Escape') {
    clearSearch()
    const el = document.querySelector('input[placeholder="Search issues..."]')
    if (el) el.blur()
  }
}
onMounted(() => window.addEventListener('keydown', keyHandler))
onBeforeUnmount(() => window.removeEventListener('keydown', keyHandler))

// refetch issues when selected project changes
// preferredProjectId: default project from auth takes precedence over explicit selection
const preferredProjectId = computed(() => {
  try {
    const projects = authStore.user?.projects
    if (Array.isArray(projects)) {
      const dp = projects.find(p => p && p.default)
      if (dp) return typeof dp === 'string' ? dp : (dp._id || dp.id || null)
    }
  } catch (e) {}
  return projectStore.currentProjectId
})

watch(preferredProjectId, (id) => {
  issuesStore.fetchIssues(id).catch(() => {})
}, { immediate: true })

const totalItems = computed(() => filteredIssues.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))
const pagedIssues = computed(() => filteredIssues.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }
function setPage(n) { if (n >= 1 && n <= totalPages.value) page.value = n }
const pagesArray = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

function openView(issue) {
  selectedIssue.value = issue
  // create a shallow copy for editing
  editIssue.value = { ...issue }
  showViewModal.value = true
}

function openAssign(issue) {
  selectedIssue.value = issue
  assignName.value = issue.responsible_person || ''
  showAssignModal.value = true
}

function confirmAssign() {
  if (!selectedIssue.value) return
  // update via API: map responsible_person -> assignedTo
  const id = selectedIssue.value.id || selectedIssue.value._id
  issuesStore.updateIssue(id, { assignedTo: assignName.value }).then((updated) => {
    // reflect change in local selectedIssue
    selectedIssue.value.responsible_person = updated.responsible_person || updated.assignedTo || assignName.value
    // also update in issuesStore list
    showAssignModal.value = false
    showToast('Assigned')
  }).catch(() => {
    showToast('Failed to assign')
  })
}

function addIssue() {
  const errs = validateIssue(newIssue.value)
  if (Object.keys(errs).length) { formErrors.value = errs; return }
  // map UI fields to backend Issue fields: responsible_person -> assignedTo, priority -> severity
  const payload = {
    projectId: projectStore.currentProjectId,
    title: newIssue.value.type || newIssue.value.title || '',
    // auto-assign issue number based on existing issues for the project
    number: (() => {
      try {
        const pid = projectStore.currentProjectId
        if (!pid) return undefined
        const nums = issuesStore.issues
          .filter(i => (i.projectId || i.project || i.projectId === pid || i.projectId === pid))
          .map(i => Number(i.number) || 0)
        const max = nums.length ? Math.max(...nums) : 0
        return max + 1
      } catch (e) { return undefined }
    })(),
    description: newIssue.value.description,
    type: newIssue.value.type,
    severity: newIssue.value.priority,
    assignedTo: newIssue.value.responsible_person
  }
  issuesStore.createIssue(payload).then(() => {
    newIssue.value = { type: '', description: '', priority: 'Medium', responsible_person: '' }
    showAddModal.value = false
    formErrors.value = {}
    showToast('Issue created')
  }).catch(() => showToast('Failed to create issue'))
}

const showCloseModal = ref(false)

function openClose(issue) {
  selectedIssue.value = issue
  showCloseModal.value = true
}

function confirmClose() {
  if (!selectedIssue.value) return
  const id = selectedIssue.value.id || selectedIssue.value._id
  // update status to 'Closed' via API
  issuesStore.updateIssue(id, { status: 'Closed' }).then(() => {
    showCloseModal.value = false
    showToast('Issue closed')
  }).catch(() => showToast('Failed to close issue'))
}

function saveEdit() {
  if (!editIssue.value) return
  const errs = validateIssue(editIssue.value)
  if (Object.keys(errs).length) { formErrors.value = errs; return }
  const id = editIssue.value.id || editIssue.value._id
  const payload = {
    title: editIssue.value.title || editIssue.value.type,
    description: editIssue.value.description,
    type: editIssue.value.type,
    severity: editIssue.value.priority,
    assignedTo: editIssue.value.responsible_person,
    status: editIssue.value.status
  }
  issuesStore.updateIssue(id, payload).then(() => {
    showViewModal.value = false
    formErrors.value = {}
    showToast('Issue updated')
  }).catch(() => showToast('Failed to update issue'))
}

function cancelEdit() {
  editIssue.value = null
  showViewModal.value = false
}

// Keep page within range when filter/pageSize/issue list changes
watch([() => priorityFilter.value, () => pageSize.value, () => issuesStore.issues.length, () => filteredIssues.value.length, () => searchQuery.value, () => effectiveSearch.value, () => searchMode.value], () => {
  if (page.value > totalPages.value) page.value = 1
})

function togglePriority(name) {
  if (!name) return
  if (name === 'All' || name === priorityFilter.value) {
    priorityFilter.value = 'All'
  } else {
    priorityFilter.value = name
  }
}
</script>
