<template>
  <div class="p-4">
    <BreadCrumbs :items="crumbs" />

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="text-white/70"
    >
      Loading...
    </div>

    <div v-else>
      <div class="flex items-center gap-4 border-b border-white/10 mb-4">
        <button
          v-for="t in tabs"
          :key="t"
          type="button"
          class="px-3 py-2 text-sm"
          :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'"
          @click="currentTab = t"
        >
          {{ t }}
        </button>
      </div>

      <div
        v-if="currentTab === 'Info'"
        class="space-y-4 max-w-3xl"
      >
        <div class="p-3 rounded bg-white/5 border border-white/10">
          <div class="text-sm text-white/80 mb-2">
            Source format
          </div>
          <div class="flex items-center gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="sourceType"
                class="w-4 h-4"
                :checked="form.sourceType === 'xml'"
                @change="setSourceType('xml')"
              >
              XML
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="radio"
                name="sourceType"
                class="w-4 h-4"
                :checked="form.sourceType === 'csv'"
                @change="setSourceType('csv')"
              >
              CSV
            </label>
          </div>
          <div class="text-xs text-white/60 mt-2">
            Choose either XML or CSV. Only one can be used at a time.
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-white/80 mb-1">Name</label>
            <input
              v-model="form.name"
              class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
              placeholder="Cx General"
            >
          </div>
          <div>
            <label class="block text-white/80 mb-1">Slug</label>
            <input
              v-model="form.slug"
              class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
              placeholder="cx-general"
            >
            <p class="text-xs text-white/60 mt-1">
              Optional. If blank, it will be generated from the name.
            </p>
          </div>
          <div>
            <label class="block text-white/80 mb-1">Category</label>
            <input
              v-model="form.category"
              class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
              placeholder="Cx"
            >
          </div>
          <div>
            <label class="block text-white/80 mb-1">Version</label>
            <input
              v-model="form.version"
              class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
              placeholder="1.0.0"
            >
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="active"
            v-model="form.isActive"
            type="checkbox"
            class="w-4 h-4"
          >
          <label
            for="active"
            class="text-white/80"
          >
            Active (visible to Premium users)
          </label>
        </div>

        <div>
          <label class="block text-white/80 mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            placeholder="Optional description for admins and Premium users"
          />
        </div>

        <div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-white/70 shrink-0">
              Tags
            </div>
            <button
              v-if="canSuggestTemplateTags"
              type="button"
              class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="suggestingTemplateTags"
              @click="suggestTemplateTags"
            >
              {{ suggestingTemplateTags ? 'Suggesting…' : 'Suggest tags' }}
            </button>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="t in form.tags"
                :key="t"
                class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80"
              >
                <span>{{ t }}</span>
                <button
                  type="button"
                  class="text-white/60 hover:text-white"
                  aria-label="Remove tag"
                  @click="removeTag(t)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <input
              v-model="tagsInput"
              type="text"
              placeholder="Add a tag and press Enter…"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
              @keydown.enter.prevent="addTagsFromInput"
              @keydown.,.prevent="addTagsFromInput"
            >
            <button
              type="button"
              class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
              @click="addTagsFromInput"
            >
              Add
            </button>
          </div>
          <div class="text-xs text-white/60 mt-1">
            Tip: use commas or Enter to add multiple tags.
          </div>
          <div
            v-if="suggestedTemplateTagsFiltered.length"
            class="mt-2 rounded-md border border-white/10 bg-black/20 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs text-white/60">
                Suggested tags
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80"
                  @click="applyAllSuggestedTemplateTags"
                >
                  Add all
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white/70"
                  @click="dismissSuggestedTemplateTags"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="s in suggestedTemplateTagsFiltered"
                :key="s.tag"
                type="button"
                class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 hover:bg-white/15"
                :title="s.reason || ''"
                @click="addTemplateTag(String(s.tag || ''))"
              >
                <span>{{ s.tag }}</span>
                <span
                  v-if="typeof s.confidence === 'number'"
                  class="text-white/60"
                >{{ Math.round(s.confidence * 100) }}%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="currentTab === 'XML'"
        class="space-y-2 max-w-5xl"
      >
        <div
          v-if="form.sourceType !== 'xml'"
          class="p-3 rounded bg-amber-500/10 border border-amber-400/30 text-amber-100 text-sm"
        >
          Switch Source format to <span class="font-semibold">XML</span> to edit this tab.
        </div>
        <div class="flex items-center justify-between gap-3">
          <label class="block text-white/80">MS Project XML</label>
          <input
            ref="xmlFile"
            type="file"
            accept=".xml"
            class="text-sm text-white/70"
            @change="onXmlFileSelected"
          >
        </div>
        <textarea
          v-model="form.xml"
          rows="18"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400 font-mono text-xs"
          placeholder="Paste MS Project XML here"
          :disabled="form.sourceType !== 'xml'"
        />
        <p class="text-xs text-white/60">
          This XML is stored as the template source and used to import tasks into a project.
        </p>
      </div>

      <div
        v-else-if="currentTab === 'CSV'"
        class="space-y-2 max-w-5xl"
      >
        <div
          v-if="form.sourceType !== 'csv'"
          class="p-3 rounded bg-amber-500/10 border border-amber-400/30 text-amber-100 text-sm"
        >
          Switch Source format to <span class="font-semibold">CSV</span> to edit this tab.
        </div>
        <div class="flex items-center justify-between gap-3">
          <label class="block text-white/80">CSV</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="h-9 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
              title="Download a 5-row sample CSV"
              @click="downloadSampleCsv"
            >
              Download sample
            </button>
            <input
              ref="csvFile"
              type="file"
              accept=".csv,text/csv"
              class="text-sm text-white/70"
              @change="onCsvFileSelected"
            >
          </div>
        </div>
        <textarea
          v-model="form.csv"
          rows="18"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400 font-mono text-xs"
          placeholder="Paste CSV here (first row must be headers)"
          :disabled="form.sourceType !== 'csv'"
        />
        <div class="text-xs text-white/60">
          Header suggestions: <span class="font-mono">taskId,wbs,name,description,start,finish,duration,percentComplete,status,notes,tags,dependencies</span>
        </div>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div class="text-white/80">
          Preview
        </div>
        <div
          v-if="previewError"
          class="text-red-300 text-sm"
        >
          {{ previewError }}
        </div>
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div class="p-3 rounded bg-white/5 border border-white/10">
            <div class="text-xs text-white/60">
              Tasks
            </div>
            <div class="text-xl text-white">
              {{ previewStats.taskCount }}
            </div>
          </div>
          <div class="p-3 rounded bg-white/5 border border-white/10">
            <div class="text-xs text-white/60">
              Max outline level
            </div>
            <div class="text-xl text-white">
              {{ previewStats.maxOutlineLevel }}
            </div>
          </div>
          <div class="p-3 rounded bg-white/5 border border-white/10">
            <div class="text-xs text-white/60">
              Distinct WBS values (sampled)
            </div>
            <div class="text-xl text-white">
              {{ previewStats.distinctWbs }}
            </div>
          </div>
        </div>

        <div class="p-3 rounded bg-white/5 border border-white/10">
          <div class="text-sm text-white/70 mb-2">
            First {{ previewTasks.length }} tasks
          </div>
          <div class="overflow-auto">
            <table class="min-w-[720px] w-full text-left border-collapse">
              <thead>
                <tr class="text-white/70 text-sm">
                  <th class="p-2 border-b border-white/10">
                    WBS
                  </th>
                  <th class="p-2 border-b border-white/10">
                    Name
                  </th>
                  <th class="p-2 border-b border-white/10">
                    Outline level
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(t, idx) in previewTasks"
                  :key="idx"
                  class="border-b border-white/5 text-sm text-white/80"
                >
                  <td class="p-2 whitespace-nowrap">
                    {{ t.wbs || '—' }}
                  </td>
                  <td class="p-2">
                    {{ t.name || '—' }}
                  </td>
                  <td class="p-2 whitespace-nowrap">
                    {{ t.outlineLevel ?? '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="text-xs text-white/60 mt-2">
            Preview is generated in the browser and may truncate large XMLs.
          </div>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <RouterLink
            :to="{ name: 'admin-task-templates' }"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
          >
            Back
          </RouterLink>

          <button
            :disabled="saving || !canSave"
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
            :disabled="saving || !canClone"
            class="h-10 w-10 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Clone"
            aria-label="Clone"
            @click="cloneTemplate"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
              aria-hidden
            ><rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              stroke-width="1.5"
            /><path
              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
          </button>

          <button
            v-if="!isNew"
            :disabled="saving"
            class="h-10 w-10 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Delete"
            aria-label="Delete"
            @click="del"
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
          </button>

          <span
            v-if="isDirty && !loading"
            class="ml-2 text-xs px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-100"
          >
            Unsaved changes
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-white/60">
            {{ isNew ? 'New' : `ID: ${id}` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
  import http from '../../utils/http'
  import BreadCrumbs from '../../components/BreadCrumbs.vue'
  import { useUiStore } from '../../stores/ui'
  import { useProjectStore } from '../../stores/project'
  import { useAiStore } from '../../stores/ai'

  const ui = useUiStore()
  const projectStore = useProjectStore()
  const ai = useAiStore()
  const route = useRoute()
  const router = useRouter()
  const id = computed(() => String(route.params.id || ''))
  const isNew = computed(() => id.value === 'new')
const tabs = ['Info', 'XML', 'CSV', 'Preview'] as const
const currentTab = ref<typeof tabs[number]>('Info')

const loading = ref(false)
const saving = ref(false)
  const error = ref('')
  const xmlFile = ref(null)
  const csvFile = ref(null)
  const tagsInput = ref('')
  const suggestingTemplateTags = ref(false)
  const suggestedTemplateTags = ref<Array<{ tag: string; confidence?: number; reason?: string }>>([])

const form = ref({
  name: '',
  slug: '',
  category: '',
  version: '1.0.0',
  isActive: true,
  description: '',
  tags: [] as string[],
  sourceType: 'xml' as 'xml' | 'csv',
  xml: '',
  csv: '',
})

const crumbs = computed(() => [
  { text: 'Admin', to: '/app/admin' },
  { text: 'Task Templates', to: '/app/admin/templates/task-templates' },
  { text: isNew.value ? 'New' : (form.value?.name || 'Edit') },
])

const initialSnapshot = ref('')
const isDirty = computed(() => {
  if (loading.value) return false
  return snapshotForm(form.value) !== initialSnapshot.value
})

const canSave = computed(() => {
  const hasName = String(form.value.name || '').trim().length > 0
  if (!hasName) return false
  if (form.value.sourceType === 'csv') return String(form.value.csv || '').trim().length > 0
  return String(form.value.xml || '').trim().length > 0
})

const canClone = computed(() => {
  return !loading.value && canSave.value && !saving.value
})

function normalizeTags(tags) {
  const arr = Array.isArray(tags) ? tags : []
  const out = []
  const seen = new Set()
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

function addTagsFromInput() {
  const raw = String(tagsInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  form.value.tags = normalizeTags([...(form.value.tags || []), ...parts])
  tagsInput.value = ''
}

  function removeTag(tag) {
    const key = String(tag || '').trim().toLowerCase()
    form.value.tags = (Array.isArray(form.value.tags) ? form.value.tags : [])
      .filter((t) => String(t || '').trim().toLowerCase() !== key)
  }

  function addTemplateTag(tag: string) {
    const t = String(tag || '').trim()
    if (!t) return
    form.value.tags = normalizeTags([...(form.value.tags || []), t])
  }

  const canSuggestTemplateTags = computed(() => {
    const pid = String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    if (!pid) return false
    const p = projectStore.currentProject || {}
    if (p.ai && p.ai.enabled === false) return false
    const tier = String(p.subscriptionTier || '').toLowerCase()
    const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
    return tier === 'premium' || hasFeature
  })

  const suggestedTemplateTagsFiltered = computed(() => {
    const existing = new Set((form.value.tags || []).map(t => String(t || '').trim().toLowerCase()).filter(Boolean))
    const list = Array.isArray(suggestedTemplateTags.value) ? suggestedTemplateTags.value : []
    return list
      .filter((s) => s && s.tag && !existing.has(String(s.tag).trim().toLowerCase()))
      .slice(0, 12)
  })

  function dismissSuggestedTemplateTags() {
    suggestedTemplateTags.value = []
  }

  function applyAllSuggestedTemplateTags() {
    for (const s of suggestedTemplateTagsFiltered.value) addTemplateTag(String(s.tag || ''))
    dismissSuggestedTemplateTags()
  }

  async function suggestTemplateTags() {
    const pid = String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    if (!pid) {
      ui.showError('Select a project to enable tag suggestions')
      return
    }
    suggestingTemplateTags.value = true
    try {
      const entity = {
        name: String(form.value.name || '').trim(),
        category: String(form.value.category || '').trim(),
        version: String(form.value.version || '').trim(),
        description: String(form.value.description || '').trim(),
        sourceType: String(form.value.sourceType || '').trim(),
      }
      const allowed = Array.isArray(projectStore.currentProject?.tags) ? projectStore.currentProject?.tags : []
      const tags = await ai.suggestTags(pid, 'taskTemplate', entity, { existingTags: form.value.tags || [], allowedTags: allowed })
      suggestedTemplateTags.value = Array.isArray(tags) ? tags : []
      if (!suggestedTemplateTagsFiltered.value.length) ui.showInfo('No new tag suggestions')
    } catch (e: any) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to suggest tags')
    } finally {
      suggestingTemplateTags.value = false
    }
  }

  function snapshotForm(v) {
    const s = v || {}
    return JSON.stringify({
      name: String(s.name || ''),
    slug: String(s.slug || ''),
    category: String(s.category || ''),
    version: String(s.version || ''),
    isActive: !!s.isActive,
    description: String(s.description || ''),
    tags: normalizeTags(s.tags),
    sourceType: s.sourceType === 'csv' ? 'csv' : 'xml',
    xml: String(s.xml || ''),
    csv: String(s.csv || ''),
  })
}

function setSourceType(next: 'xml' | 'csv') {
  const cur = form.value.sourceType === 'csv' ? 'csv' : 'xml'
  if (cur === next) return
  form.value.sourceType = next
  if (next === 'csv') {
    form.value.xml = ''
    try { if (xmlFile.value) xmlFile.value.value = '' } catch (_) { /* ignore */ }
    if (currentTab.value === 'XML') currentTab.value = 'CSV'
  } else {
    form.value.csv = ''
    try { if (csvFile.value) csvFile.value.value = '' } catch (_) { /* ignore */ }
    if (currentTab.value === 'CSV') currentTab.value = 'XML'
  }
}

async function load() {
  if (isNew.value) {
    form.value = {
      name: '',
      slug: '',
      category: '',
      version: '1.0.0',
      isActive: true,
      description: '',
      tags: [],
      sourceType: 'xml',
      xml: '',
      csv: '',
    }
    initialSnapshot.value = snapshotForm(form.value)
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get(`/api/admin/task-templates/${id.value}`)
    const sourceType = String(data?.sourceType || '').trim().toLowerCase() === 'csv'
      ? 'csv'
      : (String(data?.csv || '').trim() ? 'csv' : 'xml')
    form.value = {
      name: data?.name || '',
      slug: data?.slug || '',
      category: data?.category || '',
      version: data?.version || '1.0.0',
      isActive: data?.isActive !== false,
      description: data?.description || '',
      tags: normalizeTags(data?.tags),
      xml: data?.xml || '',
      csv: data?.csv || '',
      sourceType,
    }
    if (form.value.sourceType === 'csv') form.value.xml = ''
    else form.value.csv = ''
    initialSnapshot.value = snapshotForm(form.value)
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function onXmlFileSelected(e) {
  if (form.value.sourceType !== 'xml') setSourceType('xml')
  const file = e?.target?.files && e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    form.value.xml = String(text || '')
    ui.showInfo('XML loaded')
  } catch (err) {
    ui.showError(err?.message || 'Failed to read XML')
  } finally {
    try {
      if (xmlFile.value) xmlFile.value.value = ''
    } catch (_) {
      /* ignore */
    }
  }
}

async function onCsvFileSelected(e) {
  if (form.value.sourceType !== 'csv') setSourceType('csv')
  const file = e?.target?.files && e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    form.value.csv = String(text || '')
    ui.showInfo('CSV loaded')
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to read CSV')
  } finally {
    try {
      if (csvFile.value) csvFile.value.value = ''
    } catch (_) {
      /* ignore */
    }
  }
}

function downloadSampleCsv() {
  const headers = [
    'taskId',
    'wbs',
    'name',
    'description',
    'start',
    'finish',
    'duration',
    'percentComplete',
    'status',
    'notes',
    'tags',
    'dependencies',
  ]

  const rows: Array<Array<string | number>> = [
    [1, '1', 'PROJECT NAME (Proj #)', 'Root summary', '2025-01-01T09:00:00', '2025-01-02T09:00:00', 1, 0, 'Not Started', '', 'project', ''],
    [2, '1.1', 'DESIGN', 'Design phase', '2025-01-02T09:00:00', '2025-01-10T09:00:00', 8, 0, 'Not Started', '', 'design', ''],
    [3, '1.1.1', 'Project Start', 'Milestone', '2025-01-02T09:00:00', '2025-01-02T09:00:00', 1, 0, 'Not Started', 'Milestone row', 'milestone;phase1', ''],
    [4, '1.1.2', 'Basis of Design (BoD)', 'Document review', '2025-01-03T09:00:00', '2025-01-03T17:00:00', 1, 0, 'Not Started', 'Review docs', 'review', '3'],
    [5, '1.1.3', 'Design Review 1', 'Review meeting', '2025-01-04T09:00:00', '2025-01-04T12:00:00', 1, 0, 'Not Started', '', 'meeting', '4'],
  ]

  const csvEscape = (value: unknown) => {
    const s = String(value ?? '')
    if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(r => r.map(csvEscape).join(',')),
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = 'task-template-sample.csv'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

function normalizedPayload() {
  const payload: any = { ...form.value }
  payload.tags = normalizeTags(payload.tags)
  payload.sourceType = payload.sourceType === 'csv' ? 'csv' : 'xml'
  if (payload.sourceType === 'csv') payload.xml = ''
  else payload.csv = ''
  return payload
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''
  try {
    if (isNew.value) {
      const { data } = await http.post('/api/admin/task-templates', normalizedPayload())
      ui.showSuccess('Saved')
      initialSnapshot.value = snapshotForm(form.value)
      const newId = String(data?._id || '')
      if (newId) {
        await router.replace({ name: 'admin-task-templates-edit', params: { id: newId } })
      }
    } else {
      const { data } = await http.patch(`/api/admin/task-templates/${id.value}`, normalizedPayload())
      form.value = {
        name: data?.name || '',
        slug: data?.slug || '',
        category: data?.category || '',
        version: data?.version || '1.0.0',
        isActive: data?.isActive !== false,
        description: data?.description || '',
        tags: normalizeTags(data?.tags),
        sourceType: String(data?.sourceType || '').trim().toLowerCase() === 'csv' ? 'csv' : 'xml',
        xml: data?.xml || '',
        csv: data?.csv || '',
      }
      if (form.value.sourceType === 'csv') form.value.xml = ''
      else form.value.csv = ''
      ui.showSuccess('Saved')
      initialSnapshot.value = snapshotForm(form.value)
    }
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || String(e)
  } finally {
    saving.value = false
  }
}

async function cloneTemplate() {
  if (!canClone.value) return
  if (!confirm('Clone this task template?')) return
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...normalizedPayload(),
      name: `Copy of ${String(form.value.name || '').trim() || 'Task Template'}`,
      slug: '',
      isActive: false,
    }
    const { data } = await http.post('/api/admin/task-templates', payload)
    const newId = String(data?._id || '')
    ui.showSuccess('Cloned')
    if (newId) {
      await router.push({ name: 'admin-task-templates-edit', params: { id: newId } })
    }
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || String(e)
  } finally {
    saving.value = false
  }
}

async function del() {
  if (isNew.value) return
  if (!confirm('Delete this task template?')) return
  saving.value = true
  try {
    await http.delete(`/api/admin/task-templates/${id.value}`)
    ui.showSuccess('Deleted')
    router.push({ name: 'admin-task-templates' })
  } catch (e) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete')
  } finally {
    saving.value = false
  }
}

const previewError = ref('')
const previewTasks = ref<Array<{ wbs: string; name: string; outlineLevel: number | null }>>([])
const previewStats = ref({ taskCount: 0, maxOutlineLevel: 0, distinctWbs: 0 })

function parseCsvRows(input: string, delimiter = ',') {
  const text = String(input || '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    if (row.length === 1 && String(row[0] || '').trim() === '') {
      row = []
      return
    }
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1]
        if (next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
      continue
    }
    if (c === delimiter) {
      pushField()
      continue
    }
    if (c === '\n') {
      pushField()
      pushRow()
      continue
    }
    if (c === '\r') continue
    field += c
  }
  pushField()
  pushRow()
  return rows
}

function normalizeCsvHeader(h: string) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

function buildPreview() {
  previewError.value = ''
  previewTasks.value = []
  previewStats.value = { taskCount: 0, maxOutlineLevel: 0, distinctWbs: 0 }
  if (form.value.sourceType === 'csv') {
    const csv = String(form.value.csv || '')
    if (!csv.trim()) return
    if (csv.length > 2_000_000) {
      previewError.value = 'CSV is too large to preview in the browser (over 2MB).'
      return
    }
    try {
      const rows = parseCsvRows(csv)
      if (!rows.length) return
      const headers = rows[0].map(normalizeCsvHeader)
      const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((c) => String(c || '').trim()))
      previewStats.value.taskCount = dataRows.length
      const wbsSet = new Set<string>()
      let maxOutlineLevel = 0
      const wbsIndex = headers.indexOf('wbs')
      const outlineIndex = headers.indexOf('outlinenumber')
      const nameIndex = headers.indexOf('name')
      const tasks = []
      for (const r of dataRows.slice(0, 50)) {
        const wbs = String((wbsIndex >= 0 ? r[wbsIndex] : '') || (outlineIndex >= 0 ? r[outlineIndex] : '') || '').trim()
        const name = String((nameIndex >= 0 ? r[nameIndex] : '') || '').trim()
        if (wbs) wbsSet.add(wbs)
        const outlineLevel = wbs ? wbs.split('.').filter(Boolean).length : null
        if (outlineLevel && outlineLevel > maxOutlineLevel) maxOutlineLevel = outlineLevel
        tasks.push({ wbs, name, outlineLevel })
      }
      for (const r of dataRows.slice(50, 250)) {
        const wbs = String((wbsIndex >= 0 ? r[wbsIndex] : '') || (outlineIndex >= 0 ? r[outlineIndex] : '') || '').trim()
        if (wbs) wbsSet.add(wbs)
      }
      previewTasks.value = tasks
      previewStats.value.maxOutlineLevel = maxOutlineLevel
      previewStats.value.distinctWbs = wbsSet.size
    } catch (e: any) {
      previewError.value = e?.message || 'Failed to build preview'
    }
    return
  }

  const xml = String(form.value.xml || '')
  if (!xml.trim()) return
  if (xml.length > 2_000_000) {
    previewError.value = 'XML is too large to preview in the browser (over 2MB).'
    return
  }
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const parseErr = doc.querySelector('parsererror')
    if (parseErr) {
      previewError.value = 'Invalid XML (parser error).'
      return
    }
    const nodes = Array.from(doc.getElementsByTagName('Task'))
    previewStats.value.taskCount = nodes.length
    const wbsSet = new Set()
    let maxOutlineLevel = 0
    const tasks = []
    for (const node of nodes.slice(0, 50)) {
      const name = node.getElementsByTagName('Name')[0]?.textContent || ''
      const wbs = node.getElementsByTagName('WBS')[0]?.textContent || node.getElementsByTagName('OutlineNumber')[0]?.textContent || ''
      const outlineLevelText = node.getElementsByTagName('OutlineLevel')[0]?.textContent || ''
      const outlineLevel = outlineLevelText ? Number(outlineLevelText) : null
      if (outlineLevel && outlineLevel > maxOutlineLevel) maxOutlineLevel = outlineLevel
      if (wbs) wbsSet.add(wbs)
      tasks.push({ wbs, name, outlineLevel: Number.isFinite(outlineLevel) ? outlineLevel : null })
    }
    for (const node of nodes.slice(50, 250)) {
      const wbs = node.getElementsByTagName('WBS')[0]?.textContent || node.getElementsByTagName('OutlineNumber')[0]?.textContent || ''
      if (wbs) wbsSet.add(wbs)
    }
    previewTasks.value = tasks
    previewStats.value.maxOutlineLevel = maxOutlineLevel
    previewStats.value.distinctWbs = wbsSet.size
  } catch (e: any) {
    previewError.value = e?.message || 'Failed to build preview'
  }
}

watch(currentTab, (t) => {
  if (t === 'Preview') buildPreview()
})

watch(() => id.value, () => {
  currentTab.value = 'Info'
  load()
})

onMounted(load)
</script>
