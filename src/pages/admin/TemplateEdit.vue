<template>
  <section class="p-4 space-y-4 text-white">
    <div>
      <BreadCrumbs :items="crumbs" />
    </div>

    <div
      v-if="error"
      class="text-red-400"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="text-white/70"
    >
      Loading...
    </div>

    <div
      v-else
      class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10"
    >
      <!-- Tabs header: Info, Components, Checklists, FPT -->
      <div class="mb-4 md:mb-6">
        <div
          role="tablist"
          class="relative flex items-center w-full"
        >
          <div
            class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out"
            :style="{ left: tabLeft + '%', width: tabWidth + '%' }"
          />
          <button
            v-for="t in tabs"
            :key="t"
            :aria-selected="currentTab === t"
            role="tab"
            class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2"
            :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'"
            @click="currentTab = t"
          >
            <svg
              v-if="t === 'Info'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            ><circle
              cx="12"
              cy="12"
              r="9"
              stroke-width="1.5"
            /><path
              d="M12 11v6"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M12 7h.01"
              stroke-width="2"
              stroke-linecap="round"
            /></svg>
            <svg
              v-else-if="t === 'Components'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            ><rect
              x="3"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="13"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="3"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="13"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'Checklists'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            ><path
              d="M9 11l3 3L22 4"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'FPT'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden
            ><path
              d="M12 6v6l4 2"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><circle
              cx="12"
              cy="12"
              r="9"
              stroke-width="1.5"
            /></svg>
            <span>{{ t }}</span>
            <span
              v-if="countForTab(t) > 0"
              class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] leading-none text-white/80"
            >{{ countForTab(t) }}</span>
          </button>
        </div>
      </div>

      <!-- Info Tab -->
      <div
        v-if="currentTab === 'Info'"
        class="grid md:grid-cols-2 gap-x-4 gap-y-2 items-start"
      >
        <div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-white/70">Tag <span class="text-red-300">*</span></label>
              <input
                v-model="form.tag"
                type="text"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              >
              <div
                v-if="!isValidTag"
                class="text-xs text-red-300 mt-1"
              >
                Tag is required.
              </div>
            </div>
            <div>
              <label class="block text-sm text-white/70">Type <span class="text-red-300">*</span></label>
              <div class="relative">
                <select
                  v-model="form.type"
                  class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                >
                  <option
                    v-for="opt in typeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.text }}
                  </option>
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                  aria-hidden
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </div>
              <div
                v-if="!isValidType"
                class="text-xs text-red-300 mt-1"
              >
                Type is required.
              </div>
            </div>
          </div>
          <div class="mt-2">
            <label class="block text-sm text-white/70">Title <span class="text-red-300">*</span></label>
            <input
              v-model="form.title"
              type="text"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
            >
            <div
              v-if="!isValidTitle"
              class="text-xs text-red-300 mt-1"
            >
              Title is required.
            </div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-white/70">System</label>
              <div class="relative">
                <select
                  v-model="form.system"
                  class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                >
                  <option
                    v-for="opt in systemSelectOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.text }}
                  </option>
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                  aria-hidden
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </div>
            </div>
            <div>
              <label class="block text-sm text-white/70">Status</label>
              <div class="relative">
                <select
                  v-model="form.status"
                  class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                >
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
                  aria-hidden
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </div>
            </div>
          </div>
          <div class="mt-2">
            <label class="block text-sm text-white/70">Description</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
            />
          </div>
          <div class="mt-2">
            <div class="flex items-center gap-3">
              <div class="text-sm text-white/70 shrink-0">
                Tags
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="t in (form as any).tags"
                  :key="t"
                  class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white/80"
                >
                  {{ t }}
                  <button
                    type="button"
                    class="text-white/60 hover:text-white"
                    aria-label="Remove tag"
                    @click="removeTemplateTag(t)"
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input
                v-model="templateTagsInput"
                type="text"
                placeholder="Add a tag and press Enter…"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                @keydown.enter.prevent="addTemplateTagsFromInput"
                @keydown.,.prevent="addTemplateTagsFromInput"
              >
              <button
                type="button"
                class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
                @click="addTemplateTagsFromInput"
              >
                Add
              </button>
            </div>
            <div class="text-xs text-white/60 mt-1">
              Tip: use commas or Enter to add multiple tags.
            </div>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <button
              :disabled="saving || !isValidForm"
              class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
              :class="(saving || !isValidForm) ? 'opacity-60 cursor-not-allowed' : ''"
              @click="save"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden
              ><path
                d="M5 13l4 4L19 7"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg>
              <span>{{ saving ? 'Saving…' : 'Save' }}</span>
            </button>
            <button
              v-if="!isNew"
              class="px-3 py-2 rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 inline-flex items-center gap-2"
              @click="onDelete"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden
              ><path
                d="M3 6h18"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M8 6l1-2h6l1 2"
                stroke-width="1.5"
                stroke-linecap="round"
              /><rect
                x="6"
                y="6"
                width="12"
                height="14"
                rx="1.5"
                stroke-width="1.5"
              /><path
                d="M10 10v6M14 10v6"
                stroke-width="1.5"
                stroke-linecap="round"
              /></svg>
              <span>Delete</span>
            </button>
            <div class="flex-1" />
            <RouterLink
              :to="{ name: 'admin-templates' }"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
            >
              Back
            </RouterLink>
          </div>
        </div>

        <!-- Right: Attributes editor -->
        <div class="space-y-2">
          <div class="rounded-md border border-white/10 bg-white/5 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm text-white/80">
                Attributes
              </div>
              <div class="text-xs text-white/60">
                {{ currentAttributes.length }} items
              </div>
            </div>
            <div
              v-if="currentAttributes.length === 0"
              class="text-white/60 text-sm"
            >
              No attributes yet.
            </div>
            <ul
              v-else
              class="divide-y divide-white/10"
            >
              <li
                v-for="(a, i) in currentAttributes"
                :key="i"
                class="py-2 flex items-center gap-2"
              >
                <template v-if="editingIndex === i">
                  <input
                    v-model="editKey"
                    class="w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                    placeholder="Key"
                  >
                  <input
                    v-model="editValue"
                    class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                    placeholder="Value"
                  >
                  <button
                    class="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 text-sm"
                    @click="saveEdit(i)"
                  >
                    Save
                  </button>
                  <button
                    class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                    @click="cancelEdit"
                  >
                    Cancel
                  </button>
                </template>
                <template v-else>
                  <div class="w-40 truncate text-white/90">
                    {{ a.key }}
                  </div>
                  <div class="flex-1 min-w-0 truncate text-white/70">
                    {{ a.value }}
                  </div>
                  <button
                    class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                    @click="startEdit(i)"
                  >
                    Edit
                  </button>
                  <button
                    class="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 text-sm"
                    @click="removeAttr(i)"
                  >
                    Remove
                  </button>
                </template>
              </li>
            </ul>

            <div class="mt-3 flex items-center gap-2">
              <input
                v-model="newAttrKey"
                class="w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                placeholder="Key"
              >
              <input
                v-model="newAttrValue"
                class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                placeholder="Value"
              >
              <button
                :disabled="!newAttrKey.trim()"
                class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                :class="!newAttrKey.trim() ? 'opacity-60 cursor-not-allowed' : ''"
                @click="addAttr"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Components Tab -->
      <div
        v-else-if="currentTab === 'Components'"
        class="space-y-3"
      >
        <ComponentsPanel
          v-model="components"
          :statuses="statuses"
          :project-id="null"
          :asset-id="templateId"
          :asset-tag="String(form.tag || '')"
          :asset-system="String(form.system || '')"
          @change="onComponentsChange"
        />
        <div
          v-if="isNew"
          class="text-xs text-white/60"
        >
          Tip: Save the template first to enable autosave for this tab.
        </div>
      </div>

      <!-- Checklists Tab -->
      <div v-else-if="currentTab === 'Checklists'">
        <ChecklistPanel
          v-model="checklists"
          :project-id="null"
          :equipment-id="templateId"
          :equipment-tag="String(form.tag || '')"
          @change="onChecklistsChange"
        />
        <div
          v-if="isNew"
          class="text-xs text-white/60 mt-2"
        >
          Tip: Save the template first to enable autosave for this tab.
        </div>
      </div>

      <!-- FPT Tab -->
      <div v-else-if="currentTab === 'FPT'">
        <FunctionalTestsPanel
          v-model="functionalTests"
          :project-id="null"
          :equipment-id="templateId"
          :equipment-tag="String(form.tag || '')"
          @change="onFunctionalTestsChange"
          @save="onFunctionalTestsSave"
        />
        <div
          v-if="isNew"
          class="text-xs text-white/60 mt-2"
        >
          Tip: Save the template first to enable autosave for this tab.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../../utils/http'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ComponentsPanel from '../../components/ComponentsPanel.vue'
