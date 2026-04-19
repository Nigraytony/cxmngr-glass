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
            v-if="tile.delta != null"
            class="text-[11px] px-1.5 py-0.5 rounded-md border"
            :class="tile.deltaPositive
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
              : tile.delta === 0
                ? 'bg-white/10 border-white/15 text-white/60'
                : 'bg-rose-500/15 border-rose-400/30 text-rose-300'"
          >
            {{ tile.delta > 0 ? '+' : '' }}{{ tile.delta }}
          </span>
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
        <VChart
          v-if="tile.spark"
          class="h-10 mt-2"
          :option="tile.spark"
          autoresize
        />
        <div
          v-if="tile.hint"
          class="mt-1 text-[11px] text-white/40"
        >
          {{ tile.hint }}
        </div>
      </div>
    </div>

    <!-- Widget row: Issue burndown + Commissioning progress -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div
        v-if="featureEnabled('issues')"
        class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Issue burndown — last 30 days
          </h3>
          <span
            v-if="issuesLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="burndownOption"
          class="h-64"
          :option="burndownOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No issue data
        </div>
      </div>

      <div
        v-if="featureEnabled('equipment')"
        class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Commissioning progress by system
          </h3>
          <span
            v-if="equipmentLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="commissioningOption"
          class="h-64"
          :option="commissioningOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No equipment data
        </div>
      </div>
    </div>

    <!-- Widget row: Heatmap + Schedule -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div
        v-if="featureEnabled('issues')"
        class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Issues by system × severity
          </h3>
          <span
            v-if="issuesLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="heatmapOption"
          class="h-64"
          :option="heatmapOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No issue data
        </div>
      </div>

      <div
        v-if="featureEnabled('tasks')"
        class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Upcoming & overdue tasks
          </h3>
          <span
            v-if="tasksLoadingState"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="scheduleOption"
          class="h-64"
          :option="scheduleOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-64 flex items-center justify-center"
        >
          No tasks with due dates
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import VChart from 'vue-echarts'
import { palette, axisStyle, tooltipStyle } from './echarts-setup'
import { useIssuesStore } from '../../stores/issues'
import { useActivitiesStore } from '../../stores/activities'
import { useEquipmentStore } from '../../stores/equipment'
import { useSpacesStore } from '../../stores/spaces'
import { useProjectStore } from '../../stores/project'

type TaskRecord = Record<string, any>

const props = defineProps<{ tasks?: TaskRecord[]; tasksLoading?: boolean }>()

const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const activitiesStore = useActivitiesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()
const tasksLoadingState = computed(() => props.tasksLoading === true)

// ---------------------------------------------------------------------------
// Feature gating (unchanged from the previous dashboard)
// ---------------------------------------------------------------------------

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
  } catch (e) { /* soft-fail */ }
})

const issuesLoading = computed(() => issuesStore.loading)
const equipmentLoading = computed(() => equipmentStore.loading)

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseDate(v: any): Date | null {
  if (!v) return null
  try {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}
function startOfDay(d: Date): Date {
  const c = new Date(d.getTime())
  c.setHours(0, 0, 0, 0)
  return c
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function lastNDays(n: number): Date[] {
  const today = startOfDay(new Date())
  const out: Date[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime())
    d.setDate(d.getDate() - i)
    out.push(d)
  }
  return out
}
function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function normStatus(s?: string) {
  const k = String(s || 'Unknown').toLowerCase()
  if (k.includes('closed') || k.includes('cancel')) return 'Closed'
  if (k.includes('progress')) return 'In Progress'
  if (k.includes('open')) return 'Open'
  return s || 'Unknown'
}
function normSeverity(s?: string) {
  const k = String(s || '').toLowerCase()
  if (k.startsWith('h') || k === 'critical') return 'High'
  if (k.startsWith('m')) return 'Medium'
  if (k.startsWith('l')) return 'Low'
  return 'Other'
}

// ---------------------------------------------------------------------------
// KPI tiles (top row)
// ---------------------------------------------------------------------------

// Sparkline option factory — a small inline line chart with no axes / legend.
function sparkOption(values: number[], color: string) {
  return {
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, i) => String(i)) },
    yAxis: { type: 'value', show: false, scale: true },
    series: [{
      type: 'line',
      data: values,
      showSymbol: false,
      smooth: true,
      lineStyle: { color, width: 2 },
      areaStyle: { color, opacity: 0.18 },
    }],
    animation: false,
  }
}

