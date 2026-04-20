<template>
  <div class="space-y-6">
    <!-- KPI tile strip -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="tile in kpiTiles"
        :key="tile.key"
        class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="text-xs uppercase tracking-wide text-white/50">
          {{ tile.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-3xl font-semibold text-white tabular-nums">
            {{ tile.value }}
          </div>
          <div
            v-if="tile.unit"
            class="text-sm text-white/50"
          >
            {{ tile.unit }}
          </div>
        </div>
        <div
          v-if="tile.hint"
          class="mt-1 text-[11px] text-white/40 truncate"
        >
          {{ tile.hint }}
        </div>
      </div>
    </div>

    <!-- Status donut + Type bar -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Status
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="statusOption"
          class="h-64"
          :option="statusOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No status data
        </div>
      </div>

      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Top types
          </h3>
        </div>
        <VChart
          v-if="typesOption"
          class="h-64"
          :option="typesOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No type data
        </div>
      </div>
    </div>

    <!-- Monthly trend (full width) -->
    <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold text-white">
          Activity volume by month
        </h3>
      </div>
      <VChart
        v-if="monthlyOption"
        class="h-56"
        :option="monthlyOption"
        autoresize
      />
      <div
        v-else
        class="text-white/60 text-sm h-56 flex items-center justify-center"
      >
        No monthly data
      </div>
    </div>

    <!-- Top locations (full width) -->
    <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold text-white">
          Top locations
        </h3>
      </div>
      <VChart
        v-if="locationsOption"
        class="h-72"
        :option="locationsOption"
        autoresize
      />
      <div
        v-else
        class="text-white/60 text-sm h-72 flex items-center justify-center"
      >
        No location data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { palette, axisStyle, tooltipStyle } from './echarts-setup'

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

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

interface KpiTile { key: string; label: string; value: string | number; unit?: string; hint?: string }
const kpiTiles = computed<KpiTile[]>(() => {
  const t = analytics.value?.totals || {} as any
  return [
    { key: 'activities', label: 'Activities', value: safeNum(t.totalActivities) },
    { key: 'issues', label: 'Issues logged', value: safeNum(t.totalIssues), hint: 'Across all activities' },
    { key: 'photos', label: 'Photos', value: safeNum(t.totalPhotos), hint: 'Site captures' },
    {
      key: 'docs',
      label: 'Comments + attachments',
      value: safeNum(t.totalComments) + safeNum(t.totalAttachments),
      hint: `${safeNum(t.totalComments)} comments · ${safeNum(t.totalAttachments)} attachments`,
    },
  ]
})

// ---------------------------------------------------------------------------
// Status donut
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  'Not Started': palette.slate,
  'In Progress': palette.amber,
  'Complete': palette.emerald,
  'Completed': palette.emerald,
  'Cancelled': palette.rose,
}
const statusOption = computed(() => {
  const rows = (analytics.value?.activitiesByStatus || []).filter((r) => r && r.name && Number(r.count) > 0)
  if (!rows.length) return null
  const total = rows.reduce((s, r) => s + (Number(r.count) || 0), 0)
  const data = rows.map((r) => ({
    value: Number(r.count) || 0,
    name: normalizeLabel(r.name),
    itemStyle: { color: statusColors[normalizeLabel(r.name)] || palette.slate },
  }))
  return {
    tooltip: { trigger: 'item', ...tooltipStyle, formatter: (p: any) => `${p.name}<br/><strong>${p.value}</strong> (${p.percent}%)` },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.8)' } },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'center',
        formatter: [`{val|${total}}`, `{lbl|total}`].join('\n'),
        rich: {
          val: { fontSize: 28, fontWeight: 600, color: '#fff', lineHeight: 32 },
          lbl: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
        },
      },
      labelLine: { show: false },
      itemStyle: { borderColor: 'rgba(15,23,42,0.6)', borderWidth: 2 },
      data,
    }],
  }
})

// ---------------------------------------------------------------------------
// Reusable top-N horizontal bar
// ---------------------------------------------------------------------------

function topBarOption(rows: Array<{ name: string; count: number }> | undefined, color: string, n = 10) {
  const entries = topN((rows || []).filter((r) => r && r.name), n, (r) => Number(r.count) || 0)
  if (!entries.length) return null
  const labels = entries.map((r) => normalizeLabel(r.name))
  const counts = entries.map((r) => Number(r.count) || 0)
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    grid: { left: 140, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: {
      type: 'category',
      data: labels,
      ...axisStyle,
      inverse: true,
      axisLabel: { ...axisStyle.axisLabel, width: 130, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: { color, borderRadius: [0, 6, 6, 0] },
      barMaxWidth: 18,
      label: { show: true, position: 'right', color: 'rgba(255,255,255,0.85)' },
    }],
  }
}

const typesOption = computed(() => topBarOption(analytics.value?.activitiesByType, palette.violet))
const locationsOption = computed(() => topBarOption(analytics.value?.activitiesByLocation, palette.cyan))

// ---------------------------------------------------------------------------
// Monthly time series
// ---------------------------------------------------------------------------

const monthlyOption = computed(() => {
  const rows = (analytics.value?.activitiesByMonth || []).filter((r) => r && r.month)
  if (!rows.length) return null
  // Sort chronologically (ISO month labels like 2026-04 sort lexicographically)
  const sorted = [...rows].sort((a, b) => String(a.month).localeCompare(String(b.month)))
  const labels = sorted.map((r) => formatMonthLabel(String(r.month)))
  const counts = sorted.map((r) => Number(r.count) || 0)
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'line' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: labels, boundaryGap: false, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle },
    series: [{
      type: 'line',
      data: counts,
      smooth: true,
      showSymbol: counts.length <= 24,
      symbolSize: 6,
      lineStyle: { color: palette.amber, width: 2 },
      itemStyle: { color: palette.amber },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(251,191,36,0.35)' },
            { offset: 1, color: 'rgba(251,191,36,0.02)' },
          ],
        },
      },
    }],
  }
})

function formatMonthLabel(raw: string): string {
  // Input like "2026-04" → "Apr 2026"
  const m = /^(\d{4})-(\d{2})$/.exec(String(raw).trim())
  if (!m) return String(raw)
  const year = Number(m[1])
  const month = Number(m[2])
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}
</script>
