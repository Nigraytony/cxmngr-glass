<template>
  <div v-if="store.featureEnabled">
    <!-- Collapsed sidebar: icon + status dot; click expands the sidebar. -->
    <button
      v-if="!open"
      class="flex w-full items-center justify-center px-3 py-2 rounded-lg text-white/90 border border-white/10 hover:bg-white/20"
      :title="statusTitle"
      @click="emit('expand')"
    >
      <span class="i relative">
        📦
        <span :class="['absolute -right-1 -top-1 h-2 w-2 rounded-full', store.isOnline ? 'bg-emerald-400' : 'bg-amber-400']" />
      </span>
    </button>

    <!-- Expanded sidebar: compact offline panel. -->
    <div
      v-else
      class="rounded-lg border border-white/10 px-3 py-2 text-white/90"
    >
      <div class="mb-1.5 flex items-center justify-between">
        <span class="flex items-center gap-2 text-sm font-medium">
          <span :class="['h-2 w-2 rounded-full', store.isOnline ? 'bg-emerald-400' : 'bg-amber-400']" />
          Offline <span class="text-xs text-white/40">beta</span>
        </span>
        <button
          class="text-xs text-white/50 hover:text-white"
          @click="store.setSimulatedOffline(store.isOnline)"
        >
          {{ store.isOnline ? 'Simulate offline' : 'Go online' }}
        </button>
      </div>

      <button
        v-if="!store.isCheckedOut"
        class="w-full rounded-md border border-indigo-400/30 bg-indigo-600/70 px-2 py-1.5 text-sm font-medium hover:bg-indigo-600/80 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!projectId || !store.isOnline || busy"
        @click="onCheckout"
      >
        {{ busy ? 'Checking out…' : 'Check out for offline' }}
      </button>

      <div v-else>
        <p class="text-xs text-white/70">
          Checked out · <span class="text-white">{{ store.pendingCount }}</span> pending
        </p>
        <div class="mt-1.5 flex gap-1.5">
          <button
            class="flex-1 rounded-md border border-emerald-400/30 bg-emerald-600/70 px-2 py-1.5 text-sm font-medium hover:bg-emerald-600/80 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!store.isOnline || busy"
            @click="onCheckIn"
          >
            {{ store.syncing ? 'Syncing…' : 'Check in' }}
          </button>
          <button
            class="rounded-md border border-white/20 bg-white/10 px-2 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOfflineStore } from '../stores/offline'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'

defineProps<{ open?: boolean }>()
const emit = defineEmits<{ (e: 'expand'): void }>()

const store = useOfflineStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const busy = ref(false)

const projectId = computed(() =>
  String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''))

const statusTitle = computed(() => {
  const net = store.isOnline ? 'online' : 'offline'
  return store.isCheckedOut
    ? `Offline mode (${net}) — checked out, ${store.pendingCount} pending`
    : `Offline mode (${net})`
})

// Initialize the offline store once the feature is enabled (listeners + read
// any existing checkout). Reactive so flipping the settings toggle works
// without a reload.
watch(() => store.featureEnabled, (on) => {
  if (on) store.init().catch(() => { /* ignore */ })
}, { immediate: true })

async function onCheckout() {
  if (!projectId.value) return
  busy.value = true
  try {
    const s = await store.checkout(projectId.value)
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
