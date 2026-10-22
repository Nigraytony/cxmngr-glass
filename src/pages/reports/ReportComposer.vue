<template>
  <section class="space-y-4 relative">
    <BreadCrumbs
      :items="[
        { text: 'Dashboard', to: '/app' },
        { text: 'Custom Reports', to: { name: 'custom-reports' } },
      ]"
      title="Custom Reports"
    />

    <!-- Toolbar -->
    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 flex flex-wrap items-center gap-3">
      <select
        v-model="selectedSavedId"
        class="px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90 text-sm min-w-[14rem]"
        @change="onPickSaved"
      >
        <option value="">
          — new report —
        </option>
        <option
          v-for="r in saved"
          :key="r._id"
          :value="String(r._id)"
        >
          {{ r.name }}
        </option>
      </select>
      <input
        v-model="name"
        type="text"
        placeholder="Report name…"
        class="flex-1 min-w-[12rem] px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-white text-sm"
        @input="markDirty"
      >
      <select
        v-model="orientation"
        class="px-2 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90 text-sm"
        @change="markDirty"
      >
        <option value="portrait">
          Portrait
        </option>
        <option value="landscape">
          Landscape
        </option>
      </select>
      <span
        v-if="dirty"
        class="text-xs text-amber-300"
      >Unsaved changes</span>
      <span class="flex-1" />
      <button
        class="px-3 py-1.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 hover:bg-indigo-500/40 text-white text-sm disabled:opacity-50"
        :disabled="working || !dirty"
        @click="saveReport"
      >
        {{ working ? 'Working…' : 'Save' }}
      </button>
      <button
        v-if="selectedSavedId"
        class="px-3 py-1.5 rounded-md bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 text-sm disabled:opacity-50"
        :disabled="working"
        @click="deleteReport"
      >
        Delete…
      </button>
      <button
        class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 text-sm disabled:opacity-50"
        :disabled="working || !tableBlockCount"
        :title="tableBlockCount ? 'One sheet per table block' : 'Add a table block first'"
        @click="exportXlsx"
      >
        XLSX
      </button>
      <button
        class="px-3 py-1.5 rounded-md bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/35 text-sm disabled:opacity-50"
        :disabled="working || !blocks.length"
        @click="generatePdf"
      >
        {{ working ? 'Generating…' : 'Generate PDF' }}
      </button>
    </div>

    <div
      v-if="!projectId"
      class="rounded-xl p-6 bg-white/5 border border-white/10 text-white/70 text-center"
    >
      Select a project to build custom reports.
    </div>

    <!-- Builder -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-12 gap-4"
    >
      <!-- Block list (left rail) -->
      <aside class="md:col-span-3 rounded-2xl p-3 bg-white/5 border border-white/10 min-h-0">
        <div class="text-xs uppercase tracking-wide text-white/50 mb-2 px-1">
          Blocks
        </div>
        <ul class="space-y-1">
          <li
            v-for="(b, idx) in blocks"
            :key="b.id"
            :class="dragIndex === idx ? 'opacity-50' : ''"
            draggable="true"
            @dragstart="onDragStart(idx, $event)"
            @dragover.prevent
            @drop.prevent="onDrop(idx)"
          >
            <button
              type="button"
              :class="[
                'w-full text-left px-2 py-2 rounded-lg border text-sm flex items-center gap-2',
                selectedBlockId === b.id
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'bg-transparent border-white/5 text-white/80 hover:bg-white/10',
              ]"
              @click="selectedBlockId = b.id"
            >
              <span
                class="cursor-grab text-white/30 shrink-0 select-none"
                title="Drag to reorder"
              >⋮⋮</span>
              <span class="shrink-0">{{ blockIcon(b) }}</span>
              <span class="flex-1 min-w-0 truncate">{{ blockLabel(b) }}</span>
              <span
                v-if="selectedBlockId === b.id"
                class="shrink-0 inline-flex items-center gap-0.5"
              >
                <button
                  type="button"
                  class="px-1 rounded bg-white/10 text-[10px] text-white/70 hover:text-white disabled:opacity-30"
                  :disabled="idx === 0"
                  title="Move up"
                  @click.stop="moveBlock(idx, -1)"
                >↑</button>
                <button
                  type="button"
                  class="px-1 rounded bg-white/10 text-[10px] text-white/70 hover:text-white disabled:opacity-30"
                  :disabled="idx === blocks.length - 1"
                  title="Move down"
                  @click.stop="moveBlock(idx, 1)"
                >↓</button>
              </span>
            </button>
          </li>
        </ul>
        <div class="mt-2 grid grid-cols-2 gap-1.5">
          <button
            v-for="t in BLOCK_TYPES"
            :key="t.type"
            type="button"
            class="px-2 py-1.5 rounded-lg border border-dashed border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs"
            @click="addBlock(t.type)"
          >
            + {{ t.label }}
          </button>
        </div>
      </aside>

      <!-- Block editor (main pane) -->
      <div class="md:col-span-9 rounded-2xl p-4 bg-white/5 border border-white/10 min-w-0">
        <div
          v-if="!selectedBlock"
          class="text-white/60 text-sm"
        >
          Add a block on the left, or pick one to edit. Blocks render top to bottom; tables pull live project data when you generate.
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="text-lg text-white font-medium">
              {{ blockIcon(selectedBlock) }} {{ BLOCK_TYPE_LABELS[selectedBlock.type] }}
            </div>
            <button
              type="button"
              class="px-2 py-1 rounded-md bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 text-sm"
              @click="removeSelectedBlock"
            >
              Remove block
            </button>
          </div>

          <!-- Cover -->
          <div
            v-if="selectedBlock.type === 'cover'"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <input
              v-model="selectedBlock.title"
              type="text"
              placeholder="Cover title"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
            <input
              v-model="selectedBlock.subtitle"
              type="text"
              placeholder="Subtitle (defaults to project name)"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
            <input
              v-model="selectedBlock.byLine"
              type="text"
              placeholder="By line"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
            <div class="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                class="text-xs text-white/70"
                @change="onCoverImage"
              >
              <button
                v-if="selectedBlock.imageDataUrl"
                type="button"
                class="px-2 py-1 rounded bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white"
                @click="selectedBlock.imageDataUrl = ''; markDirty()"
              >
                Clear image
              </button>
            </div>
          </div>

          <!-- Heading -->
          <div
            v-else-if="selectedBlock.type === 'heading'"
            class="flex items-center gap-3"
          >
            <input
              v-model="selectedBlock.text"
              type="text"
              placeholder="Heading text"
              class="flex-1 px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
            <select
              v-model.number="selectedBlock.level"
              class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
              @change="markDirty"
            >
              <option :value="1">
                Heading 1
              </option>
              <option :value="2">
                Heading 2
              </option>
            </select>
          </div>

          <!-- Text -->
          <textarea
            v-else-if="selectedBlock.type === 'text'"
            v-model="selectedBlock.text"
            rows="10"
            placeholder="Narrative text — blank lines separate paragraphs."
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
            @input="markDirty"
          />

          <!-- Page break -->
          <div
            v-else-if="selectedBlock.type === 'pageBreak'"
            class="text-white/60 text-sm"
          >
            Forces the next block onto a new page.
          </div>

          <!-- Summary -->
          <div
            v-else-if="selectedBlock.type === 'summary'"
            class="space-y-3"
          >
            <div class="flex items-center gap-3 flex-wrap">
              <select
                v-model="selectedBlock.entity"
                class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
                @change="onEntityChange"
              >
                <option
                  v-for="e in COMPOSER_ENTITIES"
                  :key="e"
                  :value="e"
                >
                  {{ ENTITY_LABELS[e] }}
                </option>
              </select>
              <label class="text-white/70 text-sm">grouped by</label>
              <select
                v-model="selectedBlock.groupBy"
                class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
                @change="markDirty"
              >
                <option
                  v-for="c in entityColumns(selectedBlock.entity)"
                  :key="c.key"
                  :value="c.key"
                >
                  {{ c.label }}
                </option>
              </select>
            </div>
            <input
              v-model="selectedBlock.title"
              type="text"
              placeholder="Block title (optional)"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
          </div>

          <!-- Table -->
          <div
            v-else-if="selectedBlock.type === 'table'"
            class="space-y-3"
          >
            <div class="flex items-center gap-3 flex-wrap">
              <select
                v-model="selectedBlock.entity"
                class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
                @change="onEntityChange"
              >
                <option
                  v-for="e in COMPOSER_ENTITIES"
                  :key="e"
                  :value="e"
                >
                  {{ ENTITY_LABELS[e] }}
                </option>
              </select>
              <label class="text-white/70 text-sm">sort by</label>
              <select
                v-model="selectedBlock.sortBy"
                class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
                @change="markDirty"
              >
                <option value="">
                  — default order —
                </option>
                <option
                  v-for="c in entityColumns(selectedBlock.entity)"
                  :key="c.key"
                  :value="c.key"
                >
                  {{ c.label }}
                </option>
              </select>
              <select
                v-model="selectedBlock.sortDir"
                class="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/90 text-sm"
                @change="markDirty"
              >
                <option value="asc">
                  ↑ asc
                </option>
                <option value="desc">
                  ↓ desc
                </option>
              </select>
              <label class="text-white/70 text-sm">limit</label>
              <input
                v-model.number="selectedBlock.limit"
                type="number"
                min="0"
                placeholder="all"
                class="w-20 px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
                @input="markDirty"
              >
            </div>
            <input
              v-model="selectedBlock.title"
              type="text"
              placeholder="Block title (optional — defaults to the module name)"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
              @input="markDirty"
            >
            <div>
              <div class="text-white/70 text-sm mb-1.5">
                Columns <span class="text-white/40">(none checked = the default set)</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <label
                  v-for="c in entityColumns(selectedBlock.entity)"
                  :key="c.key"
                  class="inline-flex items-center gap-2 text-sm text-white/85 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="(selectedBlock.columns || []).includes(c.key)"
                    class="accent-emerald-400"
                    @change="toggleTableColumn(c.key, ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ c.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { ENTITY_COLUMNS, ENTITY_LABELS } from '../../reports/data/columns'
