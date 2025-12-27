<template>
  <div class="p-4 rounded bg-white/6 border border-white/10 text-white">
    <div class="flex items-center gap-2 mb-4">
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg border text-sm"
        :class="activeTab === 'general' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'"
        @click="activeTab = 'general'"
      >
        General
      </button>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg border text-sm"
        :class="activeTab === 'expenses' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'"
        @click="activeTab = 'expenses'"
      >
        Expenses
      </button>
    </div>

    <div
      v-if="activeTab === 'general'"
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
      <div class="col-span-2">
        <label class="block text-white/70 text-sm">Linked Activity</label>
        <div class="relative flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="activityQuery"
              placeholder="Search or create an activity…"
              class="w-full px-3 py-2 rounded bg-white/10"
              @input="onActivityInput"
              @focus="showActivityDropdown = true"
              @blur="() => setTimeout(() => showActivityDropdown = false, 120)"
            >
            <ul
              v-if="showActivityDropdown && activityResults.length"
              class="absolute z-50 left-0 right-0 bg-black/70 backdrop-blur-3xl rounded mt-1 max-h-56 overflow-auto border border-white/10 shadow-lg"
            >
              <li
                v-for="a in activityResults"
                :key="a._id"
                class="px-3 py-2 hover:bg-white/10 cursor-pointer"
                @mousedown.prevent="selectActivity(a)"
              >
                <div class="text-sm text-white">
                  {{ a.name || a._id }}
                </div>
                <div class="text-xs text-white/70">
                  {{ a.type || '—' }} · {{ fmtDate(a.startDate) || '—' }} – {{ fmtDate(a.endDate) || '—' }}
                </div>
              </li>
              <li
                v-if="canCreateActivity"
                class="px-3 py-2 border-t border-white/10 hover:bg-white/10 cursor-pointer"
                @mousedown.prevent="createAndLinkActivity"
              >
                <div class="text-sm text-emerald-200">
                  Create and link “{{ activityQuery }}”
                </div>
                <div class="text-xs text-white/60">
                  Creates a new activity in this project.
                </div>
              </li>
            </ul>
          </div>
          <button
            v-if="task.activityId"
            type="button"
            class="h-9 px-3 rounded bg-white/6 hover:bg-white/10 border border-white/15 text-white/80 text-sm"
            @click="clearActivity"
          >
            Clear
          </button>
        </div>
        <p
          v-if="task.activityId && linkedActivityName"
          class="text-xs text-white/60 mt-1"
        >
          Linked to: <span class="text-white/80">{{ linkedActivityName }}</span>
        </p>
      </div>
      <div>
        <label class="block text-white/70 text-sm">Assignee</label>
        <div class="relative">
          <input
            v-model="assigneeQuery"
            placeholder="Search users by name or email"
            class="w-full px-3 py-2 rounded bg-white/10"
            @input="onAssigneeInput"
            @focus="showAssigneeDropdown = true"
            @blur="() => setTimeout(() => showAssigneeDropdown = false, 120)"
          >
          <ul
            v-if="showAssigneeDropdown && assigneeResults.length"
            class="absolute z-50 left-0 right-0 bg-black/70 backdrop-blur-3xl rounded mt-1 max-h-48 overflow-auto border border-white/10 shadow-lg"
          >
            <li
              v-for="u in assigneeResults"
              :key="u._id"
              class="px-3 py-2 hover:bg-white/10 cursor-pointer"
              @mousedown.prevent="selectAssignee(u)"
            >
              <div class="text-sm text-white">
                {{ u.name || u.email || u._id }}
              </div>
              <div class="text-xs text-white/70">
                {{ u.email || '' }}
              </div>
            </li>
          </ul>
        </div>
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
        <label class="block text-white/70 text-sm">Start</label>
        <input
          v-model="startLocal"
          type="date"
          class="w-full px-3 py-2 rounded bg-white/10"
        >
      </div>
      <div>
        <label class="block text-white/70 text-sm">End</label>
        <input
          v-model="endLocal"
          type="date"
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
    </div>

    <div
      v-else
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

    <div class="flex justify-between items-center gap-2 mt-3">
      <div class="text-sm text-white/70">
        Tip: use the Completion field to mark progress
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-2 rounded bg-white/6 text-white"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="px-3 py-2 rounded bg-blue-600 text-white"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
    <p
      v-if="error"
      class="mt-2 text-sm text-rose-400"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { http } from '../utils/http'
import { useProjectStore } from '../stores/project'
import { useUiStore } from '../stores/ui'

const props = defineProps({
  id: { type: String, default: null },
  projectId: { type: String, default: null }
})
const emit = defineEmits(['saved', 'cancel'])