import ChecklistPanel from '../../components/ChecklistPanel.vue'
import FunctionalTestsPanel from '../../components/FunctionalTestsPanel.vue'
import { useUiStore } from '../../stores/ui'
import lists from '../../lists.js'
import { RouterLink } from 'vue-router'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))
const templateId = computed(() => String(id.value || ''))
const isNew = computed(() => templateId.value === 'new')
const error = ref('')
const loading = ref(false)
const saving = ref(false)

const ui = useUiStore()

type AdminTemplate = Record<string, any>

const statuses = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']
const form = ref<AdminTemplate>({
  tag: '',
  title: '',
  type: '',
  system: '',
  status: 'Not Started',
  description: '',
  tags: [],
  attributes: [],
  components: [],
  checklists: [],
  functionalTests: [],
})

const crumbs = computed(() => [
  { text: 'Admin', to: '/app/admin' },
  { text: 'Templates', to: '/app/admin/templates' },
  { text: (form.value?.tag || form.value?.title || (isNew.value ? 'New' : 'Edit')) },
])

const tabs = ['Info', 'Components', 'Checklists', 'FPT'] as const
const currentTab = ref<typeof tabs[number]>('Info')
const tabIndex = computed(() => Math.max(0, tabs.indexOf(currentTab.value)))
const tabWidth = computed(() => 100 / tabs.length)
const tabLeft = computed(() => tabIndex.value * tabWidth.value)

