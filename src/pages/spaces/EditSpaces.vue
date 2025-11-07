<template>
  <section class="space-y-4 text-white relative" ref="pageSection">
    <div>
      <BreadCrumbs :items="crumbs" />
    </div>
    <!-- Using global UI toasts; local Toast removed for consistency -->

    <div class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10">
      <!-- Tabs header -->
      <div class="mb-4 md:mb-6">
        <div role="tablist" class="relative flex items-center w-full">
          <div class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out" :style="{ left: tabLeft + '%', width: tabWidth + '%' }" />
          <button v-for="t in tabs" :key="t" @click="currentTab = t" :aria-selected="currentTab === t" role="tab" class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2" :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'">
            <svg v-if="t === 'Info'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="M12 11v6" stroke-width="1.5" stroke-linecap="round"/><path d="M12 7h.01" stroke-width="2" stroke-linecap="round"/></svg>
            <svg v-else-if="t === 'SubSpaces'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="5" r="2.25"/><circle cx="7" cy="19" r="2.25"/><circle cx="17" cy="19" r="2.25"/><path d="M12 7.5v5.5" stroke-linecap="round"/><path d="M12 13h-3" stroke-linecap="round"/><path d="M12 13h3" stroke-linecap="round"/></svg>
            <svg v-else-if="t === 'Equipment'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/><path d="M7 10h10M7 14h6" stroke-width="1.5"/></svg>
            <svg v-else-if="t === 'Issues'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l9 16H3l9-16z" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9v4" stroke-width="1.5" stroke-linecap="round"/><path d="M12 17h.01" stroke-width="2" stroke-linecap="round"/></svg>
            <svg v-else-if="t === 'Attachments'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg v-else-if="t === 'Attributes'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h16M4 17h16" stroke-width="1.5" stroke-linecap="round"/></svg>
            <svg v-else-if="t === 'Settings'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.8v.2a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.7-.8 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.8-.6H5a2 2 0 1 1 0-4h.1a1 1 0 0 0 .8-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.8V5a2 2 0 1 1 4 0v.1a1 1 0 0 0 .7.8h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .8.6H19a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.8.6Z" stroke-width="1.5"/></svg>
            <svg v-else-if="t === 'MetaData'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" stroke-width="1.5"/><path d="M8 9h8M8 13h8M8 17h8" stroke-width="1.5"/></svg>
            <span>{{ t }}</span>
            <span v-if="countForTab(t) > 0" class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] leading-none text-white/80">{{ countForTab(t) }}</span>
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div>
        <!-- Info Tab -->
        <div v-if="currentTab === 'Info'" class="grid md:grid-cols-2 gap-x-4 gap-y-2 items-start">
          <div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">Tag</label>
                <input v-model="form.tag" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" />
              </div>
              <div>
                <label class="block text-sm text-white/70">Type</label>
                <select v-model="form.type" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20">
                  <option v-for="t in spaceTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Title</label>
              <input v-model="form.title" type="text" required class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" />
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Parent Space</label>
              <select v-model="form.parentSpace" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20">
                <option :value="''">None</option>
                <option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ p.title }} ({{ p.type }})</option>
              </select>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Description</label>
              <textarea v-model="form.description" rows="4" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"></textarea>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button @click="save" :disabled="saving" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Save</span>
              </button>
              <button @click="goPrev" :disabled="!prevId" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M15 6l-6 6 6 6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Prev</span></button>
              <button @click="goNext" :disabled="!nextId" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 disabled:opacity-50"><span>Next</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M9 6l6 6-6 6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>
          </div>
          <div>
            <div class="text-white/70 text-sm">Notes</div>
            <textarea v-model="form.notes" rows="10" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"></textarea>
          </div>
        </div>

        <!-- SubSpaces Tab -->
        <div v-else-if="currentTab === 'SubSpaces'" class="space-y-3">
          <div class="text-white/70 text-sm">Sub-spaces under this space</div>
          <div v-if="children.length === 0" class="text-white/60">No sub-spaces.</div>
          <ul class="space-y-1">
            <li v-for="c in children" :key="c.id" class="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/10">
              <div class="min-w-0">
                <div class="font-medium truncate">{{ c.title }}</div>
                <div class="text-xs text-white/60">{{ c.type }} <span v-if="c.tag">· {{ c.tag }}</span></div>
              </div>
              <RouterLink
                :to="{ name: 'space-edit', params: { id: c.id || c._id } }"
                class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                aria-label="Open space"
                :title="`Open ${c.title || 'space'}`"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke-width="1.5"/>
                  <circle cx="12" cy="12" r="3" stroke-width="1.5"/>
                </svg>
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- Equipment Tab -->
        <div v-else-if="currentTab === 'Equipment'" class="space-y-2">
          <div class="text-white/70">Equipment management coming soon.</div>
        </div>

        <!-- Issues Tab -->
        <div v-else-if="currentTab === 'Issues'" class="space-y-3">
          <IssuesTable :issues="issuesForSpace" />
        </div>

        <!-- Attachments Tab -->
        <div v-else-if="currentTab === 'Attachments'" class="space-y-4">
          <div>
            <DocumentUploader
              :upload="uploadDocument"
              button-label="Upload Documents"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*"
              :multiple="true"
              :disabled="false"
              @done="refreshAfterUpload"
            />
          </div>
          <div>
            <label class="block text-sm text-white/70 mb-1">Attachments</label>
            <div v-if="!attachmentsList.length" class="text-white/60">No attachments.</div>
            <ul v-else class="space-y-2">
              <li v-for="(a, i) in attachmentsList" :key="i" class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm">{{ a.filename }}</div>
                  <div class="text-xs text-white/60 truncate">{{ a.url }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <a :href="a.url" target="_blank" class="h-8 px-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm">Open</a>
                  <button @click="deleteAttachment(i)" class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30" title="Remove" aria-label="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M3 6h18" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6l1-2h6l1 2" stroke-width="1.5" stroke-linecap="round"/><rect x="6" y="6" width="12" height="14" rx="1.5" stroke-width="1.5"/><path d="M10 10v6M14 10v6" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Attributes Tab -->
        <div v-else-if="currentTab === 'Attributes'" class="space-y-2">
          <div class="text-white/70 text-sm">Attributes (key/value)</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 items-center" v-for="(row, idx) in attributesRows" :key="idx">
            <input v-model="row.key" placeholder="Key (e.g., Size)" class="px-3 py-2 rounded-md bg-white/10 border border-white/20" />
            <input v-model="row.value" placeholder="Value (e.g., 1200 sqft)" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 md:col-span-2" />
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button @click="addAttributeRow" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Add Row</button>
            <button @click="applyAttributes" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Apply to Space</button>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-else-if="currentTab === 'Settings'" class="space-y-2">
          <div class="text-white/70">Settings coming soon.</div>
        </div>

        <!-- MetaData Tab -->
        <div v-else-if="currentTab === 'MetaData'" class="space-y-2">
          <div class="text-white/70 text-sm">Custom metadata (key/value)</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 items-center" v-for="(row, idx) in metadataRows" :key="idx">
            <input v-model="row.key" placeholder="Key" class="px-3 py-2 rounded-md bg-white/10 border border-white/20" />
            <input v-model="row.value" placeholder="Value" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 md:col-span-2" />
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button @click="addMetadataRow" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Add Row</button>
            <button @click="applyMetadata" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Apply to Space</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import { useSpacesStore, type Space } from '../../stores/spaces'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import axios from 'axios'
import { getApiBase } from '../../utils/api'
import { useIssuesStore } from '../../stores/issues'
import { useEquipmentStore } from '../../stores/equipment'
import IssuesTable from '../../components/IssuesTable.vue'

const route = useRoute()
const router = useRouter()
const spaces = useSpacesStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const issuesStore = useIssuesStore()
const equipmentStore = useEquipmentStore()

const id = computed(() => String(route.params.id || ''))
const isNew = computed(() => id.value === 'new')

const spaceTypes = ['Building', 'Floor', 'Room', 'Area', 'Level', 'Corridor', 'Roof']

const tabs = ['Info', 'SubSpaces', 'Equipment', 'Issues', 'Attachments', 'Attributes', 'Settings', 'MetaData']
const currentTab = ref('Info')
const tabIndex = computed(() => Math.max(0, tabs.indexOf(currentTab.value)))
const tabWidth = computed(() => 100 / tabs.length)
const tabLeft = computed(() => tabIndex.value * tabWidth.value)

const form = ref<Space>({ title: '', type: 'Room', project: '', tag: '', parentSpace: '', description: '', attachments: [], attributes: [], notes: '', metaData: {} as any })
const saving = ref(false)

const pageSection = ref<HTMLElement | null>(null)

const crumbs = computed(() => [
  { text: 'Dashboard', to: '/' },
  { text: 'Spaces', to: '/spaces' },
  { text: form.value.title || 'Space', to: `/spaces/${id.value}` }
])

const currentIndex = computed(() => spaces.items.findIndex(s => String(s.id || (s as any)._id) === id.value))
const prevId = computed(() => { const i = currentIndex.value; return i > 0 ? String(spaces.items[i - 1].id || (spaces.items[i - 1] as any)._id) : '' })
const nextId = computed(() => { const i = currentIndex.value; return i >= 0 && i < spaces.items.length - 1 ? String(spaces.items[i + 1].id || (spaces.items[i + 1] as any)._id) : '' })
function goPrev() { if (prevId.value) router.push({ name: 'space-edit', params: { id: prevId.value } }) }
function goNext() { if (nextId.value) router.push({ name: 'space-edit', params: { id: nextId.value } }) }

const children = computed(() => {
  const curId = id.value
  return spaces.items
    .filter(s => String(s.parentSpace || '') === curId)
    .filter(s => !!(s && (s.title || '').trim()))
})

const parentOptions = computed(() => {
  const selfId = id.value
  const type = form.value.type
  let base = spaces.items.filter(s => String(s.id || (s as any)._id) !== selfId)
  if (type === 'Building') return []
  if (type === 'Floor') base = base.filter(s => s.type === 'Building')
  else if (type === 'Room') base = base.filter(s => s.type === 'Floor')
  return base
})

function countForTab(t: string) {
  if (t === 'SubSpaces') return children.value.length
  if (t === 'Issues') return issuesForSpace.value.length
  if (t === 'Attachments') return attachmentsList.value.length
  if (t === 'Attributes') return attributesDisplayCount.value
  return 0
}

async function load() {
  // Try to have items loaded; prefer project scope if we know it, otherwise fetch single
  if (!id.value || id.value === 'new') return
  const found = spaces.items.find(s => String(s.id || (s as any)._id) === id.value)
  if (!found) await spaces.fetchOne(id.value)
  const s = spaces.items.find(sp => String(sp.id || (sp as any)._id) === id.value)
  if (s) {
    // Normalize attachments (backend stores as string URLs) and drop empties
    const normAtt = Array.isArray((s as any).attachments)
      ? (s as any).attachments
          .map((u: any) => (typeof u === 'string' ? { url: u, filename: fileNameFromUrl(u) } : { filename: u?.filename || fileNameFromUrl(u?.url), url: u?.url || '' }))
          .filter((a: any) => !!(a && a.url))
      : []
    // Initialize attributes rows from space (ensure array of {key,value})
    const attrs = Array.isArray((s as any).attributes) ? (s as any).attributes.map((a: any) => ({ key: String(a?.key || ''), value: String(a?.value || '') })) : []
    attributesRows.value = attrs.length ? attrs : [{ key: '', value: '' }]
    form.value = { ...s, attachments: normAtt, attributes: attrs, id: String((s as any).id || (s as any)._id) } as any
  }
}

onMounted(async () => {
  // Ensure project spaces are loaded if a project is selected
  if (projectStore.currentProjectId) {
    await spaces.fetchByProject(String(projectStore.currentProjectId)).catch(() => {})
    await Promise.all([
      equipmentStore.fetchByProject(String(projectStore.currentProjectId)).catch(() => {}),
      issuesStore.fetchIssues(String(projectStore.currentProjectId)).catch(() => {}),
    ])
  }
  await load()
  // Local toast positioning removed; using global UI toasts instead
})

watch(() => route.params.id, () => load())
watch(() => route.params.id, () => load())

async function save() {
  try {
    if (!form.value.title || !form.value.title.trim()) { ui.showError('Title is required'); return }
    if (!form.value.project) form.value.project = projectStore.currentProjectId || ''
    saving.value = true
    if (form.value.id) {
      const payload: any = { ...form.value }
      // Convert attachments back to array of URLs (strings)
      if (Array.isArray(payload.attachments)) payload.attachments = payload.attachments.map((a: any) => (typeof a === 'string' ? a : (a?.url || ''))).filter((s: any) => !!s)
      // Clean attributes: only non-empty rows
      if (Array.isArray(payload.attributes)) payload.attributes = payload.attributes.filter((r: any) => (String(r?.key || '').trim() || String(r?.value || '').trim()))
      await spaces.update(payload as any)
    } else {
      const payload: any = { ...form.value }
      if (Array.isArray(payload.attachments)) payload.attachments = payload.attachments.map((a: any) => (typeof a === 'string' ? a : (a?.url || ''))).filter((s: any) => !!s)
      if (Array.isArray(payload.attributes)) payload.attributes = payload.attributes.filter((r: any) => (String(r?.key || '').trim() || String(r?.value || '').trim()))
      await spaces.create(payload as any)
    }
  ui.showSuccess('Space saved')
    ui.showSuccess('Space saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save space')
  } finally {
    saving.value = false
  }
}

// Helpers for attachments
function fileNameFromUrl(u?: string) {
  try { if (!u) return ''; const url = new URL(u); return decodeURIComponent(url.pathname.split('/').pop() || '') } catch { return String(u || '').split('/').pop() || '' }
}
const attachmentsList = computed(() => {
  const arr = Array.isArray(form.value.attachments) ? (form.value.attachments as any[]) : []
  return arr
    .map((a: any) => (typeof a === 'string' ? { url: a, filename: fileNameFromUrl(a) } : { filename: a?.filename || fileNameFromUrl(a?.url), url: a?.url || '' }))
    .filter((a: any) => !!(a && a.url))
})

async function refreshAfterUpload() {
  if (!id.value) return
  const updated = await spaces.fetchOne(String(id.value)).catch(() => null)
  if (updated) {
    const normAtt = Array.isArray((updated as any).attachments)
      ? (updated as any).attachments
          .map((u: any) => (typeof u === 'string' ? { url: u, filename: fileNameFromUrl(u) } : { filename: u?.filename || fileNameFromUrl(u?.url), url: u?.url || '' }))
          .filter((a: any) => !!(a && a.url))
      : []
    ;(form.value as any).attachments = normAtt
  }
}

async function uploadDocument(file: File, onProgress: (pct: number) => void) {
  // Ensure space exists (should already exist since we are in edit route)
  const sid = id.value
  if (!sid) throw new Error('Space id missing')
  const fd = new FormData()
  fd.append('attachments', file)
  const res = await axios.post(`${getApiBase()}/api/spaces/${sid}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  await refreshAfterUpload()
  return res.data
}

async function deleteAttachment(i: number) {
  const sid = id.value
  if (!sid) return
  try {
    await axios.delete(`${getApiBase()}/api/spaces/${sid}/attachments/${i}`)
    await refreshAfterUpload()
  ui.showSuccess('Attachment removed')
    ui.showSuccess('Attachment removed')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove attachment')
  }
}

// MetaData key/value helpers
const metadataRows = ref<Array<{ key: string; value: string }>>([])
function addMetadataRow() { metadataRows.value.push({ key: '', value: '' }) }
function applyMetadata() {
  const obj: any = {}
  for (const r of metadataRows.value) {
    const k = String(r.key || '').trim()
    if (!k) continue
    obj[k] = r.value
  }
  form.value.metaData = obj
  ui.showSuccess('Metadata applied (remember to Save)')
  ui.showSuccess('Metadata applied (remember to Save)')
}

// Attributes key/value helpers
const attributesRows = ref<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
const attributesDisplayCount = computed(() => attributesRows.value.filter(r => (String(r.key || '').trim() || String(r.value || '').trim())).length)
function addAttributeRow() { attributesRows.value.push({ key: '', value: '' }) }
function applyAttributes() {
  const rows = attributesRows.value
    .map(r => ({ key: String(r.key || '').trim(), value: String(r.value || '').trim() }))
    .filter(r => (r.key || r.value))
  form.value.attributes = rows
  ui.showSuccess('Attributes applied (remember to Save)')
  ui.showSuccess('Attributes applied (remember to Save)')
}

// Issues for this space: resolve via equipment in this space or location hints
const equipmentIdsInSpace = computed(() => {
  const sid = String(id.value || '')
  if (!sid) return new Set<string>()
  const set = new Set<string>()
  for (const e of (equipmentStore.items || [])) {
    const eid = String((e as any).id || (e as any)._id || '')
    if (eid && String((e as any).spaceId || '') === sid) set.add(eid)
  }
  return set
})
const issuesForSpace = computed(() => {
  const list: any[] = Array.isArray(issuesStore.issues) ? (issuesStore.issues as any[]) : []
  const set = equipmentIdsInSpace.value
  const title = String(form.value.title || '').toLowerCase()
  const tag = String((form.value as any).tag || '').toLowerCase()
  return list.filter((it: any) => {
    const assetMatch = it.assetId && set.has(String(it.assetId))
    const loc = String(it.location || '').toLowerCase()
    const locationMatch = !!loc && ((title && loc.includes(title)) || (tag && loc.includes(tag)))
    return !!(assetMatch || locationMatch)
  })
})
</script>