import { COMPOSER_ENTITIES, type ComposerEntity } from '../../reports/data/fetchRows'
import {
  generateCompositePdf,
  generateCompositeXlsx,
  newBlockId,
  type ComposerBlock,
  type CompositeDefinition,
} from '../../reports/definitions/composite'
import {
  createReportDefinition,
  deleteReportDefinition,
  listReportDefinitions,
  updateReportDefinition,
  type ReportDefinitionRecord,
} from '../../reports/data/reportDefinitions'

const projectStore = useProjectStore()
const ui = useUiStore()

const projectId = computed(() => String(projectStore.currentProjectId || ''))

const saved = ref<ReportDefinitionRecord[]>([])
const selectedSavedId = ref('')
const name = ref('')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const blocks = ref<ComposerBlock[]>([])
const selectedBlockId = ref<string | null>(null)
const dirty = ref(false)
const working = ref(false)

const BLOCK_TYPE_LABELS: Record<ComposerBlock['type'], string> = {
  cover: 'Cover page',
  heading: 'Heading',
  text: 'Text',
  pageBreak: 'Page break',
  summary: 'Summary',
  table: 'Table',
}
const BLOCK_TYPES: Array<{ type: ComposerBlock['type']; label: string }> = [
  { type: 'cover', label: 'Cover' },
  { type: 'heading', label: 'Heading' },
  { type: 'text', label: 'Text' },
  { type: 'table', label: 'Table' },
  { type: 'summary', label: 'Summary' },
  { type: 'pageBreak', label: 'Page break' },
]

