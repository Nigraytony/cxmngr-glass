<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-white/80">
        Define the components that make up this item.
      </div>
      <button
        class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
        @click="startNewComponent"
      >
        Add Component
      </button>
    </div>

    <div
      v-if="!local.length"
      class="text-white/60"
    >
      No components yet.
    </div>
    <div
      v-else
      class="overflow-x-auto rounded-md border border-white/10"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-white/5 text-white/70">
          <tr>
            <th class="w-8 px-2 py-2" />
            <th class="text-left px-3 py-2">
              Tag
            </th>
            <th class="text-left px-3 py-2">
              Type
            </th>
            <th class="text-left px-3 py-2">
              Title
            </th>
            <th class="text-left px-3 py-2">
              Key attributes
            </th>
            <th class="text-left px-3 py-2">
              Status
            </th>
            <th class="text-right px-3 py-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, i) in local"
            :key="c.id || i"
            class="border-t border-white/10 hover:bg-white/5"
            draggable="true"
            @dragstart="onCompDragStart(c, $event)"
            @dragover.prevent="onCompDragOver(i, $event)"
            @drop.prevent="onCompDrop(i, $event)"
          >
            <td class="px-2 py-2 align-middle">
              <span
                class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 text-white/70 cursor-grab active:cursor-grabbing select-none"
                title="Drag to reorder"
                aria-label="Drag to reorder"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="w-4 h-4 opacity-80"
                ><path d="M9 6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM9 12a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 9 12Zm8 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 17 12ZM9 17.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" /></svg>
              </span>
            </td>
            <td class="px-3 py-2">
              {{ c.tag || '—' }}
            </td>
            <td class="px-3 py-2">
              {{ c.type }}
            </td>
            <td class="px-3 py-2">
              {{ c.title || '—' }}
            </td>
            <td class="px-3 py-2">
              <span
                v-if="attrSummary(c.attributes)"
                class="text-white/70"
              >{{ attrSummary(c.attributes) }}</span>
              <span
                v-else
                class="text-white/40"
              >—</span>
            </td>
            <td class="px-3 py-2">
              {{ c.status || '—' }}
            </td>
            <td class="px-3 py-2 text-right">
              <button
                class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 mr-2"
                title="Edit"
                aria-label="Edit"
                @click="editComponent(i)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M12 20h9"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 mr-2"
                title="Duplicate"
                aria-label="Duplicate"
                @click="duplicateComponent(i)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <rect
                    x="9"
                    y="3"
                    width="12"
                    height="12"
                    rx="2"
                    stroke-width="1.5"
                  />
                  <rect
                    x="3"
                    y="9"
                    width="12"
                    height="12"
                    rx="2"
                    stroke-width="1.5"
                  />
                </svg>
              </button>
              <button
                class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-400/60 text-red-200 hover:bg-red-500/35"
                title="Remove"
                aria-label="Remove"
                @click="removeComponent(i)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M3 6h18"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8 6l1-2h6l1 2"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="14"
                    rx="1.5"
                    stroke-width="1.5"
                  />
                  <path
                    d="M10 10v6M14 10v6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Component Editor Modal -->
    <Modal v-model="showCompModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ compDraft.id ? 'Edit Component' : 'Add Component' }}
        </h3>
      </template>
      <div class="space-y-4">
        <div class="grid md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-white/70">Tag</label>
            <input
              v-model="compDraft.tag"
              placeholder="SF-01-FAN"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
            >
          </div>
          <div>
            <label class="block text-sm text-white/70">Type</label>
            <input
              v-model="compDraft.type"
              placeholder="fan, damper, sensor, vfd, ..."
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
            >
          </div>
          <div>
            <label class="block text-sm text-white/70">Title/Label</label>
            <input
              v-model="compDraft.title"
              placeholder="Supply Fan, OA Damper, ..."
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
            >
          </div>
          <div>
            <label class="block text-sm text-white/70">Status</label>
            <div class="relative">
              <select
                v-model="compDraft.status"
                class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
              >
                <option :value="''">
                  —
                </option>
                <option
                  v-for="s in statuses"
                  :key="s"
                  :value="s"
                >
                  {{ s }}
                </option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
              ><path
                d="M6 9l6 6 6-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg>
            </div>
          </div>
        </div>

        <div>
          <div class="text-sm text-white/80 mb-1">
            Attributes
          </div>
          <div
            v-if="compAttrList.length === 0"
            class="text-white/60"
          >
            No attributes yet.
          </div>
          <ul
            v-else
            class="divide-y divide-white/10"
          >
            <li
              v-for="(a, i) in compAttrList"
              :key="i"
              class="py-2 flex items-center gap-2"
            >
              <template v-if="compAttrEditingIndex === i">
                <input
                  v-model="compAttrKey"
                  class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="Key"
                >
                <input
                  v-model="compAttrValue"
                  class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="Value"
                >
                <button
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  title="Save"
                  aria-label="Save"
                  @click="saveCompAttr(i)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  title="Cancel"
                  aria-label="Cancel"
                  @click="cancelCompAttr"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </template>
              <template v-else>
                <span class="flex-1 min-w-0 truncate text-white/90">{{ a.key }}</span>
                <span class="flex-1 min-w-0 truncate text-white/70">{{ a.value }}</span>
                <button
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  title="Edit"
                  aria-label="Edit"
                  @click="editCompAttr(i)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M12 20h9"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-400/60 text-red-200 hover:bg-red-500/35"
                  title="Remove"
                  aria-label="Remove"
                  @click="removeCompAttr(i)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M3 6h18"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M8 6l1-2h6l1 2"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="14"
                      rx="1.5"
                      stroke-width="1.5"
                    />
                    <path
                      d="M10 10v6M14 10v6"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </template>
            </li>
          </ul>
          <div class="mt-3 flex items-center gap-2">
            <input
              v-model="compAttrKey"
              class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
              placeholder="Key"
            >
            <input
              v-model="compAttrValue"
              class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
              placeholder="Value"
            >
            <button
              :disabled="!compAttrKey.trim()"
              class="h-10 w-10 grid place-items-center rounded-full bg-white/20 border border-white/30 hover:bg-white/30 shrink-0"
              :class="!compAttrKey.trim() ? 'opacity-60 cursor-not-allowed' : ''"
              title="Add attribute"
              aria-label="Add attribute"
              @click="addCompAttr"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm text-white/70 mb-1">Notes</label>
          <textarea
            v-model="compDraft.notes"
            rows="3"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
            placeholder="Notes about this component..."
          />
          <div
            v-if="compDraftIssueLinks.length"
            class="mt-2"
          >
            <div class="text-sm text-white/80 mb-1">
              Linked issues
            </div>
            <ul class="list-disc list-inside text-white/80 space-y-0.5">
              <li
                v-for="it in compDraftIssueLinks"
                :key="it.id"
                class="truncate"
              >
                <RouterLink
                  :to="{ name: 'issue-edit', params: { id: it.id } }"
                  class="hover:underline"
                >
                  #{{ it.number || '—' }} {{ it.title || it.id }}
                </RouterLink>
                <span class="text-xs text-white/60 ml-2">[{{ it.status || 'Open' }}]</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center gap-2">
          <button
            :disabled="!compDraft.type?.trim()"
            class="px-3 py-2 rounded-md bg-emerald-600/30 border border-emerald-400/40 hover:bg-emerald-600/40 disabled:opacity-60"
            @click="saveComponent"
          >
            Save Component
          </button>
          <button
            v-if="canCreateIssues"
            class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
            @click="openCompIssueModal"
          >
            Add Issue
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
            @click="cancelEditComponent"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>

    <!-- Add Component Issue Modal -->
    <Modal v-model="showCompIssueModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Add Issue for Component
        </h3>
      </template>
      <IssueForm v-model="compIssueDraft" />
      <template #footer>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="createCompIssue"
          >
            Create
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="showCompIssueModal = false"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from './Modal.vue'
import IssueForm from './IssueForm.vue'
import { RouterLink } from 'vue-router'
import { useUiStore } from '../stores/ui'
import { useIssuesStore } from '../stores/issues'

