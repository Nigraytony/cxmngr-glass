<template>
  <div class="p-4">
    <h2 class="text-2xl mb-4">
      Projects
    </h2>

    <div class="mb-4 flex gap-2">
      <input
        v-model="q"
        placeholder="Search projects"
        class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
        @keyup.enter="load"
      >
      <button
        class="px-3 py-1 rounded bg-indigo-600"
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
          <td class="p-2 text-white/80">
            {{ p.isActive ? 'yes' : 'no' }}
          </td>
          <td class="p-2">
            <router-link
              :to="{ name: 'admin-projects-edit', params: { id: p._id } }"
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
import { ref } from 'vue'
import { http } from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'

const projects = ref([])
const q = ref('')
const skip = ref(0)
const limit = ref(50)
const total = ref(0)
const error = ref('')

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (q.value) params.q = q.value
    const { data } = await http.get('/api/admin/projects', { params, headers: getAuthHeaders() })
    projects.value = data.projects || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.message || String(err)
    projects.value = []
  }
}

function prev() { skip.value = Math.max(0, skip.value - limit.value); load() }
function next() { skip.value = skip.value + limit.value; load() }

load()
</script>

<style scoped>
</style>
