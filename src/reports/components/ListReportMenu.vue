<script setup lang="ts">
// The shared list-report control (Phase 4): one "Report" button + modal that
// gives every list page column selection, PDF/CSV/XLSX export on the report
// kit, and project-shared saved presets (ReportDefinition, custom reports
// Stage 1). Column picks also persist per project in localStorage.
import { computed, ref, watch } from 'vue'
import Modal from '../../components/Modal.vue'
import { columnsForKeys, defaultColumnKeys, type ColumnDef } from '../data/columns'
import { toCsv, downloadCsv } from '../data/csv'
import { downloadXlsx } from '../data/xlsx'
import { generateListPdf } from '../definitions/list'
import { dateStamp, reportFileName } from '../core/deliver'
import {
  createReportDefinition,
  deleteReportDefinition,
  listReportDefinitions,
  type ReportDefinitionRecord,
} from '../data/reportDefinitions'
import { useUiStore } from '../../stores/ui'

const props = withDefaults(defineProps<{
  /** ReportDefinition entity key ('equipment', 'issues', 'tasks', ...). */
  entity: string
  columnDefs: ColumnDef[]
  /** PDF running-header title. */
  title: string
  footerLabel?: string
  /** Filename slug parts (date stamp appended). */
  fileBase: Array<string | undefined>
  projectId: string
  project?: any
  /** Returns ALL rows matching the list's current filters (not just the page). */
  fetchRows: () => Promise<any[]>
  /** Lookup maps for column accessors, resolved at generation time. */
  ctx?: () => Record<string, any>
  buttonLabel?: string
}>(), {
  footerLabel: undefined,
  project: undefined,
  ctx: undefined,
  buttonLabel: 'Report',
})

const ui = useUiStore()
const open = ref(false)
const working = ref(false)
const presets = ref<ReportDefinitionRecord[]>([])
const presetsLoading = ref(false)
const selectedPresetId = ref('')
const newPresetName = ref('')
const selection = ref<Record<string, boolean>>({})

const COLUMNS_STORAGE_KEY = computed(() => `report:${props.entity}:${props.projectId}:columns`)

function defaultSelection(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const d of props.columnDefs) out[d.key] = d.enabled !== false
  return out
}

function applyKeys(keys: string[]) {
  const set = new Set(keys)
  const out: Record<string, boolean> = {}
  for (const d of props.columnDefs) out[d.key] = set.has(d.key)
  selection.value = out
}

function loadStoredColumns() {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY.value)
    const keys = raw ? JSON.parse(raw) : null
    if (Array.isArray(keys) && keys.length) { applyKeys(keys.map(String)); return }
  } catch (e) { /* ignore */ }
  selection.value = defaultSelection()
}

function storeColumns() {
  try { localStorage.setItem(COLUMNS_STORAGE_KEY.value, JSON.stringify(enabledKeys.value)) } catch (e) { /* ignore */ }
}

const enabledKeys = computed(() => props.columnDefs.filter(d => selection.value[d.key]).map(d => d.key))
const enabledColumns = computed(() => columnsForKeys(props.columnDefs, enabledKeys.value))

async function loadPresets() {
  if (!props.projectId) return
  presetsLoading.value = true
  try {
    presets.value = await listReportDefinitions(props.projectId, props.entity)
  } catch (e) {
    presets.value = []
  } finally {
    presetsLoading.value = false
  }
}

watch(open, (v) => {
  if (v) {
    loadStoredColumns()
    loadPresets()
    selectedPresetId.value = ''
    newPresetName.value = ''
  }
})

function applyPreset() {
  const p = presets.value.find(x => String(x._id) === selectedPresetId.value)
  if (!p) return
  const keys = Array.isArray(p.definition?.columns) ? p.definition.columns.map(String) : []
  if (keys.length) applyKeys(keys)
}

async function savePreset() {
  const name = newPresetName.value.trim()
  if (!name) { ui.showError('Name the report first'); return }
  if (!enabledKeys.value.length) { ui.showError('Select at least one column'); return }
  try {
    const created = await createReportDefinition(props.projectId, {
      entity: props.entity,
      name,
      definition: { columns: enabledKeys.value },
    })
    presets.value = [created, ...presets.value]
    selectedPresetId.value = String(created._id)
    newPresetName.value = ''
    ui.showSuccess('Report saved for the project team')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save report')
  }
}