export type ComponentItem = {
  id?: string
  tag?: string
  type: string
  title?: string
  attributes?: Record<string, any> | Array<{ key: string; value: string }>
  status?: string
  notes?: string
  issues?: string[]
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

const props = defineProps<{
  modelValue: ComponentItem[] | null | undefined
  projectId?: string | null
  assetId?: string | null
  assetTag?: string | null
  assetSystem?: string | null
  statuses?: string[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: ComponentItem[]): void
  (e: 'change', v: ComponentItem[]): void
}>()

const ui = useUiStore()
const issuesStore = useIssuesStore()

const statuses = computed(() => props.statuses && props.statuses.length
  ? props.statuses
  : ['Not Started', 'Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Working','Has Issues','Decommissioned']
)
const canCreateIssues = computed(() => !!(props.projectId))

// Local normalized copy
const local = reactive<ComponentItem[]>(normalize(props.modelValue))
watch(() => props.modelValue, (v) => {
  const next = normalize(v)
  local.splice(0, local.length, ...next)
})
function normalize(v: any): ComponentItem[] {
  const arr = Array.isArray(v) ? v : []
  return arr.map((c: any) => ({
    id: c?.id,
    tag: c?.tag || '',
    type: String(c?.type || ''),
    title: c?.title || '',
    attributes: normalizeAttrs(c?.attributes),
    status: c?.status || '',
    notes: c?.notes || '',
    issues: Array.isArray(c?.issues) ? c.issues.slice() : [],
    createdAt: c?.createdAt,
    updatedAt: c?.updatedAt,
    createdBy: c?.createdBy,
    updatedBy: c?.updatedBy,
  }))
}
function normalizeAttrs(attrs: any): Record<string, any> {
  if (!attrs) return {}
  if (Array.isArray(attrs)) {
    // convert array of {key,value} to object
    const out: Record<string, any> = {}
    for (const it of attrs) { if (it && (it.key || it.title)) out[String(it.key ?? it.title)] = it.value ?? '' }
    return out
  }
  if (typeof attrs === 'object') return { ...attrs }
  return {}
}

function notifyChange() {
  const payload = local.map(c => ({ ...c, attributes: { ...(c.attributes as any) } }))
  emit('update:modelValue', payload)
  if (notifyTimer) clearTimeout(notifyTimer)
  notifyTimer = setTimeout(() => emit('change', payload), 600)
}
let notifyTimer: any = null

// Attribute helpers
type CompAttrPair = { key: string; value: string }
function pairsFromObject(obj?: Record<string, any>): CompAttrPair[] { if (!obj || typeof obj !== 'object') return []; return Object.entries(obj).map(([k, v]) => ({ key: String(k), value: String(v ?? '') })) }
function objectFromPairs(pairs: CompAttrPair[]): Record<string, any> { const out: Record<string, any> = {}; for (const p of pairs) { const k = String(p.key || '').trim(); if (!k) continue; out[k] = p.value } return out }
function attrSummary(attrs: any): string {
  if (!attrs) return ''
  let pairs: CompAttrPair[] = []
  if (Array.isArray(attrs)) { pairs = (attrs as any[]).map((r: any) => ({ key: String(r?.key ?? r?.title ?? ''), value: String(r?.value ?? '') })) }
  else if (typeof attrs === 'object') { pairs = Object.entries(attrs).map(([k, v]) => ({ key: String(k), value: String(v ?? '') })) }
  const shown = pairs.filter(p => p.key && (p.value || p.value === '')).slice(0, 3)
  return shown.map(p => `${p.key}: ${p.value}`).join(' • ')
}
// _formatDateTime is a small helper kept for potential future use; silence unused warning
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _formatDateTime(d?: any) { if (!d) return ''; try { return new Date(d).toLocaleString() } catch (e) { return String(d) } }

// Modal editor state
const editingIndex = ref<number | null>(null)
const compDraft = ref<ComponentItem>({ type: '', title: '', tag: '', attributes: {}, status: '', notes: '' })
const compAttrList = ref<CompAttrPair[]>([])
const compAttrEditingIndex = ref<number | null>(null)
const compAttrKey = ref('')
const compAttrValue = ref('')

const issuesById = computed(() => {
  const map: Record<string, any> = {}
  for (const it of (issuesStore.issues || [])) {
    const key = String((it as any).id || (it as any)._id || '')
    if (key) map[key] = it
  }
  return map
})
const compDraftIssueLinks = computed<any[]>(() => {
  const ids: string[] = Array.isArray(compDraft.value.issues) ? compDraft.value.issues.filter(Boolean) as string[] : []
  return ids.map(id => issuesById.value[String(id)]).filter(Boolean)
})

const showCompModal = ref(false)
const showCompIssueModal = ref(false)
const compIssueDraft = ref<any>({ status: 'open', priority: 'medium', title: '', type: '', description: '', location: '', system: '' })

function startNewComponent() {
  // use null index to signal "append" without overwriting existing items
  editingIndex.value = null
  compDraft.value = { type: '', title: '', tag: '', attributes: {}, status: '', notes: '' }
  compAttrList.value = []
  compAttrEditingIndex.value = null
  compAttrKey.value = ''
  compAttrValue.value = ''
  showCompModal.value = true
}
function editComponent(i: number) {
  const c: any = local[i]
  editingIndex.value = i
  const attrsPairs = pairsFromObject(normalizeAttrs(c?.attributes))
  compAttrList.value = attrsPairs
  compDraft.value = {
    id: c?.id,
    tag: c?.tag || '',
    type: String(c?.type || ''),
    title: c?.title || '',
    attributes: objectFromPairs(attrsPairs),
    status: c?.status || '',
    notes: c?.notes || '',
    issues: Array.isArray(c?.issues) ? c.issues.slice() : [],
    createdAt: c?.createdAt,
    updatedAt: c?.updatedAt,
    createdBy: c?.createdBy,
    updatedBy: c?.updatedBy
  }
  compAttrEditingIndex.value = null
  compAttrKey.value = ''
  compAttrValue.value = ''
  showCompModal.value = true
}
function cancelEditComponent() {
  editingIndex.value = null
  compDraft.value = { type: '', title: '', tag: '', attributes: {}, status: '', notes: '' }
  compAttrList.value = []
  cancelCompAttr()
  showCompModal.value = false
}
async function removeComponent(i: number) {
  local.splice(i, 1)
  notifyChange()
}

function duplicateComponent(i: number) {
  const c = local[i]
  if (!c) return
  const attrs = normalizeAttrs(c.attributes)
  const newTag = nextDuplicateTag(c.tag || '')
  const copy: ComponentItem = {
    tag: newTag,
    type: c.type,
    title: c.title,
    attributes: { ...attrs },
    status: c.status,
    notes: c.notes,
    issues: []
  }
  const insertAt = i + 1
  local.splice(insertAt, 0, copy)
  ui.showSuccess('Component duplicated')
  notifyChange()
}

function nextDuplicateTag(tag: string): string {
  const s = String(tag || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)-(\d+)$/)
  const base = m ? m[1] : s
  let n = m ? (isFinite(parseInt(m[2], 10)) ? parseInt(m[2], 10) + 1 : 1) : 1
  const existing = new Set(
    local.map(it => String(it?.tag || '').trim()).filter(Boolean)
  )
  let candidate = `${base}-${n}`
  while (existing.has(candidate)) {
    n += 1
    candidate = `${base}-${n}`
  }
  return candidate
}

