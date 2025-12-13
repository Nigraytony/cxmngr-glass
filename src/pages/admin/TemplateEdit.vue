<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Templates', to: '/app/admin/templates' }, { text: 'Edit Template' }]" />
    <h2 class="text-2xl mb-4">
      Edit Template
    </h2>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div
      v-if="!template"
      class="text-white/70"
    >
      Loading...
    </div>

    <div v-else>
      <div class="mb-4">
        <label class="block text-white/80">Title</label>
        <input
          v-model="template.title"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
        >
      </div>

      <div class="mb-4">
        <label class="block text-white/80">Body</label>
        <textarea
          v-model="template.body"
          rows="8"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
        />
      </div>

      <div>
        <button
          v-if="isAdmin()"
          class="px-4 py-2 rounded bg-green-600"
          @click="save"
        >
          Save
        </button>
        <router-link
          to="/admin/templates"
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
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const template = ref(null)
const error = ref('')

const auth = useAuthStore()

function isAdmin() {
  const me = auth.user
  if (!me) return false
  return me.role === 'admin' || me.role === 'globaladmin' || me.role === 'superadmin'
}

async function load() {
  try {
    const { data } = await http.get(`/api/admin/templates/${id}`)
    Object.assign(template, data)
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

async function save() {
  try {
    if (id === 'new') {
      await http.post('/api/admin/templates', template)
    } else {
      await http.patch(`/api/admin/templates/${id}`, template)
    }
    router.push({ name: 'admin-templates' })
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

onMounted(load)
</script>

<style scoped>
</style>
