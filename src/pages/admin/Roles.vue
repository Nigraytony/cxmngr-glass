<template>
  <section class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/admin' }, { text: 'Roles & Permissions' }]" />
    <h2 class="text-lg font-semibold text-white mb-4">
      Roles & Permissions
    </h2>

    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-3 bg-white/5 rounded">
        <h3 class="font-medium mb-2">
          Create role
        </h3>
        <div class="space-y-2">
          <input
            v-model="form.name"
            placeholder="Role name"
            class="w-full p-2 rounded bg-white/6"
          >
          <input
            v-model="form.description"
            placeholder="Description"
            class="w-full p-2 rounded bg-white/6"
          >
          <select
            v-model="form.scope"
            class="w-full p-2 rounded bg-white/6"
          >
            <option
              value="global"
            >
              global
            </option>
            <option
              value="project"
            >
              project
            </option>
          </select>
          <input
            v-if="form.scope === 'project'"
            v-model="form.projectId"
            placeholder="Project ID (for project-scoped)"
            class="w-full p-2 rounded bg-white/6"
          >
          <textarea
            v-model="form.permissionsText"
            placeholder="Permissions (one per line)"
            class="w-full p-2 rounded bg-white/6 h-28"
          />
          <div class="text-right">
            <button
              v-if="isAdmin()"
              class="px-3 py-1 rounded bg-white/6"
              @click="createRole"
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <div class="p-3 bg-white/5 rounded">
        <h3 class="font-medium mb-2">
          Existing roles
        </h3>
        <div v-if="loading">
          Loading...
        </div>
        <div v-else>
          <ul class="space-y-2">
            <li
              v-for="r in roles"
              :key="r._id || r.id"
              class="p-2 bg-white/3 rounded flex items-start justify-between gap-3"
            >
              <div class="min-w-0">
                <div class="font-medium truncate">
                  {{ r.name }} <span class="text-xs text-white/60">({{ r.scope }})</span>
                </div>
                <div class="text-xs text-white/60 truncate">
                  {{ r.description }}
                </div>
                <div class="text-xs mt-1">
                  <template v-if="r.permissions && r.permissions.length">
                    <span class="text-white/70">Permissions:</span>
                    <span class="text-xs text-white/60">{{ r.permissions.join(', ') }}</span>
                  </template>
                  <template v-else>
                    <span class="text-xs text-white/60">No permissions</span>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="isAdmin()"
                  class="px-2 py-1 bg-red-600/20 text-red-300 rounded"
                  @click="deleteRole(r._id)"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const ui = useUiStore()
const roles = ref([])
const loading = ref(false)
const form = ref({ name: '', description: '', scope: 'global', projectId: '', permissionsText: '' })

const auth = useAuthStore()

function isAdmin() {
  const me = auth.user
  if (!me) return false
  return me.role === 'admin' || me.role === 'globaladmin' || me.role === 'superadmin'
}

async function load() {
  loading.value = true
  try {
    const { data } = await http.get('/api/admin/roles')
    roles.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('load roles error', err)
    ui.showError(err?.response?.data?.error || 'Failed to load roles')
  } finally { loading.value = false }
}

async function createRole() {
  try {
      const payload = {
      name: form.value.name,
      description: form.value.description,
      scope: form.value.scope,
      projectId: form.value.scope === 'project' ? form.value.projectId : undefined,
      permissions: form.value.permissionsText ? form.value.permissionsText.split('\n').map(s => s.trim()).filter(Boolean) : []
    }
      await http.post('/api/admin/roles', payload)
    ui.showSuccess('Role created')
    form.value = { name: '', description: '', scope: 'global', projectId: '', permissionsText: '' }
    await load()
  } catch (err) {
    console.error('create role error', err)
    ui.showError(err?.response?.data?.error || 'Failed to create role')
  }
}


async function deleteRole(id) {
  if (!confirm('Delete this role?')) return
  try {
    await http.delete(`/api/admin/roles/${id}`)
    ui.showSuccess('Role deleted')
    await load()
  } catch (err) {
    console.error('delete role error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete role')
  }
}

onMounted(() => { load() })
</script>

<style scoped>
/* minimal styling — relies on Tailwind classes in template */
</style>
