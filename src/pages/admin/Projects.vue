<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Projects' }]" />
    <!-- Title removed: breadcrumbs provide the page title -->

    <div class="mt-6 mb-4 flex gap-2 items-center">
      <router-link
        v-if="isGlobalAdmin()"
        to="/admin/projects/new"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white"
        title="Create new project"
        aria-label="Create new project"
      >
        <svg
          class="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </router-link>

      <input
        v-model="q"
        placeholder="Search projects"
        class="p-2 rounded bg-white/5 border border-white/10 text-white flex-1 placeholder:text-gray-400"
        @keyup.enter="load"
      >
      <button
        class="px-3 py-1 rounded bg-indigo-600"
        @click="load"
      >
        Search
      </button>
    </div>
    
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <label class="text-white/80">Per page</label>
        <select
          v-model.number="limit"
          class="rounded bg-white/5 p-1 text-white border border-white/10"
          @change="onLimitChange"
        >
          <option :value="10">
            10
          </option>
          <option :value="25">
            25
          </option>
          <option :value="50">
            50
          </option>
          <option :value="100">
            100
          </option>
        </select>
      </div>

      <div class="text-white/80">
        Page {{ currentPage }} / {{ totalPages }}
      </div>

      <div class="flex items-center gap-2">
        <button
          :disabled="currentPage === 1"
          :aria-disabled="currentPage === 1"
          title="First"
          aria-label="First page"
          class="px-3 py-1 rounded bg-gray-700 flex items-center justify-center"
          @click="goToPage(1)"
        >
          <svg
            class="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <polyline
              points="17 18 11 12 17 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              points="11 18 5 12 11 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          :disabled="currentPage === 1"
          :aria-disabled="currentPage === 1"
          title="Previous"
          aria-label="Previous page"
          class="px-3 py-1 rounded bg-gray-700 flex items-center justify-center"
          @click="prev"
        >
          <svg
            class="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <polyline
              points="15 18 9 12 15 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          :disabled="currentPage === totalPages"
          :aria-disabled="currentPage === totalPages"
          title="Next"
          aria-label="Next page"
          class="px-3 py-1 rounded bg-gray-700 flex items-center justify-center"
          @click="next"
        >
          <svg
            class="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <polyline
              points="9 18 15 12 9 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          :disabled="currentPage === totalPages"
          :aria-disabled="currentPage === totalPages"
          title="Last"
          aria-label="Last page"
          class="px-3 py-1 rounded bg-gray-700 flex items-center justify-center"
          @click="goToPage(totalPages)"
        >
          <svg
            class="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <polyline
              points="7 18 13 12 7 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              points="13 18 19 12 13 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="text-white/80">
          <th class="p-2">
            Name
          </th>
          <th class="p-2">
            Created
          </th>
          <th class="p-2">
            Status
          </th>
          <th class="p-2">
            Active
          </th>
          <th class="p-2">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in projects"
          :key="p._id"
          class="border-t border-white/5"
        >
          <td class="p-2 text-white">
            {{ p.title || p.name }}
          </td>
          <td class="p-2 text-white/80">
            {{ formatDate(p.createdAt) }}
          </td>
          <td class="p-2 text-sm">
            <span :class="statusBadgeClass(p) + ' text-xs px-2 py-0.5 rounded-full'">{{ displayStatus(p) }}</span>
          </td>
          <td class="p-2 text-white/80">
            {{ p.isActive ? 'yes' : 'no' }}
          </td>
          <td class="p-2">
            <router-link
              v-if="isAdmin()"
              :to="{ name: 'admin-projects-edit', params: { id: p._id } }"
              class="px-2 py-1 rounded bg-gray-700"
            >
              Edit
            </router-link>
            <button
              v-if="isGlobalAdmin()"
              class="ml-2 px-2 py-1 rounded bg-red-600"
              @click="confirmSoftDelete(p)"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="mt-4 flex items-center justify-between">
      <div>
        <button
          :disabled="skip === 0"
          class="px-3 py-1 rounded bg-gray-700 mr-2"
          @click="prev"
        >
          Prev
        </button>
        <button
          :disabled="projects.length < limit"
          class="px-3 py-1 rounded bg-gray-700"
          @click="next"
        >
          Next
        </button>
      </div>
      <div class="text-white/80">
        Showing {{ skip + 1 }} - {{ skip + projects.length }} of {{ total }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const projects = ref([])
const q = ref('')
const skip = ref(0)
const limit = ref(50)
const total = ref(0)
const error = ref('')

const auth = useAuthStore()
const ui = useUiStore()

function isAdmin() {
  const me = auth.user
  if (!me) return false
  return me.role === 'admin' || me.role === 'globaladmin' || me.role === 'superadmin'
}

function isGlobalAdmin() {
  const me = auth.user
  if (!me) return false
  return me.role === 'globaladmin' || me.role === 'superadmin'
}

const totalPages = computed(() => {
  const t = Number(total.value) || 0
  const l = Number(limit.value) || 1
  return Math.max(1, Math.ceil(t / l))
})

const currentPage = computed(() => {
  return Math.floor((skip.value || 0) / (limit.value || 1)) + 1
})

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (q.value) params.q = q.value
    const { data } = await http.get('/api/admin/projects', { params })
    projects.value = data.projects || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.message || String(err)
    projects.value = []
  }
}

function goToPage(n) {
  const p = Math.min(Math.max(1, n || 1), totalPages.value)
  skip.value = (p - 1) * limit.value
  load()
}

function prev() { goToPage(currentPage.value - 1) }
function next() { goToPage(currentPage.value + 1) }

function displayStatus(p) {
  if (!p) return ''
  const s = (p.status || '').toString()
  if (p.deleted || s === 'Deleted') return 'Deleted'
  if (s === 'Archived') return 'Archived'
  if (!p.isActive || s === 'Inactive') return 'Inactive'
  return 'Active'
}

function statusBadgeClass(p) {
  try {
    const s = (p && p.status) ? String(p.status) : ''
    if (p && (p.deleted || s === 'Deleted')) return 'bg-red-500 text-white'
    if (s === 'Archived') return 'bg-gray-600 text-white'
    if (p && (!p.isActive || s === 'Inactive')) return 'bg-white/10 text-white/80'
    return 'bg-yellow-500 text-black'
  } catch (e) { return 'bg-white/10 text-white/80' }
}

async function confirmSoftDelete(p) {
  const ok = await inlineConfirm({ title: 'Delete project', message: `Soft-delete project ${p.name || p.title || p._id}? This keeps the record but marks it deleted.`, confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  try {
    await http.patch(`/api/admin/projects/${encodeURIComponent(p._id)}`, { deleted: true })
    ui.showSuccess('Project soft-deleted')
    await load()
  } catch (err) {
    console.error('soft delete project error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete project')
  }
}

load()
</script>

<style scoped>
</style>