const last30 = computed(() => lastNDays(30))

const openIssuesSeries = computed<number[]>(() => {
  // Count of still-open issues at end of each day for last 30 days.
  const days = last30.value
  const issues = issuesStore.issues || []
  const series: number[] = []
  for (const day of days) {
    const end = new Date(day.getTime())
    end.setHours(23, 59, 59, 999)
    let openCount = 0
    for (const it of issues) {
      const created = parseDate((it as any).dateFound || (it as any).createdAt)
      if (!created || created.getTime() > end.getTime()) continue
      const closed = parseDate((it as any).closedDate)
      const closedOnOrBefore = closed && closed.getTime() <= end.getTime()
      if (!closedOnOrBefore) openCount++
    }
    series.push(openCount)
  }
  return series
})

const openIssuesToday = computed(() => {
  const s = openIssuesSeries.value
  return s.length ? s[s.length - 1] : 0
})
const openIssues7dAgo = computed(() => {
  const s = openIssuesSeries.value
  return s.length >= 8 ? s[s.length - 8] : (s[0] || 0)
})

const equipmentByStatus = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const e of (equipmentStore.items || [])) {
    const k = String((e as any).status || 'Not Started')
    counts[k] = (counts[k] || 0) + 1
  }
  return counts
})
const operationalCount = computed(() => equipmentByStatus.value['Operational'] || 0)
const totalEquipment = computed(() => (equipmentStore.items || []).length)
const operationalPct = computed(() => totalEquipment.value ? Math.round((operationalCount.value / totalEquipment.value) * 100) : 0)

// FPT pass rate — across all equipment's functionalTests
const fptStats = computed(() => {
  let total = 0
  let passed = 0
  for (const e of (equipmentStore.items || [])) {
    const fts = Array.isArray((e as any).functionalTests) ? (e as any).functionalTests : []
    for (const t of fts) {
      if (!t) continue
      const p = (t as any).pass
      if (p === true) { total++; passed++ }
      else if (p === false) { total++ }
      // pass === null / undefined → not yet tested, don't count
    }
  }
  return { total, passed }
})
const fptPassRate = computed(() => fptStats.value.total ? Math.round((fptStats.value.passed / fptStats.value.total) * 100) : 0)

const tasksOverdue = computed(() => {
  const list = Array.isArray(props.tasks) ? props.tasks : []
  const today = startOfDay(new Date())
  let n = 0
  for (const t of list) {
    if (!t || (t as any).deleted === true) continue
    const status = String((t as any).status || '').toLowerCase()
    if (status.includes('complete')) continue
    const end = parseDate((t as any).end || (t as any).finish || (t as any).dueDate)
    if (!end) continue
    if (end.getTime() < today.getTime()) n++
  }
  return n
})

interface KpiTile {
  key: string
  label: string
  value: string | number
  unit?: string
  delta?: number | null
  deltaPositive?: boolean
  spark?: any
  hint?: string
}
const kpiTiles = computed<KpiTile[]>(() => {
  const tiles: KpiTile[] = []
  if (featureEnabled('issues')) {
    const now = openIssuesToday.value
    const prev = openIssues7dAgo.value
    const delta = now - prev
    tiles.push({
      key: 'open-issues',
      label: 'Open issues',
      value: now,
      delta,
      deltaPositive: delta < 0, // fewer open is good
      spark: sparkOption(openIssuesSeries.value, palette.rose),
      hint: `vs ${prev} a week ago`,
    })
  }
  if (featureEnabled('equipment')) {
    tiles.push({
      key: 'equipment-operational',
      label: 'Equipment operational',
      value: operationalPct.value,
      unit: '%',
      hint: `${operationalCount.value} of ${totalEquipment.value}`,
    })
    tiles.push({
      key: 'fpt-pass-rate',
      label: 'FPT pass rate',
      value: fptStats.value.total ? fptPassRate.value : '—',
      unit: fptStats.value.total ? '%' : '',
      hint: fptStats.value.total ? `${fptStats.value.passed} passed / ${fptStats.value.total} tested` : 'No tests recorded',
    })
  }
  if (featureEnabled('tasks')) {
    tiles.push({
      key: 'tasks-overdue',
      label: 'Tasks overdue',
      value: tasksOverdue.value,
      hint: tasksOverdue.value ? 'past due date & not complete' : 'On schedule',
    })
  }
  return tiles
})

