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
        <main class="flex-1 overflow-y-auto p-6 min-w-0">
          <Suspense>
            <template #default>
              <RouterView />
            </template>
            <template #fallback>
              <Spinner />
            </template>
          </Suspense>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'
import Spinner from '../components/Spinner.vue'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push({ name: 'home' })
}
</script>
