<template>
  <div
    :class="rootClass"
    :style="rootStyle"
  >
    <div
      v-if="showHeader"
      class="flex items-center justify-between gap-3 mb-3"
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

    <!-- KPI tile strip -->
    <div
      v-if="showKpis"
      :class="kpisWrapClass"
    >
      <div
        v-for="tile in kpiTiles"
        :key="tile.key"
        :class="cardClass"
      >
        <div :class="mutedClass + ' text-xs uppercase tracking-wide'">
          {{ tile.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-2">
          <div :class="valueClass + ' tabular-nums'">
            {{ tile.value }}
          </div>
          <div
            v-if="tile.unit"
            :class="mutedClass + ' text-sm'"
          >
            {{ tile.unit }}
          </div>
        </div>
        <div
          v-if="tile.bar != null"
          class="mt-2 h-1.5 rounded-full overflow-hidden"
          :class="isLight ? 'bg-black/10' : 'bg-white/8'"
        >
          <div
            class="h-full rounded-full"
            :class="tile.barClass"
            :style="{ width: Math.max(0, Math.min(100, Number(tile.bar))) + '%' }"
          />
        </div>
        <div
          v-if="tile.hint"
          :class="mutedClass + ' mt-1 text-[11px] truncate'"
        >
          {{ tile.hint }}
        </div>
      </div>
    </div>

    <!-- Row 1: status donut + completion distribution -->
    <div :class="chartsWrapClass">
      <div :class="panelClass">
        <div :class="sectionTitleClass">
          By status
        </div>
        <VChart
          v-if="statusOption"
          :style="chartStyle64"
          :option="statusOption"
          autoresize
        />
        <div
          v-else
          :class="mutedClass + ' text-sm'"
          :style="chartStyle64"
        >
          No status data.
        </div>
      </div>
      <div :class="panelClass">
        <div :class="sectionTitleClass">
          By completion
        </div>
        <VChart
          v-if="completionOption"
          :style="chartStyle64"
          :option="completionOption"
          autoresize
        />
        <div
          v-else
          :class="mutedClass + ' text-sm'"
          :style="chartStyle64"
        >
          No completion data.
        </div>
      </div>
    </div>

    <!-- Row 2: phase overview (dual-axis, spans full width) -->
    <div :class="chartsWrapClass">
      <div :class="panelClass + ' lg:col-span-2'">
        <div class="flex items-center justify-between gap-3">
          <div :class="sectionTitleClass">
            By phase — task count &amp; cost
          </div>
          <div :class="mutedClass + ' text-xs'">
            Total cost: {{ formatCurrency(analytics?.totalCost) }}
          </div>
        </div>
        <VChart
          v-if="phaseOption"
          :style="chartStyle72"
          :option="phaseOption"
          autoresize
        />
        <div
          v-else
          :class="mutedClass + ' text-sm'"
          :style="chartStyle64"
        >
          No phase data.
        </div>
      </div>
    </div>

    <!-- Row 3: top-cost tasks (full width) -->
    <div :class="chartsWrapClass">
      <div :class="panelClass + ' lg:col-span-2'">
        <div :class="sectionTitleClass">
          Top cost tasks
        </div>
        <VChart
          v-if="topCostOption"
          :style="chartStyle72"
          :option="topCostOption"
          autoresize
        />
        <div
          v-else
          :class="mutedClass + ' text-sm'"
          :style="chartStyle64"
        >
          No cost data.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { palette } from './echarts-setup'

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

// ---------------------------------------------------------------------------
// Presentation plumbing (kept so PDF / light-mode variants still work)
// ---------------------------------------------------------------------------

const rootClass = computed(() => {
  if (props.embedded) return 'space-y-4'
  return isLight.value
    ? 'rounded-2xl p-4 bg-white border border-black/10 space-y-4'
    : 'rounded-2xl p-4 bg-white/6 border border-white/10 space-y-4'
})

const rootStyle = computed(() => {
  const maxH = Math.round(280 * heightScale.value)
  return { '--chart-max-h': `${maxH}px` } as any
})

const chartStyle64 = computed(() => ({ height: `${Math.round(256 * heightScale.value)}px` }))
const chartStyle72 = computed(() => ({ height: `${Math.round(288 * heightScale.value)}px` }))

const titleClass = computed(() => isLight.value ? 'text-black/90 font-medium' : 'text-white/90 font-medium')
const mutedClass = computed(() => isLight.value ? 'text-black/60' : 'text-white/60')
const valueClass = computed(() => isLight.value ? 'text-black text-2xl font-semibold' : 'text-white text-2xl font-semibold')
const sectionTitleClass = computed(() => isLight.value ? 'text-sm text-black/80 mb-2' : 'text-sm text-white/80 mb-2')
const pad = computed(() => (isReport.value ? 'p-2' : 'p-3'))
const panelClass = computed(() => isLight.value
  ? `rounded-xl bg-black/5 border border-black/10 ${pad.value}`
  : `rounded-xl bg-white/5 border border-white/10 ${pad.value}`)
const cardClass = computed(() => isLight.value
  ? `rounded-xl bg-black/5 border border-black/10 ${pad.value}`
  : `rounded-xl bg-white/5 border border-white/10 ${pad.value}`)

const kpisWrapClass = computed(() => (isReport.value
  ? 'grid grid-cols-4 gap-2'
  : 'grid grid-cols-2 sm:grid-cols-4 gap-3'))

const chartsWrapClass = computed(() => (isReport.value
  ? 'grid grid-cols-1 lg:grid-cols-2 gap-3'
  : 'grid grid-cols-1 lg:grid-cols-2 gap-4'))

// ---------------------------------------------------------------------------
// ECharts style helpers (theme-aware)
// ---------------------------------------------------------------------------

const axisStyle = computed(() => {
  const tick = isLight.value ? 'rgba(0,0,0,0.70)' : 'rgba(255,255,255,0.75)'
  const line = isLight.value ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.20)'
  const split = isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'
  return {
    axisLine: { lineStyle: { color: line } },
    axisTick: { lineStyle: { color: line } },
    axisLabel: { color: tick },
    splitLine: { lineStyle: { color: split } },
  } as any
})

const tooltipStyle = computed(() => ({
  backgroundColor: isLight.value ? 'rgba(255,255,255,0.98)' : 'rgba(15,23,42,0.95)',
  borderColor: isLight.value ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
  borderWidth: 1,
  textStyle: { color: isLight.value ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)' },
  extraCssText: 'backdrop-filter: blur(8px); border-radius: 12px;',
} as any))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeNum(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function formatCurrency(v: unknown, compact = false) {
  const n = Number(v)
  const amount = Number.isFinite(n) ? n : 0
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : undefined,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

interface KpiTile {
  key: string; label: string; value: string | number; unit?: string;
  bar?: number | null; barClass?: string; hint?: string;
}
const kpiTiles = computed<KpiTile[]>(() => {
  const t: KpiTile[] = []
  const total = safeNum(props.analytics?.totalTasks)
  const done = safeNum(props.analytics?.completedTasks)
  const pct = total ? Math.round((done / total) * 100) : 0
  const avgPct = Math.round(safeNum(props.analytics?.avgPercentComplete))
  t.push({ key: 'total', label: 'Total tasks', value: total })
  t.push({
    key: 'completed',
    label: 'Completed',
    value: done,
    bar: pct,
    barClass: 'bg-emerald-400/80',
    hint: total ? `${pct}% of total` : undefined,
  })
  t.push({
    key: 'avgpct',
    label: 'Avg. completion',
    value: avgPct,
    unit: '%',
    bar: avgPct,
    barClass: 'bg-sky-400/80',
  })
  t.push({
    key: 'cost',
    label: 'Total cost',
    value: formatCurrency(props.analytics?.totalCost, true),
    hint: 'All tasks combined',
  })
  return t
})

// ---------------------------------------------------------------------------
// Status donut (ring with centred completion %)
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  'Not Started': palette.slate,
  'Pending': palette.indigo,
  'In Progress': palette.amber,
  'Blocked': palette.rose,
  'Completed': palette.emerald,
  'Complete': palette.emerald,
  'Cancelled': palette.slate,
}
const statusOption = computed(() => {
  const rows = (props.analytics?.tasksByStatus || []).filter((r) => r && r.name && safeNum(r.count) > 0)
  if (!rows.length) return null
  const total = safeNum(props.analytics?.totalTasks) || rows.reduce((s, r) => s + safeNum(r.count), 0)
  const done = safeNum(props.analytics?.completedTasks)
  const pct = total ? Math.round((done / total) * 100) : 0
  const data = rows.map((r) => ({
    value: safeNum(r.count),
    name: String(r.name || '—'),
    itemStyle: { color: statusColors[String(r.name || '')] || palette.slate },
  }))
  const centreColor = isLight.value ? '#0f172a' : '#fff'
  const hintColor = isLight.value ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.5)'
  return {
    tooltip: { trigger: 'item', ...tooltipStyle.value, formatter: (p: any) => `${p.name}<br/><strong>${p.value}</strong> (${p.percent}%)` },
    legend: { bottom: 0, textStyle: { color: isLight.value ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' } },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'center',
        formatter: [`{val|${pct}%}`, `{lbl|complete}`].join('\n'),
        rich: {
          val: { fontSize: 28, fontWeight: 600, color: centreColor, lineHeight: 32 },
          lbl: { fontSize: 11, color: hintColor, letterSpacing: 1 },
        },
      },
      labelLine: { show: false },
      itemStyle: { borderColor: isLight.value ? '#fff' : 'rgba(15,23,42,0.6)', borderWidth: 2 },
      data,
    }],
  }
})