// ---------------------------------------------------------------------------
// Widget 1 — Issue burndown (line + bar overlay)
// ---------------------------------------------------------------------------

const burndownOption = computed(() => {
  const days = last30.value
  const labels = days.map(shortDay)
  const open = openIssuesSeries.value
  // New per day
  const newPerDay: number[] = days.map((day) => {
    const k = dayKey(day)
    let n = 0
    for (const it of (issuesStore.issues || [])) {
      const created = parseDate((it as any).dateFound || (it as any).createdAt)
      if (created && dayKey(startOfDay(created)) === k) n++
    }
    return n
  })
  const closedPerDay: number[] = days.map((day) => {
    const k = dayKey(day)
    let n = 0
    for (const it of (issuesStore.issues || [])) {
      const closed = parseDate((it as any).closedDate)
      if (closed && dayKey(startOfDay(closed)) === k) n++
    }
    return n
  })
  const hasAny = open.some(v => v > 0) || newPerDay.some(v => v > 0) || closedPerDay.some(v => v > 0)
  if (!hasAny) return null
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'cross' } },
    legend: {
      data: ['Open', 'New', 'Closed'],
      textStyle: { color: 'rgba(255,255,255,0.8)' },
      top: 0,
    },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: labels, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        name: 'Open',
        type: 'line',
        data: open,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: palette.rose, width: 2 },
        itemStyle: { color: palette.rose },
        areaStyle: { color: palette.rose, opacity: 0.12 },
      },
      {
        name: 'New',
        type: 'bar',
        data: newPerDay,
        itemStyle: { color: palette.amber, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 14,
      },
      {
        name: 'Closed',
        type: 'bar',
        data: closedPerDay.map(v => -v),
        itemStyle: { color: palette.emerald, borderRadius: [0, 0, 3, 3] },
        barMaxWidth: 14,
      },
    ],
  }
})

// ---------------------------------------------------------------------------
// Widget 2 — Commissioning progress by system (stacked bar)
// ---------------------------------------------------------------------------

const equipmentStatusOrder = ['Not Started', 'Ordered', 'Shipped', 'In Storage', 'Installed', 'Tested', 'Operational']
const statusPalette: Record<string, string> = {
  'Not Started': palette.slate,
  'Ordered': palette.blue,
  'Shipped': palette.indigo,
  'In Storage': palette.amber,
  'Installed': palette.cyan,
  'Tested': palette.violet,
  'Operational': palette.green,
}
const commissioningOption = computed(() => {
  const bySystem: Record<string, Record<string, number>> = {}
  for (const e of (equipmentStore.items || [])) {
    const sys = String((e as any).system || 'Unassigned') || 'Unassigned'
    const status = equipmentStatusOrder.includes((e as any).status) ? (e as any).status : 'Not Started'
    if (!bySystem[sys]) bySystem[sys] = {}
    bySystem[sys][status] = (bySystem[sys][status] || 0) + 1
  }
  const systems = Object.keys(bySystem).sort((a, b) => {
    const sa = Object.values(bySystem[a]).reduce((x, y) => x + y, 0)
    const sb = Object.values(bySystem[b]).reduce((x, y) => x + y, 0)
    return sb - sa
  }).slice(0, 10) // cap for readability
  if (!systems.length) return null
  const series = equipmentStatusOrder.map((status) => ({
    name: status,
    type: 'bar',
    stack: 'total',
    emphasis: { focus: 'series' },
    itemStyle: { color: statusPalette[status] },
    data: systems.map((sys) => bySystem[sys][status] || 0),
    barMaxWidth: 22,
  }))
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    legend: { textStyle: { color: 'rgba(255,255,255,0.8)' }, top: 0, type: 'scroll' },
    grid: { left: 110, right: 20, top: 30, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'category', data: systems, ...axisStyle, inverse: true },
    series,
  }
})

// ---------------------------------------------------------------------------
// Widget 3 — Issues heatmap (system × severity)
// ---------------------------------------------------------------------------

