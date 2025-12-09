<template>
  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <!-- Issues by Status -->
    <div v-if="featureEnabled('issues')" class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Status
        </h3>
        <span
          v-if="issuesLoading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Doughnut
        v-if="issuesChartData.datasets[0].data.length"
        :data="issuesChartData"
        :options="doughnutOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No issue data
      </div>
    </div>

    <!-- Activities by Type -->
    <div v-if="featureEnabled('activities')" class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Activities by Type
        </h3>
        <span
          v-if="activitiesLoading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="activitiesChartData.datasets[0].data.length"
        :data="activitiesChartData"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No activity data
      </div>
    </div>

    <!-- Equipment by Status -->
    <div v-if="featureEnabled('equipment')" class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Equipment by Status
        </h3>
        <span
          v-if="equipmentLoading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="equipmentChartData.datasets[0].data.length"
        :data="equipmentChartData"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No equipment data
      </div>
    </div>

    <!-- Spaces by Type -->
    <div v-if="featureEnabled('spaces')" class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Spaces by Type
        </h3>
        <span
          v-if="spacesLoading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="spacesChartData.datasets[0].data.length"
        :data="spacesChartData"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No spaces data
      </div>
    </div>

    <!-- Tasks by Status -->
    <div v-if="featureEnabled('tasks')" class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Tasks by Status
        </h3>
        <span
          v-if="tasksLoadingState"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Doughnut
        v-if="tasksChartData.datasets[0].data.length"
        :data="tasksChartData"
        :options="doughnutOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No task data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useIssuesStore } from '../../stores/issues'
import { useActivitiesStore } from '../../stores/activities'
import { useEquipmentStore } from '../../stores/equipment'
import { useSpacesStore } from '../../stores/spaces'
import { useProjectStore } from '../../stores/project'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type TaskRecord = Record<string, any>

const props = defineProps<{ tasks?: TaskRecord[]; tasksLoading?: boolean }>()

const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const activitiesStore = useActivitiesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()
const tasksLoadingState = computed(() => props.tasksLoading === true)

// Feature gating
function normalizeFeatureFlags(raw: any): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (!k) continue
    const key = k.toLowerCase()
    if (v === false || v === 'false' || v === 0) { out[key] = false; continue }
    if (v === true || v === 'true' || v === 1) { out[key] = true; continue }
  }
  return out
}
const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  basic:    { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true },
  standard: { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true },
  premium:  { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true },
}
const activeFeatures = computed(() => {
  const proj: any = projectStore.currentProject || {}
  const flags = normalizeFeatureFlags(proj.subscriptionFeatures)
  if (Object.keys(flags).length) return flags
  const tier = (proj.subscriptionTier || proj.subscription || '').toLowerCase()
  if (tier && PLAN_FEATURES[tier]) return normalizeFeatureFlags(PLAN_FEATURES[tier])
  // default: enable all if nothing specified
  return { issues: true, equipment: true, spaces: true, templates: true, activities: true, tasks: true }
})
function featureEnabled(key: string): boolean {
  const flags = activeFeatures.value
  const v = flags ? flags[key.toLowerCase()] : undefined
  if (v === false) return false
  return true
}

onMounted(async () => {
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  try {
    const tasks: Promise<any>[] = []
    if (pid && featureEnabled('issues')) tasks.push(issuesStore.fetchIssues(pid).catch(() => {}))
    if (pid && featureEnabled('activities')) tasks.push(activitiesStore.fetchActivities(pid).catch(() => {}))
    if (pid && featureEnabled('equipment')) tasks.push(equipmentStore.fetchByProject(String(pid)).catch(() => {}))
    if (pid && featureEnabled('spaces')) tasks.push(spacesStore.fetchByProject(String(pid)).catch(() => {}))
    if (tasks.length) await Promise.all(tasks)
  } catch (e) {
    // soft-fail on dashboard
  }
})

const issuesLoading = computed(() => issuesStore.loading)
const activitiesLoading = computed(() => activitiesStore.loading)
const equipmentLoading = computed(() => equipmentStore.loading)
const spacesLoading = computed(() => spacesStore.loading)
const dashboardTasks = computed(() => {
  const list = Array.isArray(props.tasks) ? props.tasks : []
  return list.filter((task) => {
    if (!task) return false
    if ((task as any).deleted === true) return false
    const status = String((task as any).status || '').toLowerCase()
    return status !== 'deleted'
  })
})

