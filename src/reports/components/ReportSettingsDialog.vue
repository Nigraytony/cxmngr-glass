<script setup lang="ts">
// Shared report settings dialog (Phase 3): ordered sections with include
// toggles and drag/arrow reordering, photo limit, and optional cover + TOC
// tabs. Works on the one ReportSettings shape from reports/core/settings.
import { computed, ref, watch } from 'vue'
import Modal from '../../components/Modal.vue'
import {
  defaultReportSettings,
  normalizeReportSettings,
  type ReportSettings,
  type ReportSettingsDefaults,
  type SectionDef,
} from '../core/settings'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  settings: ReportSettings
  sectionDefs: SectionDef[]
  defaults?: ReportSettingsDefaults
  showPhotoLimit?: boolean
  showCover?: boolean
  showToc?: boolean
}>(), {
  title: 'Report Settings',
  defaults: undefined,
  showPhotoLimit: true,
  showCover: false,
  showToc: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', settings: ReportSettings): void
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const draft = ref<ReportSettings>(defaultReportSettings(props.sectionDefs, props.defaults))
watch(() => props.modelValue, (v) => {
  if (v) draft.value = normalizeReportSettings(JSON.parse(JSON.stringify(props.settings || {})), props.sectionDefs, props.defaults)
}, { immediate: true })

const labelByKey = computed(() => {
  const m: Record<string, string> = {}
  for (const d of props.sectionDefs) m[d.key] = d.label
  return m
})

function move(idx: number, dir: number) {
  const next = idx + dir
  const arr = draft.value.sections
  if (next < 0 || next >= arr.length) return
  const [row] = arr.splice(idx, 1)
  arr.splice(next, 0, row)
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
  const arr = draft.value.sections
  const [row] = arr.splice(from, 1)
  arr.splice(idx, 0, row)
}

async function onCoverImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    draft.value.cover.imageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })
  } catch (err) { /* ignore */ }
  try { input.value = '' } catch (err) { /* ignore */ }
}

function reset() {
  draft.value = defaultReportSettings(props.sectionDefs, props.defaults)
}

function save() {
  emit('save', JSON.parse(JSON.stringify(draft.value)))
  open.value = false
}
</script>

<template>
  <Modal v-model="open">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="text-lg">
          {{ title }}
        </div>
      </div>
    </template>
    <div class="space-y-4 text-white/90">
      <div>
        <div class="text-sm text-white/70 mb-2">
          Sections — toggle what's included and drag to set the report order
        </div>
        <div class="space-y-1">
          <div
            v-for="(s, i) in draft.sections"
            :key="s.key"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5 border border-white/10"
            :class="dragIndex === i ? 'opacity-50' : ''"
            draggable="true"
            @dragstart="onDragStart(i, $event)"
            @dragover.prevent
            @drop.prevent="onDrop(i)"
          >
            <span
              class="cursor-grab text-white/40 select-none"
              title="Drag to reorder"
            >⋮⋮</span>
            <label class="inline-flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
              <input
                v-model="s.enabled"
                type="checkbox"
                class="accent-emerald-400"
              >
              <span class="truncate">{{ labelByKey[s.key] || s.key }}</span>
            </label>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white disabled:opacity-30"
              :disabled="i === 0"
              title="Move up"
              @click="move(i, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white disabled:opacity-30"
              :disabled="i === draft.sections.length - 1"
              title="Move down"
              @click="move(i, 1)"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showPhotoLimit"
        class="flex items-center gap-3"
      >
        <label class="text-white/70 text-sm">Max photos</label>
        <input
          v-model.number="draft.photoLimit"
          type="number"
          min="0"
          max="12"
          class="w-24 px-2 py-1 rounded-md bg-white/10 border border-white/20"
        >
        <span class="text-xs text-white/60">Only the first {{ draft.photoLimit }} will be included</span>
      </div>

      <div
        v-if="showToc"
        class="flex items-center gap-3"
      >
        <label class="inline-flex items-center gap-2">
          <input
            v-model="draft.toc"
            type="checkbox"
            class="accent-emerald-400"
          >
          <span>Table of contents</span>
        </label>
      </div>

      <div
        v-if="showCover"
        class="space-y-2 pt-2 border-t border-white/10"
      >
        <label class="inline-flex items-center gap-2">
          <input
            v-model="draft.cover.enabled"
            type="checkbox"
            class="accent-emerald-400"
          >
          <span>Cover page</span>
        </label>
        <div
          v-if="draft.cover.enabled"
          class="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <input
            v-model="draft.cover.title"
            type="text"
            placeholder="Cover title"
            class="px-2 py-1 rounded-md bg-white/10 border border-white/20"
          >
          <input
            v-model="draft.cover.subtitle"
            type="text"
            placeholder="Subtitle"
            class="px-2 py-1 rounded-md bg-white/10 border border-white/20"
          >
          <input
            v-model="draft.cover.byLine"
            type="text"
            placeholder="By line"
            class="px-2 py-1 rounded-md bg-white/10 border border-white/20"
          >
          <div class="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              class="text-xs text-white/70"
              @change="onCoverImageChange"
            >
            <button
              v-if="draft.cover.imageDataUrl"
              type="button"
              class="px-2 py-1 rounded bg-white/10 border border-white/15 text-xs text-white/80 hover:text-white"
              @click="draft.cover.imageDataUrl = ''"
            >
              Clear image
            </button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 hover:text-white"
          @click="reset"
        >
          Reset
        </button>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 hover:bg-white/15 hover:text-white"
            @click="open = false"
          >
            Close
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 text-white hover:bg-white/30"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>