// ---------------------------------------------------------------------------
// Completion distribution (stepped bar, 0–100% buckets)
// ---------------------------------------------------------------------------

const completionOption = computed(() => {
  const rows = props.analytics?.tasksByCompletion || []
  if (!rows.length) return null
  // Sort numerically when buckets look like "0–25%" etc. Fall back to given order.
  const sorted = [...rows].sort((a, b) => extractBucketStart(a.bucket) - extractBucketStart(b.bucket))
  const labels = sorted.map((r) => String(r.bucket))
  const counts = sorted.map((r) => safeNum(r.count))
  // Gradient: low completion = rose, high = emerald
  const colors = sorted.map((_, i) => gradientColor(i / Math.max(1, sorted.length - 1)))
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle.value, axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 20, top: 10, bottom: 30 },
    xAxis: { type: 'category', data: labels, ...axisStyle.value },
    yAxis: { type: 'value', ...axisStyle.value },
    series: [{
      type: 'bar',
      data: counts.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [6, 6, 0, 0] } })),
      barMaxWidth: 48,
      label: { show: true, position: 'top', color: isLight.value ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)' },
    }],
  }
})

function extractBucketStart(bucket: string): number {
  const m = /(\d+)/.exec(String(bucket || ''))
  return m ? Number(m[1]) : 0
}

