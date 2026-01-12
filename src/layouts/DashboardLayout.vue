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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const isAssistantRoute = computed(() => route.name === 'assistant')

function handleLogout() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>
