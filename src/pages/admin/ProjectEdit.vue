<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Projects', to: '/app/admin/projects' }, { text: id === 'new' ? 'Create Project' : 'Edit Project' }]" />

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

    <div
      v-else
      class="mt-6"
    >
      <div class="mb-4">
        <label class="block text-white/80">Title</label>
        <input
          v-model="project.title"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
        >
      </div>

      <div class="mb-4">
        <label class="block text-white/80">Name</label>
        <input
          v-model="project.name"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
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
          v-if="isAdmin()"
          class="px-4 py-2 rounded bg-green-600"
          @click="save"
        >
          Save
        </button>
        <button
          v-if="isGlobalAdmin()"
          class="ml-2 px-4 py-2 rounded bg-red-600"
          @click="confirmSoftDelete"
        >
          Delete
        </button>
        <router-link
          to="/admin/projects"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../../utils/http'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const project = ref(null)
const audits = ref([])
const modalOpen = ref(false)
const selectedAudit = ref(null)

function openAudit(a) { selectedAudit.value = a; modalOpen.value = true }

const ui = useUiStore()
const error = ref('')

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
  try {
    const { data } = await http.get(`/api/admin/projects/${id}`)
    project.value = data
    await loadAudits()
  } catch (err) {
    error.value = err?.message || String(err)
  }
}

async function save() {
  try {
    await http.patch(`/api/admin/projects/${id}`, project.value)
    ui.showSuccess('Project updated')
    router.push({ name: 'admin-projects' })
  } catch (err) {
    error.value = err?.message || String(err)
    ui.showError(error.value)
  }
}

onMounted(load)

async function loadAudits() {
  try {
    if (!id) { audits.value = []; return }
    const { data } = await http.get('/api/admin/audit', { params: { targetUserId: id, limit: 50, skip: 0 } })
    audits.value = data.entries || []
  } catch (err) {
    console.error('failed to load project audits', err)
    audits.value = []
  }
}

function pretty(d) { try { return JSON.stringify(d, null, 2) } catch (e) { return String(d) } }

function formatDate(s) { try { return new Date(s).toLocaleString() } catch (e) { return String(s) } }

async function confirmSoftDelete() {
  const ok = await inlineConfirm({ title: 'Delete project', message: 'Soft-delete this project? This will keep the database record but mark the project as deleted.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  try {
    await http.patch(`/api/admin/projects/${id}`, { deleted: true })
    ui.showSuccess('Project soft-deleted')
    router.push({ name: 'admin-projects' })
  } catch (err) {
    console.error('soft delete error', err)
    ui.showError(err?.response?.data?.error || 'Failed to delete project')
  }
}
</script>

<style scoped>
</style>

<style scoped>
</style>