const selectedBlock = computed(() => blocks.value.find((b) => b.id === selectedBlockId.value) || null)
const tableBlockCount = computed(() => blocks.value.filter((b) => b.type === 'table' && b.entity).length)

function markDirty() { dirty.value = true }
function entityColumns(entity?: string) { return ENTITY_COLUMNS[String(entity || '')] || [] }

function blockIcon(b: ComposerBlock): string {
  return { cover: '🖼️', heading: '🔤', text: '📝', pageBreak: '↡', summary: '∑', table: '📊' }[b.type] || '▫'
}
function blockLabel(b: ComposerBlock): string {
  if (b.type === 'table') return b.title || `Table — ${ENTITY_LABELS[String(b.entity)] || b.entity || '?'}`
  if (b.type === 'summary') return b.title || `Summary — ${ENTITY_LABELS[String(b.entity)] || b.entity || '?'}`
  if (b.type === 'heading') return b.text || 'Heading'
  if (b.type === 'text') return (b.text || 'Text').slice(0, 40) || 'Text'
  if (b.type === 'cover') return b.title || 'Cover page'
  return 'Page break'
}

function addBlock(type: ComposerBlock['type']) {
  const base: ComposerBlock = { id: newBlockId(), type }
  if (type === 'cover') Object.assign(base, { title: name.value || '', subtitle: '', byLine: '', imageDataUrl: '' })
  if (type === 'heading') Object.assign(base, { text: '', level: 1 })
  if (type === 'text') Object.assign(base, { text: '' })
  if (type === 'table') Object.assign(base, { entity: 'issues' as ComposerEntity, columns: [], sortBy: '', sortDir: 'asc', limit: 0, title: '' })
  if (type === 'summary') Object.assign(base, { entity: 'issues' as ComposerEntity, groupBy: 'status', title: '' })
  blocks.value.push(base)
  selectedBlockId.value = base.id
  markDirty()
}

