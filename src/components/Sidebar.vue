<template>
  <aside
    class="group fixed md:sticky md:top-0 md:left-0 z-40 h-full md:h-screen transition-all duration-300
           bg-white/10 dark:bg-white/10 backdrop-blur-xl border-r border-white/20
           shadow-[0_10px_40px_rgba(0,0,0,0.25)] ring-1 ring-white/10
           overflow-hidden"
    :class="[ open ? 'w-64' : 'w-16' ]"
  >
    <div class="relative h-16 flex items-center gap-2 px-3">
      <!-- Show full brand logo when sidebar is open (1.5x size) -->
      <div
        v-if="open"
        class="h-12 max-w-[240px] flex items-center"
      >
        <picture>
          <source
            srcset="/brand/logo.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo.png"
            alt="App logo"
            class="h-12 w-auto object-contain invert"
          >
        </picture>
      </div>
      <!-- Compact square logo when collapsed (use cropped PNG) -->
      <div
        v-else
        class="h-12 w-12 rounded-xl overflow-hidden grid place-items-center"
      >
        <picture>
          <source
            srcset="/brand/logo-2.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="App logo"
            class="h-9 w-9 object-contain invert"
          >
        </picture>
      </div>
    </div>

    <nav class="px-2 space-y-1">
      <RouterLink
        to="/app"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/app') ? 'page' : null"
      >
        <span class="i">🏠</span>
        <span v-if="open">Dashboard</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('spaces')"
        to="/spaces"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/spaces') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/spaces') ? 'page' : null"
      >
        <span class="i">🏢</span>
        <span v-if="open">Spaces</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('equipment')"
        to="/equipment"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/equipment') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/equipment') ? 'page' : null"
      >
        <span class="i">🧰</span>
        <span v-if="open">Equipment</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('templates')"
        to="/templates"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/templates') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/templates') ? 'page' : null"
      >
        <span class="i">📦</span>
        <span v-if="open">Templates</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('issues')"
        to="/issues"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/issues') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/issues') ? 'page' : null"
      >
        <span class="i">🐞</span>
        <span v-if="open">Issues</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('activities')"
        to="/activities"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/activities') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/activities') ? 'page' : null"
      >
        <span class="i">📝</span>
        <span v-if="open">Activities</span>
      </RouterLink>
      <RouterLink
        v-if="featureEnabled('tasks')"
        to="/tasks"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/tasks') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/tasks') ? 'page' : null"
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
      <RouterLink
        to="/projects"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/projects') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/projects') ? 'page' : null"
      >
        <span class="i">📁</span>
        <span v-if="open">Projects</span>
      </RouterLink>
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
        to="/admin"
        :class="[
          'mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/admin') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/admin') ? 'page' : null"
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
  </aside>
</template>

<script setup>
defineProps({ open: { type: Boolean, default: true } })
defineEmits(['toggle'])
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const projectStore = useProjectStore()
const authStore = useAuthStore()
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
// Plan feature map aligned with backend plans.js
const PLAN_FEATURES = {
  basic:    { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true },
  standard: { issues: true, equipment: true, spaces: true,  templates: true,  activities: true,  tasks: true },
  premium:  { issues: true, equipment: true, spaces: true,  templates: true,  activities: true,  tasks: true },
}

const activeFeatures = computed(() => {
  const proj = currentProject.value || {}
  const flags = normalizeFeatureFlags(proj.subscriptionFeatures)
  if (Object.keys(flags).length) return flags
  const tier = (proj.subscriptionTier || proj.subscription || '').toLowerCase()
  if (tier && PLAN_FEATURES[tier]) return normalizeFeatureFlags(PLAN_FEATURES[tier])
  // default: enable all if nothing specified
  return { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true }
})

const featureEnabled = (key) => {
  const flags = activeFeatures.value
  const v = flags ? flags[key.toLowerCase()] : undefined
  if (v === false) return false
  return true
}

function isActive(path) {
  // simple startsWith match; treat root specially
  if (path === '/') return route.path === '/'
  if (path === '/app') return route.path === '/app' || route.path.startsWith('/app')
  // special-case: when checking /projects, don't mark it active for project-settings route
  if (path === '/projects' && route.name === 'project-settings') return false
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

</script>
