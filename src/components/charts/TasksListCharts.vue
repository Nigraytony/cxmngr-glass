<template>
  <div class="rounded-2xl p-4 bg-white/6 border border-white/10">
    <div class="flex items-center justify-between gap-3">
      <div class="text-white/90 font-medium">
        Task Analytics
      </div>
      <div
        v-if="loading"
        class="text-xs text-white/60"
      >
        Loading…
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Total tasks
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ safeNum(analytics?.totalTasks) }}
        </div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Completed tasks
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ safeNum(analytics?.completedTasks) }}
        </div>
      </div>
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-xs text-white/60">
          Avg. completion
        </div>
        <div class="text-white text-2xl font-semibold">
          {{ formatPct(analytics?.avgPercentComplete) }}
        </div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-sm text-white/80 mb-2">
          Tasks by phase
        </div>
        <template v-if="phaseChartData">
          <div class="h-64">
            <Bar
              :data="phaseChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          class="text-sm text-white/60"
        >
          No data.
        </div>
      </div>

      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-sm text-white/80 mb-2">
          Tasks by status
        </div>
        <template v-if="statusChartData">
          <div class="h-64">
            <Bar
              :data="statusChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          class="text-sm text-white/60"
        >
          No data.
        </div>
      </div>

      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-sm text-white/80 mb-2">
          Tasks by completion
        </div>
        <template v-if="completionChartData">
          <div class="h-64">
            <Bar
              :data="completionChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          class="text-sm text-white/60"
        >
          No data.
        </div>
      </div>

      <div class="rounded-xl bg-white/5 border border-white/10 p-3">
        <div class="text-sm text-white/80 mb-2">
          Cost by phase
        </div>
        <template v-if="costByPhaseChartData">
          <div class="h-64">
            <Bar
              :data="costByPhaseChartData"
              :options="currencyBarOptions"
            />
          </div>
        </template>
        <div
          v-else
          class="text-sm text-white/60"
        >
          No data.
        </div>
      </div>

      <div class="rounded-xl bg-white/5 border border-white/10 p-3 lg:col-span-2">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div class="text-sm text-white/80">
            Top cost tasks
          </div>
          <div class="text-xs text-white/60">
            Total: {{ formatCurrency(analytics?.totalCost) }}
          </div>
        </div>
        <template v-if="topCostTasksChartData">
          <div class="h-72">
            <Bar
              :data="topCostTasksChartData"
              :options="currencyBarOptions"
            />
          </div>
        </template>
        <div
          v-else
          class="text-sm text-white/60"
        >
          No data.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export type TasksAnalytics = {
  totalTasks: number;
  completedTasks: number;
  avgPercentComplete: number;
  totalCost: number;
  tasksByStatus: Array<{ name: string; count: number }>;
  tasksByCompletion: Array<{ bucket: string; count: number }>;
  tasksByPhase: Array<{ wbs: string; label: string; count: number }>;
  costByPhase: Array<{ wbs: string; label: string; totalCost: number }>;
  topCostTasks: Array<{ taskId: string; wbs: string; name: string; totalCost: number }>;
}

const props = defineProps<{
  analytics: TasksAnalytics | null;
  loading?: boolean;
}>()

function safeNum(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatPct(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0%'
  return `${Math.round(n)}%`
}

function formatCurrency(v: unknown) {
  const n = Number(v)
  const amount = Number.isFinite(n) ? n : 0
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
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

const currencyBarOptions = {
  ...barOptions,
  plugins: {
    ...barOptions.plugins,
    tooltip: {
      enabled: true,
      callbacks: {
        label: (ctx: any) => formatCurrency(ctx?.raw),
      },
    },
  },
  scales: {
    ...barOptions.scales,
    y: {
      ...barOptions.scales.y,
      ticks: {
        ...barOptions.scales.y.ticks,
        callback: (value: any) => {
          const n = Number(value)
          if (!Number.isFinite(n)) return value
          return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n)
        },
      },
    },
  },
} as const

const phaseChartData = computed(() => {
  const rows = props.analytics?.tasksByPhase || []
  if (!rows.length) return null
  return {
    labels: rows.map(r => r.label || r.wbs),
    datasets: [
      {
        label: 'Tasks',
        data: rows.map(r => safeNum(r.count)),
        backgroundColor: 'rgba(16, 185, 129, 0.55)',
        borderColor: 'rgba(16, 185, 129, 0.9)',
        borderWidth: 1,
      },
    ],
  }
})

const statusChartData = computed(() => {
  const rows = props.analytics?.tasksByStatus || []
  if (!rows.length) return null
  return {
    labels: rows.map(r => r.name),
    datasets: [
      {
        label: 'Tasks',
        data: rows.map(r => safeNum(r.count)),
        backgroundColor: 'rgba(59, 130, 246, 0.55)',
        borderColor: 'rgba(59, 130, 246, 0.9)',
        borderWidth: 1,
      },
    ],
  }
})

const completionChartData = computed(() => {
  const rows = props.analytics?.tasksByCompletion || []
  if (!rows.length) return null
  return {
    labels: rows.map(r => r.bucket),
    datasets: [
      {
        label: 'Tasks',
        data: rows.map(r => safeNum(r.count)),
        backgroundColor: 'rgba(236, 72, 153, 0.45)',
        borderColor: 'rgba(236, 72, 153, 0.85)',
        borderWidth: 1,
      },
    ],
  }
})

const costByPhaseChartData = computed(() => {
  const rows = props.analytics?.costByPhase || []
  if (!rows.length) return null
  return {
    labels: rows.map(r => r.label || r.wbs),
    datasets: [
      {
        label: 'Cost',
        data: rows.map(r => safeNum(r.totalCost)),
        backgroundColor: 'rgba(245, 158, 11, 0.45)',
        borderColor: 'rgba(245, 158, 11, 0.85)',
        borderWidth: 1,
      },
    ],
  }
})

const topCostTasksChartData = computed(() => {
  const rows = props.analytics?.topCostTasks || []
  if (!rows.length) return null
  const labels = rows.map(r => {
    const left = r.taskId || r.wbs || ''
    const title = r.name || ''
    return left ? `${left} — ${title}` : title
  })
  return {
    labels,
    datasets: [
      {
        label: 'Cost',
        data: rows.map(r => safeNum(r.totalCost)),
        backgroundColor: 'rgba(139, 92, 246, 0.45)',
        borderColor: 'rgba(139, 92, 246, 0.85)',
        borderWidth: 1,
      },
    ],
  }
})
</script>

<style scoped>
/* Give charts a consistent height */
.chartjs-render-monitor,
canvas {
  max-height: 280px;
}
</style>
