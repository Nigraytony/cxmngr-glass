<template>
  <aside
    class="group fixed md:static z-40 h-full md:h-auto transition-all duration-300
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
      <!-- Compact square logo when collapsed (1.5x size) -->
      <div
        v-else
        class="h-12 w-12 rounded-xl overflow-hidden bg-white/30 border border-white/30 grid place-items-center"
      >
        <picture>
          <source
            srcset="/brand/logo.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo.png"
            alt="App logo"
            class="h-9 w-9 object-contain invert"
          >
        </picture>
      </div>
    </div>

    <nav class="px-2 space-y-1">
      <RouterLink
        to="/"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg text-white/90 border border-white/10',
          isActive('/') ? 'bg-white/20 text-white border-white/20' : 'hover:bg-white/20'
        ]"
        :aria-current="isActive('/') ? 'page' : null"
      >
        <span class="i">🏠</span>
        <span v-if="open">Dashboard</span>
      </RouterLink>
      <RouterLink
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

const route = useRoute()
const projectStore = useProjectStore()

function isActive(path) {
  // simple startsWith match; treat root specially
  if (path === '/') return route.path === '/'
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

</script>
