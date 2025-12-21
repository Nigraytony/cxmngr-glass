<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Users' }]" />

    <div class="mt-4 mb-4 flex gap-2 items-center">
      <router-link
        v-if="isGlobalAdmin()"
        :to="{ name: 'admin-users-edit', params: { id: 'new' } }"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white"
        title="Create new user"
        aria-label="Create new user"
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
        placeholder="Search email or name"
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
            Email
          </th>
          <th class="p-2">
            Role
          </th>
          <th class="p-2">
            Status
          </th>
          <th class="p-2">
            Projects
          </th>
          <th class="p-2">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="u in users"
          :key="u._id"
          class="border-t border-white/5"
        >
          <td class="p-2 text-white">
            {{ u.firstName }} {{ u.lastName }}
          </td>
          <td class="p-2 text-white/80 break-all">
            {{ u.email }}
          </td>
          <td class="p-2 text-white/80">
            {{ u.role }}
          </td>
          <td class="p-2 text-sm">
            <span :class="statusBadgeClass(u) + ' text-xs px-2 py-0.5 rounded-full'">{{ displayStatus(u) }}</span>
          </td>
          <td class="p-2 text-white/80">
            {{ (u.projects || []).length }}
          </td>
          <td class="p-2">
            <router-link
              v-if="isAdmin()"
              :to="{ name: 'admin-users-edit', params: { id: u._id } }"
              class="px-2 py-1 rounded bg-gray-700 mr-2"
            >
              Edit
            </router-link>
            <button
              v-if="isGlobalAdmin()"
              class="px-2 py-1 rounded bg-red-600 mr-2"
              @click="confirmSoftDelete(u)"
            >
              Delete
            </button>
            <button
              v-if="isGlobalAdmin()"
              class="px-2 py-1 rounded bg-yellow-600"
              @click="sendReset(u)"
            >
              Send reset
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="mt-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          :disabled="skip === 0"
          :aria-disabled="skip === 0"
          title="Previous"
          aria-label="Previous page"
          class="px-3 py-1 rounded bg-gray-700 mr-2 flex items-center justify-center"
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
          :disabled="users.length < limit"
          :aria-disabled="users.length < limit"
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
      </div>
      <div class="text-white/80">
        Showing {{ skip + 1 }} - {{ skip + users.length }} of {{ total }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'

const users = ref([])
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

async function confirmSoftDelete(u) {
  const ok = await inlineConfirm({ title: 'Delete user', message: `Soft-delete user ${u.email || u._id}? This will keep the database record but mark the user as deleted.`, confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  await softDeleteUser(u._id)
}

async function softDeleteUser(id) {
  try {
    // Soft-delete via patch flag so the DB record remains
    await http.patch(`/api/admin/users/${encodeURIComponent(id)}`, { deleted: true })
    ui.showSuccess('User soft-deleted')
    await load()
  } catch (err) {
    console.error('soft delete error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete user')
  }
}

async function sendReset(u) {
  try {
    await http.post(`/api/admin/users/${encodeURIComponent(u._id)}/send-reset`)
    ui.showSuccess('Password reset email queued')
  } catch (err) {
    console.error('send reset error', err)
    ui.showError(err?.response?.data?.error || 'Failed to send reset email')
  }
}

const totalPages = computed(() => {
  const t = Number(total.value) || 0
  const l = Number(limit.value) || 1
  return Math.max(1, Math.ceil(t / l))
})

const currentPage = computed(() => {
  return Math.floor((skip.value || 0) / (limit.value || 1)) + 1
})

function goToPage(n) {
  const p = Math.min(Math.max(1, n || 1), totalPages.value)
  skip.value = (p - 1) * limit.value
  load()
}

function onLimitChange() {
  skip.value = 0
  load()
}

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (q.value) params.q = q.value
    const { data } = await http.get('/api/admin/users', { params })
    users.value = data.users || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.message || String(err)
    users.value = []
  }
}

function prev() { goToPage(currentPage.value - 1) }
function next() { goToPage(currentPage.value + 1) }

function displayStatus(u) {
  if (!u) return ''
  const s = (u.status || '').toString()
  if (u.deleted || s === 'Deleted') return 'Deleted'
  if (s === 'Invited') return 'Invited'
  if (u.isActive === false || s === 'Inactive') return 'Inactive'
  if (s === 'Pending') return 'Pending'
  return 'Active'
}

function statusBadgeClass(u) {
  // High priority style for Deleted, Medium for Active
  try {
    const s = (u && u.status) ? String(u.status) : ''
    if (u && (u.deleted || s === 'Deleted')) return 'bg-red-500 text-white'
    if (s === 'Invited') return 'bg-sky-500 text-white'
    if (u && (u.isActive === false || s === 'Inactive')) return 'bg-gray-500 text-white'
    if (s === 'Pending') return 'bg-amber-500 text-black'
    // Active default -> Medium priority (yellow)
    return 'bg-yellow-500 text-black'
  } catch (e) {
    return 'bg-white/10 text-white/80'
  }
}

load()
</script>

<style scoped>
</style>
