<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="text-white/80">
        {{ title }}
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
          :disabled="loading"
          @click="$emit('refresh')"
        >
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
      </div>
    </div>
    <div
      v-if="loading"
      class="text-white/70"
    >
      Loading logs...
    </div>
    <div
      v-else-if="!logs?.length"
      class="text-white/60"
    >
      No logs found.
    </div>
    <ul
      v-else
      class="space-y-2"
    >
      <li
        v-for="(l, idx) in logs"
        :key="(l.ts || '') + String(idx)"
        class="p-2 rounded bg-white/5 border border-white/10 cursor-pointer"
        @click="toggle(idx, l)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0 text-sm text-white/80 flex items-center gap-2">
            <span class="font-medium truncate">{{ l.type }}</span>
            <span
              v-if="l.message"
              class="text-white/60 truncate"
            >— {{ l.message }}</span>
          </div>
          <div class="text-xs text-white/60 shrink-0">
            {{ formatDateTime(l.ts) }}<span v-if="l.by"> • {{ l.by }}</span>
          </div>
        </div>
        <div
          v-if="isOpen(idx, l)"
          class="mt-2 text-xs text-white/70 space-y-1"
        >
          <div v-if="l.details">
            {{ typeof l.details === 'string' ? l.details : JSON.stringify(l.details) }}
          </div>
          <div v-else-if="l.meta">
            {{ typeof l.meta === 'string' ? l.meta : JSON.stringify(l.meta) }}
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  logs?: Array<any>
  loading?: boolean
}>()
defineEmits(['refresh'])

import { ref } from 'vue'
const openMap = ref<Record<string, boolean>>({})

function formatDateTime(d?: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleString() } catch (e) { return String(d) }
}

function keyFor(idx: number, l: any) {
  return `${idx}-${l?.ts || ''}-${l?.type || ''}`
}
function isOpen(idx: number, l: any) {
  return Boolean(openMap.value[keyFor(idx, l)])
}
function toggle(idx: number, l: any) {
  const k = keyFor(idx, l)
  openMap.value[k] = !openMap.value[k]
}
</script>