function normalizeTemplateTags(tags: any): string[] {
  const arr = Array.isArray(tags) ? tags : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const t = String(raw || '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

const templateTagsInput = ref('')
function addTemplateTagsFromInput() {
  const raw = String(templateTagsInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  form.value.tags = normalizeTemplateTags([ ...(form.value.tags || []), ...parts ])
  templateTagsInput.value = ''
}
function removeTemplateTag(tag: string) {
  const key = String(tag || '').trim().toLowerCase()
  form.value.tags = (Array.isArray(form.value.tags) ? form.value.tags : [])
    .filter((t: any) => String(t || '').trim().toLowerCase() !== key)
}

const systemSelectOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.systemOptions || []
  return arr
    .filter((opt: any) => opt && (opt.value !== undefined))
    .map((opt: any) => ({ value: opt.value === null ? '' : String(opt.value), text: String(opt.text ?? opt.value) }))
})
const typeOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  return arr.filter((opt: any) => opt && opt.value).map((opt: any) => ({ value: String(opt.value), text: String(opt.text ?? opt.value) }))
})

// Attributes UI state and helpers (key/value mapped to template attributes {key, value})
const newAttrKey = ref('')
const newAttrValue = ref('')
const editingIndex = ref<number | null>(null)
const editKey = ref('')
const editValue = ref('')

const currentAttributes = computed<Array<{ key: string; value: string }>>(() => {
  const arr = Array.isArray(form.value.attributes) ? form.value.attributes : []
  return arr.map((r: any) => ({ key: String(r?.key ?? r?.title ?? ''), value: String(r?.value ?? '') })).filter((r: any) => (r.key || r.value))
})

async function patchFields(patch: Record<string, any>) {
  if (isNew.value) return
  const sanitized = { ...patch }
  delete sanitized.projectId
  delete sanitized.spaceId
  const { data } = await http.patch(`/api/admin/templates/${templateId.value}`, sanitized)
  form.value = normalizeLoaded(data)
}

function normalizeLoaded(t: any): AdminTemplate {
  const next = { ...(t || {}) }
  next.tags = normalizeTemplateTags(next.tags)
  if (next.attributes && !Array.isArray(next.attributes)) {
    const arr = typeof next.attributes === 'object'
      ? Object.entries(next.attributes).map(([k, v]) => ({ key: String(k), value: String(v ?? '') }))
      : []
    next.attributes = arr
  }
  if (!Array.isArray(next.attributes)) next.attributes = []
  if (!Array.isArray(next.components)) next.components = []
  if (!Array.isArray(next.checklists)) next.checklists = []
  if (!Array.isArray(next.functionalTests)) next.functionalTests = []
  if (!next.status) next.status = 'Not Started'
  return next
}

