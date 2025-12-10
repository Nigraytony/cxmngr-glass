<template>
  <div class="p-4 rounded bg-white/6 border border-white/10 text-white">
    <div class="grid grid-cols-2 gap-3">
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
        <div class="flex items-center justify-between">
          <label class="block text-white/70 text-sm">Cost</label>
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
          Auto-calculated from duration × bill rate
          <span v-if="autoCostPreview != null"> — ${{ autoCostPreview }}</span>.
        </p>
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
  assignee: '',
  percentComplete: 0,
  cost: 0,
  duration: undefined,
  autoCost: true
})
const saving = ref(false)
const error = ref('')
const assigneeQuery = ref('')
const assigneeResults = ref([])
const showAssigneeDropdown = ref(false)
let assigneeTimer = null

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
  const calc = duration * rate
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
  if (!props.id || props.id === 'new') return
  try {
    const resp = await http.get(`/api/tasks/${props.id}`)
    Object.assign(task.value, resp.data)
    if (typeof task.value.autoCost !== 'boolean') task.value.autoCost = true
    // populate local datetime-local inputs from stored values
    startLocal.value = toDateInputString(task.value.start)
    endLocal.value = toDateInputString(task.value.end)
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

watch(() => props.id, async () => { await load() })
</script>

<style scoped>
</style>
