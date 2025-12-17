<template>
  <div
    v-if="rows.length"
    class="overflow-x-auto rounded-md border border-white/10"
  >
    <table class="min-w-full w-full text-sm table-fixed">
      <thead class="bg-white/5 text-white/70">
        <tr>
          <th
            class="text-left px-3 py-2 w-24 cursor-pointer select-none"
            @click="setSort('number')"
          >
            Number
            <span class="ml-1 text-[10px] align-middle">{{ sortIndicator('number') }}</span>
          </th>
          <th
            class="text-left px-3 py-2 w-32 cursor-pointer select-none"
            @click="setSort('type')"
          >
            Type
            <span class="ml-1 text-[10px] align-middle">{{ sortIndicator('type') }}</span>
          </th>
          <th
            class="text-left px-3 py-2 w-[18.75%] cursor-pointer select-none"
            @click="setSort('title')"
          >
            Title
            <span class="ml-1 text-[10px] align-middle">{{ sortIndicator('title') }}</span>
          </th>
          <th
            class="text-left px-3 py-2 w-[31.25%] cursor-pointer select-none"
            @click="setSort('description')"
          >
            Description
            <span class="ml-1 text-[10px] align-middle">{{ sortIndicator('description') }}</span>
          </th>
          <th class="text-left px-3 py-2 w-36">
            Recommendation
          </th>
          <th
            class="text-left px-3 py-2 w-28 cursor-pointer select-none"
            @click="setSort('status')"
          >
            Status
            <span class="ml-1 text-[10px] align-middle">{{ sortIndicator('status') }}</span>
          </th>
          <th
            v-if="showUnlink"
            class="text-left px-3 py-2 w-24"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="it in sortedRows"
          :key="it.id"
          class="border-t border-white/10 hover:bg-white/5"
        >
          <td class="px-3 py-2 align-middle whitespace-nowrap w-24">
            <RouterLink
              :to="{ name: 'issue-edit', params: { id: it.id } }"
              class="hover:underline"
            >
              #{{ it.number ?? '—' }}
            </RouterLink>
          </td>
          <td class="px-3 py-2 align-middle whitespace-nowrap w-32">
            {{ it.type || '—' }}
          </td>
          <td class="px-3 py-2 align-middle w-[18.75%]">
            <RouterLink
              :to="{ name: 'issue-edit', params: { id: it.id } }"
              class="hover:underline"
            >
              <span
                class="block whitespace-normal break-words"
                :title="it.title || ''"
              >{{ it.title || '—' }}</span>
            </RouterLink>
          </td>
          <td class="px-3 py-2 align-middle w-[31.25%]">
            <span class="block text-white/70 whitespace-normal break-words">{{ it.description || '—' }}</span>
          </td>
          <td class="px-3 py-2 align-middle">
            <span class="block text-white/70 whitespace-normal break-words">{{ it.recommendation || '—' }}</span>
          </td>
          <td class="px-3 py-2 align-middle whitespace-nowrap w-28">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs border"
              :class="statusClass(it.status)"
            >{{ it.status || 'Open' }}</span>
          </td>
          <td
            v-if="showUnlink"
            class="px-3 py-2 align-middle whitespace-nowrap w-24"
          >
            <button
              class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs"
              @click="$emit('unlink', it)"
            >
              Unlink
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div
    v-else
    class="text-white/60"
  >
    No issues.
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

export type IssueLite = {
  id: string
  number?: number
  title?: string
  description?: string
  type?: string
  recommendation?: string
  status?: string
}

const props = defineProps<{
  issues: any[] | null | undefined
  showUnlink?: boolean
}>()

// Emit unlink event when the optional Unlink button is used
const emit = defineEmits<{
  (e: 'unlink', issue: IssueLite): void
}>()

const rows = computed<IssueLite[]>(() => {
  const arr = Array.isArray(props.issues) ? props.issues : []
  return arr.map((raw: any) => ({
    id: String(raw.id || raw._id || ''),
    number: raw.number,
    title: raw.title,
    description: htmlToText(raw.description),
    type: raw.type,
    recommendation: raw.recommendation || raw.recommendationText || raw.recommendation_text || '',
    status: raw.status,
  })).filter(r => r.id)
})

const sortKey = ref<'number' | 'type' | 'title' | 'description' | 'status' | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

const sortedRows = computed<IssueLite[]>(() => {
  const base = rows.value.slice()
  if (!sortKey.value) return base
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return base.sort((a, b) => {
    if (key === 'number') {
      const av = (typeof a.number === 'number') ? a.number : Number.POSITIVE_INFINITY
      const bv = (typeof b.number === 'number') ? b.number : Number.POSITIVE_INFINITY
      if (av === bv) return 0
      return av < bv ? -1 * dir : 1 * dir
    }
    const as = String((a as any)[key] || '').toLowerCase()
    const bs = String((b as any)[key] || '').toLowerCase()
    if (!as && !bs) return 0
    if (!as) return 1
    if (!bs) return -1
    return as.localeCompare(bs) * dir
  })
})

function setSort(key: 'number' | 'type' | 'title' | 'description' | 'status') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIndicator(key: 'number' | 'type' | 'title' | 'description' | 'status') {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

// Convert WYSIWYG/HTML to plain text for display
function htmlToText(html?: string) {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = tmp.textContent || tmp.innerText || ''
    return t.replace(/\s+/g, ' ').trim()
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function statusClass(s?: string) {
  const v = String(s || 'Open').toLowerCase()
  if (v === 'open') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
  if (v.includes('progress')) return 'bg-amber-500/15 text-amber-200 border-amber-400/40'
  // Closed and all other statuses use neutral styling
  return 'bg-white/10 text-white/80 border-white/20'
}
</script>