const projectStore = useProjectStore()
const ui = useUiStore()
const task = ref({
  name: '',
  wbs: '',
  description: '',
  notes: '',
  start: '',
  end: '',
  projectId: props.projectId || projectStore.currentProjectId,
  activityId: null,
  assignee: '',
  percentComplete: 0,
  cost: 0,
  duration: undefined,
  autoCost: true,
  expenses: { airfare: 0, hotel: 0, rentalCar: 0, food: 0, mileage: 0, labor: 0, other1: 0, other2: 0 }
})
const saving = ref(false)
const error = ref('')
const assigneeQuery = ref('')
const assigneeResults = ref([])
const showAssigneeDropdown = ref(false)
let assigneeTimer = null
const activeTab = ref('general') // 'general' | 'expenses'

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

const activityQuery = ref('')
const activityResults = ref([])
const showActivityDropdown = ref(false)
let activityTimer = null
const activitiesCache = ref([])

const linkedActivityName = computed(() => {
  const id = task.value && task.value.activityId ? String(task.value.activityId) : ''
  if (!id) return ''
  const hit = (activitiesCache.value || []).find((a) => String(a?._id || a?.id || '') === id)
  return hit && hit.name ? String(hit.name) : ''
})

const canCreateActivity = computed(() => {
  const q = String(activityQuery.value || '').trim()
  const pid = String(props.projectId || projectStore.currentProjectId || '')
  if (!pid || !q) return false
  // if an exact name match exists, don't offer create
  const exists = (activitiesCache.value || []).some(a => String(a?.name || '').trim().toLowerCase() === q.toLowerCase())
  return !exists
})

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) }
}

async function loadActivities() {
  const pid = String(props.projectId || projectStore.currentProjectId || '')
  if (!pid) { activitiesCache.value = []; return }
  try {
    const { data } = await http.get('/api/activities', { params: { projectId: pid, light: true } })
    activitiesCache.value = Array.isArray(data) ? data : []
  } catch (e) {
    activitiesCache.value = []
  }
}

function onActivityInput() {
  const q = String(activityQuery.value || '').trim()
  if (activityTimer) clearTimeout(activityTimer)
  activityTimer = setTimeout(() => {
    if (!q) {
      activityResults.value = (activitiesCache.value || []).slice(0, 25)
      return
    }
    const s = q.toLowerCase()
    activityResults.value = (activitiesCache.value || [])
      .filter(a => String(a?.name || '').toLowerCase().includes(s) || String(a?.type || '').toLowerCase().includes(s))
      .slice(0, 25)
  }, 150)
}

function selectActivity(a) {
  if (!a) return
  task.value.activityId = a._id || a.id || null
  activityQuery.value = a.name || ''
  showActivityDropdown.value = false
}

function clearActivity() {
  task.value.activityId = null
  activityQuery.value = ''
}

async function createAndLinkActivity() {
  const name = String(activityQuery.value || '').trim()
  const pid = String(props.projectId || projectStore.currentProjectId || '')
  if (!pid || !name) return
  try {
    const now = new Date().toISOString()
    const { data } = await http.post('/api/activities', { name, projectId: pid, type: 'Other', startDate: now, endDate: now })
    const created = data || null
    if (created && (created._id || created.id)) {
      activitiesCache.value = [created, ...(activitiesCache.value || [])]
      task.value.activityId = created._id || created.id
      activityQuery.value = created.name || name
      showActivityDropdown.value = false
      activityResults.value = []
      try { ui.showSuccess('Activity created and linked') } catch (e) { /* ignore */ }
    }
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create activity'
    try { ui.showError(msg) } catch (ee) { /* ignore */ }
  }
}

