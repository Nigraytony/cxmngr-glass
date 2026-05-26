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

        <button
          disabled
          class="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/40 text-sm cursor-not-allowed"
          title="PDF generation lands in PR C"
        >
          ⬇ Download PDF
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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import DataSectionTable from '../../components/finalReport/DataSectionTable.vue'
import { useFinalReportStore, type FinalReportSection } from '../../stores/finalReport'
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

const selectedSection = computed(() => {
  if (!selectedKey.value) return null
  return workingSections.value.find((s) => s.key === selectedKey.value) || null
})

const hasDataSections = computed(() =>
  workingSections.value.some((s) => s.type === 'data' && s.enabled),
)

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
