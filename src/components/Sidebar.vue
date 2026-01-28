<template>
  <aside
    class="group fixed md:sticky md:top-0 md:left-0 z-40 h-full md:h-screen transition-all duration-300
           bg-white/10 dark:bg-white/10 backdrop-blur-xl border-r border-white/20
           shadow-[0_10px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10
           overflow-hidden"
    :class="[ open ? 'w-64' : 'w-16' ]"
  >
    <div class="flex flex-col h-full">
      <div class="relative h-16 flex items-center gap-2 px-3">
      <!-- Show brand mark + word when sidebar is open -->
      <div
        v-if="open"
        class="h-12 max-w-[240px] flex items-center gap-3"
      >
        <picture>
          <source
            srcset="/brand/logo-2.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="Cxma logo"
            class="h-10 w-10 object-contain invert"
          >
        </picture>
        <span class="text-white text-xl font-semibold tracking-wide">Cxma</span>
      </div>
      <!-- Compact square logo when collapsed (mark only) -->
      <div
        v-else
        class="h-12 w-12 rounded-xl overflow-hidden grid place-items-center"
      >
        <picture>
          <source
            srcset="/brand/logo.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="Cxma logo"
            class="h-9 w-9 object-contain invert"
          >
        </picture>
      </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        <nav class="space-y-1">
      <!-- Dashboard -->
      <RouterLink
        to="/app"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          route.path === '/app' ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="route.path === '/app' ? 'page' : null"
      >
        <span class="i">🏠</span>
        <span v-if="open">Dashboard</span>
      </RouterLink>
      <!-- Assistant -->
      <RouterLink
        to="/app/assistant"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/assistant') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/assistant') ? 'page' : null"
      >
        <span class="i">🤖</span>
        <span v-if="open">Assistant</span>
      </RouterLink>
      <!-- OPR Workshop (paid add-on; visible to all projects) -->
	      <RouterLink
	        v-if="showStandaloneOprWorkshopLink"
	        to="/app/opr"
	        :class="[
	          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
	          isActive('/app/opr') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
	        ]"
	        :aria-current="isActive('/app/opr') ? 'page' : null"
	      >
	        <span class="i">🗳️</span>
	        <span
	          v-if="open"
	          class="flex items-center justify-between gap-2 w-full min-w-0"
	        >
	          <span class="truncate">OPR Workshop</span>
	          <span
	            v-if="opr.workshopIsActive"
	            class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 shrink-0"
	          >
	            Live
	          </span>
	          <span
	            v-else
	            class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70 shrink-0"
	          >
	            Add-on
	          </span>
	        </span>
	      </RouterLink>
      <!-- Tasks + Process tree (split action: click label to open list page; click caret to expand tree) -->
      <div v-if="featureEnabled('tasks')">
        <div class="flex items-stretch">
          <RouterLink
            to="/app/tasks"
            :class="[
              'flex-1 flex items-center gap-3 px-3 py-2 rounded-l-lg text-white/90 border border-white/10 border-r-0 min-w-0',
              isActive('/app/tasks') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
            ]"
            :aria-current="isRouteName('tasks') ? 'page' : null"
          >
            <span class="i shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M9 11l2 2 4-4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 6H7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 12H7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 18H7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span
              v-if="open"
              class="truncate"
            >Tasks</span>
          </RouterLink>

          <button
            v-if="open"
            type="button"
            class="px-2 rounded-r-lg border border-white/10 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            :class="processOpen ? 'bg-white/15 border-white/20' : 'bg-white/5'"
            :disabled="!currentProjectId"
            :title="currentProjectId ? (processOpen ? 'Hide process tree' : 'Show process tree') : 'Select a project to view the process tree'"
            @click="toggleProcessOpen"
          >
            <span class="inline-flex items-center gap-2">
              <span
                v-if="processLoading"
                class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70"
              >
                Loading…
              </span>
              <svg
                class="w-4 h-4 text-white/70 transition-transform"
                :class="processOpen ? 'rotate-180' : ''"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>

        <div
          v-if="currentProjectId && open && processOpen"
          class="mt-1 ml-[-0.75rem] pl-3 border-l border-white/10 space-y-1 pr-1"
        >
          <div
            v-if="processError"
            class="text-xs text-red-200 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
          >
            {{ processError }}
          </div>
          <div
            v-else-if="!processLoading && processVisibleNodes.length === 0"
            class="text-xs text-white/60 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          >
            No tasks found for this project.
          </div>

          <div
            v-for="n in processVisibleNodes"
            :key="n.key"
            class="flex items-start gap-1 px-2 py-0.5 rounded-md hover:bg-white/10"
            :class="n.active ? 'bg-white/15 border border-white/15' : 'border border-transparent'"
            :style="processRowStyle(n)"
          >
            <button
              v-if="n.hasChildren"
              type="button"
              class="mt-0 w-4 h-4 grid place-items-center rounded hover:bg-white/10 text-white/70 shrink-0"
	              :title="processExpanded[n.key] ? 'Collapse' : 'Expand'"
	              @click.stop="toggleProcessNode(n.key)"
	            >
	              <svg
	                class="w-3 h-3 transition-transform"
	                :class="processExpanded[n.key] ? 'rotate-90' : ''"
	                xmlns="http://www.w3.org/2000/svg"
	                viewBox="0 0 24 24"
	                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
	            </button>
	            <span
	              v-else
	              class="mt-0 w-4 h-4"
	            />

            <div
              v-if="n.taskId"
              class="min-w-0 flex-1 flex items-center gap-2"
            >
              <RouterLink
                :to="{ name: 'task-edit', params: { id: n.taskId } }"
                class="min-w-0 flex-1 text-xs text-white/85 hover:text-white truncate"
                :title="`${n.wbs} ${n.name}`"
              >
                <span class="text-white/60 mr-1">{{ n.wbs }}</span>
                <span class="truncate">{{ n.name }}</span>
              </RouterLink>

              <RouterLink
                v-if="isOprWorkshopTaskNode(n)"
                to="/app/opr"
                class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white shrink-0 ml-auto"
                title="Open OPR Workshop"
                @click.stop
              >
                workshop
              </RouterLink>
            </div>
            <button
              v-else
              type="button"
              class="min-w-0 flex-1 text-left text-xs text-white/70 hover:text-white"
              :title="n.wbs"
              @click="n.hasChildren ? toggleProcessNode(n.key) : null"
            >
              <span class="text-white/60 mr-1">{{ n.wbs }}</span>
              <span class="truncate">{{ n.name }}</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Activities -->
      <RouterLink
        v-if="featureEnabled('activities')"
        to="/app/activities"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/activities') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/activities') ? 'page' : null"
      >
        <span class="i">📝</span>
        <span v-if="open">Activities</span>
      </RouterLink>
      <!-- Templates -->
      <RouterLink
        v-if="featureEnabled('templates')"
        to="/app/templates"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/templates') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/templates') ? 'page' : null"
      >
        <span class="i">📦</span>
        <span v-if="open">Templates</span>
      </RouterLink>
      <!-- Documents -->
      <RouterLink
        v-if="featureEnabled('documents')"
        to="/app/documents"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/documents') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/documents') ? 'page' : null"
      >
        <span class="i">📁</span>
        <span v-if="open">Documents</span>
      </RouterLink>
      <!-- Spaces -->
      <RouterLink
        v-if="featureEnabled('spaces')"
        to="/app/spaces"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/spaces') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/spaces') ? 'page' : null"
      >
        <span class="i">🏢</span>
        <span v-if="open">Spaces</span>
      </RouterLink>
      <!-- Equipment -->
      <RouterLink
        v-if="featureEnabled('equipment')"
        to="/app/equipment"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/equipment') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/equipment') ? 'page' : null"
      >
        <span class="i">🧰</span>
        <span v-if="open">Equipment</span>
      </RouterLink>
      <!-- Issues -->
      <RouterLink
        v-if="featureEnabled('issues')"
        to="/app/issues"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/issues') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/issues') ? 'page' : null"
      >
        <span class="i">🐞</span>
        <span v-if="open">Issues</span>
      </RouterLink>
      <button
        v-if="currentProjectId && featureEnabled('ai')"
        type="button"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10 hover:bg-white/20"
	        @click="openAiChat"
	      >
	        <span class="i">✨</span>
	        <span v-if="open">AI</span>
	      </button>
        </nav>
      </div>

      <div class="px-2 pt-2 pb-3 border-t border-white/10">
        <RouterLink
          v-if="currentProjectId"
          :to="{ name: 'project-settings', params: { id: currentProjectId } }"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
            isRouteName('project-settings') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
          ]"
          :aria-current="isRouteName('project-settings') ? 'page' : null"
        >
          <span class="i">⚙️</span>
          <span v-if="open">Project Settings</span>
        </RouterLink>
        <RouterLink
          v-if="isGlobalAdmin"
          to="/app/admin"
          :class="[
            'mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
            isActive('/app/admin') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
          ]"
          :aria-current="isActive('/app/admin') ? 'page' : null"
        >
          <span class="i">🛠️</span>
          <span v-if="open">Admin</span>
        </RouterLink>
      </div>
    </div>

    <!-- Expand affordance -->
    <button
      class="absolute -right-3 top-6 size-6 grid place-items-center rounded-full
             bg-white/40 border border-white/50 text-white shadow"
      title="Toggle sidebar"
      @click="$emit('toggle')"
    >
      <span v-if="open">‹</span>
      <span v-else>›</span>
    </button>

    <!-- AI Chat overlay (only when sidebar is expanded) -->
    <div
      v-if="open && ai.open"
      class="absolute inset-x-0 top-16 bottom-0 bg-black/70 backdrop-blur-xl border-t border-white/10"
    >
      <AiChatSidebar />
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({ open: { type: Boolean, default: true } })
const emit = defineEmits(['toggle'])
import { useRoute } from 'vue-router'
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
	import { useProjectStore } from '../stores/project'
	import { useAuthStore } from '../stores/auth'
	import { useAiStore } from '../stores/ai'
	import { useOprStore } from '../stores/opr'