function removeSelectedBlock() {
  const idx = blocks.value.findIndex((b) => b.id === selectedBlockId.value)
  if (idx < 0) return
  blocks.value.splice(idx, 1)
  selectedBlockId.value = blocks.value[Math.min(idx, blocks.value.length - 1)]?.id || null
  markDirty()
}

function moveBlock(idx: number, dir: number) {
  const next = idx + dir
  if (next < 0 || next >= blocks.value.length) return
  const [row] = blocks.value.splice(idx, 1)
  blocks.value.splice(next, 0, row)
  markDirty()
}

const dragIndex = ref<number | null>(null)
function onDragStart(idx: number, e: DragEvent) {
  dragIndex.value = idx
  try { e.dataTransfer?.setData('text/plain', String(idx)) } catch (err) { /* ignore */ }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop(idx: number) {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === idx) return
  const [row] = blocks.value.splice(from, 1)
  blocks.value.splice(idx, 0, row)
  markDirty()
}

function onEntityChange() {
  const b = selectedBlock.value
  if (!b) return
  if (b.type === 'table') { b.columns = []; b.sortBy = '' }
  if (b.type === 'summary') {
    const defs = entityColumns(b.entity)
    if (!defs.some((d) => d.key === b.groupBy)) b.groupBy = defs.find((d) => d.key === 'status')?.key || defs[0]?.key || ''
  }
  markDirty()
}

function toggleTableColumn(key: string, checked: boolean) {
  const b = selectedBlock.value
  if (!b || b.type !== 'table') return
  const defs = entityColumns(b.entity)
  const current = new Set(b.columns || [])
  if (checked) current.add(key)
  else current.delete(key)
  // Keep catalog order.
  b.columns = defs.filter((d) => current.has(d.key)).map((d) => d.key)
  markDirty()
}