async function persistAttributes(): Promise<boolean> {
  try {
    const attrs = currentAttributes.value
      .map(r => ({ key: String(r.key || '').trim(), value: String(r.value || '') }))
      .filter(r => !!r.key)
    await patchFields({ attributes: attrs })
    return true
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save attributes')
    return false
  }
}

async function addAttr() {
  const k = String(newAttrKey.value || '').trim()
  const v = String(newAttrValue.value || '').trim()
  if (!k) return
  const arr = currentAttributes.value.slice()
  arr.push({ key: k, value: v })
  form.value.attributes = arr
  newAttrKey.value = ''
  newAttrValue.value = ''
  if (!isNew.value) await persistAttributes()
}
async function removeAttr(i: number) {
  const arr = currentAttributes.value.slice()
  arr.splice(i, 1)
  form.value.attributes = arr
  if (editingIndex.value === i) cancelEdit()
  if (!isNew.value) await persistAttributes()
}
function startEdit(i: number) {
  const item = currentAttributes.value[i]
  editingIndex.value = i
  editKey.value = item?.key || ''
  editValue.value = item?.value || ''
}
async function saveEdit(i: number) {
  const k = String(editKey.value || '').trim()
  const v = String(editValue.value || '').trim()
  if (!k) return
  const arr = currentAttributes.value.slice()
  arr[i] = { key: k, value: v }
  form.value.attributes = arr
  cancelEdit()
  if (!isNew.value) await persistAttributes()
}
function cancelEdit() { editingIndex.value = null; editKey.value = ''; editValue.value = '' }

// Components state and helpers (mirrors TemplateEditor)
const componentsList = computed<any[]>({
  get() { return Array.isArray(form.value.components) ? form.value.components : [] },
  set(v: any[]) { form.value.components = Array.isArray(v) ? v : [] },
})
const components = computed<any[]>({
  get() { return componentsList.value },
  set(v: any[]) { componentsList.value = Array.isArray(v) ? v : [] },
})
function objectFromPairs(pairs?: Array<{ key: string; value: any }>): Record<string, any> {
  const out: Record<string, any> = {}
  const list = Array.isArray(pairs) ? pairs : []
  for (const p of list) {
    const k = String((p as any)?.key || '').trim()
    if (!k) continue
    out[k] = (p as any)?.value
  }
  return out
}
async function persistComponents(): Promise<boolean> {
  try {
    const payloadList = (componentsList.value || []).map((c: any) => {
      const attrs = Array.isArray(c?.attributes) ? objectFromPairs(c.attributes as any) : (c?.attributes || {})
      const out: any = {
        id: c?.id,
        tag: c?.tag || '',
        type: c?.type,
        title: c?.title,
        attributes: attrs,
        status: c?.status || '',
        notes: c?.notes || '',
        issues: Array.isArray(c?.issues) ? c.issues : undefined,
      }
      return out
    })
    await patchFields({ components: payloadList })
    return true
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save components')
    return false
  }
}
let componentsSaveTimer: any = null
function onComponentsChange(list: any[]) {
  if (componentsSaveTimer) clearTimeout(componentsSaveTimer)
  componentsSaveTimer = setTimeout(async () => {
    componentsList.value = Array.isArray(list) ? list : []
    if (!isNew.value) {
      const ok = await persistComponents()
      if (ok) ui.showSuccess('Components saved')
    }
    componentsSaveTimer = null
  }, 700)
}

// Checklists and FPT as arrays with debounced persistence
const checklists = computed<any[]>({
  get() {
    const cl: any = form.value.checklists
    if (Array.isArray(cl)) return cl
    if (cl && typeof cl === 'object') return Object.values(cl)
    return []
  },
  set(v: any[]) { form.value.checklists = Array.isArray(v) ? v : [] },
})
const functionalTests = computed<any[]>({
  get() {
    const ft: any = form.value.functionalTests
    if (Array.isArray(ft)) return ft
    if (ft && typeof ft === 'object') return Object.values(ft)
    return []
  },
  set(v: any[]) { form.value.functionalTests = Array.isArray(v) ? v : [] },
})