function gradientColor(t: number): string {
  // Interpolate rose → amber → emerald at t ∈ [0,1]
  const stops = [
    { t: 0, c: [251, 113, 133] },   // rose
    { t: 0.5, c: [251, 191, 36] },  // amber
    { t: 1, c: [34, 197, 94] },     // emerald
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]; const b = stops[i + 1]
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t)
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * k)
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * k)
      const bv = Math.round(a.c[2] + (b.c[2] - a.c[2]) * k)
      return `rgb(${r},${g},${bv})`
    }
  }
  return palette.slate
}

// ---------------------------------------------------------------------------
// Phase overview (dual axis: task count as bar, cost as line)
// ---------------------------------------------------------------------------

const phaseOption = computed(() => {
  const taskRows = props.analytics?.tasksByPhase || []
  const costRows = props.analytics?.costByPhase || []
  if (!taskRows.length && !costRows.length) return null
  // Union phases, keyed by wbs
  const keys = Array.from(new Set([
    ...taskRows.map((r) => r.wbs || r.label || ''),
    ...costRows.map((r) => r.wbs || r.label || ''),
  ])).filter(Boolean)
  if (!keys.length) return null
  const labelFor = (k: string) => {
    const row = taskRows.find((r) => (r.wbs || r.label) === k) || costRows.find((r) => (r.wbs || r.label) === k)
    return String(row?.label || k)
  }
  const labels = keys.map(labelFor)
  const countSeries = keys.map((k) => {
    const row = taskRows.find((r) => (r.wbs || r.label) === k)
    return row ? safeNum(row.count) : 0
  })
  const costSeries = keys.map((k) => {
    const row = costRows.find((r) => (r.wbs || r.label) === k)
    return row ? safeNum(row.totalCost) : 0
  })
  return {
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle.value,
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValue ?? ''
        const rows = params.map((p) => {
          if (p.seriesName === 'Cost') return `${p.marker} ${p.seriesName}: <strong>${formatCurrency(p.value)}</strong>`
          return `${p.marker} ${p.seriesName}: <strong>${p.value}</strong>`
        }).join('<br/>')
        return `${label}<br/>${rows}`
      },
    },
    legend: { data: ['Tasks', 'Cost'], textStyle: { color: isLight.value ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }, top: 0 },
    grid: { left: 50, right: 60, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: labels, ...axisStyle.value },
    yAxis: [
      { type: 'value', name: 'Tasks', ...axisStyle.value },
      {
        type: 'value',
        name: 'Cost',
        ...axisStyle.value,
        axisLabel: { ...axisStyle.value.axisLabel, formatter: (v: number) => formatCurrency(v, true) },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Tasks',
        type: 'bar',
        yAxisIndex: 0,
        data: countSeries,
        itemStyle: { color: palette.emerald, borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 28,
      },
      {
        name: 'Cost',
        type: 'line',
        yAxisIndex: 1,
        data: costSeries,
        smooth: true,
        symbolSize: 6,
        lineStyle: { color: palette.amber, width: 2 },
        itemStyle: { color: palette.amber },
      },
    ],
  }
})