function addCompAttr() { const k = String(compAttrKey.value || '').trim(); if (!k) return; compAttrList.value = [...compAttrList.value, { key: k, value: String(compAttrValue.value || '') }]; compAttrKey.value = ''; compAttrValue.value = '' }
function editCompAttr(i: number) { const it = compAttrList.value[i]; compAttrEditingIndex.value = i; compAttrKey.value = it?.key || ''; compAttrValue.value = it?.value || '' }
function removeCompAttr(i: number) { const arr = compAttrList.value.slice(); arr.splice(i, 1); compAttrList.value = arr; if (compAttrEditingIndex.value === i) cancelCompAttr() }
function saveCompAttr(i: number) { const k = String(compAttrKey.value || '').trim(); if (!k) return; const arr = compAttrList.value.slice(); arr[i] = { key: k, value: String(compAttrValue.value || '') }; compAttrList.value = arr; cancelCompAttr() }
function cancelCompAttr() { compAttrEditingIndex.value = null; compAttrKey.value = ''; compAttrValue.value = '' }

function saveComponent() {
  const idx = editingIndex.value
  const type = String(compDraft.value.type || '').trim()
  if (!type) { ui.showError('Component type is required'); return }
  const componentToSave: ComponentItem = {
    id: compDraft.value.id,
    tag: compDraft.value.tag || '',
    type,
    title: compDraft.value.title || '',
    attributes: objectFromPairs(compAttrList.value),
    status: compDraft.value.status || '',
    notes: compDraft.value.notes || '',
    issues: Array.isArray(compDraft.value.issues) ? compDraft.value.issues.slice() : []
  }
  if (idx !== null && idx >= 0 && idx < local.length) local.splice(idx, 1, componentToSave)
  else local.push(componentToSave)
  ui.showSuccess('Component saved')
  notifyChange()
  cancelEditComponent()
}

