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
          class="mt-1 text-[11px] text-white/40"
        >
          {{ tile.hint }}
        </div>
      </div>
    </div>

    <!-- Commissioning pipeline (full width) -->
    <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold text-white">
          Commissioning pipeline
        </h3>
        <span
          v-if="loading"
          class="text-xs text-white/60"
        >Loading…</span>
      </div>
      <VChart
        v-if="pipelineOption"
        class="h-56"
        :option="pipelineOption"
        autoresize
      />
      <div
        v-else
        class="text-white/60 text-sm h-56 flex items-center justify-center"
      >
        No equipment data
      </div>
    </div>

    <!-- Systems overview + FPT composite -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            By system
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="systemsOption"
          class="h-80"
          :option="systemsOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-80 flex items-center justify-center"
        >
          No system breakdown
        </div>
      </div>

      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Functional tests
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="fptOption"
          class="h-80"
          :option="fptOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-80 flex items-center justify-center"
        >
          No test data
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { palette, axisStyle, tooltipStyle } from './echarts-setup'

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

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

const totalEquipment = computed(() => {
  const rows = analytics.value.equipmentByStatus || []
  return rows.reduce((s, r) => s + (Number(r.count) || 0), 0)
})
const operationalCount = computed(() => {
  const rows = analytics.value.equipmentByStatus || []
  const m = rows.find((r) => String(r.name || '').toLowerCase() === 'operational')
  return m ? Number(m.count) || 0 : 0
})
const operationalPct = computed(() => totalEquipment.value ? Math.round((operationalCount.value / totalEquipment.value) * 100) : 0)

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
  t.push({ key: 'total', label: 'Total equipment', value: totalEquipment.value, hint: totalEquipment.value ? 'All statuses' : undefined })
  t.push({
    key: 'operational',
    label: 'Operational',
    value: operationalCount.value,
    pct: totalEquipment.value ? operationalPct.value : null,
    bar: operationalPct.value,
    barClass: 'bg-emerald-400/80',
    hint: totalEquipment.value ? `of ${totalEquipment.value}` : undefined,
  })
  const cp = checklistProgress.value
  if (cp && cp.totalQuestions > 0) {
    t.push({
      key: 'checklists',
      label: 'Checklist answered',
      value: cp.pct,
      unit: '%',
      bar: cp.pct,
      barClass: 'bg-sky-400/80',
      hint: `${cp.answeredQuestions} / ${cp.totalQuestions} questions`,
    })
  } else {
    t.push({ key: 'checklists', label: 'Checklist answered', value: '—', hint: 'No questions yet' })
  }
  const fp = fptProgress.value
  if (fp && fp.doneTests > 0) {
    const passRate = fp.doneTests ? Math.round((fp.passTests / fp.doneTests) * 100) : 0
    t.push({
      key: 'fpt',
      label: 'FPT pass rate',
      value: passRate,
      unit: '%',
      bar: passRate,
      barClass: 'bg-violet-400/80',
      hint: `${fp.passTests} pass · ${fp.failTests} fail · ${Math.max(0, fp.totalTests - fp.doneTests)} pending`,
    })
  } else if (fp && fp.totalTests > 0) {
    t.push({ key: 'fpt', label: 'FPT pass rate', value: '—', hint: `${fp.totalTests} tests defined` })
  } else {
    t.push({ key: 'fpt', label: 'FPT pass rate', value: '—', hint: 'No tests yet' })
  }
  return t
})

// ---------------------------------------------------------------------------
// Commissioning pipeline — horizontal bar, ordered by typical workflow
// ---------------------------------------------------------------------------

const pipelineOrder = ['Not Started', 'Ordered', 'Shipped', 'In Storage', 'Installed', 'Tested', 'Operational']
const statusPalette: Record<string, string> = {
  'Not Started': palette.slate,
  'Ordered': palette.blue,
  'Shipped': palette.indigo,
  'In Storage': palette.amber,
  'Installed': palette.cyan,
  'Tested': palette.violet,
  'Operational': palette.green,
  'Decommissioned': palette.red,
  'Has Issues': palette.rose,
}

