<template>
  <div class="app-bg min-h-screen text-white">
    <div class="grid md:grid-cols-[auto,1fr]">
      <Sidebar :open="ui.sidebarOpen" @toggle="ui.toggleSidebar()" />

      <div class="min-h-screen md:ml-0" :class="ui.sidebarOpen ? 'ml-16 md:ml-0' : 'ml-16'">
        <Topbar :name="auth.name" @toggleSidebar="ui.toggleSidebar()" @logout="handleLogout" />
        <main class="p-6">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'
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