import AiChatSidebar from './AiChatSidebar.vue'
import http from '../utils/http'

const route = useRoute()
	const projectStore = useProjectStore()
	const authStore = useAuthStore()
	const ai = useAiStore()
	const opr = useOprStore()
const currentProject = computed(() =>
  projectStore.currentProject ||
  (projectStore.projects || []).find(p => String(p.id || p._id) === currentProjectId.value) ||
  null
)

function normalizeFeatureFlags(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!k) continue
    const key = k.toLowerCase()
    if (v === false || v === 'false' || v === 0) { out[key] = false; continue }
    if (v === true || v === 'true' || v === 1) { out[key] = true; continue }
  }
  return out
}

function normalizeTierKey(raw) {
  const s = String(raw || '').toLowerCase().trim()
  if (!s) return ''
  if (s === 'basic' || s.startsWith('basic')) return 'basic'
  if (s === 'standard' || s.startsWith('standard')) return 'standard'
  if (s === 'premium' || s.startsWith('premium')) return 'premium'
  // tolerate labels like "Standard — $49/mo"
  if (s.includes('standard')) return 'standard'
  if (s.includes('premium')) return 'premium'
  if (s.includes('basic')) return 'basic'
  return ''
}

// Conservative defaults when plan data isn't available yet.
// (Prevents showing premium-only links like Templates/Tasks/AI by accident.)
const DEFAULT_FEATURES = {
  issues: true,
  equipment: true,
  spaces: true,
  activities: true,
  templates: false,
  documents: false,
  tasks: false,
  ai: false,
}
// Plan feature map aligned with backend plans.js
const PLAN_FEATURES = {
  basic:    { issues: true, equipment: true, spaces: false, templates: false, documents: false, activities: false, tasks: false, ai: false },
  standard: { issues: true, equipment: true, spaces: true, templates: false, documents: false, activities: true, tasks: false, ai: false },
  premium:  { issues: true, equipment: true, spaces: true, templates: true, documents: true, activities: true, tasks: true, ai: true },
}

