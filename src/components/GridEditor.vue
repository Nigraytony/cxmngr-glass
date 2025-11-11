<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <button
        class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
        @click="addRow"
      >
        Add Row
      </button>
      <button
        class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30 text-sm"
        :disabled="!hasSelection"
        @click="removeSelected"
      >
        Remove Selected
      </button>
    </div>
    <div
      ref="containerEl"
      class="ag-theme-alpine w-full"
      :style="{ height, minHeight: minHeight }"
    >
      <AgGridVue
        class="w-full h-full"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :row-data="rowsRef"
        :dom-layout="'normal'"
        row-selection="multiple"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register all Community features (AG Grid v34+ module system)
ModuleRegistry.registerModules([AllCommunityModule])

interface Props {
  columns: string[]
  rows: Array<Record<string, any>>
  height?: string
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:rows', v: Array<Record<string, any>>): void }>()

const height = computed(() => props.height || '420px')
const minHeight = '260px'

const gridApi = ref<any>(null)
const columnApi = ref<any>(null)
const containerEl = ref<HTMLElement | null>(null)

const rowsRef = ref<Array<Record<string, any>>>([])
watch(() => props.rows, (v) => { rowsRef.value = Array.isArray(v) ? v.map(r => ({ ...r })) : [] }, { immediate: true, deep: true })

const columnDefs = computed(() => (props.columns && props.columns.length ? props.columns : deriveColumns(rowsRef.value)).map(c => ({ field: c, editable: true, flex: 1, resizable: true })))
const defaultColDef = { sortable: true, filter: true }

function onGridReady(params: any) {
  gridApi.value = params.api
  columnApi.value = params.columnApi
  sizeToFitSoon()
}

function onCellValueChanged() {
  emit('update:rows', rowsRef.value)
}

function sizeToFitSoon() {
  // Avoid measuring when hidden; retry shortly
  setTimeout(() => {
    if (!gridApi.value) return
    const el = containerEl.value
    if (!el || !el.offsetParent) { sizeToFitSoon(); return }
    try { gridApi.value.sizeColumnsToFit() } catch (err) {
      // ignore: AG Grid may throw while mounting/resizing in some environments
    }
  }, 50)
}

function addRow() {
  const obj: Record<string, any> = {}
  for (const c of (props.columns && props.columns.length ? props.columns : deriveColumns(rowsRef.value))) obj[c] = ''
  rowsRef.value = [...rowsRef.value, obj]
  emit('update:rows', rowsRef.value)
  sizeToFitSoon()
}

const hasSelection = computed(() => {
  if (!gridApi.value) return false
  const sel = gridApi.value.getSelectedRows?.() || []
  return sel.length > 0
})

function removeSelected() {
  if (!gridApi.value) return
  const sel = gridApi.value.getSelectedRows?.() || []
  if (!sel.length) return
  const toDelete = new Set(sel)
  rowsRef.value = rowsRef.value.filter(r => !toDelete.has(r))
  emit('update:rows', rowsRef.value)
}

function deriveColumns(rows: Array<Record<string, any>>): string[] {
  const keys = new Set<string>()
  for (const r of rows) Object.keys(r || {}).forEach(k => keys.add(k))
  return Array.from(keys.size ? keys : ['Step', 'Expected', 'Actual'])
}

function handleResize() { sizeToFitSoon() }
onMounted(() => { window.addEventListener('resize', handleResize) })
onBeforeUnmount(() => { window.removeEventListener('resize', handleResize) })
</script>

<style scoped>
.ag-theme-alpine {
  --ag-foreground-color: #e5e7eb;
  --ag-background-color: rgba(17,24,39,0.25);
  --ag-header-foreground-color: #d1d5db;
  --ag-header-background-color: rgba(255,255,255,0.06);
  --ag-borders: rgba(255,255,255,0.12);
}
</style>
