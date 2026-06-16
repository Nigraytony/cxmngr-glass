<template>
  <section class="space-y-4 relative">
    <BreadCrumbs
      :items="[
        { text: 'Dashboard', to: '/app' },
        { text: project?.name || 'Project', to: { name: 'project-settings', params: { id: projectId } } },
        { text: 'Final Report', to: { name: 'final-report', params: { id: projectId } } },
      ]"
      title="Final Report"
    />

    <!-- Toolbar -->
    <div
      class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-3"
    >
      <div class="flex items-center gap-3 min-w-0 flex-wrap">
        <span
          class="px-2 py-1 rounded-full text-xs font-medium border"
          :class="statusBadgeClass"
        >{{ statusLabel }}</span>
        <span
          v-if="report && report.currentVersion > 0"
          class="text-xs text-white/60"
        >
          v{{ report.currentVersion }}
          <span v-if="report.releases.length">· {{ report.releases.length }} release{{ report.releases.length === 1 ? '' : 's' }}</span>
        </span>
        <span
          v-if="hasUnsavedChanges"
          class="text-xs text-amber-300"
        >Unsaved changes</span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          v-if="canEdit"
          :disabled="refreshingAll || !hasDataSections"
          class="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/85 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          title="Re-pull live data for every data section"
          @click="onRefreshAll"
        >
          <span>↻</span>
          <span>{{ refreshingAll ? 'Refreshing…' : 'Refresh all data' }}</span>
        </button>

        <button
          v-if="canEdit"
          :disabled="isLocked || saving"
          class="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/85 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          title="Cover page settings"
          @click="openCoverModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke-width="1.5"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Cover…</span>
        </button>

        <button
          v-if="canEdit"
          :disabled="!hasUnsavedChanges || saving"
          class="px-3 py-1.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 hover:bg-indigo-500/40 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="onSave"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>

        <button
          v-if="canEdit && hasUnsavedChanges"
          class="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-sm"
          @click="onDiscard"
        >
          Discard
        </button>

        <!-- Lock/unlock controls -->
        <button
          v-if="canLock && !isLocked"
          :disabled="hasUnsavedChanges || saving"
          class="px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :title="hasUnsavedChanges ? 'Save changes before locking' : 'Lock the report'"
          @click="showLockModal = true"
        >
          🔒 Lock…
        </button>
        <button
          v-if="canUnlock && isLocked"
          :disabled="saving"
          class="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/85 text-sm disabled:opacity-50"
          @click="onUnlock"
        >
          🔓 Unlock
        </button>

        <!--
          Download PDF.
          - Locked reports with a released PDF: link straight to the
            immutable Release.pdfBlobUrl (signed on demand).
          - Drafts or locks without a stored PDF: synchronously generate
            a fresh PDF via Puppeteer on the backend.
        -->
        <button
          :disabled="generatingPdf"
          class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/85 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          :title="generatingPdf ? 'Generating PDF — this can take 30-60 seconds for large reports' : 'Generate a PDF of the current report state'"
          @click="onDownloadPdf"
        >
          <span v-if="generatingPdf">⏳</span>
          <span v-else>⬇</span>
          <span>{{ generatingPdf ? 'Generating PDF…' : 'Download PDF' }}</span>
        </button>
      </div>
    </div>

    <!-- Locked banner -->
    <div
      v-if="isLocked"
      class="rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-400/30 text-amber-100 text-sm flex items-center gap-2"
    >
      <span>🔒</span>
      <span>
        This report is <strong>{{ statusLabel }}</strong>.
        Editing is disabled.
        <span v-if="canUnlock">Click <strong>Unlock</strong> to return to draft.</span>
        <span v-else-if="report?.status === 'in_review'">A CxA or admin can revert to draft.</span>
        <span v-else>Only a global administrator can unlock a finalized report.</span>
      </span>
    </div>

    <!-- Loading / empty -->
    <div
      v-if="loading"
      class="rounded-xl p-6 bg-white/5 border border-white/10 text-white/70 text-center"
    >
      Loading report…
    </div>

    <div
      v-else-if="!report"
      class="rounded-xl p-6 bg-white/5 border border-white/10 text-white/70 text-center"
    >
      <p>No report data.</p>
      <button
        class="mt-2 px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-sm"
        @click="reload"
      >
        Reload
      </button>
    </div>

    <!-- Three-pane layout -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-12 gap-4"
    >
      <!-- Section list (left rail) -->
      <aside class="md:col-span-3 rounded-2xl p-3 bg-white/5 border border-white/10 min-h-0">
        <div class="text-xs uppercase tracking-wide text-white/50 mb-2 px-1">
          Sections
        </div>
        <ul class="space-y-1">
          <li
            v-for="(s, idx) in workingSections"
            :key="s.key"
          >
            <button
              type="button"
              :class="[
                'w-full text-left px-2 py-2 rounded-lg border text-sm flex items-center gap-2',
                selectedKey === s.key
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'bg-transparent border-white/5 text-white/80 hover:bg-white/10',
                !s.enabled && 'opacity-50',
              ]"
              @click="selectedKey = s.key"
            >
              <span class="text-white/50 text-xs w-6 text-right shrink-0">{{ idx + 1 }}.</span>
              <span class="shrink-0">{{ s.type === 'data' ? '📊' : '📝' }}</span>
              <span class="flex-1 min-w-0 truncate">{{ s.title }}</span>
              <input
                v-if="canEdit"
                type="checkbox"
                :checked="s.enabled"
                class="shrink-0"
                title="Include this section in the report"
                @click.stop
                @change="onToggleEnabled(s.key, ($event.target as HTMLInputElement).checked)"
              >
            </button>
          </li>
        </ul>
      </aside>

      <!-- Section editor (main pane) -->
      <div class="md:col-span-9 rounded-2xl p-4 bg-white/5 border border-white/10 min-w-0">
        <div
          v-if="!selectedSection"
          class="text-white/60 text-sm"
        >
          Pick a section on the left to edit.
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <!-- Title + meta -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex-1 min-w-0">
              <input
                v-model="selectedSection.title"
                type="text"
                :disabled="!canEdit"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-lg font-medium disabled:opacity-70"
                @input="markDirty"
              >
            </div>
            <div class="text-xs text-white/50">
              {{ selectedSection.type === 'data' ? 'Computed from project data' : 'Free-form prose' }}
            </div>
          </div>

          <!-- Prose editor -->
          <div v-if="selectedSection.type === 'prose'">
            <!--
              "Insert template" — same UX as the Cx Plan starter. Only shows
              for prose sections that have a registered LEED-aware template
              (Purpose, Cx Scope of Work, Roles & Responsibilities,
              Transition to Ongoing Cx, Sign-offs) AND when the section is
              currently empty, so a CxA can't accidentally overwrite their
              custom narrative.
            -->
            <div
              v-if="canEdit && showTemplateButton"
              class="mb-2 flex items-center justify-end"
            >
              <button
                type="button"
                class="px-3 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 hover:bg-indigo-500/30 text-indigo-100 text-xs inline-flex items-center gap-2"
                :title="'Insert a LEED-aware boilerplate for ' + selectedSection.title"
                @click="onInsertTemplate"
              >
                <span>✦</span>
                <span>Insert template</span>
              </button>
            </div>
            <RichTextEditor
              v-model="selectedSection.contentHtml"
              :editable="canEdit"
              class="h-[28rem]"
              @update:model-value="markDirty"
            />
          </div>

          <!-- Data section -->
          <div
            v-else-if="selectedSection.type === 'data'"
            class="space-y-3"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="text-xs text-white/50">
                Source: <span class="text-white/80 font-medium">{{ selectedSection.dataSource }}</span>
                <span
                  v-if="dataMeta(selectedSection.key)?.totalCount != null"
                >· {{ dataMeta(selectedSection.key).totalCount }} row{{ dataMeta(selectedSection.key).totalCount === 1 ? '' : 's' }}</span>
              </div>
              <button
                v-if="canEdit"
                type="button"
                :disabled="refreshingKey === selectedSection.key"
                class="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/85 text-sm disabled:opacity-50"
                @click="onRefreshSection(selectedSection.key)"
              >
                {{ refreshingKey === selectedSection.key ? 'Refreshing…' : '↻ Refresh data' }}
              </button>
            </div>

            <DataSectionTable
              :data-source="selectedSection.dataSource"
              :data="sectionData[selectedSection.key]"
              :editable="canEdit && !isLocked"
              @add-revision="onAddRevision"
              @delete-revision="onDeleteRevision"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Lock modal -->
    <div
      v-if="showLockModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      @click.self="showLockModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-slate-900/95 border border-white/15 p-5 space-y-3">
        <div class="text-lg font-semibold text-white">
          Lock report
        </div>
        <p class="text-sm text-white/70">
          Pick the new state. Marking the report <strong>Final</strong> creates an
          immutable release record with a snapshot of every section; only a
          global administrator can unlock it after that.
        </p>
        <div class="flex flex-col gap-2">
          <label class="flex items-start gap-2 cursor-pointer">
            <input
              v-model="lockChoice"
              type="radio"
              value="in_review"
              class="mt-1"
            >
            <div>
              <div class="text-white">In review</div>
              <div class="text-xs text-white/60">Lock for stakeholder review. Any CxA/admin can unlock.</div>
            </div>
          </label>
          <label class="flex items-start gap-2 cursor-pointer">
            <input
              v-model="lockChoice"
              type="radio"
              value="final"
              class="mt-1"
            >
            <div>
              <div class="text-white">Final</div>
              <div class="text-xs text-white/60">Create v{{ (report?.currentVersion || 0) + 1 }} release snapshot. Global admin unlock only.</div>
            </div>
          </label>
        </div>
        <div>
          <label class="block text-xs text-white/60 mb-1">Note (optional)</label>
          <textarea
            v-model="lockNote"
            rows="2"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
            placeholder="What changed in this release?"
          />
        </div>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-sm"
            @click="showLockModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="saving"
            class="px-3 py-1.5 rounded-md bg-amber-500/30 border border-amber-400/40 hover:bg-amber-500/40 text-amber-100 text-sm disabled:opacity-50"
            @click="onLock"
          >
            {{ saving ? 'Locking…' : 'Lock report' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cover page settings modal -->
    <div
      v-if="showCoverModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      @click.self="showCoverModal = false"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/15 p-5 space-y-4">
        <div class="text-lg font-semibold text-white">
          Cover page settings
        </div>

        <div class="space-y-1">
          <label class="block text-xs text-white/60">Title</label>
          <input
            v-model="coverDraft.title"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
            placeholder="Commissioning Final Report"
          >
        </div>
        <div class="space-y-1">
          <label class="block text-xs text-white/60">Subtitle</label>
          <input
            v-model="coverDraft.subtitle"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 text-white text-sm"
            placeholder="Client / sub-heading"
          >
        </div>

        <div class="space-y-2">
          <div class="text-xs text-white/60">Cover logo</div>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white">
            <input
              v-model="coverDraft.logoSource"
              type="radio"
              value="commissioning_agent"
              :disabled="!caLogo"
            >
            <span>Commissioning Agent logo</span>
            <span
              v-if="!caLogo"
              class="text-xs text-white/40"
            >(none on this project)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white">
            <input
              v-model="coverDraft.logoSource"
              type="radio"
              value="client"
              :disabled="!clientLogo"
            >
            <span>Client logo</span>
            <span
              v-if="!clientLogo"
              class="text-xs text-white/40"
            >(none on this project)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white">
            <input
              v-model="coverDraft.logoSource"
              type="radio"
              value="custom"
            >
            <span>Uploaded image</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-white">
            <input
              v-model="coverDraft.logoSource"
              type="radio"
              value="none"
            >
            <span>No logo</span>
          </label>

          <div
            v-if="coverDraft.logoSource === 'custom'"
            class="pl-6"
          >
            <input
              type="file"
              accept="image/*"
              class="text-xs text-white/70 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-white/15 file:text-white"
              @change="onCoverLogoFile"
            >
            <p class="text-[11px] text-white/40 mt-1">
              PNG/JPG/SVG, up to 2 MB.
            </p>
          </div>

          <div
            v-if="coverLogoPreview"
            class="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 flex items-center justify-center"
          >
            <img
              :src="coverLogoPreview"
              alt="Cover logo preview"
              class="max-h-20 max-w-[240px] object-contain"
            >
          </div>
        </div>

        <label class="flex items-center gap-2 cursor-pointer text-sm text-white/85">
          <input
            v-model="coverDraft.showProjectImage"
            type="checkbox"
          >
          <span>Show project image on the cover</span>
        </label>

        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            class="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-sm"
            @click="showCoverModal = false"
          >
            Cancel
          </button>
          <button
            :disabled="saving"
            class="px-3 py-1.5 rounded-md bg-indigo-500/30 border border-indigo-400/40 hover:bg-indigo-500/40 text-white text-sm disabled:opacity-50"
            @click="onSaveCover"
          >
            {{ saving ? 'Saving…' : 'Save cover' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import { hasTemplate, renderTemplate, type TemplateContext } from '../../utils/finalReportTemplates'
import DataSectionTable from '../../components/finalReport/DataSectionTable.vue'
import { useFinalReportStore, type FinalReportSection, type FinalReportCover } from '../../stores/finalReport'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const projectStore = useProjectStore()
const ui = useUiStore()
const store = useFinalReportStore()
const { report, loading, saving, sectionData, isLocked, canEdit, canLock, canUnlock } =
  storeToRefs(store)

const projectId = computed(() => String(props.id || route.params.id || ''))
const project = computed(() => projectStore.currentProject as any)

const workingSections = ref<FinalReportSection[]>([])
const selectedKey = ref<string | null>(null)
const refreshingKey = ref<string | null>(null)
const refreshingAll = ref(false)
const hasUnsavedChanges = ref(false)

const showLockModal = ref(false)
const lockChoice = ref<'in_review' | 'final'>('in_review')
const lockNote = ref('')

// --- Cover page settings ---
const showCoverModal = ref(false)
const coverDraft = ref<FinalReportCover>({
  title: '', subtitle: '', logoSource: 'commissioning_agent', customLogoUrl: null, ownerLogoBlobUrl: null, showProjectImage: true,
})
const caLogo = computed(() => String((project.value && project.value.commissioning_agent && project.value.commissioning_agent.logo) || ''))
const clientLogo = computed(() => String((project.value && project.value.logo) || ''))
const coverLogoPreview = computed(() => {
  const s = coverDraft.value.logoSource
  if (s === 'commissioning_agent') return caLogo.value
  if (s === 'client') return clientLogo.value
  if (s === 'custom') return String(coverDraft.value.customLogoUrl || '')
  return ''
})

function openCoverModal() {
  const c: any = (report.value && report.value.cover) || {}
  coverDraft.value = {
    title: c.title || '',
    subtitle: c.subtitle || '',
    logoSource: c.logoSource || 'commissioning_agent',
    customLogoUrl: c.customLogoUrl || null,
    ownerLogoBlobUrl: c.ownerLogoBlobUrl || null,
    showProjectImage: c.showProjectImage !== false,
  }
  showCoverModal.value = true
}

function onCoverLogoFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { ui.showError('Please choose an image file'); return }
  if (file.size > 2 * 1024 * 1024) { ui.showError('Image must be under 2 MB'); return }
  const reader = new FileReader()
  reader.onload = () => { coverDraft.value.customLogoUrl = String(reader.result || ''); coverDraft.value.logoSource = 'custom' }
  reader.onerror = () => ui.showError('Failed to read image')
  reader.readAsDataURL(file)
}

async function onSaveCover() {
  try {
    await store.save({ cover: coverDraft.value })
    showCoverModal.value = false
    ui.showSuccess('Cover settings saved')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to save cover settings')
  }
}

const selectedSection = computed(() => {
  if (!selectedKey.value) return null
  return workingSections.value.find((s) => s.key === selectedKey.value) || null
})

const hasDataSections = computed(() =>
  workingSections.value.some((s) => s.type === 'data' && s.enabled),
)

/**
 * Show the "Insert template" button only when:
 *   1. A prose section is selected
 *   2. We have a registered template for that section key (see
 *      src/utils/finalReportTemplates.ts)
 *   3. The section is currently empty (so a CxA can't accidentally
 *      overwrite hand-written narrative)
 */
const showTemplateButton = computed(() => {
  const s = selectedSection.value
  if (!s || s.type !== 'prose') return false
  if (!hasTemplate(s.key)) return false
  const html = String(s.contentHtml || '').replace(/<[^>]*>/g, '').trim()
  return html.length === 0
})

/** Build the template context from the current project. */
function buildTemplateContext(): TemplateContext {
  const p: any = project.value || {}
  return {
    projectName: p.name || '',
    client: p.client || '',
    buildingType: p.building_type || '',
    leedTarget: p.leedTarget || null,
    leedCertificationLevel: p.leedCertificationLevel || null,
    cxScope: p.cxScope || {},
    cxaName:
      p.commissioning_agent
        ? [p.commissioning_agent.firstName, p.commissioning_agent.lastName].filter(Boolean).join(' ')
        : '',
    cxaCompany: (p.commissioning_agent && p.commissioning_agent.company) || '',
  }
}

function onInsertTemplate() {
  const s = selectedSection.value
  if (!s) return
  const html = renderTemplate(s.key, buildTemplateContext())
  if (!html) return
  s.contentHtml = html
  markDirty()
  ui.showSuccess('Template inserted — edit as needed, then save.')
}

const statusLabel = computed(() => {
  const s = report.value?.status
  if (s === 'in_review') return 'In Review'
  if (s === 'final') return 'Final'
  return 'Draft'
})

const statusBadgeClass = computed(() => {
  const s = report.value?.status
  if (s === 'final') return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
  if (s === 'in_review') return 'bg-amber-500/20 border-amber-400/40 text-amber-100'
  return 'bg-white/10 border-white/20 text-white/80'
})

function markDirty() {
  hasUnsavedChanges.value = true
}

function onToggleEnabled(key: string, enabled: boolean) {
  const s = workingSections.value.find((x) => x.key === key)
  if (!s) return
  s.enabled = enabled
  markDirty()
}

function syncFromStore() {
  if (!report.value) {
    workingSections.value = []
    return
  }
  // Deep-clone so editing doesn't mutate store state until Save.
  workingSections.value = JSON.parse(JSON.stringify(report.value.sections || []))
  if (workingSections.value.length && !selectedKey.value) {
    selectedKey.value = workingSections.value[0].key
  } else if (selectedKey.value && !workingSections.value.find((s) => s.key === selectedKey.value)) {
    selectedKey.value = workingSections.value[0]?.key || null
  }
  hasUnsavedChanges.value = false
}

function dataMeta(key: string): any {
  return sectionData.value[key] || null
}

async function reload() {
  try {
    await store.load(projectId.value)
    syncFromStore()
    // Auto-refresh visible data sections so users see live numbers immediately.
    await store.refreshAllSections()
  } catch (e: any) {
    ui.showError(store.error || 'Failed to load Final Report')
  }
}

async function onSave() {
  try {
    await store.save({ sections: workingSections.value })
    syncFromStore()
    ui.showSuccess('Final Report saved')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to save')
  }
}

function onDiscard() {
  syncFromStore()
  ui.showInfo('Changes discarded')
}

async function onRefreshSection(key: string) {
  refreshingKey.value = key
  try {
    await store.refreshSection(key)
  } catch (e: any) {
    ui.showError(store.error || 'Failed to refresh section')
  } finally {
    refreshingKey.value = null
  }
}

async function onAddRevision(payload: { versionLabel: string; summary: string; reviserName: string; date: string }) {
  try {
    await store.addRevision(payload)
    ui.showSuccess('Revision added')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to add revision')
  }
}

async function onDeleteRevision(id: string) {
  try {
    await store.deleteRevision(id)
  } catch (e: any) {
    ui.showError(store.error || 'Failed to delete revision')
  }
}

async function onRefreshAll() {
  refreshingAll.value = true
  try {
    await store.refreshAllSections()
    ui.showSuccess('Data refreshed')
  } catch (e: any) {
    ui.showError('Some sections failed to refresh')
  } finally {
    refreshingAll.value = false
  }
}

async function onLock() {
  try {
    await store.lock(lockChoice.value, lockNote.value)
    showLockModal.value = false
    lockNote.value = ''
    lockChoice.value = 'in_review'
    syncFromStore()
    ui.showSuccess(lockChoice.value === 'final' ? 'Report finalized' : 'Report locked for review')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to lock report')
  }
}

const generatingPdf = ref(false)

/**
 * Download a PDF of the report. For locked-final reports with an
 * existing released PDF on the latest release, we just sign that and
 * open it. Otherwise we trigger a fresh server-side render.
 */
async function onDownloadPdf() {
  if (generatingPdf.value) return
  generatingPdf.value = true
  try {
    // If the latest release has a stored PDF, prefer it (immutable).
    const latest = report.value?.releases && report.value.releases.length
      ? report.value.releases[report.value.releases.length - 1]
      : null
    if (report.value?.status === 'final' && latest && latest.pdfBlobUrl) {
      const url = await store.getReleasePdfUrl(latest.version)
      window.open(url, '_blank', 'noopener,noreferrer')
      ui.showSuccess('Released PDF opened in a new tab.')
      return
    }
    ui.showInfo('Generating PDF — this can take 30-60 seconds for large reports.', { duration: 4000 })
    const result = await store.generatePdf()
    window.open(result.url, '_blank', 'noopener,noreferrer')
    ui.showSuccess('PDF ready.')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to generate PDF')
  } finally {
    generatingPdf.value = false
  }
}

async function onUnlock() {
  if (!confirm('Unlock this report and return it to draft? Existing releases are preserved.')) return
  try {
    await store.unlock()
    syncFromStore()
    ui.showSuccess('Report unlocked')
  } catch (e: any) {
    ui.showError(store.error || 'Failed to unlock')
  }
}

// Warn before leaving with unsaved changes (router-level guard would be cleaner;
// this catches refresh/close too).
function beforeUnloadHandler(e: BeforeUnloadEvent) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
  await reload()
})

watch(report, () => {
  // If the store gets repopulated (e.g. after lock/unlock), re-sync.
  if (!hasUnsavedChanges.value) syncFromStore()
})
</script>