const billRate = computed(() => {
  const rate = Number(ui.tasksBillRate)
  return Number.isFinite(rate) ? rate : 0
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

async function searchAssignees(q) {
  try {
    const params = { q, limit: 10 }
    const { data } = await http.get('/api/admin/users', { params })
    // normalize users
    assigneeResults.value = (data && data.users) ? data.users : []
  } catch (e) {
    assigneeResults.value = []
  }
}

function onAssigneeInput() {
  const q = (assigneeQuery.value || '').trim()
  if (assigneeTimer) clearTimeout(assigneeTimer)
  assigneeTimer = setTimeout(() => {
    if (!q) { assigneeResults.value = []; return }
    searchAssignees(q)
  }, 250)
}

function selectAssignee(u) {
  if (!u) return
  task.value.assignee = u._id || null
  assigneeQuery.value = u.name || u.email || String(u._id)
  showAssigneeDropdown.value = false
}

// local date-only bindings (YYYY-MM-DD) so we can show a browser date picker
const startLocal = ref('')
const endLocal = ref('')

function pad(n) { return String(n).padStart(2, '0') }

// Convert various stored date formats (ISO, mm/dd/yyyy, Date) to a date input value YYYY-MM-DD
function toDateInputString(value) {
  if (!value && value !== 0) return ''
  let d = null
  if (value instanceof Date) d = value
  else {
    // try ISO or parsable
    const iso = new Date(String(value))
    if (!isNaN(iso.getTime())) d = iso
    else {
      // try mm/dd/yyyy or mm/dd/yyyy HH:MM
      const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
      if (m) {
        const mm = parseInt(m[1],10)
        const dd = parseInt(m[2],10)
        const yyyy = parseInt(m[3],10)
        const hh = m[4] ? parseInt(m[4],10) : 0
        const min = m[5] ? parseInt(m[5],10) : 0
        d = new Date(yyyy, mm-1, dd, hh, min, 0, 0)
      }
    }
  }
  if (!d || isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

async function load() {
  await loadActivities()
  onActivityInput()
  if (!props.id || props.id === 'new') return
  try {
    const resp = await http.get(`/api/tasks/${props.id}`)
    Object.assign(task.value, resp.data)
    task.value.expenses = normalizeExpenses(task.value.expenses)
    if (typeof task.value.autoCost !== 'boolean') task.value.autoCost = true
    // populate local datetime-local inputs from stored values
    startLocal.value = toDateInputString(task.value.start)
    endLocal.value = toDateInputString(task.value.end)
    // set activity query from linked activity id
    try {
      const aid = task.value && task.value.activityId ? String(task.value.activityId) : ''
      if (aid) {
        const hit = (activitiesCache.value || []).find(a => String(a?._id || a?.id || '') === aid)
        if (hit && hit.name) activityQuery.value = String(hit.name)
        else {
          // best-effort fetch single activity if not in list (e.g., different project)
          const { data: one } = await http.get(`/api/activities/${encodeURIComponent(aid)}`, { params: { light: true } })
          if (one && one.name) activityQuery.value = String(one.name)
        }
      }
    } catch (e) { /* ignore */ }
    // populate assigneeQuery if assignee id present
    try {
      if (task.value && task.value.assignee) {
        const { data: u } = await http.get(`/api/admin/users/${encodeURIComponent(task.value.assignee)}`)
        assigneeQuery.value = (u && (u.name || u.email)) ? (u.name || u.email) : String(task.value.assignee)
      }
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

async function save() {
  saving.value = true
  try {
    if (!task.value.projectId && projectStore.currentProjectId) task.value.projectId = projectStore.currentProjectId
    task.value.expenses = normalizeExpenses(task.value.expenses || defaultExpenses)
    // If the user picked dates in the browser picker, convert them to ISO strings
    // so they are consistently stored and display correctly elsewhere.
    if (startLocal.value) {
      // interpret date input as local midnight and store ISO
      const d = new Date(`${startLocal.value}T00:00:00`)
      task.value.start = isNaN(d.getTime()) ? '' : d.toISOString()
    }
    if (endLocal.value) {
      const d2 = new Date(`${endLocal.value}T23:59:59`)
      task.value.end = isNaN(d2.getTime()) ? '' : d2.toISOString()
    }
    if (!props.id || props.id === 'new') {
      // sanitize fields that expect ObjectId/null on the server
      if (task.value && task.value.assignee === '') task.value.assignee = null
      if (task.value.autoCost !== false) {
        const autoVal = autoCostNumber.value
        task.value.cost = Number.isFinite(autoVal) ? autoVal : task.value.cost
      }
      const resp = await http.post('/api/tasks', task.value)
      emit('saved', resp.data)
      try { ui.showSuccess('Task created') } catch (e) { /* ignore */ }
    } else {
      if (task.value && task.value.assignee === '') task.value.assignee = null
      if (task.value.autoCost !== false) {
        const autoVal = autoCostNumber.value
        task.value.cost = Number.isFinite(autoVal) ? autoVal : task.value.cost
      }
      const resp = await http.patch(`/api/tasks/${props.id}`, task.value)
      emit('saved', resp.data)
      try { ui.showSuccess('Task saved') } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.error('Failed to save task', e)
    try {
      error.value = (e && e.response && e.response.data && e.response.data.error) ? e.response.data.error : (e && e.message) ? e.message : 'Save failed'
    } catch (ee) {
      error.value = 'Save failed'
    }
  } finally { saving.value = false }
}

onMounted(() => load())

watch(() => props.projectId, async () => { await loadActivities(); onActivityInput() })

watch(() => props.id, async () => { await load() })
</script>

<style scoped>
</style>