async function removePreset() {
  const p = presets.value.find(x => String(x._id) === selectedPresetId.value)
  if (!p) return
  try {
    await deleteReportDefinition(props.projectId, String(p._id))
    presets.value = presets.value.filter(x => String(x._id) !== String(p._id))
    selectedPresetId.value = ''
    ui.showSuccess('Saved report deleted')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete report')
  }
}

async function withRows(fn: (rows: any[]) => Promise<void> | void) {
  if (!enabledKeys.value.length) { ui.showError('Select at least one column'); return }
  working.value = true
  try {
    storeColumns()
    const rows = await props.fetchRows()
    if (!rows.length) { ui.showInfo('Nothing matches the current filters'); return }
    await fn(rows)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Export failed')
  } finally {
    working.value = false
  }
}

const resolvedCtx = () => (props.ctx ? props.ctx() : undefined)

async function exportPdf() {
  await withRows(async (rows) => {
    await generateListPdf({
      title: props.title,
      footerLabel: props.footerLabel || props.title,
      project: props.project,
      columns: enabledColumns.value,
      rows,
      ctx: resolvedCtx(),
      fileBase: props.fileBase,
    })
    open.value = false
  })
}

async function exportCsv() {
  await withRows((rows) => {
    const csv = toCsv(rows, enabledColumns.value, resolvedCtx())
    downloadCsv(reportFileName(props.fileBase, 'csv'), csv)
    open.value = false
  })
}

async function exportXlsx() {
  await withRows(async (rows) => {
    await downloadXlsx(reportFileName(props.fileBase, 'xlsx'), `Export ${dateStamp()}`, rows, enabledColumns.value, resolvedCtx())
    open.value = false
  })
}
</script>

<template>
  <button
    type="button"
    class="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 hover:text-white inline-flex items-center gap-2"
    :title="projectId ? 'List report: PDF, CSV, XLSX, saved reports' : 'Select a project'"
    :disabled="!projectId"
    @click="open = true"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      class="w-4 h-4"
    >
      <path
        d="M7 3h7l3 3v15H7V3Z"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M9 12h6M9 16h6"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <span class="text-sm">{{ buttonLabel }}</span>
  </button>

  <Modal v-model="open">
    <template #header>
      <div class="text-lg">
        {{ title }}
      </div>
    </template>
    <div class="space-y-4 text-white/90 text-sm">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-white/70">
            Saved reports (shared with the project team)
          </div>
          <div
            v-if="presetsLoading"
            class="text-xs text-white/50"
          >
            Loading…
          </div>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-model="selectedPresetId"
            class="flex-1 px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90"
            @change="applyPreset"
          >
            <option value="">
              — choose a saved report —
            </option>
            <option
              v-for="p in presets"
              :key="p._id"
              :value="String(p._id)"
            >
              {{ p.name }}
            </option>
          </select>
          <button
            v-if="selectedPresetId"
            type="button"
            class="px-2 py-1.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-100 hover:bg-red-500/30 text-xs"
            @click="removePreset"
          >
            Delete
          </button>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <input
            v-model="newPresetName"
            type="text"
            placeholder="Save current columns as…"
            class="flex-1 px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
            @keydown.enter.prevent="savePreset"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 text-xs"
            @click="savePreset"
          >
            Save
          </button>
        </div>
      </div>

      <div>
        <div class="text-white/70 mb-2">
          Columns
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          <label
            v-for="d in columnDefs"
            :key="d.key"
            class="inline-flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="selection[d.key]"
              type="checkbox"
              class="accent-emerald-400"
            >
            <span class="truncate">{{ d.label }}</span>
          </label>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-xs text-white/50">
          Exports everything matching the current filters
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 disabled:opacity-50"
            :disabled="working"
            @click="exportCsv"
          >
            CSV
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 disabled:opacity-50"
            :disabled="working"
            @click="exportXlsx"
          >
            XLSX
          </button>
          <button
            class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 disabled:opacity-50"
            :disabled="working"
            @click="exportPdf"
          >
            {{ working ? 'Working…' : 'List PDF' }}
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>
