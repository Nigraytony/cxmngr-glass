<template>
  <header
    class="h-16 px-4 grid grid-cols-3 items-center w-full overflow-x-hidden
           bg-white/10 dark:bg-white/10 backdrop-blur-xl
           border-b border-white/20 ring-1 ring-white/10
           shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
  >
    <!-- Left: menu + client logo -->
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="px-3 py-1 rounded-lg bg-white/30 border border-white/40 text-white"
        @click="$emit('toggleSidebar')"
      >
        ☰
      </button>
      <div
        v-if="clientLogo"
        class="h-10 w-auto max-w-[160px] flex items-center"
      >
        <img
          :src="clientLogo"
          alt="Client logo"
          class="h-10 w-auto object-contain rounded-lg"
        >
      </div>
    </div>

    <!-- Center: project name -->
    <div class="flex items-center justify-center min-w-0">
      <span class="text-white font-semibold text-center truncate max-w-[60vw]">{{ defaultProjectName }}</span>
    </div>

    <!-- Right: CxA logo + user menu -->
    <div
      ref="userWrap"
      class="relative flex items-center justify-end gap-3 min-w-0"
    >
      <div
        v-if="cxaLogo"
        class="h-10 w-auto max-w-[160px] flex items-center"
      >
        <img
          :src="cxaLogo"
          alt="CxA logo"
          class="h-10 w-auto object-contain rounded-lg"
        >
      </div>
      <button
        class="flex items-center gap-2 px-2 py-1 rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
        @click="toggleMenu"
      >
        <!-- thumbnail: avatar image when present, otherwise initials -->
        <div
          v-if="avatarSrc"
          class="w-8 h-8 rounded-full overflow-hidden bg-white/10"
        >
          <img
            :src="avatarSrc"
            alt="User avatar"
            class="w-full h-full object-cover"
          >
        </div>
        <div
          v-else
          class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          <span class="font-medium">{{ initials }}</span>
        </div>
        <span class="text-white/90 hidden sm:inline">{{ firstName }}</span>
        <span
          v-if="invitationsStore.invites.length"
          class="inline-flex items-center justify-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/80 text-white shadow-sm"
        >
          {{ invitationsStore.invites.length }}
        </span>
      </button>

      <!-- Dropdown -->
      <!-- Teleport dropdown to body to avoid local stacking context issues; position fixed using measured coords -->
      <transition name="fade">
        <teleport to="body">
          <div
            v-if="menuOpen"
            :style="dropdownStyle"
            class="w-72 rounded-lg p-2 bg-white/6 backdrop-blur-md border border-white/10 shadow-lg text-white z-[9999]"
          >
            <ul class="flex flex-col gap-1">
              <li>
                <button
                  class="w-full text-left px-3 py-2 rounded hover:bg-white/10 flex items-center gap-2"
                  @click="goProfile"
                >
                  <!-- Profile icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4 text-white/90"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1"
                  /></svg>
                  <span>Profile</span>
                </button>
              </li>

              <!-- Projects list -->
              <li class="my-1 border-t border-white/10" />
              <!-- Invitations block -->
              <template v-if="invitationsStore.invites.length">
                <li class="px-3 py-1 text-xs font-semibold text-white/70">
                  Invitations
                </li>
                <li
                  v-for="inv in invitationsStore.invites"
                  :key="inv.id"
                  class="px-3 py-2 rounded hover:bg-white/10 flex items-center gap-2"
                >
                  <div class="flex-1 min-w-0">
                    <div
                      class="truncate text-sm"
                      :title="inv.project?.name || 'Project'"
                    >
                      {{ inv.project?.name || 'Project' }}
                    </div>
                    <div class="text-[11px] text-white/50">
                      {{ formatInviteDate(inv.createdAt) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="text-xs px-2 py-1 rounded bg-green-500/70 hover:bg-green-500 text-white"
                      @click="accept(inv.id)"
                    >
                      Accept
                    </button>
                    <button
                      class="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white"
                      @click="decline(inv.id)"
                    >
                      Decline
                    </button>
                  </div>
                </li>
                <li class="my-1 border-t border-white/10" />
              </template>
              <li
                v-if="projectsList.length === 0"
                class="px-3 py-2 text-sm text-white/60"
              >
                No projects
              </li>
              <li
                v-for="p in projectsList"
                :key="p.id"
              >
                <button
                  class="w-full text-left px-3 py-2 rounded flex items-center justify-between gap-2 hover:bg-white/10"
                  :class="isDefaultProject(p) ? 'bg-white/10 cursor-default' : ''"
                  :title="p.name"
                  @click="onSelectProject(p)"
                >
                  <span
                    class="truncate"
                    :title="p.name"
                  >{{ p.name }}</span>
                  <span
                    class="flex items-center gap-1 text-xs"
                    :class="isDefaultProject(p) ? 'text-green-300' : 'text-white/70'"
                  >
                    <svg
                      v-if="isDefaultProject(p)"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <template v-else>
                      <!-- thumbtack icon for 'make default' -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4"
                        aria-label="Make default"
                        title="Make default"
                      >
                        <!-- tack head -->
                        <circle
                          cx="12"
                          cy="6.5"
                          r="2.5"
                          stroke-width="1.4"
                        />
                        <!-- cross bar under head -->
                        <path
                          d="M9 10.5h6"
                          stroke-width="1.4"
                          stroke-linecap="round"
                        />
                        <!-- stem -->
                        <path
                          d="M12 10.5v5.5"
                          stroke-width="1.4"
                          stroke-linecap="round"
                        />
                        <!-- point -->
                        <path
                          d="M12 16l-1.8 5"
                          stroke-width="1.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </template>
                    <span v-if="isDefaultProject(p)">Default</span>
                  </span>
                </button>
              </li>

              <li class="my-1 border-t border-white/10" />
              <li>
                <button
                  class="w-full text-left px-3 py-2 rounded hover:bg-white/10 flex items-center gap-2"
                  @click="emitLogout"
                >
                  <!-- Logout icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4 text-white/90"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M17 16l4-4m0 0l-4-4m4 4H7M3 21h8a2 2 0 002-2V5a2 2 0 00-2-2H3"
                  /></svg>
                  <span>Logout</span>
                </button>
              </li>
            </ul>
          </div>
        </teleport>
      </transition>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useInvitationsStore } from '../stores/invitations'
// axios removed; use `http` helper instead when needed
import { getAuthHeaders } from '../utils/auth'
import http from '../utils/http'

const emit = defineEmits(['toggleSidebar','logout'])
// Use auth store for current user name
// import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const invitationsStore = useInvitationsStore()

const defaultProjectName = computed(() => {
  // Prefer the live current project from the project store
  if (projectStore.currentProject && projectStore.currentProject.name) {
    return projectStore.currentProject.name
  }
  // Fallback to default project entry from auth.user (may be hydrated by backend)
  try {
    if (auth.user && Array.isArray(auth.user.projects)) {
      const dp = auth.user.projects.find(p => (p && typeof p === 'object' && p.default))
      if (dp) return dp.name || dp.title || 'Projects'
    }
  } catch (e) { /* ignore */ }
  return 'Cx Manager Dashboard'
})

const menuOpen = ref(false)
const userWrap = ref(null)
const dropdownStyle = ref({ position: 'fixed', top: '4rem', left: 'auto', right: '1rem' })

// Logos from current project
const clientLogo = computed(() => projectStore.currentProject?.logo || '')
const cxaLogo = computed(() => projectStore.currentProject?.commissioning_agent?.logo || '')

function updateDropdownPosition() {
  if (!userWrap.value) return
  const btn = userWrap.value.querySelector('button')
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  // position dropdown below the button, align right edge
  const top = rect.bottom + 8
  const right = window.innerWidth - rect.right
  dropdownStyle.value = { position: 'fixed', top: `${top}px`, right: `${right}px` }
}

function onWindowChange() {
  if (menuOpen.value) updateDropdownPosition()
}

onMounted(() => {
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})

const router = useRouter()
const firstName = computed(() => (auth.user ? (auth.user.firstName || '') : ''))

const avatarSrc = computed(() => {
  if (!auth.user) return ''
  return auth.user.avatar || auth.user.contact?.avatar || ''
})

const initials = computed(() => {
  if (!auth.user) return ''
  const f = auth.user.firstName || ''
  const l = auth.user.lastName || ''
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
  if (f) return f.slice(0,2).toUpperCase()
  return auth.user.email ? auth.user.email.slice(0,2).toUpperCase() : ''
})

function goProfile() {
  menuOpen.value = false
  router.push({ path: '/profile' })
}

function toggleMenu() { menuOpen.value = !menuOpen.value; if (menuOpen.value) updateDropdownPosition() }
function emitLogout() { menuOpen.value = false; emit('logout') }

function onClickOutside(e) {
  if (!userWrap.value) return
  if (!userWrap.value.contains(e.target)) menuOpen.value = false
}

onMounted(() => window.addEventListener('click', onClickOutside))
onBeforeUnmount(() => window.removeEventListener('click', onClickOutside))

// Ensure projects are loaded for the dropdown
onMounted(async () => {
  try {
    if (!projectStore.projects || projectStore.projects.length === 0) {
      await projectStore.fetchProjects()
    }
  try { await invitationsStore.fetchPending() } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
})

const projectsList = computed(() => {
  // Prefer the authenticated user's project membership list (hydrated by /api/users/me)
  try {
    if (auth.user && Array.isArray(auth.user.projects) && auth.user.projects.length > 0) {
      return auth.user.projects
        .map((p) => {
          if (!p) return null
          if (typeof p === 'string') return { id: p, name: p }
          // p may be a lightweight project object coming from the user payload
          return {
            id: p._id || p.id,
            _id: p._id || p.id,
            name: p.name || p.title || (p.client ? `${p.client} - ${p.name}` : p.name) || 'Project',
          }
        })
        .filter(Boolean)
    }
  } catch (e) {
    /* ignore and fall back */
  }
  // No authenticated project list available -> return empty list so users
  // don't see all projects in the app (fallback to project store would leak all projects).
  return []
})
const defaultProjectId = computed(() => {
  try {
    const list = (auth.user && Array.isArray(auth.user.projects)) ? auth.user.projects : []
    const dp = list.find((p) => p && p.default)
    if (dp) {
      const obj = dp
      return typeof dp === 'string' ? dp : (obj._id || obj.id || null)
    }
  } catch (e) { /* ignore */ }
  return projectStore.currentProjectId || null
})

function isDefaultProject(p) {
  const pid = p && (p.id || p._id)
  return defaultProjectId.value && pid && String(defaultProjectId.value) === String(pid)
}

async function onSelectProject(p) {
  if (!p) return
  if (isDefaultProject(p)) return // already default
  try {
    const userId = auth.user && (auth.user._id || auth.user.id)
    if (!userId) return
    const projectId = p.id || p._id
  const { data } = await http.post(`/api/projects/${projectId}/set-default`, { userId }, { headers: getAuthHeaders() })
    // Update auth store's user while preserving token
    const incoming = (data && data.user) ? data.user : data
    const preserveToken = auth.token || (auth.user && auth.user.token) || null
    if (incoming) {
      auth.user = Object.assign({}, auth.user || {}, incoming)
      if (preserveToken && auth.user) {
        auth.user.token = preserveToken
      }
      // persist
        try { localStorage.setItem('user', JSON.stringify(auth.user)) } catch (e) { /* ignore */ }
    }
    // Switch current project in store
    if (projectId) projectStore.setCurrentProject(String(projectId))
    ui.showSuccess('Default project updated')
  } catch (err) {
    ui.showError(err?.response?.data?.error || 'Failed to set default project')
  } finally {
    // keep menu open so user sees the highlight update; optionally close
  }
}

function formatInviteDate(d) {
  try { return d ? new Date(d).toLocaleDateString() : '' } catch (e) { return '' }
}

async function accept(id) {
  try {
    const ok = await invitationsStore.acceptInvite(id)
    if (ok) {
      ui.showSuccess('Invitation accepted')
        try { await projectStore.fetchProjects() } catch (e) { /* ignore */ }
    } else {
      ui.showError(invitationsStore.error || 'Failed to accept invitation')
    }
  } catch (e) {
    ui.showError('Failed to accept invitation')
  }
}

async function decline(id) {
  try {
    const ok = await invitationsStore.rejectInvite(id)
    if (ok) ui.showSuccess('Invitation declined')
    else ui.showError(invitationsStore.error || 'Failed to decline invitation')
  } catch (e) {
    ui.showError('Failed to decline invitation')
  }
}
</script>