const activeFeatures = computed(() => {
  const proj = currentProject.value || {}
  const base = { ...DEFAULT_FEATURES }
  const tierKey = normalizeTierKey(proj.subscriptionTier || proj.subscription || '')
  const tierFlags = tierKey && PLAN_FEATURES[tierKey] ? normalizeFeatureFlags(PLAN_FEATURES[tierKey]) : {}
  const projectFlags = normalizeFeatureFlags(proj.subscriptionFeatures)
  // Merge: defaults -> tier -> project flags.
  // Note: Templates is premium-only; if `subscriptionFeatures.templates` is incorrectly true on Standard,
  // do not show the Templates link unless the project is clearly premium (tier is premium or premium-only flags enabled).
  const merged = { ...base, ...tierFlags, ...projectFlags }
  const inferredPremium = tierKey === 'premium' || projectFlags.tasks === true || projectFlags.ai === true
  if (!inferredPremium) merged.templates = false
  if (!inferredPremium) merged.documents = false
  else merged.documents = true
  return merged
})

const featureEnabled = (key) => {
  const flags = activeFeatures.value || {}
  return flags[key.toLowerCase()] === true
}

function isActive(path) {
  // simple startsWith match; treat root specially
  if (path === '/') return route.path === '/'
  if (path === '/app') return route.path === '/app' || route.path.startsWith('/app')
  // special-case: when checking /projects, don't mark it active for project-settings route
  if ((path === '/projects' || path === '/app/projects') && route.name === 'project-settings') return false
  return route.path.startsWith(path)
}

