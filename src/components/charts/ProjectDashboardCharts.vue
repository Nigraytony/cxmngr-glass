<template>
  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <!-- Issues by Status -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Issues by Status</h3>
        <span v-if="issuesLoading" class="text-xs text-white/60">Loading…</span>
      </div>
      <Doughnut v-if="issuesChartData.datasets[0].data.length"
                :data="issuesChartData"
                :options="doughnutOptions"
                class="max-h-72" />
      <div v-else class="text-white/60 text-sm">No issue data</div>
    </div>

    <!-- Activities by Type -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Activities by Type</h3>
        <span v-if="activitiesLoading" class="text-xs text-white/60">Loading…</span>
      </div>
      <Bar v-if="activitiesChartData.datasets[0].data.length"
           :data="activitiesChartData"
           :options="barOptions"
           class="max-h-72" />
      <div v-else class="text-white/60 text-sm">No activity data</div>
    </div>

    <!-- Equipment by Status -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Equipment by Status</h3>
        <span v-if="equipmentLoading" class="text-xs text-white/60">Loading…</span>
      </div>
      <Bar v-if="equipmentChartData.datasets[0].data.length"
           :data="equipmentChartData"
           :options="barOptions"
           class="max-h-72" />
      <div v-else class="text-white/60 text-sm">No equipment data</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useIssuesStore } from '../../stores/issues'
import { useActivitiesStore } from '../../stores/activities'
import { useEquipmentStore } from '../../stores/equipment'
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

const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const activitiesStore = useActivitiesStore()
const equipmentStore = useEquipmentStore()

onMounted(async () => {
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  try {
    // These will internally filter by project if the store supports it
    await Promise.all([
      issuesStore.fetchIssues(pid).catch(() => {}),
      activitiesStore.fetchActivities(pid).catch(() => {}),
      pid ? equipmentStore.fetchByProject(String(pid)).catch(() => {}) : Promise.resolve(),
    ])
  } catch (e) {
    // soft-fail on dashboard
  }
})

const issuesLoading = computed(() => issuesStore.loading)
const activitiesLoading = computed(() => activitiesStore.loading)
const equipmentLoading = computed(() => equipmentStore.loading)

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
