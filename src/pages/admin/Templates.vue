<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Templates' }]">
      <template #middle>
        <SearchPill
          v-model="q"
          placeholder="Search templates"
          @enter="load"
          @clear="clearAndReload"
        />
      </template>
    </BreadCrumbs>

    <div class="mt-4 mb-4 flex gap-2 items-center">
      <router-link
        v-if="isAdmin()"
        :to="{ name: 'admin-templates-edit', params: { id: 'new' } }"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white"
        title="Create new template"
        aria-label="Create new template"
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
            Tag
          </th>
          <th class="p-2">
            Title
          </th>
          <th class="p-2">
            Type
          </th>
          <th class="p-2">
            System
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
          class="border-t border-white/5"
        >
          <td class="p-2 text-white">
            {{ t.tag }}
          </td>
          <td class="p-2 text-white/80">
            {{ t.title }}
          </td>
          <td class="p-2 text-white/80">
            {{ t.type || '—' }}
          </td>
          <td class="p-2 text-white/80">
            {{ t.system || '—' }}
          </td>
          <td class="p-2">
            <div class="flex items-center gap-2">
              <router-link
                v-if="isAdmin()"
                :to="{ name: 'admin-templates-edit', params: { id: t._id } }"
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
          :disabled="templates.length < limit"
          class="px-3 py-1 rounded bg-gray-700"
          @click="next"
        >
          Next
        </button>
      </div>
      <div class="text-white/80">
        Showing {{ skip + 1 }} - {{ skip + templates.length }} of {{ total }}
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
import SearchPill from '../../components/SearchPill.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'

const templates = ref([])
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

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (q.value) params.q = q.value
    const { data } = await http.get('/api/admin/templates', { params })
    templates.value = data.templates || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.message || String(err)
    templates.value = []
  }
}

function clearAndReload() {
  q.value = ''
  skip.value = 0
  load()
}

function prev() { skip.value = Math.max(0, skip.value - limit.value); load() }
function next() { skip.value = skip.value + limit.value; load() }

async function onDelete(t) {
  try {
    const id = String(t?._id || '')
    if (!id) return
    const ok = await inlineConfirm({
      title: 'Delete template',
      message: `Delete "${t?.tag || t?.title || 'template'}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })
    if (!ok) return
    await http.delete(`/api/admin/templates/${id}`)
    ui.showSuccess('Template deleted')
    // Keep pagination stable if we deleted the last item on the page.
    if (templates.value.length === 1 && skip.value > 0) skip.value = Math.max(0, skip.value - limit.value)
    await load()
  } catch (err) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to delete template')
  }
}

load()
</script>

<style scoped>
</style>
