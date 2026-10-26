<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl">
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <div class="text-white font-medium">
            Export issues
          </div>
          <div class="text-white/50 text-xs mt-0.5">
            {{ scopeText }}
          </div>
        </div>
        <button
          class="text-white/50 hover:text-white text-lg px-1"
          title="Close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <!-- Report picker -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label
            v-for="r in REPORTS"
            :key="r.key"
            class="rounded-lg border p-3 cursor-pointer transition-colors"
            :class="report === r.key ? 'bg-emerald-500/15 border-emerald-400/60' : 'bg-white/5 border-white/10 hover:bg-white/10'"
          >
            <input
              v-model="report"
              type="radio"
              :value="r.key"
              class="hidden"
            >
            <div class="text-white/90 text-sm font-medium">
              {{ r.label }}
            </div>
            <div class="text-white/50 text-xs mt-0.5">
              {{ r.purpose }}
            </div>
          </label>
        </div>

        <div
          v-if="report === 'data'"
          class="flex items-center gap-2"
        >
          <span class="text-white/60 text-xs">Format</span>
          <button
            v-for="f in ['xlsx', 'csv']"
            :key="f"
            class="px-2.5 py-1 rounded-md text-xs border"
            :class="format === f ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'"
            @click="format = f as 'xlsx' | 'csv'"
          >
            {{ f === 'xlsx' ? 'Excel' : 'CSV' }}
          </button>
        </div>

        <!-- Options -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label
            v-if="report === 'log'"
            class="flex items-center gap-1.5 text-white/75 text-sm"
          >
            Group by
            <select
              v-model="groupBy"
              class="rounded-md bg-white/10 border border-white/15 px-2 py-1 text-white/90 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="none">
                None
              </option>
              <option value="responsible">
                Responsible party
              </option>
              <option value="system">
                System
              </option>
              <option value="equipment">
                Equipment
              </option>
              <option value="priority">
                Priority
              </option>
            </select>
          </label>
          <label class="flex items-center gap-1.5 text-white/75 text-sm">
            <input
              v-model="closedLast"
              type="checkbox"
              class="rounded bg-white/10 border-white/20"
            >
            Closed issues last
          </label>
          <label
            v-if="report === 'log'"
            class="flex items-center gap-1.5 text-white/75 text-sm"
          >
            <input
              v-model="summaryBand"
              type="checkbox"
              class="rounded bg-white/10 border-white/20"
            >
            Summary block
          </label>
        </div>

        <!-- Columns (Issues Log + Data only) -->
        <div v-if="report === 'log' || report === 'data'">
          <div class="flex items-center justify-between mb-1.5">
            <div class="text-white/70 text-sm">
              Columns
            </div>
            <div class="flex items-center gap-1.5">
              <button
                v-for="p in PRESETS"
                :key="p.name"
                class="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/70 text-xs"
                @click="applyPreset(p)"
              >
                {{ p.name }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <div
              v-for="g in COLUMN_GROUPS"
              :key="g.name"
            >
              <div class="text-white/45 text-xs mb-1">
                {{ g.name }}
              </div>
              <label
                v-for="col in g.cols"
                :key="col.key"
                class="flex items-center gap-2 text-white/85 text-sm py-0.5"
                :class="col.locked ? 'opacity-60' : ''"
              >
                <input
                  type="checkbox"
                  :checked="col.locked || columnSet.has(col.key)"
                  :disabled="col.locked"
                  class="rounded bg-white/10 border-white/20"
                  @change="toggleColumn(col.key, ($event.target as HTMLInputElement).checked)"
                >
                {{ col.label }}
              </label>
            </div>
          </div>
          <div
            v-if="report === 'log' && widthWarning"
            class="mt-2 text-amber-300/90 text-xs"
          >
            ⚠ {{ widthWarning }}
          </div>
        </div>
        <div
          v-else
          class="text-white/40 text-xs"
        >
          {{ report === 'sheets' ? 'Issue Sheets print a fixed card layout — column selection does not apply.' : 'Full Detail prints every section of each issue — column selection does not apply.' }}
        </div>
      </div>

      <div class="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
        <span class="text-white/40 text-xs">Settings are remembered for this project.</span>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-sm"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            :disabled="busy"
            class="px-4 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
            @click="doExport"
          >
            {{ busy ? 'Exporting…' : buttonLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Export dialog for the Issues module (Batch-Columns mockup): report picker,
// options, grouped plain-language columns with presets and a width meter,
// remembered per project. The parent runs the chosen generator on 'export'.
import { computed, onMounted, ref, watch } from 'vue'

export interface IssueExportPayload {
  report: 'log' | 'sheets' | 'detail' | 'data'
  format: 'xlsx' | 'csv'
  groupBy: 'none' | 'responsible' | 'system' | 'equipment' | 'priority'
  closedLast: boolean
  summaryBand: boolean
  columns: string[]
}

const props = defineProps<{
  projectId: string
  matchCount: number
  filterSummary: string
  busy?: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'export', payload: IssueExportPayload): void }>()

const REPORTS = [
  { key: 'log', label: 'Issues Log', purpose: 'Landscape table with a summary block — for OAC meetings.' },
  { key: 'sheets', label: 'Issue Sheets', purpose: 'Compact cards with photos — to hand to a contractor.' },
  { key: 'detail', label: 'Full Detail', purpose: 'Cover table plus every issue’s complete two-page sheet — the archive.' },
  { key: 'data', label: 'Data', purpose: 'Excel or CSV with every selected column, full text.' },
] as const

const COLUMN_GROUPS: Array<{ name: string; cols: Array<{ key: string; label: string; locked?: boolean }> }> = [
  {
    name: 'Issue',
    cols: [
      { key: 'number', label: 'Number', locked: true },
      { key: 'title', label: 'Title', locked: true },
      { key: 'type', label: 'Type' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'labels', label: 'Tags' },
    ],
  },
  {
    name: 'Where',
    cols: [
      { key: 'tag', label: 'Equipment' },
      { key: 'location', label: 'Location' },
      { key: 'system', label: 'System' },
    ],
  },
  {
    name: 'People & dates',
    cols: [
      { key: 'foundBy', label: 'Found by' },
      { key: 'assignedTo', label: 'Responsible' },
      { key: 'dateFound', label: 'Date found' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'closedDate', label: 'Closed date' },
    ],
  },
  {
    name: 'Text',
    cols: [
      { key: 'description', label: 'Description' },
      { key: 'recommendation', label: 'Recommendation' },
      { key: 'resolution', label: 'Response' },
    ],
  },
]
const PRESETS = [
  { name: 'OAC log', cols: ['tag', 'priority', 'status', 'assignedTo', 'dueDate'] },
  { name: 'Punch list', cols: ['tag', 'location', 'assignedTo', 'dueDate', 'recommendation'] },
  { name: 'Everything', cols: COLUMN_GROUPS.flatMap(g => g.cols.filter(col => !col.locked).map(col => col.key)) },
]

const report = ref<IssueExportPayload['report']>('log')
const format = ref<'xlsx' | 'csv'>('xlsx')
const groupBy = ref<IssueExportPayload['groupBy']>('none')
const closedLast = ref(true)
const summaryBand = ref(true)
const columns = ref<string[]>(['tag', 'priority', 'status', 'assignedTo', 'dueDate'])
const columnSet = computed(() => new Set(columns.value))

function toggleColumn(key: string, on: boolean) {
  columns.value = on ? [...new Set([...columns.value, key])] : columns.value.filter(k => k !== key)
}
function applyPreset(p: { cols: string[] }) {
  columns.value = [...p.cols]
}

// Rough landscape-fit estimate for the Log (content ≈ 255mm; core columns
// take ~132mm; long-text columns belong in Data or the Sheets).
const widthWarning = computed(() => {
  const LONG = ['description', 'recommendation', 'resolution']
  const picked = columns.value
  if (picked.some(k => LONG.includes(k))) {
    return 'Description / Recommendation / Response are long-text fields — use them in Data exports or Issue Sheets; the Log skips them.'
  }
  const est: Record<string, number> = { type: 22, location: 28, system: 20, foundBy: 26, dateFound: 18, labels: 24 }
  const extraW = picked.reduce((a, k) => a + (est[k] || 0), 0)
  return 132 + extraW > 255 ? 'This many columns may be tight on landscape Letter — the Issue column shrinks to fit.' : ''
})

const scopeText = computed(() => `${props.matchCount} issue${props.matchCount === 1 ? '' : 's'} match the current filters${props.filterSummary ? ` · ${props.filterSummary}` : ''}`)
const buttonLabel = computed(() => report.value === 'data' ? (format.value === 'xlsx' ? 'Export Excel' : 'Export CSV') : 'Export PDF')

const storageKey = () => `issueExport:${props.projectId || 'global'}`
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null')
    if (saved && typeof saved === 'object') {
      if (saved.report) report.value = saved.report
      if (saved.format) format.value = saved.format
      if (saved.groupBy) groupBy.value = saved.groupBy
      if (typeof saved.closedLast === 'boolean') closedLast.value = saved.closedLast
      if (typeof saved.summaryBand === 'boolean') summaryBand.value = saved.summaryBand
      if (Array.isArray(saved.columns)) columns.value = saved.columns
    }
  } catch (e) { /* defaults */ }
})
watch([report, format, groupBy, closedLast, summaryBand, columns], () => {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({
      report: report.value, format: format.value, groupBy: groupBy.value,
      closedLast: closedLast.value, summaryBand: summaryBand.value, columns: columns.value,
    }))
  } catch (e) { /* ignore */ }
}, { deep: true })

function doExport() {
  emit('export', {
    report: report.value,
    format: format.value,
    groupBy: groupBy.value,
    closedLast: closedLast.value,
    summaryBand: summaryBand.value,
    columns: ['number', 'title', ...columns.value],
  })
}
</script>
