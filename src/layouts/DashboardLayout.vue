<template>
  <div class="app-bg h-screen text-white overflow-hidden">
    <div class="flex h-full w-full">
      <Sidebar
        :open="ui.sidebarOpen"
        @toggle="ui.toggleSidebar()"
      />

      <div
        class="flex-1 flex flex-col min-w-0 h-full transition-all duration-300"
      >
        <Topbar
          class="sticky top-0 z-30"
          :name="auth.name"
          @toggle-sidebar="ui.toggleSidebar()"
          @logout="handleLogout"
        />
        <main
          class="flex-1 p-6 min-w-0"
          :class="isAssistantRoute ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto'"
        >
          <template v-if="isAssistantRoute">
            <div class="flex-1 min-h-0">
              <Suspense>
                <template #default>
                  <RouterView />
                </template>
                <template #fallback>
                  <Spinner />
                </template>
              </Suspense>
            </div>
            <AppFooter class="mt-8" />
          </template>
          <template v-else>
            <div class="min-h-full flex flex-col">
              <div class="flex-1 min-h-0">
                <Suspense>
                  <template #default>
                    <RouterView />
                  </template>
                  <template #fallback>
                    <Spinner />
                  </template>
                </Suspense>
              </div>
              <AppFooter class="mt-8" />
            </div>
          </template>
        </main>
      </div>
    </div>

    <AssistantModal />
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'
import Spinner from '../components/Spinner.vue'
import AppFooter from '../components/AppFooter.vue'
import AssistantModal from '../components/assistant/AssistantModal.vue'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useOprStore } from '../stores/opr'

const ui = useUiStore()
const auth = useAuthStore()
const projectStore = useProjectStore()
const opr = useOprStore()
const router = useRouter()
const route = useRoute()
const isAssistantRoute = computed(() => route.name === 'assistant')

const resolvedProjectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim())

let workshopCheckTimer = null
let workshopCheckInFlight = false
async function checkForActiveOprWorkshop(projectId) {
  const pid = String(projectId || '').trim()
  if (!pid) return
  if (!auth.isAuthenticated) return
  if (workshopCheckInFlight) return
  workshopCheckInFlight = true
  try {
    await opr.fetchWorkshop(pid)
  } catch (e) {
    // Add-on not enabled or access denied; treat as no active workshop.
    try { opr.workshop = null } catch (_) { /* ignore */ }
  } finally {
    workshopCheckInFlight = false
  }

  const ws = opr.workshop
  const active = Boolean(ws && ws.startedAt && !ws.endedAt)
  if (!active) return
  if (String(route.path || '').startsWith('/app/opr')) return

  const dismissKey = `oprWorkshopPromptDismissed:${pid}:${String(ws.id || '')}:${String(ws.startedAt || '')}`
  try {
    if (sessionStorage.getItem(dismissKey) === '1') return
  } catch (e) { /* ignore */ }

  // Avoid re-showing the same toast if it's already visible
  try {
    if (ui.toast && ui.toast.show && ui.toast.dismissKey === dismissKey) return
  } catch (e) { /* ignore */ }

  const name = String(ws.name || '').trim()
  ui.showToast({
    message: `An OPR Workshop session is live${name ? `: ${name}` : ''}.`,
    variant: 'info',
    duration: 12000,
    actionLabel: 'Enter Workshop',
    actionTo: '/app/opr',
    dismissKey,
  })
}

watch(
  [() => auth.authReady, () => resolvedProjectId.value],
  ([ready, pid], [prevReady, prevPid]) => {
    if (!ready) return
    if (pid && pid !== prevPid) {
      try { opr.workshop = null } catch (_) { /* ignore */ }
      try { opr.attendee = null } catch (_) { /* ignore */ }
    }
    if (workshopCheckTimer) clearTimeout(workshopCheckTimer)
    // slight delay to avoid racing initial project fetches during navigation
    workshopCheckTimer = setTimeout(() => checkForActiveOprWorkshop(pid), 250)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  if (workshopCheckTimer) clearTimeout(workshopCheckTimer)
})

function handleLogout() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>
