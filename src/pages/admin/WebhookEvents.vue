<template>
  <div class="p-4">
    <h2 class="text-2xl mb-4">
      Webhook Events
    </h2>
    <div class="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
      <div>
        <label class="block text-white/80">Status</label>
        <select
          v-model="filter.status"
          class="rounded-lg p-2 bg-white/5 border border-white/10 text-white"
        >
          <option value="">
            All
          </option>
          <option value="processing">
            processing
          </option>
          <option value="processed">
            processed
          </option>
          <option value="failed">
            failed
          </option>
        </select>
      </div>
      <div>
        <label class="block text-white/80">Date from</label>
        <input
          v-model="filter.date_from"
          type="date"
          class="rounded-lg p-2 bg-white/5 border border-white/10 text-white"
        >
      </div>
      <div>
        <label class="block text-white/80">Date to</label>
        <input
          v-model="filter.date_to"
          type="date"
          class="rounded-lg p-2 bg-white/5 border border-white/10 text-white"
        >
      </div>
      <div class="flex items-end">
        <button
          class="ml-2 px-3 py-1 rounded bg-indigo-600"
          @click="load"
        >
          Refresh
        </button>
      </div>
    </div>
    <table class="w-full text-left border-collapse">
      <div
        v-if="error"
        class="mb-4 text-red-400"
      >
        {{ error }}
      </div>
      <thead>
        <tr class="text-white/80">
          <th class="p-2">
            ID
          </th>
          <th class="p-2">
            Type
          </th>
          <th class="p-2">
            Status
          </th>
          <th class="p-2">
            Received
          </th>
          <th class="p-2">
            Processed
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="e in events"
          :key="e.eventId"
        >
          <tr class="border-t border-white/5">
            <td class="p-2 text-sm text-white break-all">
              {{ e.eventId }}
            </td>
            <td class="p-2 text-sm text-white/80">
              {{ e.type }}
            </td>
            <td class="p-2 text-sm">
              <span :class="e.status === 'failed' ? 'text-red-400' : 'text-white'">{{ e.status }}</span>
            </td>
            <td class="p-2 text-sm text-white/80">
              {{ formatDate(e.receivedAt) }}
            </td>
            <td class="p-2 text-sm text-white/80">
              {{ formatDate(e.processedAt) }}
            </td>
            <td class="p-2 text-sm">
              <button
                class="mr-2 px-2 py-1 rounded bg-gray-700"
                @click="toggleExpand(e)"
              >
                {{ expanded[e.eventId] ? 'Hide' : 'Show' }}
              </button>
              <button
                class="px-2 py-1 rounded bg-green-600"
                @click="replay(e)"
              >
                Replay
              </button>
            </td>
          </tr>
          <tr
            v-if="expanded[e.eventId]"
            class="bg-white/2"
          >
            <td
              colspan="6"
              class="p-2 text-xs text-white/70 break-words"
            >
              <pre class="whitespace-pre-wrap">{{ prettyPayload(e.meta && e.meta.raw) }}</pre>
            </td>
          </tr>
        </template>
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
          :disabled="events.length < limit"
          class="px-3 py-1 rounded bg-gray-700"
          @click="next"
        >
          Next
        </button>
      </div>
      <div class="text-white/80">
        Showing {{ skip + 1 }} - {{ skip + events.length }} of {{ total }}
      </div>
    </div>
    
    <!-- Confirmation modal for replay (liquid glass style) -->
    <div
      v-if="showModal"
      class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="w-11/12 max-w-lg p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md shadow-lg text-white">
        <h3 class="text-lg mb-2">
          Confirm replay
        </h3>
        <p class="mb-4">
          Are you sure you want to replay the webhook event <strong>{{ pendingReplay?.eventId }}</strong>? This will re-run processing and may update project billing state.
        </p>
        <div class="flex justify-end">
          <button
            class="mr-3 px-4 py-2 rounded-lg bg-white/6 border border-white/8 text-white hover:bg-white/8"
            @click="cancelReplay"
          >
            Cancel
          </button>
          <button
            :disabled="replayInProgress"
            class="px-4 py-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            @click="performReplay"
          >
            <svg
              v-if="replayInProgress"
              class="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            ><circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            /><path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            /></svg>
            <span>{{ replayInProgress ? 'Replaying...' : 'Confirm replay' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUiStore } from '../../stores/ui'
import { getAuthHeaders } from '../../utils/auth'
import { apiUrl } from '../../utils/api'

const events = ref([])
const filter = ref({ status: '', date_from: '', date_to: '' })
const error = ref('')
const ui = useUiStore()
const expanded = ref({})
const skip = ref(0)
const limit = ref(50)
const total = ref(0)
const showModal = ref(false)
const pendingReplay = ref(null)
const replayInProgress = ref(false)

function authHeaders() {
  return getAuthHeaders()
}

async function load() {
  const q = new URLSearchParams()
  if (filter.value.status) q.set('status', filter.value.status)
  const url = `${apiUrl('/api/admin/webhook-events')}?${q.toString()}`
  try {
    error.value = ''
    const pagedUrl = `${url}&skip=${skip.value}&limit=${limit.value}`
    const res = await fetch(pagedUrl, { headers: authHeaders() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const msg = `Failed to fetch webhook events: ${res.status} ${text}`
      console.error(msg)
      error.value = msg
      events.value = []
      return
    }
    const data = await res.json()
    events.value = data.events || []
    total.value = data.total || 0
  } catch (err) {
    const msg = `Failed to fetch webhook events: ${err && err.message}`
    console.error(msg)
    error.value = msg
    events.value = []
  }
}

function toggleExpand(e) {
  expanded.value[e.eventId] = !expanded.value[e.eventId]
}

function prettyPayload(p) {
  try {
    return JSON.stringify(p, null, 2)
  } catch (e) {
    return String(p)
  }
}

async function replay(e) {
  // Show confirmation modal
  pendingReplay.value = e
  showModal.value = true
}

function cancelReplay() {
  pendingReplay.value = null
  showModal.value = false
}

async function performReplay() {
  if (!pendingReplay.value) return
  try {
    error.value = ''
    replayInProgress.value = true
  const res = await fetch(apiUrl(`/api/admin/webhook-events/${encodeURIComponent(pendingReplay.value.eventId)}/replay`), { method: 'POST', headers: authHeaders() })
    replayInProgress.value = false
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error.value = `Replay failed: ${res.status} ${text}`
      ui.showError(`Replay failed: ${res.status} ${text}`)
      showModal.value = false
      pendingReplay.value = null
      return
    }
    showModal.value = false
    pendingReplay.value = null
    await load()
    ui.showSuccess('Replay queued/processed successfully')
  } catch (err) {
    replayInProgress.value = false
    error.value = `Replay failed: ${err && err.message}`
    ui.showError(`Replay failed: ${err && err.message}`)
    showModal.value = false
    pendingReplay.value = null
  }
}

function prev() {
  skip.value = Math.max(0, skip.value - limit.value)
  load()
}

function next() {
  skip.value = skip.value + limit.value
  load()
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString()
}

load()
</script>

<style scoped>
/* small tweaks to keep table readable */
table td { vertical-align: middle; }
</style>