// ---------------------------------------------------------------------------
// Top-cost tasks horizontal bar
// ---------------------------------------------------------------------------

const topCostOption = computed(() => {
  const rows = (props.analytics?.topCostTasks || []).filter((r) => r && safeNum(r.totalCost) > 0)
  if (!rows.length) return null
  const labels = rows.map((r) => {
    const left = r.taskId || r.wbs || ''
    const title = r.name || ''
    const combined = left ? `${left} — ${title}` : title
    return combined.length > 60 ? combined.slice(0, 57) + '…' : combined
  })
  const data = rows.map((r) => safeNum(r.totalCost))
  return {
    tooltip: {
      trigger: 'axis',
      ...tooltipStyle.value,
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => `${params[0]?.axisValue ?? ''}<br/><strong>${formatCurrency(params[0]?.value)}</strong>`,
    },
    grid: { left: 200, right: 60, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      ...axisStyle.value,
      axisLabel: { ...axisStyle.value.axisLabel, formatter: (v: number) => formatCurrency(v, true) },
    },
    yAxis: {
      type: 'category',
      data: labels,
      ...axisStyle.value,
      inverse: true,
      axisLabel: { ...axisStyle.value.axisLabel, width: 190, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      data,
      itemStyle: { color: palette.violet, borderRadius: [0, 6, 6, 0] },
      barMaxWidth: 18,
      label: {
        show: true,
        position: 'right',
        color: isLight.value ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)',
        formatter: (p: any) => formatCurrency(p.value, true),
      },
    }],
  }
})
</script>
