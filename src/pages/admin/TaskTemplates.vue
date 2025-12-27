<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Task Templates' }]" />
    <div class="mt-4 mb-4 flex flex-wrap gap-2 items-center">
      <router-link
        v-if="isAdmin()"
        :to="{ name: 'admin-task-templates-edit', params: { id: 'new' } }"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
        title="New task template"
        aria-label="New task template"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
        </svg>
      </router-link>
      <input
        v-model="q"
        placeholder="Search task templates"
        class="p-2 rounded bg-white/5 border border-white/10 text-white w-full md:w-96 placeholder:text-gray-400"
        @keyup.enter="load"
      >
      <select
        v-model="activeFilter"
        class="p-2 rounded bg-white/5 border border-white/10 text-white"
        @change="() => { skip = 0; load() }"
      >
        <option value="">
          All
        </option>
        <option value="true">
          Active
        </option>
        <option value="false">
          Inactive
        </option>
      </select>
      <button
        class="px-3 py-2 rounded bg-indigo-600 text-white"
        @click="load"
      >
        Search
      </button>
    </div>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div class="overflow-x-auto rounded-md border border-white/10">
      <table class="w-full text-left border-collapse text-sm">
        <thead class="bg-white/5 text-white/80">
          <tr>
            <th class="p-2">
              Name
            </th>
            <th class="p-2">
              Category
            </th>
            <th class="p-2">
              Version
            </th>
            <th class="p-2">
              Status
            </th>
            <th class="p-2">
              Updated
            </th>
            <th class="p-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in templates"
            :key="t._id"
            class="border-t border-white/10"
          >
            <td class="p-2 text-white">
              {{ t.name }}
            </td>
            <td class="p-2 text-white/80">
              {{ t.category || '—' }}
            </td>
            <td class="p-2 text-white/80">
              {{ t.version || '—' }}
            </td>
            <td class="p-2">
              <span :class="t.isActive ? 'text-emerald-300' : 'text-white/60'">
                {{ t.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="p-2 text-white/70">
              {{ fmtDate(t.updatedAt || t.createdAt) }}
            </td>
            <td class="p-2">
              <div class="flex items-center gap-2">
                <router-link
                  v-if="isAdmin()"
                  :to="{ name: 'admin-task-templates-edit', params: { id: t._id } }"
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90"
                  title="Edit"
                  aria-label="Edit"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                    aria-hidden
                  >
                    <path
                      d="M12 20h9"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </router-link>
                <button
                  v-if="isAdmin()"
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30"
                  title="Delete"
                  aria-label="Delete"
                  @click="onDelete(t)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                    aria-hidden
                  >
                    <path
                      d="M3 6h18"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M8 6l1-2h6l1 2"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="14"
                      rx="1.5"
                      stroke-width="1.5"
                    />
                    <path
                      d="M10 10v6M14 10v6"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="templates.length === 0">
            <td
              colspan="6"
              class="p-4 text-white/70"
            >
              No task templates found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          :disabled="skip === 0"
          class="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
          @click="prev"
        >
          Prev
        </button>
        <button
          :disabled="templates.length < limit"
          class="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
          @click="next"
        >
          Next
        </button>
      </div>
      <div class="text-white/70 text-sm">
        Showing {{ total ? (skip + 1) : 0 }} - {{ skip + templates.length }} of {{ total }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'

const templates = ref([])
const q = ref('')
const activeFilter = ref('true')
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

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) }
}

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (q.value) params.q = q.value
    if (activeFilter.value !== '') params.active = activeFilter.value
    const { data } = await http.get('/api/admin/task-templates', { params })
    templates.value = data.templates || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || String(err)
    templates.value = []
    total.value = 0
  }
}

function prev() { skip.value = Math.max(0, skip.value - limit.value); load() }
function next() { skip.value = skip.value + limit.value; load() }

async function onDelete(t) {
  try {
    const id = String(t?._id || '')
    if (!id) return
    const ok = await inlineConfirm({
      title: 'Delete task template',
      message: `Delete "${t?.name || 'task template'}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })
    if (!ok) return
    await http.delete(`/api/admin/task-templates/${id}`)
    ui.showSuccess('Task template deleted')
    if (templates.value.length === 1 && skip.value > 0) skip.value = Math.max(0, skip.value - limit.value)
    await load()
  } catch (err) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to delete task template')
  }
}

load()
</script>