async function onCoverImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  const b = selectedBlock.value
  if (!file || !b || b.type !== 'cover') return
  if (file.size > 800 * 1024) { ui.showError('Cover image must be under 800 KB'); return }
  try {
    b.imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })
    markDirty()
  } catch (err) { ui.showError('Failed to read the image') }
  try { input.value = '' } catch (err) { /* ignore */ }
}

// --- Saved reports ---------------------------------------------------------

function currentDefinition(): CompositeDefinition {
  return { blocks: JSON.parse(JSON.stringify(blocks.value)), orientation: orientation.value }
}

async function loadSaved() {
  if (!projectId.value) { saved.value = []; return }
  try {
    saved.value = await listReportDefinitions(projectId.value, 'composite')
  } catch (e) {
    saved.value = []
  }
}

function newReport() {
  selectedSavedId.value = ''
  name.value = ''
  orientation.value = 'portrait'
  blocks.value = []
  selectedBlockId.value = null
  dirty.value = false
}

function onPickSaved() {
  if (!selectedSavedId.value) { newReport(); return }
  const rec = saved.value.find((r) => String(r._id) === selectedSavedId.value)
  if (!rec) return
  name.value = rec.name
  const def = (rec.definition || {}) as CompositeDefinition
  orientation.value = def.orientation === 'landscape' ? 'landscape' : 'portrait'
  blocks.value = Array.isArray(def.blocks)
    ? JSON.parse(JSON.stringify(def.blocks)).map((b: any) => ({ ...b, id: b.id || newBlockId() }))
    : []
  selectedBlockId.value = blocks.value[0]?.id || null
  dirty.value = false
}

async function saveReport() {
  const trimmed = name.value.trim()
  if (!trimmed) { ui.showError('Name the report first'); return }
  if (!blocks.value.length) { ui.showError('Add at least one block'); return }
  working.value = true
  try {
    if (selectedSavedId.value) {
      const updated = await updateReportDefinition(projectId.value, selectedSavedId.value, {
        name: trimmed,
        definition: currentDefinition(),
      })
      saved.value = saved.value.map((r) => (String(r._id) === selectedSavedId.value ? updated : r))
    } else {
      const created = await createReportDefinition(projectId.value, {
        entity: 'composite',
        name: trimmed,
        definition: currentDefinition(),
      })
      saved.value = [created, ...saved.value]
      selectedSavedId.value = String(created._id)
    }
    dirty.value = false
    ui.showSuccess('Report saved for the project team')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save report')
  } finally {
    working.value = false
  }
}

async function deleteReport() {
  if (!selectedSavedId.value) return
  if (!confirm('Delete this saved report for the whole project team?')) return
  working.value = true
  try {
    await deleteReportDefinition(projectId.value, selectedSavedId.value)
    saved.value = saved.value.filter((r) => String(r._id) !== selectedSavedId.value)
    newReport()
    ui.showSuccess('Saved report deleted')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete report')
  } finally {
    working.value = false
  }
}

// --- Generation ------------------------------------------------------------

async function generatePdf() {
  if (!blocks.value.length) return
  working.value = true
  try {
    await generateCompositePdf({
      project: projectStore.currentProject || {},
      projectId: projectId.value,
      name: name.value.trim() || 'Custom Report',
      definition: currentDefinition(),
    })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to generate the report')
  } finally {
    working.value = false
  }
}

async function exportXlsx() {
  working.value = true
  try {
    const sheets = await generateCompositeXlsx({
      project: projectStore.currentProject || {},
      projectId: projectId.value,
      name: name.value.trim() || 'Custom Report',
      definition: currentDefinition(),
    })
    if (!sheets) ui.showInfo('Add a table block first')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to export')
  } finally {
    working.value = false
  }
}

onMounted(loadSaved)
watch(projectId, () => { newReport(); loadSaved() })
</script>
