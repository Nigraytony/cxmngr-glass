<template>
  <div class="app-bg min-h-screen text-white overflow-x-hidden">
    <div class="grid md:grid-cols-[auto,1fr] w-full">
      <Sidebar
        :open="ui.sidebarOpen"
        @toggle="ui.toggleSidebar()"
      />

      <div
        class="min-h-screen md:ml-0 min-w-0"
        :class="ui.sidebarOpen ? 'ml-16 md:ml-0' : 'ml-16'"
      >
        <Topbar
          :name="auth.name"
          @toggle-sidebar="ui.toggleSidebar()"
          @logout="handleLogout"
        />
        <main class="p-6 min-w-0">
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
  router.push({ name: 'login' })
}
</script>
