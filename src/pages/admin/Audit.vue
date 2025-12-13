<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Audit' }]" />

    <div class="mt-6 mb-4 flex gap-2 items-center">
      <input
        v-model="actionType"
        placeholder="Action type (e.g. user.update)"
        class="p-2 rounded bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
      >
      <input
        v-model="targetId"
        placeholder="Target ID (user or project id)"
        class="p-2 rounded bg-white/5 border border-white/10 text-white flex-1 placeholder:text-gray-400"
        @keyup.enter="load"
      >
      <button
        class="px-3 py-1 rounded bg-indigo-600"
        @click="load"
      >
        Search
      </button>
    </div>

    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <label class="text-white/80">Per page</label>
        <select
          v-model.number="limit"
          class="rounded bg-white/5 p-1 text-white border border-white/10"
          @change="onLimitChange"
        >
          <option :value="10">
            10
          </option>
          <option :value="25">
            25
          </option>
          <option :value="50">
            50
          </option>
          <option :value="100">
            100
          </option>
        </select>
      </div>

      <div class="text-white/80">
        Page {{ currentPage }} / {{ totalPages }}
      </div>

      <div class="flex items-center gap-2">
        <button
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded bg-gray-700"
          @click="goToPage(1)"
        >
          First
        </button>
        <button
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded bg-gray-700"
          @click="prev"
        >
          Prev
        </button>
        <button
          :disabled="currentPage === totalPages"
          class="px-3 py-1 rounded bg-gray-700"
          @click="next"
        >
          Next
        </button>
        <button
          :disabled="currentPage === totalPages"
          class="px-3 py-1 rounded bg-gray-700"
          @click="goToPage(totalPages)"
        >
          Last
        </button>
      </div>
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
            When
          </th>
          <th class="p-2">
            Actor
          </th>
          <th class="p-2">
            Action
          </th>
          <th class="p-2">
            Target
          </th>
          <th class="p-2">
            Details
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="e in entries"
          :key="e._id"
          class="border-t border-white/5"
        >
          <td class="p-2 text-white/80">
            {{ formatDate(e.createdAt) }}
          </td>
          <td class="p-2 text-white">
            {{ e.actorEmail || e.actorId || 'system' }}
          </td>
          <td class="p-2 text-white/80">
            {{ e.actionType }}
          </td>
          <td class="p-2 text-white/80">
            {{ e.targetUserId || '-' }}
          </td>
          <td class="p-2 text-white/80">
            <button
              class="px-2 py-1 rounded bg-gray-700 text-white text-sm"
              @click="openDetails(e)"
            >
              View
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="mt-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          :disabled="skip === 0"
          class="px-3 py-1 rounded bg-gray-700"
          @click="prev"
        >
          Prev
        </button>
        <button
          :disabled="entries.length < limit"
          class="px-3 py-1 rounded bg-gray-700"
          @click="next"
        >
          Next
        </button>
      </div>
      <div class="text-white/80">
        Showing {{ skip + 1 }} - {{ skip + entries.length }} of {{ total }}
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
        <pre class="text-sm whitespace-pre-wrap text-white max-h-[60vh] overflow-auto">{{ selected ? pretty(selected.details) : '' }}</pre>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import http from '../../utils/http'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'

const entries = ref([])
const actionType = ref('')
const targetId = ref('')
const skip = ref(0)
const limit = ref(25)
const total = ref(0)
const error = ref('')

const modalOpen = ref(false)
const selected = ref(null)

const totalPages = computed(() => Math.max(1, Math.ceil((Number(total.value) || 0) / (Number(limit.value) || 1))))
const currentPage = computed(() => Math.floor((skip.value || 0) / (limit.value || 1)) + 1)

function formatDate(s) { try { return new Date(s).toLocaleString() } catch (e) { return String(s) } }
function pretty(d) { try { return JSON.stringify(d, null, 2) } catch (e) { return String(d) } }

async function load() {
  try {
    error.value = ''
    const params = { skip: skip.value, limit: limit.value }
    if (actionType.value) params.actionType = actionType.value
    if (targetId.value) params.targetUserId = targetId.value
    const { data } = await http.get('/api/admin/audit', { params })
    entries.value = data.entries || []
    total.value = data.total || 0
  } catch (err) {
    error.value = err?.message || String(err)
    entries.value = []
  }
}

function goToPage(n) { const p = Math.min(Math.max(1, n || 1), totalPages.value); skip.value = (p - 1) * limit.value; load() }
function prev() { goToPage(currentPage.value - 1) }
function next() { goToPage(currentPage.value + 1) }
function onLimitChange() { skip.value = 0; load() }

function openDetails(e) { selected.value = e; modalOpen.value = true }

load()
</script>

<style scoped>
</style>