function isRouteName(name) {
  // match by route name first, fallback to path start for robustness
  if (route.name === name) return true
  return route.path.startsWith('/projects/edit') && name === 'project-settings'
}

const currentProjectId = computed(() => projectStore.currentProjectId || localStorage.getItem('selectedProjectId'))
const isGlobalAdmin = computed(() => {
  const role = (authStore.user && authStore.user.role) ? String(authStore.user.role).toLowerCase() : ''
  return role === 'globaladmin' || role === 'superadmin'
})

const hasOprTaskForProject = computed(() => {
  const pid = String(currentProjectId.value || '').trim()
  if (!pid) return false
  if (String(processLoadedProjectId.value || '').trim() !== pid) return false
  const list = Array.isArray(processTasks.value) ? processTasks.value : []
  return list.some((t) => String(t?.name || t?.title || '').trim().toLowerCase() === 'opr')
})

	const showStandaloneOprWorkshopLink = computed(() => {
	  if (!currentProjectId.value) return false
	  if (opr.workshopIsActive) return true
	  // If tasks aren't enabled, there is no task tree entry to host the Workshop link.
	  if (!featureEnabled('tasks')) return true
	  return !hasOprTaskForProject.value
	})

function openAiChat() {
  if (!props.open) emit('toggle')
  ai.toggleOpen(true)
}

// -----------------------------
// Process nav (Tasks WBS tree)
// -----------------------------
const processOpen = ref(false)
const processLoading = ref(false)
const processError = ref('')
const processTasks = ref([])
const processLoadedProjectId = ref('')
const processExpanded = ref({})
const TASKS_UPDATED_EVENT = 'cxma:tasks-updated'
let tasksUpdatedTimer = null

function compareWbs(a, b) {
  const A = String(a || '').split('.').map((p) => (Number.isFinite(Number(p)) ? Number(p) : String(p)))
  const B = String(b || '').split('.').map((p) => (Number.isFinite(Number(p)) ? Number(p) : String(p)))
  const max = Math.max(A.length, B.length)
  for (let i = 0; i < max; i += 1) {
    const av = A[i]
    const bv = B[i]
    if (av === undefined) return -1
    if (bv === undefined) return 1
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return av - bv
    } else {
      const as = String(av)
      const bs = String(bv)
      if (as !== bs) return as.localeCompare(bs)
    }
  }
  return 0
}

