<template>
  <div class="p-4">
    <h2 class="text-2xl mb-4">
      Edit User
    </h2>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div
      v-if="!user"
      class="text-white/70"
    >
      Loading...
    </div>

    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-white/80">First name</label>
          <input
            v-model="user.firstName"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
          >
        </div>
        <div>
          <label class="block text-white/80">Last name</label>
          <input
            v-model="user.lastName"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
          >
        </div>
        <div>
          <label class="block text-white/80">Email</label>
          <input
            v-model="user.email"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
          >
        </div>
        <div>
          <label class="block text-white/80">Role</label>
          <select
            v-model="user.role"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
          >
            <option value="user">
              user
            </option>
            <option value="admin">
              admin
            </option>
            <option value="globaladmin">
              globaladmin
            </option>
            <option value="superadmin">
              superadmin
            </option>
          </select>
        </div>
      </div>

      <div class="mt-4">
        <button
          class="px-4 py-2 rounded bg-green-600"
          @click="save"
        >
          Save
        </button>
        <router-link
          to="/admin/users"
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
import { http } from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const user = ref(null)
const error = ref('')

async function load() {
  try {
    const { data } = await http.get(`/api/admin/users/${id}`, { headers: getAuthHeaders() })
    Object.assign(user, data)
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

async function save() {
  try {
    await http.patch(`/api/admin/users/${id}`, user, { headers: getAuthHeaders() })
    router.push({ name: 'admin-users' })
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

onMounted(load)
</script>

<style scoped>
</style>
