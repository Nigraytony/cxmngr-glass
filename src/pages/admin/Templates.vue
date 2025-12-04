<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/admin' }, { text: 'Templates' }]" />
    <h2 class="text-2xl mb-4">
      Templates
    </h2>

    <div class="mb-4 flex gap-2">
      <input
        v-model="q"
        placeholder="Search templates"
        class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
        @keyup.enter="load"
      >
      <button
        class="px-3 py-1 rounded bg-indigo-600"
        @click="load"
      >
        Search
      </button>
      <router-link
        v-if="isAdmin()"
        to="/admin/templates/new"
        class="ml-2 px-3 py-1 rounded bg-green-600"
      >
        New
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
            Title
          </th>
          <th class="p-2">
            Project
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
            {{ t.title }}
          </td>
          <td class="p-2 text-white/80">
            {{ t.projectId }}
          </td>
          <td class="p-2">
            <router-link
              v-if="isAdmin()"
              :to="{ name: 'admin-templates-edit', params: { id: t._id } }"
              class="px-2 py-1 rounded bg-gray-700"
            >
              Edit
            </router-link>
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
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const templates = ref([])
const q = ref('')
const skip = ref(0)
const limit = ref(50)
const total = ref(0)
const error = ref('')

const auth = useAuthStore()

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

function prev() { skip.value = Math.max(0, skip.value - limit.value); load() }
function next() { skip.value = skip.value + limit.value; load() }

load()
</script>

<style scoped>
</style>
