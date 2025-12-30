<template>
  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <!-- Equipment by System -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Equipment by System
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="equipmentBySystemChart.datasets[0].data.length"
        :data="equipmentBySystemChart"
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

    <!-- Equipment by Status -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Equipment by Status
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="equipmentByStatusChart.datasets[0].data.length"
        :data="equipmentByStatusChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No status data
      </div>
    </div>

    <!-- Equipment with Checklists by Checklist System -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Equipment with Checklists
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="equipmentByChecklistSystemChart.datasets[0].data.length"
        :data="equipmentByChecklistSystemChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No checklist system data
      </div>
    </div>

    <!-- Issues by Equipment System -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Equipment System
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByEquipmentSystemChart.datasets[0].data.length"
        :data="issuesByEquipmentSystemChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No issues data
      </div>
    </div>

    <!-- Checklist Completion -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Checklist Completion
        </h3>
        <div class="text-xs text-white/60">
          <span v-if="checklistProgress">{{ checklistProgress.pct }}%</span>
          <span v-else-if="loading">Loading…</span>
        </div>
      </div>
      <Doughnut
        v-if="checklistCompletionChart.datasets[0].data.length"
        :data="checklistCompletionChart"
        :options="doughnutOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No checklist progress data
      </div>
    </div>

    <!-- FPT Completion -->
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          FPT Completion
        </h3>
        <div class="text-xs text-white/60">
          <span v-if="fptProgress">{{ fptProgress.pct }}%</span>
          <span v-else-if="loading">Loading…</span>
        </div>
      </div>
      <Doughnut
        v-if="fptCompletionChart.datasets[0].data.length"
        :data="fptCompletionChart"
        :options="doughnutOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No FPT progress data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export type EquipmentAnalytics = {
  equipmentBySystem?: Array<{ name: string; count: number }>
  equipmentByStatus?: Array<{ name: string; count: number }>
  checklistsBySystem?: Array<{ system: string; checklistsCount: number; equipmentCount: number }>
  issuesByEquipmentSystem?: Array<{ system: string; issuesCount: number }>
  checklistProgress?: { answeredQuestions: number; totalQuestions: number; pct: number }
  fptProgress?: { doneTests: number; totalTests: number; pct: number; passTests: number; failTests: number }
}

const props = defineProps<{
  analytics?: EquipmentAnalytics | null
  loading?: boolean
}>()

const loading = computed(() => props.loading === true)
const analytics = computed(() => props.analytics || {})
const checklistProgress = computed(() => analytics.value.checklistProgress)
const fptProgress = computed(() => analytics.value.fptProgress)

function topN<T>(arr: T[], n: number, score: (x: T) => number) {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n)
}

const equipmentBySystemChart = computed(() => {
  const rows = Array.isArray(analytics.value.equipmentBySystem) ? analytics.value.equipmentBySystem : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number(r.count || 0))
  const labels = entries.map(r => String(r.name))
  const data = entries.map(r => Number(r.count || 0))
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

const equipmentByStatusChart = computed(() => {
  const rows = Array.isArray(analytics.value.equipmentByStatus) ? analytics.value.equipmentByStatus : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number(r.count || 0))
  const labels = entries.map(r => String(r.name))
  const data = entries.map(r => Number(r.count || 0))
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#34d399',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const equipmentByChecklistSystemChart = computed(() => {
  const rows = Array.isArray(analytics.value.checklistsBySystem) ? analytics.value.checklistsBySystem : []
  const entries = topN(rows.filter(r => r && r.system), 12, (r) => Number(r.equipmentCount || 0))
  const labels = entries.map(r => String(r.system))
  const data = entries.map(r => Number(r.equipmentCount || 0))
  return {
    labels,
    datasets: [{
      label: 'Equipment',
      data,
      backgroundColor: '#38bdf8',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const issuesByEquipmentSystemChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByEquipmentSystem) ? analytics.value.issuesByEquipmentSystem : []
  const entries = topN(rows.filter(r => r && r.system), 12, (r) => Number(r.issuesCount || 0))
  const labels = entries.map(r => String(r.system))
  const data = entries.map(r => Number(r.issuesCount || 0))
  return {
    labels,
    datasets: [{
      label: 'Issues',
      data,
      backgroundColor: '#fb7185',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const checklistCompletionChart = computed(() => {
  const p = checklistProgress.value
  if (!p || !Number.isFinite(p.totalQuestions) || p.totalQuestions <= 0) {
    return { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] }
  }
  const answered = Math.max(0, Number(p.answeredQuestions || 0))
  const total = Math.max(0, Number(p.totalQuestions || 0))
  const remaining = Math.max(0, total - answered)
  return {
    labels: ['Answered', 'Remaining'],
    datasets: [{
      data: [answered, remaining],
      backgroundColor: ['#22c55e', 'rgba(255,255,255,0.25)'],
      borderWidth: 0,
    }]
  }
})

const fptCompletionChart = computed(() => {
  const p = fptProgress.value
  if (!p || !Number.isFinite(p.totalTests) || p.totalTests <= 0) {
    return { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] }
  }
  const done = Math.max(0, Number(p.doneTests || 0))
  const total = Math.max(0, Number(p.totalTests || 0))
  const remaining = Math.max(0, total - done)
  return {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [done, remaining],
      backgroundColor: ['#60a5fa', 'rgba(255,255,255,0.25)'],
      borderWidth: 0,
    }]
  }
})

const baseTicks = { color: 'rgba(255,255,255,0.8)' }
const baseGrid = { color: 'rgba(255,255,255,0.08)' }

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: { ticks: baseTicks, grid: { display: false } },
    y: { ticks: baseTicks, grid: baseGrid, beginAtZero: true, precision: 0 },
  },
} as const

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: 'rgba(255,255,255,0.9)' } },
  },
} as const
</script>

<style scoped>
.max-h-72 { max-height: 18rem; }
</style>