let fptSaveTimer: any = null
async function persistFunctionalTests(tests: any[]) {
  try {
    await patchFields({ functionalTests: tests })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save functional tests')
  }
}
function onFunctionalTestsChange(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  fptSaveTimer = setTimeout(async () => {
    if (!isNew.value) {
      await persistFunctionalTests(tests)
      ui.showSuccess('Functional tests saved')
    }
    fptSaveTimer = null
  }, 700)
}
function onFunctionalTestsSave(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  if (!isNew.value) {
    persistFunctionalTests(tests).then(() => ui.showSuccess('Functional tests saved'))
  }
}

let checklistSaveTimer: any = null
async function persistChecklists(sections: any[]) {
  try {
    await patchFields({ checklists: sections })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save checklist')
  }
}
function onChecklistsChange(sections: any[]) {
  if (checklistSaveTimer) clearTimeout(checklistSaveTimer)
  checklistSaveTimer = setTimeout(async () => {
    if (!isNew.value) {
      await persistChecklists(sections)
      ui.showSuccess('Checklist saved')
    }
    checklistSaveTimer = null
  }, 700)
}

function countForTab(t: string) {
  if (t === 'Components') return Array.isArray(form.value.components) ? form.value.components.length : 0
  if (t === 'Checklists') return checklists.value.length
  if (t === 'FPT') return functionalTests.value.length
  return 0
}

const isValidTag = computed(() => !!String(form.value.tag || '').trim())
const isValidTitle = computed(() => !!String(form.value.title || '').trim())
const isValidType = computed(() => !!String(form.value.type || '').trim())
const isValidForm = computed(() => isValidTag.value && isValidTitle.value && isValidType.value)

async function load() {
  try {
    error.value = ''
    loading.value = true
    if (isNew.value) {
      form.value = normalizeLoaded({
        tag: '',
        title: '',
        type: '',
        system: '',
        status: 'Not Started',
        description: '',
        tags: [],
        attributes: [],
        components: [],
        checklists: [],
        functionalTests: [],
      })
      return
    }
    const { data } = await http.get(`/api/admin/templates/${templateId.value}`)
    form.value = normalizeLoaded(data)
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || String(err)
    form.value = normalizeLoaded({})
  } finally {
    loading.value = false
  }
}

async function save() {
  try {
    error.value = ''
    if (!isValidForm.value) { ui.showError('Please fill Tag, Title, and Type'); return }
    saving.value = true
    const attrs = Array.isArray(form.value.attributes)
      ? form.value.attributes
          .map((r: any) => ({ key: String(r?.key || '').trim(), value: String(r?.value || '') }))
          .filter((r: any) => !!r.key)
      : []
    const payload: any = {
      tag: form.value.tag,
      title: form.value.title,
      type: form.value.type,
      description: form.value.description || undefined,
      tags: normalizeTemplateTags(form.value.tags),
      attributes: attrs,
      status: form.value.status || 'Not Started',
      components: form.value.components || [],
      checklists: form.value.checklists || [],
      functionalTests: form.value.functionalTests || [],
    }
    if (form.value.system && String(form.value.system).trim()) payload.system = String(form.value.system)
    delete payload.projectId
    delete payload.spaceId

    if (isNew.value) {
      const { data } = await http.post('/api/admin/templates', payload)
      ui.showSuccess('Template created')
      router.replace({ name: 'admin-templates-edit', params: { id: String(data?._id || data?.id || '') } })
    } else {
      const { data } = await http.patch(`/api/admin/templates/${templateId.value}`, payload)
      form.value = normalizeLoaded(data)
      ui.showSuccess('Template saved')
    }
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || String(err)
    ui.showError(error.value || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  try {
    if (isNew.value) return
    const { confirm: inlineConfirm } = await import('../../utils/confirm')
    const ok = await inlineConfirm({ title: 'Delete template', message: 'Delete this template? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
    if (!ok) return
    await http.delete(`/api/admin/templates/${templateId.value}`)
    ui.showSuccess('Template deleted')
    router.push({ name: 'admin-templates' })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete')
  }
}

watch(id, () => load(), { immediate: true })
</script>

<style scoped>
</style>