const severityOrder = ['Low', 'Medium', 'High']
const heatmapOption = computed(() => {
  const bySys: Record<string, Record<string, number>> = {}
  let max = 0
  for (const it of (issuesStore.issues || [])) {
    if (normStatus((it as any).status) === 'Closed') continue
    const sys = String((it as any).system || 'Unassigned') || 'Unassigned'
    const sev = normSeverity((it as any).severity || (it as any).priority)
    if (!severityOrder.includes(sev)) continue
    if (!bySys[sys]) bySys[sys] = {}
    bySys[sys][sev] = (bySys[sys][sev] || 0) + 1
    if (bySys[sys][sev] > max) max = bySys[sys][sev]
  }
  const systems = Object.keys(bySys).sort((a, b) => {
    const sa = Object.values(bySys[a]).reduce((x, y) => x + y, 0)
    const sb = Object.values(bySys[b]).reduce((x, y) => x + y, 0)
    return sb - sa
  }).slice(0, 12)
  if (!systems.length || max === 0) return null
  const data: [number, number, number][] = []
  for (let y = 0; y < systems.length; y++) {
    for (let x = 0; x < severityOrder.length; x++) {
      const count = bySys[systems[y]]?.[severityOrder[x]] || 0
      data.push([x, y, count])
    }
  }
  return {
    tooltip: {
      ...tooltipStyle,
      formatter: (params: any) => {
        const [x, y, v] = params.value as [number, number, number]
        return `${systems[y]} • ${severityOrder[x]}<br/><strong>${v}</strong> open`
      },
    },
    grid: { left: 110, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: severityOrder, ...axisStyle, splitArea: { show: false } },
    yAxis: { type: 'category', data: systems, ...axisStyle, inverse: true, splitArea: { show: false } },
    visualMap: {
      min: 0,
      max,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.75)' },
      inRange: { color: ['rgba(251,191,36,0.12)', palette.amber, palette.rose, palette.red] },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true, color: 'rgba(255,255,255,0.95)', formatter: (p: any) => (p.value[2] ? String(p.value[2]) : '') },
      itemStyle: { borderColor: 'rgba(15,23,42,0.6)', borderWidth: 2, borderRadius: 6 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  }
})

// ---------------------------------------------------------------------------
// Widget 4 — Upcoming & overdue tasks (horizontal bar, days-from-today)
// ---------------------------------------------------------------------------

const scheduleOption = computed(() => {
  const list = Array.isArray(props.tasks) ? props.tasks : []
  const today = startOfDay(new Date())
  type Row = { name: string; days: number; overdue: boolean; completePct: number }
  const rows: Row[] = []
  for (const t of list) {
    if (!t || (t as any).deleted === true) continue
    const status = String((t as any).status || '').toLowerCase()
    if (status.includes('complete')) continue
    const end = parseDate((t as any).end || (t as any).finish || (t as any).dueDate)
    if (!end) continue
    const days = Math.round((startOfDay(end).getTime() - today.getTime()) / 86400000)
    const name = String((t as any).name || (t as any).title || '').slice(0, 60) || 'Task'
    const pct = Number((t as any).percentComplete) || 0
    rows.push({ name, days, overdue: days < 0, completePct: pct })
  }
  // Prefer the 15 closest to today (overdue + upcoming)
  const sorted = rows.sort((a, b) => Math.abs(a.days) - Math.abs(b.days)).slice(0, 15)
  if (!sorted.length) return null
  // Sort display by days asc so overdue (negative) sits at the top.
  sorted.sort((a, b) => a.days - b.days)
  const names = sorted.map(r => r.name)
  const data = sorted.map(r => ({
    value: r.days,
    itemStyle: {
      color: r.overdue ? palette.rose : r.days <= 7 ? palette.amber : palette.emerald,
      borderRadius: 4,
    },
  }))
  return {
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const row = sorted[p.dataIndex]
        const label = row.overdue ? `${Math.abs(row.days)}d overdue` : row.days === 0 ? 'due today' : `in ${row.days}d`
        return `${row.name}<br/><strong>${label}</strong> • ${row.completePct}% complete`
      },
    },
    grid: { left: 180, right: 30, top: 10, bottom: 25 },
    xAxis: {
      type: 'value',
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, formatter: (v: number) => v === 0 ? 'today' : (v > 0 ? `+${v}d` : `${v}d`) },
    },
    yAxis: { type: 'category', data: names, ...axisStyle, inverse: true },
    series: [{
      type: 'bar',
      data,
      barMaxWidth: 14,
      markLine: {
        symbol: 'none',
        silent: true,
        lineStyle: { color: 'rgba(255,255,255,0.5)', type: 'dashed' },
        data: [{ xAxis: 0 }],
        label: { show: false },
      },
    }],
  }
})
</script>
