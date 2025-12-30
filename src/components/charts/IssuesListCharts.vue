<template>
  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Status
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByStatusChart.datasets[0].data.length"
        :data="issuesByStatusChart"
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

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Type
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByTypeChart.datasets[0].data.length"
        :data="issuesByTypeChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No type data
      </div>
    </div>

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Priority
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByPriorityChart.datasets[0].data.length"
        :data="issuesByPriorityChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No priority data
      </div>
    </div>

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Equipment
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByEquipmentChart.datasets[0].data.length"
        :data="issuesByEquipmentChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No equipment-linked issues
      </div>
    </div>

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by Location
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesByLocationChart.datasets[0].data.length"
        :data="issuesByLocationChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No location data
      </div>
    </div>

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Issues by System
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <Bar
        v-if="issuesBySystemChart.datasets[0].data.length"
        :data="issuesBySystemChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No system data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export type IssuesAnalytics = {
  issuesByStatus?: Array<{ name: string; count: number }>
  issuesByType?: Array<{ name: string; count: number }>
  issuesByPriority?: Array<{ name: string; count: number }>
  issuesBySystem?: Array<{ name: string; count: number }>
  issuesByLocation?: Array<{ name: string; count: number }>
  issuesByEquipment?: Array<{ equipmentId?: string; name: string; count: number }>
}

const props = defineProps<{
  analytics?: IssuesAnalytics | null
  loading?: boolean
}>()

const loading = computed(() => props.loading === true)
const analytics = computed(() => props.analytics || {})

function topN<T>(arr: T[], n: number, score: (x: T) => number) {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n)
}

function normalizeLabel(s: any): string {
  const v = String(s || '').trim()
  return v || 'Unspecified'
}

const issuesByStatusChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByStatus) ? analytics.value.issuesByStatus : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#60a5fa',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const issuesByTypeChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByType) ? analytics.value.issuesByType : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
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

const issuesByPriorityChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByPriority) ? analytics.value.issuesByPriority : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#fb7185',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const issuesByEquipmentChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByEquipment) ? analytics.value.issuesByEquipment : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
  return {
    labels,
    datasets: [{
      label: 'Issues',
      data,
      backgroundColor: '#fbbf24',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})

const issuesByLocationChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesByLocation) ? analytics.value.issuesByLocation : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
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

const issuesBySystemChart = computed(() => {
  const rows = Array.isArray(analytics.value.issuesBySystem) ? analytics.value.issuesBySystem : []
  const entries = topN(rows.filter(r => r && r.name), 12, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).name))
  const data = entries.map(r => Number((r as any).count || 0))
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#38bdf8',
      borderRadius: 6,
      borderSkipped: false,
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
</script>

<style scoped>
.max-h-72 { max-height: 18rem; }
</style>

