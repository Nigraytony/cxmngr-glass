<template>
  <div class="space-y-4">
    <BreadCrumbs :items="[{ text: 'Dashboard', to: '/app' }, { text: 'Tasks', to: '/app/tasks' }, { text: modeLabel } ]" />

    <div class="p-4 rounded bg-white/6 border border-white/10 text-white">
      <div class="flex items-center gap-2 mb-4">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border text-sm"
          :class="activeTab === 'info' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'"
          @click="activeTab = 'info'"
        >
          Info
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border text-sm"
          :class="activeTab === 'expenses' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'"
          @click="activeTab = 'expenses'"
        >
          Expenses
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border text-sm"
          :class="activeTab === 'settings' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'"
          @click="activeTab = 'settings'"
        >
          Settings
        </button>
      </div>

      <div
        v-if="activeTab === 'info'"
        class="grid grid-cols-2 gap-3"
      >
        <div>
          <label class="block text-white/70 text-sm">Name</label>
          <input
            v-model="task.name"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">WBS</label>
          <input
            v-model="task.wbs"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Assignee</label>
          <input
            v-model="task.assignee"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Duration (hours)</label>
          <input
            v-model.number="task.duration"
            type="number"
            min="0"
            step="1"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Completion (%)</label>
          <input
            v-model.number="task.percentComplete"
            type="number"
            min="0"
            max="100"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Status</label>
          <select
            v-model="task.status"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
            <option value="Not Started">
              Not Started
            </option>
            <option value="Pending">
              Pending
            </option>
            <option value="In Progress">
              In Progress
            </option>
            <option value="Completed">
              Completed
            </option>
          </select>
        </div>
        <div>
          <label class="block text-white/70 text-sm">Start</label>
          <input
            v-model="task.start"
            type="datetime-local"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">End</label>
          <input
            v-model="task.end"
            type="datetime-local"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div class="col-span-2">
          <label class="block text-white/70 text-sm">Notes</label>
          <textarea
            v-model="task.notes"
            class="w-full px-3 py-2 rounded bg-white/10"
            rows="4"
          />
        </div>

        <div class="col-span-2 mt-1">
          <label class="block text-white/70 text-sm">Linked Activity</label>
          <div class="mt-1 rounded bg-white/10 border border-white/15 px-3 py-2 text-sm text-white/80">
            <div
              v-if="task.activityId"
              class="flex items-center justify-between gap-2"
            >
              <div class="min-w-0 truncate">
                <span class="text-white/60 mr-1">Activity:</span>{{ linkedActivityName || task.activityId }}
              </div>
              <RouterLink
                :to="{ name: 'activity-edit', params: { id: String(task.activityId) } }"
                class="text-xs text-white/70 hover:text-white underline shrink-0"
              >
                Open
              </RouterLink>
            </div>
            <div
              v-else
              class="text-white/60"
            >
              No activity linked.
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'expenses'"
        class="grid grid-cols-2 gap-3"
      >
        <div class="col-span-2">
          <div class="flex items-center justify-between">
            <label class="block text-white/70 text-sm">Cost (incl. expenses)</label>
            <label class="inline-flex items-center gap-2 text-xs text-white/70">
              <input
                v-model="manualCost"
                type="checkbox"
                class="w-4 h-4"
              >
              <span>Enter manually</span>
            </label>
          </div>
          <input
            :value="costInputValue"
            type="number"
            min="0"
            step="0.01"
            :disabled="!manualCost"
            :class="['w-full px-3 py-2 rounded bg-white/10', !manualCost ? 'opacity-60 cursor-not-allowed' : '']"
            @input="onCostInput"
          >
          <p
            v-if="!manualCost"
            class="text-xs text-white/60 mt-1"
          >
            Auto-calculated from duration × bill rate + expenses
            <span v-if="autoCostPreview != null"> — ${{ autoCostPreview }}</span>.
          </p>
          <p
            v-else
            class="text-xs text-white/60 mt-1"
          >
            Enter total cost (base + expenses).
          </p>
        </div>

        <div>
          <label class="block text-white/70 text-sm">Airfare</label>
          <input
            v-model.number="task.expenses.airfare"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Hotel</label>
          <input
            v-model.number="task.expenses.hotel"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Rental Car</label>
          <input
            v-model.number="task.expenses.rentalCar"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Food</label>
          <input
            v-model.number="task.expenses.food"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Mileage</label>
          <input
            v-model.number="task.expenses.mileage"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Labor</label>
          <input
            v-model.number="task.expenses.labor"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Other 1</label>
          <input
            v-model.number="task.expenses.other1"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Other 2</label>
          <input
            v-model.number="task.expenses.other2"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div class="col-span-2 flex justify-end">
          <div class="text-sm text-white/70">
            Expenses total: <span class="text-white">${{ expensesTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <label class="block text-white/70 text-sm">Linked Activity</label>
        <div class="rounded bg-white/10 border border-white/15 px-3 py-2 text-sm text-white/70">
          Bill rate is a per-user preference used for auto cost calculations.
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 sm:col-span-1">
            <label class="block text-white/70 text-sm">Bill rate ($/hour)</label>
            <input
              v-model.number="billRateInput"
              type="number"
              min="0"
              step="1"
              class="w-full px-3 py-2 rounded bg-white/10"
              @blur="saveBillRate"
            >
          </div>
        </div>

        <div>
          <div class="flex items-center gap-3">
            <label class="block text-white/70 text-sm">Tags</label>
            <button
              v-if="canSuggestTaskTags"
              type="button"
              class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="suggestingTaskTags"
              @click="suggestTaskTags"
            >
              {{ suggestingTaskTags ? 'Suggesting…' : 'Suggest tags' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="t in task.tags"
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
          <div class="flex items-center gap-2 mt-2">
            <input
              v-model="tagInput"
              placeholder="Add a tag and press Enter…"
              class="w-full px-3 py-2 rounded bg-white/10"
              @keydown.enter.prevent="addTagFromInput"
              @keydown.,.prevent="addTagFromInput"
            >
            <button
              type="button"
              class="h-10 px-3 rounded bg-white/6 hover:bg-white/10 border border-white/15 text-white/80 text-sm"
              @click="addTagFromInput"
            >
              Add
            </button>
          </div>
          <p class="text-xs text-white/60 mt-1">
            Tip: use commas or Enter to add multiple tags.
          </p>
          <div
            v-if="suggestedTaskTagsFiltered.length"
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
                  @click="applyAllSuggestedTaskTags"
                >
                  Add all
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white/70"
                  @click="dismissSuggestedTaskTags"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="s in suggestedTaskTagsFiltered"
                :key="s.tag"
                type="button"
                class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 hover:bg-white/15"
                :title="s.reason || ''"
                @click="addTag(String(s.tag || ''))"
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

      <div class="flex justify-start gap-2 mt-3">
        <RouterLink
          to="/app/tasks"
          class="px-3 py-2 rounded bg-white/6 text-white"
        >
          Cancel
        </RouterLink>
        <button
          :disabled="saving"
          type="button"
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="save"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
          ><path
            d="M5 13l4 4L19 7"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg>
          <span>{{ saving ? 'Saving...' : 'Save' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { http } from '../../utils/http'
import { useProjectStore } from '../../stores/project'
import { useActivitiesStore } from '../../stores/activities'
import { useUiStore } from '../../stores/ui'
import { useAiStore } from '../../stores/ai'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const activitiesStore = useActivitiesStore()
const ui = useUiStore()
const ai = useAiStore()
const id = computed(() => String(route.params.id || ''))
const modeLabel = computed(() => (id.value === 'new' ? 'New Task' : 'Edit Task'))
const task = ref({
  name: '',
  wbs: '',
  description: '',
  notes: '',
  start: '',
  end: '',
  projectId: projectStore.currentProjectId,
  activityId: null,
  assignee: '',
  percentComplete: 0,
  status: 'Not Started',
  cost: 0,
  duration: undefined,
  autoCost: true,
  expenses: { airfare: 0, hotel: 0, rentalCar: 0, food: 0, mileage: 0, labor: 0, other1: 0, other2: 0 },
  tags: []
})
const saving = ref(false)
const linkedActivityName = ref('')
const activeTab = ref('info') // info | expenses | settings
const billRateInput = ref(ui.tasksBillRate || 0)
const tagInput = ref('')
const suggestingTaskTags = ref(false)
const suggestedTaskTags = ref([])

const canSuggestTaskTags = computed(() => {
  const pid = String(task.value.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  if (!pid) return false
  const p = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

function numberOrZero(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const defaultExpenses = Object.freeze({
  airfare: 0,
  hotel: 0,
  rentalCar: 0,
  food: 0,
  mileage: 0,
  labor: 0,
  other1: 0,
  other2: 0
})

function normalizeExpenses(expenses) {
  const e = (expenses && typeof expenses === 'object') ? expenses : {}
  return {
    airfare: numberOrZero(e.airfare),
    hotel: numberOrZero(e.hotel),
    rentalCar: numberOrZero(e.rentalCar),
    food: numberOrZero(e.food),
    mileage: numberOrZero(e.mileage),
    labor: numberOrZero(e.labor),
    other1: numberOrZero(e.other1),
    other2: numberOrZero(e.other2)
  }
}

const expensesTotal = computed(() => {
  const e = task.value && task.value.expenses ? task.value.expenses : {}
  return [
    e.airfare,
    e.hotel,
    e.rentalCar,
    e.food,
    e.mileage,
    e.labor,
    e.other1,
    e.other2
  ].map(numberOrZero).reduce((a, b) => a + b, 0)
})

const billRate = computed(() => {
  const v = Number(ui.tasksBillRate)
  return Number.isFinite(v) ? v : 0
})

const manualCost = computed({
  get() {
    return task.value.autoCost === false
  },
  set(val) {
    const manual = Boolean(val)
    task.value.autoCost = manual ? false : true
    if (!manual) {
      const autoVal = autoCostNumber.value
      if (Number.isFinite(autoVal)) task.value.cost = autoVal
    }
  }
})

const autoCostNumber = computed(() => {
  if (manualCost.value) return null
  const rate = billRate.value
  const duration = Number(task.value.duration)
  if (!Number.isFinite(rate) || !Number.isFinite(duration)) return null
  const calc = (duration * rate) + expensesTotal.value
  if (!Number.isFinite(calc)) return null
  return Number(calc.toFixed(2))
})

const autoCostPreview = computed(() => {
  if (manualCost.value) return null
  const val = autoCostNumber.value
  if (!Number.isFinite(val)) return null
  return val.toFixed(2)
})

const costInputValue = computed(() => {
  if (manualCost.value) {
    const manualVal = task.value.cost
    if (manualVal === null || manualVal === undefined || manualVal === '') return ''
    if (typeof manualVal === 'number') return manualVal
    const numeric = Number(manualVal)
    return Number.isFinite(numeric) ? numeric : String(manualVal)
  }
  const autoVal = autoCostNumber.value
  if (Number.isFinite(autoVal)) return autoVal.toFixed(2)
  const fallback = task.value.cost
  if (fallback === null || fallback === undefined || fallback === '') return ''
  if (typeof fallback === 'number') return fallback
  const numeric = Number(fallback)
  return Number.isFinite(numeric) ? numeric : String(fallback)
})

function onCostInput(e) {
  if (!manualCost.value) return
  const raw = e.target.value
  if (raw === '') {
    task.value.cost = null
    return
  }
  const val = Number(raw)
  task.value.cost = Number.isFinite(val) ? val : task.value.cost
}

function saveBillRate() {
  ui.setTasksBillRate(billRateInput.value)
  try { ui.showInfo('Bill rate updated') } catch (e) { /* ignore */ }
}

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

function addTag(tag) {
  const t = String(tag || '').trim()
  if (!t) return
  task.value.tags = normalizeTags([...(task.value.tags || []), t])
}

function addTagFromInput() {
  const raw = String(tagInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  task.value.tags = normalizeTags([...(task.value.tags || []), ...parts])
  tagInput.value = ''
}

function removeTag(tag) {
  const key = String(tag || '').trim().toLowerCase()
  task.value.tags = (task.value.tags || []).filter(t => String(t || '').trim().toLowerCase() !== key)
}

const suggestedTaskTagsFiltered = computed(() => {
  const existing = new Set((task.value.tags || []).map(t => String(t || '').trim().toLowerCase()).filter(Boolean))
  const list = Array.isArray(suggestedTaskTags.value) ? suggestedTaskTags.value : []
  return list
    .filter((s) => s && s.tag && !existing.has(String(s.tag).trim().toLowerCase()))
    .slice(0, 12)
})

function dismissSuggestedTaskTags() {
  suggestedTaskTags.value = []
}

function applyAllSuggestedTaskTags() {
  for (const s of suggestedTaskTagsFiltered.value) addTag(String(s.tag || ''))
  dismissSuggestedTaskTags()
}

async function suggestTaskTags() {
  const pid = String(task.value.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  if (!pid) {
    ui.showError('No project selected')
    return
  }
  suggestingTaskTags.value = true
  try {
    const entity = {
      name: String(task.value.name || '').trim(),
      wbs: String(task.value.wbs || '').trim(),
      status: String(task.value.status || '').trim(),
      percentComplete: Number(task.value.percentComplete || 0),
      assignee: String(task.value.assignee || '').trim(),
      description: String(task.value.description || '').trim(),
      notes: String(task.value.notes || '').trim(),
    }
    const allowed = Array.isArray(projectStore.currentProject?.tags) ? projectStore.currentProject?.tags : []
    const tags = await ai.suggestTags(pid, 'task', entity, { existingTags: task.value.tags || [], allowedTags: allowed })
    suggestedTaskTags.value = Array.isArray(tags) ? tags : []
    if (!suggestedTaskTagsFiltered.value.length) ui.showInfo('No new tag suggestions')
  } catch (e) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to suggest tags')
  } finally {
    suggestingTaskTags.value = false
  }
}

async function load() {
  if (!id.value || id.value === 'new') return
  try {
    const r = await http.get(`/api/tasks/${id.value}`)
    Object.assign(task.value, r.data)
    if (typeof task.value.autoCost !== 'boolean') task.value.autoCost = true
    task.value.expenses = normalizeExpenses(task.value.expenses || defaultExpenses)
    task.value.tags = normalizeTags(task.value.tags)
    billRateInput.value = Number(ui.tasksBillRate) || 0
    // hydrate linked activity title for display
    try {
      const pid = String(task.value.projectId || projectStore.currentProjectId || '')
      if (pid) await activitiesStore.fetchActivities(pid).catch(() => {})
      const aid = task.value && task.value.activityId ? String(task.value.activityId) : ''
      if (aid) {
        const hit = (activitiesStore.activities || []).find((a) => String(a?.id || a?._id || '') === aid)
        linkedActivityName.value = hit && hit.name ? String(hit.name) : ''
      } else {
        linkedActivityName.value = ''
      }
    } catch (e) { linkedActivityName.value = '' }
  } catch (e) { /* ignore */ }
}

async function save() {
  saving.value = true
  try {
    // ensure projectId
    if (!task.value.projectId && projectStore.currentProjectId) task.value.projectId = projectStore.currentProjectId
    task.value.expenses = normalizeExpenses(task.value.expenses || defaultExpenses)
    task.value.tags = normalizeTags(task.value.tags)
    if (task.value.autoCost !== false) {
      const autoVal = autoCostNumber.value
      task.value.cost = Number.isFinite(autoVal) ? autoVal : task.value.cost
    }
    if (id.value === 'new') {
      const res = await http.post('/api/tasks', task.value)
      const created = res?.data || {}
      const createdId = String(created._id || created.id || '')
      if (createdId) {
        Object.assign(task.value, created)
        // Stay on this page, but switch route from /tasks/new -> /tasks/:id
        await router.replace({ name: 'task-edit', params: { id: createdId } })
        ui.showSuccess('Saved')
      } else {
        ui.showSuccess('Saved')
      }
    } else {
      const res = await http.patch(`/api/tasks/${id.value}`, task.value)
      const updated = res?.data || null
      if (updated && typeof updated === 'object') Object.assign(task.value, updated)
      ui.showSuccess('Saved')
    }
  } catch (e) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save task')
  } finally { saving.value = false }
}

onMounted(() => load())
</script>

<style scoped>
</style>
