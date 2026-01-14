<template>
  <aside
    class="group fixed md:sticky md:top-0 md:left-0 z-40 h-full md:h-screen transition-all duration-300
           bg-white/10 dark:bg-white/10 backdrop-blur-xl border-r border-white/20
           shadow-[0_10px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10
           overflow-hidden"
    :class="[ open ? 'w-64' : 'w-16' ]"
  >
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

    <nav class="px-2 space-y-1">
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
      <!-- Tasks -->
      <RouterLink
        v-if="featureEnabled('tasks')"
        to="/app/tasks"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/app/tasks') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app/tasks') ? 'page' : null"
      >
        <span class="i">
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
        <span v-if="open">Tasks</span>
      </RouterLink>
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

    <div class="absolute bottom-16 w-full px-2">
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
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useAuthStore } from '../stores/auth'
import { useAiStore } from '../stores/ai'
import AiChatSidebar from './AiChatSidebar.vue'

const route = useRoute()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const ai = useAiStore()
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

function openAiChat() {
  if (!props.open) emit('toggle')
  ai.toggleOpen(true)
}

</script>
