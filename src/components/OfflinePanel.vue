<template>
  <div class="fixed bottom-3 left-3 z-50 w-72 rounded-xl border border-white/10 bg-black/70 p-3 text-sm text-white shadow-lg backdrop-blur-xl">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2 font-medium">
        <span :class="['h-2.5 w-2.5 rounded-full', store.isOnline ? 'bg-emerald-400' : 'bg-amber-400']" />
        Offline <span class="text-white/40">beta</span>
      </div>
      <button
        class="text-xs text-white/50 hover:text-white"
        @click="store.setSimulatedOffline(store.isOnline)"
      >
        {{ store.isOnline ? 'Simulate offline' : 'Go online' }}
      </button>
    </div>

    <!-- Not checked out -->
    <div v-if="!store.isCheckedOut">
      <p class="mb-2 text-white/70">
        Project: <span class="text-white">{{ projectName || '—' }}</span>
      </p>
      <button
        class="w-full rounded-md border border-indigo-400/30 bg-indigo-600/70 px-3 py-1.5 font-medium hover:bg-indigo-600/80 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!projectId || !store.isOnline || busy"
        @click="onCheckout"
      >
        {{ busy ? 'Checking out…' : 'Check out for offline' }}
      </button>
      <p
        v-if="!store.isOnline"
        class="mt-1 text-xs text-amber-200/80"
      >
        Reconnect to check out a project.
      </p>
    </div>

    <!-- Checked out -->
    <div v-else>
      <p class="text-white/70">
        Checked out: <span class="text-white">{{ checkedOutLabel }}</span>
      </p>
      <p class="mb-2 text-white/70">
        Pending edits: <span class="text-white">{{ store.pendingCount }}</span>
      </p>
      <div class="flex gap-2">
        <button
          class="flex-1 rounded-md border border-emerald-400/30 bg-emerald-600/70 px-3 py-1.5 font-medium hover:bg-emerald-600/80 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!store.isOnline || busy"
          @click="onCheckIn"
        >
          {{ store.syncing ? 'Syncing…' : 'Check in' }}
        </button>
        <button
          class="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/15 disabled:opacity-50"
          :disabled="busy"
          @click="onDiscard"
        >
          Discard
        </button>
      </div>
      <p
        v-if="!store.isOnline"
        class="mt-1 text-xs text-amber-200/80"
      >
        Working offline — edits are queued.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useOfflineStore } from '../stores/offline'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'

const store = useOfflineStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const busy = ref(false)

const projectId = computed(() =>
  String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''))
const projectName = computed(() => (projectStore.currentProject as any)?.name || '')

const checkedOutLabel = computed(() => {
  const id = store.checkedOutProjectId
  if (id && id === projectId.value && projectName.value) return projectName.value
  return id || '—'
})

onMounted(() => {
  // Initialize connectivity listeners + read any existing checkout from IndexedDB.
  store.init().catch(() => { /* ignore */ })
})

async function onCheckout() {
  if (!projectId.value) return
  busy.value = true
  try {
    const s = await store.checkout(projectId.value)
    // List only entities that actually have records — avoids naming features
    // the project's plan doesn't include (e.g. activities on the basic tier).
    const counts: Array<[number, string]> = [
      [s.activities, 'activities'],
      [s.issues, 'issues'],
      [s.equipment, 'equipment'],
      [s.actions, 'actions'],
    ]
    const parts = counts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)
    ui.showSuccess(parts.length ? `Checked out: ${parts.join(', ')}` : 'Checked out (no existing records)')
  } catch (e: any) {
    ui.showError(e?.message || 'Checkout failed')
  } finally {
    busy.value = false
  }
}

async function onCheckIn() {
  busy.value = true
  try {
    const r = await store.checkIn()
    const parts = [`${r.applied} applied`]
    if (r.conflicts.length) parts.push(`${r.conflicts.length} conflicts`)
    if (r.failed.length) parts.push(`${r.failed.length} failed`)
    if (r.aborted) parts.push('paused (offline)')
    ui.showInfo(`Check-in: ${parts.join(', ')}`)
  } catch (e: any) {
    ui.showError(e?.message || 'Check-in failed')
  } finally {
    busy.value = false
  }
}

async function onDiscard() {
  if (!window.confirm('Discard the offline copy and all queued edits?')) return
  busy.value = true
  try {
    await store.discard()
    ui.showInfo('Offline copy discarded')
  } catch (e: any) {
    ui.showError(e?.message || 'Discard failed')
  } finally {
    busy.value = false
  }
}
</script>
