<template>
  <div class="p-4">
    <h2 class="text-2xl mb-4">
      Edit Project
    </h2>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div
      v-if="!project"
      class="text-white/70"
    >
      Loading...
    </div>

    <div v-else>
      <div class="mb-4">
        <label class="block text-white/80">Title</label>
        <input
          v-model="project.title"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
        >
      </div>

      <div class="mb-4">
        <label class="block text-white/80">Name</label>
        <input
          v-model="project.name"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
        >
      </div>

      <div class="mb-4">
        <label class="inline-flex items-center gap-2 text-white/80">
          <input
            v-model="project.isActive"
            type="checkbox"
            class="form-checkbox"
          >
          Active
        </label>
      </div>

      <div>
        <button
          class="px-4 py-2 rounded bg-green-600"
          @click="save"
        >
          Save
        </button>
        <router-link
          to="/admin/projects"
          class="ml-2 px-4 py-2 rounded bg-gray-700"
        >
          Back
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { http } from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const project = ref(null)
const error = ref('')

async function load() {
  try {
    const { data } = await http.get(`/api/admin/projects/${id}`, { headers: getAuthHeaders() })
    Object.assign(project, data)
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

async function save() {
  try {
    await http.patch(`/api/admin/projects/${id}`, project, { headers: getAuthHeaders() })
    router.push({ name: 'admin-projects' })
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

onMounted(load)
</script>

<style scoped>
</style>
