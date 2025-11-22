<template>
  <div class="p-4">
    <BreadCrumbs :items="crumbs" />
    <!-- Title removed: breadcrumbs provide the page title -->

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

    <div
      v-else
      class="mt-6"
    >
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
          v-if="isAdmin()"
          class="px-4 py-2 rounded bg-green-600"
          @click="save"
        >
          {{ id === 'new' ? 'Create' : 'Save' }}
        </button>
        <button
          v-if="id !== 'new' && isGlobalAdmin()"
          class="ml-2 px-4 py-2 rounded bg-red-600"
          @click="softDelete"
        >
          Delete
        </button>
        <button
          v-if="id !== 'new' && isGlobalAdmin()"
          class="ml-2 px-4 py-2 rounded bg-yellow-600"
          @click="sendReset"
        >
          Send reset
        </button>
        <router-link
          to="/admin/users"
          class="ml-2 px-4 py-2 rounded bg-gray-700"
        >
          Back
        </router-link>
      </div>
      <div class="mt-8">
        <h3 class="text-lg mb-2">
          Audit trail
        </h3>
        <div
          v-if="audits.length === 0"
          class="text-white/70"
        >
          No audit records.
        </div>
        <div v-else>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-white/80">
                <th class="p-2">
                  When
                </th>
                <th class="p-2">
                  Actor
                </th>
                <th class="p-2">
                  Action
                </th>
                <th class="p-2">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in audits"
                :key="a._id"
                class="border-t border-white/5"
              >
                <td class="p-2 text-white/80">
                  {{ formatDate(a.createdAt) }}
                </td>
                <td class="p-2 text-white">
                  {{ a.actorEmail || a.actorId || 'system' }}
                </td>
                <td class="p-2 text-white/80">
                  {{ a.actionType }}
                </td>
                <td class="p-2 text-white/80">
                  <button
                    class="px-2 py-1 rounded bg-gray-700 text-white text-sm"
                    @click="openAudit(a)"
                  >
                    View details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <Modal
    v-model:model-value="modalOpen"
    panel-class="max-w-3xl"
    main-class="max-h-[70vh] overflow-auto"
  >
    <template #header>
      <div class="text-white">
        Audit details
      </div>
    </template>
    <div>
      <pre class="text-sm whitespace-pre-wrap text-white max-h-[60vh] overflow-auto">{{ selectedAudit ? pretty(selectedAudit.details) : '' }}</pre>
    </div>
  </Modal>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { useRoute, useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const user = ref(null)
const error = ref('')
const audits = ref([])
const modalOpen = ref(false)
const selectedAudit = ref(null)

function openAudit(a) {
  selectedAudit.value = a
  modalOpen.value = true
}

const ui = useUiStore()

const auth = useAuthStore()

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

async function load() {
  if (id === 'new') {
    user.value = { firstName: '', lastName: '', email: '', role: 'user', password: '' }
    return
  }
  try {
    const { data } = await http.get(`/api/admin/users/${id}`)
    user.value = data
    await loadAudits()
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

async function save() {
  try {
    if (id === 'new') {
      // create
      const payload = Object.assign({}, user.value)
      // backend may ignore password if not allowed; include if provided
      await http.post('/api/admin/users', payload)
    } else {
      await http.patch(`/api/admin/users/${id}`, user.value)
    }
    ui.showSuccess(id === 'new' ? 'User created' : 'User updated')
    router.push({ name: 'admin-users' })
    // refresh audits after save
    await loadAudits()
  } catch (err) {
    error.value = err?.message || String(err)
    ui.showError(error.value)
  }
}

async function softDelete() {
  const ok = await inlineConfirm({ title: 'Delete user', message: 'Soft-delete this user? This will keep the database record but mark the user as deleted.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  try {
    await http.patch(`/api/admin/users/${id}`, { deleted: true })
    ui.showSuccess('User soft-deleted')
    router.push({ name: 'admin-users' })
    await loadAudits()
  } catch (err) {
    console.error('soft delete error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete user')
  }
}

async function sendReset() {
  try {
    await http.post(`/api/admin/users/${encodeURIComponent(id)}/send-reset`)
    ui.showSuccess('Password reset email queued')
  } catch (err) {
    console.error('send reset error', err)
    ui.showError(err?.response?.data?.error || 'Failed to send reset email')
  }
}

onMounted(load)

async function loadAudits() {
  try {
    if (id === 'new') { audits.value = []; return }
    const { data } = await http.get('/api/admin/audit', { params: { targetUserId: id, limit: 50, skip: 0 } })
    audits.value = data.entries || []
  } catch (err) {
    console.error('failed to load audits', err)
    audits.value = []
  }
}

function pretty(d) {
  try { return JSON.stringify(d, null, 2) } catch (e) { return String(d) }
}

function formatDate(s) {
  try { return new Date(s).toLocaleString() } catch (e) { return String(s) }
}

const crumbs = computed(() => ([{ text: 'Admin', to: '/admin' }, { text: 'Users', to: '/admin/users' }, { text: id === 'new' ? 'Create User' : 'Edit User' }]))
</script>

<style scoped>
</style>