function buildProcessTree(tasks) {
  const nodes = {}
  nodes.__root = { key: '__root', wbs: '', name: '', taskId: null, percentComplete: null, rollupPercentComplete: null, children: [] }

  const list = Array.isArray(tasks) ? tasks : []
  for (const t of list) {
    const wbs = t && t.wbs ? String(t.wbs).trim() : ''
    if (!wbs) continue
    const parts = wbs.split('.').map((p) => String(p).trim()).filter(Boolean)
    if (!parts.length) continue

	    let prefix = ''
	    for (let i = 0; i < parts.length; i += 1) {
	      prefix = prefix ? `${prefix}.${parts[i]}` : parts[i]
      if (!nodes[prefix]) nodes[prefix] = { key: prefix, wbs: prefix, name: `WBS ${prefix}`, taskId: null, percentComplete: null, rollupPercentComplete: null, children: [] }
	      const parent = prefix.includes('.') ? prefix.slice(0, prefix.lastIndexOf('.')) : '__root'
	      const parentNode = nodes[parent] || nodes.__root
	      if (!parentNode.children.includes(prefix)) parentNode.children.push(prefix)
	    }

    const id = String(t._id || t.id || '').trim()
    const name = String(t.name || t.title || '').trim()
    const pcRaw = Number(t.percentComplete)
    const percentComplete = Number.isFinite(pcRaw) ? Math.max(0, Math.min(100, pcRaw)) : null
    if (nodes[wbs]) {
      nodes[wbs].taskId = id || nodes[wbs].taskId
      if (name) nodes[wbs].name = name
      if (percentComplete !== null) nodes[wbs].percentComplete = percentComplete
    }
  }

	  for (const k of Object.keys(nodes)) {
	    nodes[k].children = (nodes[k].children || []).slice().sort(compareWbs)
	  }

  // Roll up progress for parent nodes so the tree shows completion at every level.
  const rollupMemo = {}
  function computeRollup(key) {
    if (Object.prototype.hasOwnProperty.call(rollupMemo, key)) return rollupMemo[key]
    const node = nodes[key]
    if (!node) { rollupMemo[key] = null; return null }
    const children = Array.isArray(node.children) ? node.children : []
    if (!children.length) {
      const pc = typeof node.percentComplete === 'number' ? node.percentComplete : null
      rollupMemo[key] = pc
      node.rollupPercentComplete = pc
      return pc
    }
    const vals = []
    for (const ck of children) {
      const v = computeRollup(ck)
      if (typeof v === 'number') vals.push(v)
    }
    // If we have any descendant progress, use the average; otherwise fall back to this task's own percentComplete.
    const own = typeof node.percentComplete === 'number' ? node.percentComplete : null
    const out = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : own
    const clamped = (typeof out === 'number' && Number.isFinite(out)) ? Math.max(0, Math.min(100, out)) : null
    rollupMemo[key] = clamped
    node.rollupPercentComplete = clamped
    return clamped
  }
  computeRollup('__root')

  return nodes
}

function defaultExpandedFromTree(tree) {
  // Default to fully collapsed (shows first-level tasks only).
  return {}
}

const activeTaskId = computed(() => {
  if (route.name !== 'task-edit') return ''
  return String(route.params?.id || '').trim()
})

function isOprWorkshopTaskNode(n) {
  return String(n?.name || '').trim().toLowerCase() === 'opr'
}

const processTree = computed(() => buildProcessTree(processTasks.value))
const processVisibleNodes = computed(() => {
  const tree = processTree.value
  const expanded = processExpanded.value || {}
  const out = []

  function walk(parentKey, depth) {
    const parent = tree[parentKey]
    const children = parent && Array.isArray(parent.children) ? parent.children : []
    for (const key of children) {
      const n = tree[key]
      if (!n) continue
      const hasChildren = Array.isArray(n.children) && n.children.length > 0
      const tid = n.taskId ? String(n.taskId) : ''
      out.push({
        key,
        wbs: n.wbs,
        name: n.name || `WBS ${n.wbs}`,
        taskId: tid || null,
        percentComplete: (typeof n.rollupPercentComplete === 'number' ? n.rollupPercentComplete : (typeof n.percentComplete === 'number' ? n.percentComplete : null)),
        depth,
        hasChildren,
        active: Boolean(tid && activeTaskId.value && tid === activeTaskId.value),
      })
      if (hasChildren && expanded[key]) walk(key, depth + 1)
    }
  }

  walk('__root', 0)
  return out
})

