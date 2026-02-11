<template>
  <div
    :class="rootClass"
    :style="rootStyle"
  >
    <div
      v-if="showHeader"
      class="flex items-center justify-between gap-3"
    >
      <div :class="titleClass">
        Task Analytics
      </div>
      <div
        v-if="loading"
        :class="mutedClass + ' text-xs'"
      >
        Loading…
      </div>
    </div>

    <div
      v-if="showKpis"
      :class="kpisWrapClass"
    >
      <div :class="cardClass">
        <div :class="mutedClass + ' text-xs'">
          Total tasks
        </div>
        <div :class="valueClass">
          {{ safeNum(analytics?.totalTasks) }}
        </div>
      </div>
      <div :class="cardClass">
        <div :class="mutedClass + ' text-xs'">
          Completed tasks
        </div>
        <div :class="valueClass">
          {{ safeNum(analytics?.completedTasks) }}
        </div>
      </div>
      <div :class="cardClass">
        <div :class="mutedClass + ' text-xs'">
          Avg. completion
        </div>
        <div :class="valueClass">
          {{ formatPct(analytics?.avgPercentComplete) }}
        </div>
      </div>
    </div>

    <div :class="chartsWrapClass">
      <div :class="panelClass">
        <div :class="sectionTitleClass">
          Tasks by phase
        </div>
        <template v-if="phaseChartData">
          <div :style="chartStyle64">
            <Bar
              :data="phaseChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          :class="mutedClass + ' text-sm'"
        >
          No data.
        </div>
      </div>

      <div :class="panelClass">
        <div :class="sectionTitleClass">
          Tasks by status
        </div>
        <template v-if="statusChartData">
          <div :style="chartStyle64">
            <Bar
              :data="statusChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          :class="mutedClass + ' text-sm'"
        >
          No data.
        </div>
      </div>

      <div :class="panelClass">
        <div :class="sectionTitleClass">
          Tasks by completion
        </div>
        <template v-if="completionChartData">
          <div :style="chartStyle64">
            <Bar
              :data="completionChartData"
              :options="barOptions"
            />
          </div>
        </template>
        <div
          v-else
          :class="mutedClass + ' text-sm'"
        >
          No data.
        </div>
      </div>

      <div :class="panelClass">
        <div :class="sectionTitleClass">
          Cost by phase
        </div>
        <template v-if="costByPhaseChartData">
          <div :style="chartStyle64">
            <Bar
              :data="costByPhaseChartData"
              :options="currencyBarOptions"
            />
          </div>
        </template>
        <div
          v-else
          :class="mutedClass + ' text-sm'"
        >
          No data.
        </div>
      </div>

      <div :class="panelClass + ' lg:col-span-2'">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div :class="sectionTitleClass">
            Top cost tasks
          </div>
          <div :class="mutedClass + ' text-xs'">
            Total: {{ formatCurrency(analytics?.totalCost) }}
          </div>
        </div>
        <template v-if="topCostTasksChartData">
          <div :style="chartStyle72">
            <Bar
              :data="topCostTasksChartData"
              :options="currencyBarOptions"
            />
          </div>
        </template>
        <div
          v-else
          :class="mutedClass + ' text-sm'"
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
  mode?: 'dark' | 'light';
  embedded?: boolean;
  heightScale?: number;
  variant?: 'default' | 'report';
}>()

const isLight = computed(() => props.mode === 'light')
const isReport = computed(() => props.variant === 'report')
const showHeader = computed(() => !isReport.value)
const showKpis = computed(() => !isReport.value)
const heightScale = computed(() => {
  const n = Number(props.heightScale)
  if (!Number.isFinite(n)) return 1
  return Math.max(0.5, Math.min(1.5, n))
})

const rootClass = computed(() => {
  if (props.embedded) return ''
  return isLight.value
    ? 'rounded-2xl p-4 bg-white border border-black/10'
    : 'rounded-2xl p-4 bg-white/6 border border-white/10'
})

const rootStyle = computed(() => {
  const maxH = Math.round(280 * heightScale.value)
  return { '--chart-max-h': `${maxH}px` } as any
})

const chartStyle64 = computed(() => {
  const h = Math.round(256 * heightScale.value)
  return { height: `${h}px` }
})

const chartStyle72 = computed(() => {
  const h = Math.round(288 * heightScale.value)
  return { height: `${h}px` }
})

const titleClass = computed(() => isLight.value ? 'text-black/90 font-medium' : 'text-white/90 font-medium')
const mutedClass = computed(() => isLight.value ? 'text-black/60' : 'text-white/60')
const valueClass = computed(() => isLight.value ? 'text-black text-2xl font-semibold' : 'text-white text-2xl font-semibold')
const sectionTitleClass = computed(() => isLight.value ? 'text-sm text-black/80 mb-2' : 'text-sm text-white/80 mb-2')
const pad = computed(() => (isReport.value ? 'p-2' : 'p-3'))
const panelClass = computed(() => isLight.value ? `rounded-xl bg-black/2 border border-black/10 ${pad.value}` : `rounded-xl bg-white/5 border border-white/10 ${pad.value}`)
const cardClass = computed(() => isLight.value ? `rounded-xl bg-black/2 border border-black/10 ${pad.value}` : `rounded-xl bg-white/5 border border-white/10 ${pad.value}`)

const kpisWrapClass = computed(() => (isReport.value
  ? 'mt-3 grid grid-cols-3 gap-2'
  : 'mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'
))

const chartsWrapClass = computed(() => (isReport.value
  ? 'mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3'
  : 'mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4'
))

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

const barOptions = computed(() => {
  const tick = isLight.value ? 'rgba(0,0,0,0.70)' : 'rgba(255,255,255,0.70)'
  const grid = isLight.value ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.85)',
        titleColor: '#fff',
        bodyColor: '#fff',
      },
    },
    scales: {
      x: {
        ticks: { color: tick },
        grid: { color: grid },
      },
      y: {
        ticks: { color: tick, precision: 0 },
        grid: { color: grid },
      },
    },
  }
})

const currencyBarOptions = computed(() => {
  const base: any = barOptions.value
  return {
    ...base,
    plugins: {
      ...base.plugins,
      tooltip: {
        ...(base.plugins?.tooltip || {}),
        enabled: true,
        callbacks: {
          label: (ctx: any) => formatCurrency(ctx?.raw),
        },
      },
    },
    scales: {
      ...base.scales,
      y: {
        ...base.scales?.y,
        ticks: {
          ...(base.scales?.y?.ticks || {}),
          callback: (value: any) => {
            const n = Number(value)
            if (!Number.isFinite(n)) return value
            return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n)
          },
        },
      },
    },
  }
})

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
  max-height: var(--chart-max-h, 280px);
}
</style>