const pipelineOption = computed(() => {
  const rows = analytics.value.equipmentByStatus || []
  if (!rows.length) return null
  const countMap: Record<string, number> = {}
  let leftover: Array<{ name: string; count: number }> = []
  for (const r of rows) {
    if (!r || !r.name) continue
    const n = Number(r.count) || 0
    if (pipelineOrder.includes(r.name)) countMap[r.name] = n
    else if (n > 0) leftover.push({ name: r.name, count: n })
  }
  leftover = leftover.sort((a, b) => b.count - a.count).slice(0, 3)
  const labels = [...pipelineOrder, ...leftover.map((l) => l.name)]
  const counts = labels.map((l) => countMap[l] ?? leftover.find((x) => x.name === l)?.count ?? 0)
  const hasAny = counts.some((c) => c > 0)
  if (!hasAny) return null
  const colors = labels.map((l) => statusPalette[l] || palette.slate)
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    grid: { left: 110, right: 60, top: 10, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'category', data: labels, ...axisStyle, inverse: true },
    series: [{
      type: 'bar',
      data: counts.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0] } })),
      barMaxWidth: 26,
      label: {
        show: true,
        position: 'right',
        color: 'rgba(255,255,255,0.85)',
        formatter: (p: any) => String(p.value || 0),
      },
    }],
  }
})

// ---------------------------------------------------------------------------
// Systems overview — grouped horizontal bar (equipment / checklists / issues)
// ---------------------------------------------------------------------------

const systemsOption = computed(() => {
  const eqRows = analytics.value.equipmentBySystem || []
  const chkRows = analytics.value.checklistsBySystem || []
  const issRows = analytics.value.issuesByEquipmentSystem || []
  const eqMap: Record<string, number> = {}
  for (const r of eqRows) if (r && r.name) eqMap[String(r.name)] = Number(r.count) || 0
  const chkMap: Record<string, number> = {}
  for (const r of chkRows) if (r && r.system) chkMap[String(r.system)] = Number(r.checklistsCount) || 0
  const issMap: Record<string, number> = {}
  for (const r of issRows) if (r && r.system) issMap[String(r.system)] = Number(r.issuesCount) || 0

  const names = Array.from(new Set([
    ...Object.keys(eqMap),
    ...Object.keys(chkMap),
    ...Object.keys(issMap),
  ]))
  const totalFor = (n: string) => (eqMap[n] || 0) + (chkMap[n] || 0) + (issMap[n] || 0)
  const sorted = names.sort((a, b) => totalFor(b) - totalFor(a)).slice(0, 10)
  if (!sorted.length) return null

  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Equipment', 'Checklist sections', 'Open issues'],
      textStyle: { color: 'rgba(255,255,255,0.8)' },
      top: 0,
    },
    grid: { left: 120, right: 20, top: 40, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'category', data: sorted, ...axisStyle, inverse: true },
    series: [
      {
        name: 'Equipment',
        type: 'bar',
        data: sorted.map((n) => eqMap[n] || 0),
        itemStyle: { color: palette.violet, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 12,
      },
      {
        name: 'Checklist sections',
        type: 'bar',
        data: sorted.map((n) => chkMap[n] || 0),
        itemStyle: { color: palette.cyan, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 12,
      },
      {
        name: 'Open issues',
        type: 'bar',
        data: sorted.map((n) => issMap[n] || 0),
        itemStyle: { color: palette.rose, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 12,
      },
    ],
  }
})

// ---------------------------------------------------------------------------
// FPT composite — donut showing passed / failed / pending
// ---------------------------------------------------------------------------

const fptOption = computed(() => {
  const p = fptProgress.value
  if (!p || !Number.isFinite(p.totalTests) || p.totalTests <= 0) return null
  const pass = Math.max(0, Number(p.passTests) || 0)
  const fail = Math.max(0, Number(p.failTests) || 0)
  const pending = Math.max(0, (Number(p.totalTests) || 0) - (Number(p.doneTests) || 0))
  const total = pass + fail + pending
  if (!total) return null
  return {
    tooltip: { trigger: 'item', ...tooltipStyle, formatter: (p: any) => `${p.name}<br/><strong>${p.value}</strong> (${p.percent}%)` },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.8)' },
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'center',
        formatter: [
          `{val|${p.doneTests ? Math.round((pass / p.doneTests) * 100) : 0}%}`,
          `{lbl|pass rate}`,
        ].join('\n'),
        rich: {
          val: { fontSize: 28, fontWeight: 600, color: '#fff', lineHeight: 32 },
          lbl: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
        },
      },
      labelLine: { show: false },
      itemStyle: { borderColor: 'rgba(15,23,42,0.6)', borderWidth: 2 },
      data: [
        { value: pass, name: 'Passed', itemStyle: { color: palette.green } },
        { value: fail, name: 'Failed', itemStyle: { color: palette.red } },
        { value: pending, name: 'Pending', itemStyle: { color: 'rgba(255,255,255,0.18)' } },
      ],
    }],
  }
})
</script>
