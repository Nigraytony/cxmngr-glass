<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Total activities
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ safeNum(analytics?.totals?.totalActivities) }}
        </div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Total issues
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ safeNum(analytics?.totals?.totalIssues) }}
        </div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Total photos
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ safeNum(analytics?.totals?.totalPhotos) }}
        </div>
      </div>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">
            Activities by Status
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <Bar
          v-if="activitiesByStatusChart.datasets[0].data.length"
          :data="activitiesByStatusChart"
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
            Activities by Type
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <Bar
          v-if="activitiesByTypeChart.datasets[0].data.length"
          :data="activitiesByTypeChart"
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
            Activities by Location
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <Bar
          v-if="activitiesByLocationChart.datasets[0].data.length"
          :data="activitiesByLocationChart"
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

      <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 sm:col-span-2 xl:col-span-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">
            Activities by Month
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <Bar
          v-if="activitiesByMonthChart.datasets[0].data.length"
          :data="activitiesByMonthChart"
          :options="barOptions"
          class="max-h-72"
        />
        <div
          v-else
          class="text-white/60 text-sm"
        >
          No monthly data
        </div>
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

export type ActivitiesAnalytics = {
  totals?: {
    totalActivities: number
    totalIssues: number
    totalPhotos: number
    totalComments: number
    totalAttachments: number
    totalEquipment: number
  }
  activitiesByStatus?: Array<{ name: string; count: number }>
  activitiesByType?: Array<{ name: string; count: number }>
  activitiesByLocation?: Array<{ name: string; count: number }>
  activitiesByMonth?: Array<{ month: string; count: number }>
}

const props = defineProps<{
  analytics: ActivitiesAnalytics | null
  loading?: boolean
}>()

const loading = computed(() => props.loading === true)
const analytics = computed(() => props.analytics || null)

function safeNum(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeLabel(s: any): string {
  const v = String(s || '').trim()
  return v || 'Unspecified'
}

function topN<T>(arr: T[], n: number, score: (x: T) => number) {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n)
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.70)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
    y: {
      ticks: { color: 'rgba(255,255,255,0.70)', precision: 0 },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
} as const

const activitiesByStatusChart = computed(() => {
  const rows = Array.isArray(analytics.value?.activitiesByStatus) ? analytics.value?.activitiesByStatus : []
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

const activitiesByTypeChart = computed(() => {
  const rows = Array.isArray(analytics.value?.activitiesByType) ? analytics.value?.activitiesByType : []
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

const activitiesByLocationChart = computed(() => {
  const rows = Array.isArray(analytics.value?.activitiesByLocation) ? analytics.value?.activitiesByLocation : []
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

const activitiesByMonthChart = computed(() => {
  const rows = Array.isArray(analytics.value?.activitiesByMonth) ? analytics.value?.activitiesByMonth : []
  const entries = topN(rows.filter(r => r && r.month), 24, (r) => Number((r as any).count || 0))
  const labels = entries.map(r => normalizeLabel((r as any).month))
  const data = entries.map(r => Number((r as any).count || 0))
  return {
    labels,
    datasets: [{
      label: 'Count',
      data,
      backgroundColor: '#fbbf24',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }
})
</script>

