<template>
  <div class="overflow-x-auto rounded-md border border-white/10" v-if="rows.length">
    <table class="min-w-full w-full text-sm table-fixed">
      <thead class="bg-white/5 text-white/70">
        <tr>
          <th class="text-left px-3 py-2 w-24">Number</th>
          <th class="text-left px-3 py-2 w-32">Type</th>
          <th class="text-left px-3 py-2 w-1/4">Title</th>
          <th class="text-left px-3 py-2">Description</th>
          <th class="text-left px-3 py-2 w-28">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in rows" :key="it.id" class="border-t border-white/10 hover:bg-white/5">
          <td class="px-3 py-2 align-middle whitespace-nowrap w-24">
            <RouterLink :to="{ name: 'issue-edit', params: { id: it.id } }" class="hover:underline">#{{ it.number ?? '—' }}</RouterLink>
          </td>
          <td class="px-3 py-2 align-middle whitespace-nowrap w-32">{{ it.type || '—' }}</td>
          <td class="px-3 py-2 align-middle w-1/4">
            <RouterLink :to="{ name: 'issue-edit', params: { id: it.id } }" class="hover:underline">
              <span class="block truncate" title="{{ it.title || '' }}">{{ it.title || '—' }}</span>
            </RouterLink>
          </td>
          <td class="px-3 py-2 align-middle">
            <span class="block text-white/70 whitespace-normal break-words">{{ it.description || '—' }}</span>
          </td>
          <td class="px-3 py-2 align-middle whitespace-nowrap w-28">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs border"
                  :class="statusClass(it.status)">{{ it.status || 'Open' }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="text-white/60">No issues.</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

export type IssueLite = {
  id: string
  number?: number
  title?: string
  description?: string
  type?: string
  status?: string
}

const props = defineProps<{ issues: any[] | null | undefined }>()

const rows = computed<IssueLite[]>(() => {
  const arr = Array.isArray(props.issues) ? props.issues : []
  return arr.map((raw: any) => ({
    id: String(raw.id || raw._id || ''),
    number: raw.number,
    title: raw.title,
    description: raw.description,
    type: raw.type,
    status: raw.status,
  })).filter(r => r.id)
})

function statusClass(s?: string) {
  const v = String(s || 'Open').toLowerCase()
  if (v === 'closed') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
  if (v.includes('progress')) return 'bg-amber-500/15 text-amber-200 border-amber-400/40'
  return 'bg-white/10 text-white/80 border-white/20'
}
</script>