function toggleProcessOpen() {
  processOpen.value = !processOpen.value
}

function toggleProcessNode(key) {
  const next = { ...(processExpanded.value || {}) }
  next[key] = !next[key]
  processExpanded.value = next
}

function processRowStyle(n) {
  const depth = n && typeof n.depth === 'number' ? n.depth : 0
  const paddingLeft = `calc(${Math.min(depth, 6) * 0.75}rem)`

  const pc = n && typeof n.percentComplete === 'number' ? n.percentComplete : 0
  const pct = Math.max(0, Math.min(100, pc))
  if (!pct) return { paddingLeft }

  // Very faint progress fill (keeps hover background visible).
  const color = 'rgba(255,255,255,0.06)'
  return {
    paddingLeft,
    backgroundImage: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, transparent ${pct}%, transparent 100%)`
  }
}

async function fetchProcessTasks(projectId, { force = false } = {}) {
  const pid = String(projectId || '').trim()
  if (!pid) return
  if (processLoading.value) return
  if (!force && processLoadedProjectId.value === pid) return

  processLoading.value = true
  processError.value = ''
  try {
    const resp = await http.get('/api/tasks', { params: { projectId: pid, limit: 1000 } })
    const tasks = resp?.data?.tasks || []
    processTasks.value = (Array.isArray(tasks) ? tasks : []).filter((t) => {
      if (!t) return false
      if (t.deleted === true) return false
      if (String(t.status || '').toLowerCase() === 'deleted') return false
      return Boolean(String(t.wbs || '').trim())
    })
    processLoadedProjectId.value = pid
    const tree = buildProcessTree(processTasks.value)
    const defaults = defaultExpandedFromTree(tree)
    const prev = processExpanded.value && typeof processExpanded.value === 'object' ? processExpanded.value : {}
    const hasPrev = Object.keys(prev).length > 0
    processExpanded.value = hasPrev ? { ...defaults, ...prev } : defaults
  } catch (e) {
    processTasks.value = []
    processError.value = 'Unable to load tasks for Process navigation.'
  } finally {
    processLoading.value = false
  }
}

function scheduleProcessRefresh() {
  try {
    const pid = String(currentProjectId.value || '').trim()
    if (!pid) return
    if (!props.open) return
    if (tasksUpdatedTimer) clearTimeout(tasksUpdatedTimer)
    tasksUpdatedTimer = setTimeout(() => {
      fetchProcessTasks(pid, { force: true }).catch(() => {})
    }, 300)
  } catch (e) { /* ignore */ }
}

function onTasksUpdated(e) {
  try {
    const pid = String(e?.detail?.projectId || '').trim()
    if (!pid) return
    if (pid !== String(currentProjectId.value || '').trim()) return
    scheduleProcessRefresh()
  } catch (err) { /* ignore */ }
}

watch([currentProjectId, () => props.open, processOpen], async ([pid, sidebarOpen, procOpen]) => {
  if (!pid) {
    processTasks.value = []
    processLoadedProjectId.value = ''
    processError.value = ''
    processExpanded.value = {}
    return
  }
  if (!sidebarOpen) return
  // Prefetch tasks even when the tree is closed so other UI (e.g., OPR Workshop link)
  // can react to task presence without requiring the user to open the tree.
  if (!featureEnabled('tasks')) return
  await fetchProcessTasks(pid)
}, { immediate: true })

onMounted(() => {
  try {
    if (typeof window !== 'undefined') window.addEventListener(TASKS_UPDATED_EVENT, onTasksUpdated)
  } catch (e) { /* ignore */ }
})

onBeforeUnmount(() => {
  try {
    if (tasksUpdatedTimer) clearTimeout(tasksUpdatedTimer)
  } catch (e) { /* ignore */ }
  try {
    if (typeof window !== 'undefined') window.removeEventListener(TASKS_UPDATED_EVENT, onTasksUpdated)
  } catch (e) { /* ignore */ }
})

watch(() => route.name, () => {
  // Auto-open the process tree when deep-linking into a specific task.
  if (route.name === 'task-edit') processOpen.value = true
}, { immediate: true })

</script>