function openCompIssueModal() {
  const eqTag = String(props.assetTag || '')
  const eqSystem = String(props.assetSystem || '')
  compIssueDraft.value = {
    status: 'open',
    priority: 'medium',
    title: `${(compDraft.value.title || compDraft.value.type || 'Component')} issue`,
    type: '',
    description: (compDraft.value.notes || '').trim() || `Issue for component ${(compDraft.value.title || compDraft.value.type || '').trim() || 'component'}`,
    location: eqTag || '',
    system: eqSystem || ''
  }
  showCompIssueModal.value = true
}
async function createCompIssue() {
  try {
    const pid = String(props.projectId || '')
    const aid = String(props.assetId || '')
    if (!pid) { ui.showError('Missing project id'); return }
    const title = (compIssueDraft.value.title || '').trim() || `${(compDraft.value.title || compDraft.value.type || 'Component')} issue`
    const description = (compIssueDraft.value.description || '').trim() || `Issue for ${(props.assetTag || 'entity')} – ${(compDraft.value.title || compDraft.value.type || 'component')}`
    const payload: any = { ...compIssueDraft.value, title, description, projectId: pid }
    if (aid) payload.assetId = aid
    const created = await issuesStore.createIssue(payload)
    const newId = String((created as any).id || (created as any)._id)
    if (!compDraft.value.issues) compDraft.value.issues = []
    if (newId && !compDraft.value.issues.includes(newId)) compDraft.value.issues.push(newId)
    // if editing existing in list, update it too
    const idx = editingIndex.value
    if (idx != null && idx >= 0 && idx < local.length) {
      const existing = { ...(local[idx] || {}) } as ComponentItem
      const curIds: string[] = Array.isArray(existing.issues) ? existing.issues.slice() : []
      if (!curIds.includes(newId)) curIds.push(newId)
      existing.issues = curIds
      local.splice(idx, 1, existing)
      notifyChange()
    }
    ui.showSuccess('Issue created')
    showCompIssueModal.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create issue'
    ui.showError(msg)
  }
}

// Drag-and-drop
const draggingComponent = ref<any | null>(null)
function onCompDragStart(c: any, e: DragEvent) {
  draggingComponent.value = c
  if (e && e.dataTransfer) {
    try { e.dataTransfer.setData('text/plain', 'component') } catch (err) {
      // ignore: some browsers restrict setting drag data
    }
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onCompDragOver(_i: number, e: DragEvent) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move' }
function onCompDrop(targetIndex: number, e: DragEvent) {
  e.preventDefault()
  const src = draggingComponent.value
  draggingComponent.value = null
  if (!src) return
  const list = local.slice()
  const fromIdx = list.indexOf(src)
  if (fromIdx === -1 || fromIdx === targetIndex) return
  const [moved] = list.splice(fromIdx, 1)
  list.splice(targetIndex, 0, moved)
  local.splice(0, local.length, ...list)
  notifyChange()
  ui.showSuccess('Component order updated', { duration: 1400 })
}
</script>
