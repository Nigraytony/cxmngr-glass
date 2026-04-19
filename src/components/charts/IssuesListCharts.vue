<template>
  <div class="space-y-6">
    <!-- KPI tile strip -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="tile in kpiTiles"
        :key="tile.key"
        class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between">
          <div class="text-xs uppercase tracking-wide text-white/50">
            {{ tile.label }}
          </div>
          <span
            v-if="tile.pct != null"
            class="text-[11px] px-1.5 py-0.5 rounded-md border bg-white/8 border-white/15 text-white/70"
          >
            {{ tile.pct }}%
          </span>
        </div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-3xl font-semibold text-white tabular-nums truncate">
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
          v-if="tile.bar != null"
          class="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden"
        >
          <div
            class="h-full rounded-full"
            :class="tile.barClass"
            :style="{ width: Math.max(0, Math.min(100, Number(tile.bar))) + '%' }"
          />
        </div>
        <div
          v-if="tile.hint"
          class="mt-1 text-[11px] text-white/40 truncate"
        >
          {{ tile.hint }}
        </div>
      </div>
    </div>

    <!-- Status donut + Priority bar -->
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
            Priority
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="priorityOption"
          class="h-64"
          :option="priorityOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No priority data
        </div>
      </div>
    </div>

    <!-- Top systems + Top types -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Top systems
          </h3>
        </div>
        <VChart
          v-if="systemsOption"
          class="h-72"
          :option="systemsOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-72 flex items-center justify-center"
        >
          No system data
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
          class="h-72"
          :option="typesOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-72 flex items-center justify-center"
        >
          No type data
        </div>
      </div>
    </div>

    <!-- Top equipment + Top locations -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Top equipment
          </h3>
        </div>
        <VChart
          v-if="equipmentOption"
          class="h-72"
          :option="equipmentOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-72 flex items-center justify-center"
        >
          No equipment-linked issues
        </div>
      </div>

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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { palette, axisStyle, tooltipStyle } from './echarts-setup'

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

function normalizeLabel(s: any): string {
  const v = String(s || '').trim()
  return v || 'Unspecified'
}
function topN<T>(arr: T[], n: number, score: (x: T) => number) {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n)
}
function countOf(rows: Array<{ count: number }> | undefined) {
  return (rows || []).reduce((s, r) => s + (Number(r.count) || 0), 0)
}
function findRow(rows: Array<{ name: string; count: number }> | undefined, matcher: (name: string) => boolean) {
  for (const r of rows || []) {
    if (r && matcher(String(r.name || '').toLowerCase())) return r
  }
  return null
}

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

const total = computed(() => countOf(analytics.value.issuesByStatus))
const closed = computed(() => {
  const row = findRow(analytics.value.issuesByStatus, (n) => n === 'closed' || n === 'cancelled')
  return row ? Number(row.count) || 0 : 0
})
const open = computed(() => Math.max(0, total.value - closed.value))
const highPriority = computed(() => {
  const row = findRow(analytics.value.issuesByPriority, (n) => n === 'high' || n === 'critical')
  return row ? Number(row.count) || 0 : 0
})
const topHotZone = computed(() => {
  const sysRows = analytics.value.issuesBySystem || []
  const locRows = analytics.value.issuesByLocation || []
  const topSys = topN(sysRows.filter((r) => r && r.name), 1, (r) => Number(r.count) || 0)[0]
  const topLoc = topN(locRows.filter((r) => r && r.name), 1, (r) => Number(r.count) || 0)[0]
  if (!topSys && !topLoc) return null
  const sysCount = topSys ? Number(topSys.count) || 0 : 0
  const locCount = topLoc ? Number(topLoc.count) || 0 : 0
  if (sysCount >= locCount && topSys) return { label: topSys.name, count: sysCount, kind: 'system' as const }
  if (topLoc) return { label: topLoc.name, count: locCount, kind: 'location' as const }
  return null
})

interface KpiTile {
  key: string
  label: string
  value: string | number
  unit?: string
  pct?: number | null
  bar?: number | null
  barClass?: string
  hint?: string
}
const kpiTiles = computed<KpiTile[]>(() => {
  const t: KpiTile[] = []
  t.push({ key: 'open', label: 'Open', value: open.value, hint: total.value ? `of ${total.value} total` : 'No issues yet' })
  const hpPct = total.value ? Math.round((highPriority.value / total.value) * 100) : 0
  t.push({
    key: 'high',
    label: 'High priority',
    value: highPriority.value,
    pct: total.value ? hpPct : null,
    bar: hpPct,
    barClass: 'bg-rose-400/80',
    hint: highPriority.value ? `${hpPct}% of total` : 'None flagged',
  })
  t.push({ key: 'closed', label: 'Closed', value: closed.value, hint: total.value ? `${total.value ? Math.round((closed.value / total.value) * 100) : 0}% of total` : undefined })
  const hot = topHotZone.value
  t.push({
    key: 'hotzone',
    label: 'Top hot zone',
    value: hot ? hot.label : '—',
    hint: hot ? `${hot.count} open — ${hot.kind}` : 'Nothing ranked yet',
  })
  return t
})

// ---------------------------------------------------------------------------
// Status donut
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  'Open': palette.blue,
  'In Progress': palette.amber,
  'Pending': palette.indigo,
  'Closed': palette.emerald,
  'Cancelled': palette.slate,
}
const statusOption = computed(() => {
  const rows = (analytics.value.issuesByStatus || []).filter((r) => r && r.name && Number(r.count) > 0)
  if (!rows.length) return null
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
        formatter: [`{val|${open.value}}`, `{lbl|open}`].join('\n'),
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
// Priority horizontal bar — ordered Low → High with a traffic-light palette
// ---------------------------------------------------------------------------

const priorityOrder = ['Low', 'Medium', 'High', 'Critical']
const priorityColors: Record<string, string> = {
  'Low': palette.slate,
  'Medium': palette.amber,
  'High': palette.rose,
  'Critical': palette.red,
}
const priorityOption = computed(() => {
  const rows = analytics.value.issuesByPriority || []
  if (!rows.length) return null
  const countMap: Record<string, number> = {}
  for (const r of rows) if (r && r.name) countMap[normalizeLabel(r.name)] = Number(r.count) || 0
  const ordered = priorityOrder.filter((p) => countMap[p])
  const extras = Object.keys(countMap).filter((k) => !priorityOrder.includes(k) && countMap[k] > 0)
  const labels = [...ordered, ...extras]
  if (!labels.length) return null
  const counts = labels.map((l) => countMap[l] || 0)
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    grid: { left: 90, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'category', data: labels, ...axisStyle, inverse: true },
    series: [{
      type: 'bar',
      data: counts.map((v, i) => ({
        value: v,
        itemStyle: { color: priorityColors[labels[i]] || palette.slate, borderRadius: [0, 6, 6, 0] },
      })),
      barMaxWidth: 26,
      label: { show: true, position: 'right', color: 'rgba(255,255,255,0.85)' },
    }],
  }
})

// ---------------------------------------------------------------------------
// Reusable top-N horizontal bar
// ---------------------------------------------------------------------------

function topBarOption(
  rows: Array<{ name: string; count: number }> | undefined,
  color: string,
  n = 10,
) {
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

const systemsOption = computed(() => topBarOption(analytics.value.issuesBySystem, palette.cyan))
const typesOption = computed(() => topBarOption(analytics.value.issuesByType, palette.violet))
const equipmentOption = computed(() => topBarOption(analytics.value.issuesByEquipment, palette.amber))
const locationsOption = computed(() => topBarOption(analytics.value.issuesByLocation, palette.emerald))
</script>