function normalizeTaskStatus(task: TaskRecord | null | undefined): 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' {
  if (!task) return 'Not Started'
  const raw = String(task.status || '').toLowerCase()
  if (raw.includes('block') || raw.includes('hold') || raw.includes('pending') || raw.includes('cancel')) return 'Blocked'
  if (raw.includes('progress')) return 'In Progress'
  if (raw.includes('complete')) return 'Completed'
  if (raw.includes('start')) return 'Not Started'
  const pct = Number(task.percentComplete)
  if (Number.isFinite(pct)) {
    if (pct >= 100) return 'Completed'
    if (pct > 0) return 'In Progress'
    return 'Not Started'
  }
  return 'Not Started'
}

// Issues by Status (normalize common variants)
function normStatus(s?: string) {
  const k = String(s || 'Unknown').toLowerCase()
  if (k.includes('closed') || k.includes('cancel')) return 'Closed'
  if (k.includes('progress')) return 'In Progress'
  if (k.includes('open')) return 'Open'
  return s ? s : 'Unknown'
}

const issueStatusOrder = ['Open', 'In Progress', 'Closed']
const issueColors = ['#60a5fa', '#fbbf24', '#10b981']
const issuesChartData = computed(() => {
  const counts: Record<string, number> = {}
  for (const it of issuesStore.issues) {
    const key = normStatus((it as any).status)
    counts[key] = (counts[key] || 0) + 1
  }
  const labels = issueStatusOrder.filter(l => counts[l] > 0)
  const data = labels.map(l => counts[l])
  const bg = labels.map(l => issueColors[issueStatusOrder.indexOf(l)] || '#94a3b8')
  return { labels, datasets: [{ data, backgroundColor: bg, borderWidth: 0 }] }
})

// Activities by Type
const activitiesChartData = computed(() => {
  const counts: Record<string, number> = {}
  for (const a of activitiesStore.activities) {
    const key = (a.type && a.type.trim()) ? String(a.type) : 'Other'
    counts[key] = (counts[key] || 0) + 1
  }
  // sort by count desc and cap to top 8 types
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const labels = entries.map(e => e[0])
  const data = entries.map(e => e[1])
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#a78bfa',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

// Equipment by Status
const equipmentStatusOrder = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']
const equipmentColors = ['#38bdf8','#6366f1','#f59e0b','#10b981','#06b6d4','#16a34a','#64748b']
const equipmentChartData = computed(() => {
  const counts: Record<string, number> = {}
  for (const e of equipmentStore.items) {
    const key = e.status || 'Not Started'
    counts[key] = (counts[key] || 0) + 1
  }
  const labels = equipmentStatusOrder.filter(l => counts[l] > 0)
  const data = labels.map(l => counts[l])
  const bg = labels.map(l => equipmentColors[equipmentStatusOrder.indexOf(l)] || '#94a3b8')
  return {
    labels,
    datasets: [{ label: 'Count', data, backgroundColor: bg, borderRadius: 6, borderSkipped: false }]
  }
})

// Spaces by Type
const spacesChartData = computed(() => {
  const counts: Record<string, number> = {}
  for (const s of spacesStore.items) {
    const key = s.type || 'Unknown'
    counts[key] = (counts[key] || 0) + 1
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const labels = entries.map(e => e[0])
  const data = entries.map(e => e[1])
  return {
    labels,
    datasets: [{ label: 'Count', data, backgroundColor: '#34d399', borderRadius: 6, borderSkipped: false }]
  }
})

const taskPalette: Record<string, string> = {
  'Not Started': '#f97316',
  'In Progress': '#38bdf8',
  'Completed': '#22c55e',
  'Blocked': '#fb7185',
}

const tasksChartData = computed(() => {
  const counts: Record<string, number> = {
    'Not Started': 0,
    'In Progress': 0,
    'Completed': 0,
    'Blocked': 0,
  }
  for (const task of dashboardTasks.value) {
    const status = normalizeTaskStatus(task)
    counts[status] = (counts[status] || 0) + 1
  }
  const labels = Object.keys(counts).filter(label => counts[label] > 0)
  const data = labels.map(label => counts[label])
  const backgroundColor = labels.map(label => taskPalette[label] || '#94a3b8')
  return {
    labels,
    datasets: [{ data, backgroundColor, borderWidth: 0 }],
  }
})

// Chart options styled for glass UI
const baseTicks = {
  color: 'rgba(255,255,255,0.8)'
}
const baseGrid = {
  color: 'rgba(255,255,255,0.08)'
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: { ticks: baseTicks, grid: { display: false } },
    y: { ticks: baseTicks, grid: baseGrid, beginAtZero: true, precision: 0 }
  }
} as const

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: 'rgba(255,255,255,0.9)' }
    }
  }
} as const
</script>

<style scoped>
.max-h-72 { max-height: 18rem; }
</style>
