<template>
  <div class="space-y-6">
    <!-- KPI tile strip -->
    <div class="grid gap-4 sm:grid-cols-3">
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

    <!-- Items coverage donut + Evaluations bar -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Items by coverage
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="itemsOption"
          class="h-72"
          :option="itemsOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-72 flex items-center justify-center"
        >
          No progress data
        </div>
      </div>

      <div class="rounded-2xl p-4 md:p-5 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-white">
            Evaluations
          </h3>
          <span
            v-if="loading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <VChart
          v-if="evalsOption"
          class="h-72"
          :option="evalsOption"
          autoresize
        />
        <div
          v-else
          class="text-white/60 text-sm h-72 flex items-center justify-center"
        >
          No evaluation data
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { palette, axisStyle, tooltipStyle } from './echarts-setup'
import type { OprCoverageRow } from '../../stores/oprLinkEvaluations'

const props = defineProps<{
  items: Array<{ id: string }>
  coverage: Record<string, OprCoverageRow>
  loading?: boolean
}>()

const loading = computed(() => props.loading === true)

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

function coverageLabel(c?: OprCoverageRow) {
  if (!c || !c.total) return 'Unaddressed'
  if (c.counts.fail > 0) return 'Fail'
  if (c.counts.pass > 0) return 'Pass'
  if (c.counts.na > 0) return 'N/A'
  if (c.counts.unverified > 0) return 'Unverified'
  return 'Unaddressed'
}

const totalItems = computed(() => (Array.isArray(props.items) ? props.items.length : 0))

const itemCounts = computed(() => {
  const counts = { Pass: 0, Fail: 0, 'Unverified': 0, 'N/A': 0, Unaddressed: 0 }
  for (const it of (Array.isArray(props.items) ? props.items : [])) {
    const id = String((it as any)?.id || '').trim()
    if (!id) continue
    const label = coverageLabel(props.coverage?.[id]) as keyof typeof counts
    counts[label] = (counts[label] || 0) + 1
  }
  return counts
})

const addressedCount = computed(() => {
  let n = 0
  for (const it of (Array.isArray(props.items) ? props.items : [])) {
    const id = String((it as any)?.id || '').trim()
    if (!id) continue
    const c = props.coverage?.[id]
    if (c && Number(c.total || 0) > 0) n++
  }
  return n
})

const addressedPct = computed(() => {
  const denom = totalItems.value || 0
  if (!denom) return 0
  return Math.round((addressedCount.value / denom) * 100)
})

const evalCounts = computed(() => {
  const counts = { pass: 0, fail: 0, unverified: 0, na: 0 }
  for (const it of (Array.isArray(props.items) ? props.items : [])) {
    const id = String((it as any)?.id || '').trim()
    if (!id) continue
    const c = props.coverage?.[id]
    if (!c) continue
    counts.pass += Number(c.counts?.pass || 0)
    counts.fail += Number(c.counts?.fail || 0)
    counts.unverified += Number(c.counts?.unverified || 0)
    counts.na += Number(c.counts?.na || 0)
  }
  return counts
})

const totalEvals = computed(() => {
  const c = evalCounts.value
  return Number(c.pass + c.fail + c.unverified + c.na)
})

const passRatePct = computed(() => {
  const total = totalEvals.value
  if (!total) return 0
  return Math.round((Number(evalCounts.value.pass || 0) / total) * 100)
})

// ---------------------------------------------------------------------------
// KPI tiles
// ---------------------------------------------------------------------------

interface KpiTile {
  key: string; label: string; value: string | number; unit?: string
  pct?: number | null; bar?: number | null; barClass?: string; hint?: string
}
const kpiTiles = computed<KpiTile[]>(() => {
  const t: KpiTile[] = []
  t.push({
    key: 'items',
    label: 'Total items',
    value: totalItems.value,
    hint: totalItems.value ? `${addressedCount.value} addressed` : 'No items yet',
  })
  t.push({
    key: 'addressed',
    label: 'Addressed',
    value: addressedPct.value,
    unit: '%',
    bar: addressedPct.value,
    barClass: 'bg-sky-400/80',
    hint: `${addressedCount.value} of ${totalItems.value} have a link`,
  })
  t.push({
    key: 'passrate',
    label: 'Pass rate',
    value: totalEvals.value ? passRatePct.value : '—',
    unit: totalEvals.value ? '%' : '',
    bar: totalEvals.value ? passRatePct.value : null,
    barClass: 'bg-emerald-400/80',
    hint: totalEvals.value ? `${evalCounts.value.pass} pass · ${evalCounts.value.fail} fail of ${totalEvals.value}` : 'No evaluations yet',
  })
  return t
})

// ---------------------------------------------------------------------------
// Items coverage donut
// ---------------------------------------------------------------------------

const itemsOption = computed(() => {
  const c = itemCounts.value
  const data = [
    { value: c.Pass, name: 'Pass', itemStyle: { color: palette.green } },
    { value: c.Fail, name: 'Fail', itemStyle: { color: palette.rose } },
    { value: c.Unverified, name: 'Unverified', itemStyle: { color: palette.amber } },
    { value: c['N/A'], name: 'N/A', itemStyle: { color: palette.slate } },
    { value: c.Unaddressed, name: 'Unaddressed', itemStyle: { color: 'rgba(255,255,255,0.18)' } },
  ].filter((d) => d.value > 0)
  if (!data.length) return null
  return {
    tooltip: {
      trigger: 'item',
      ...tooltipStyle,
      formatter: (p: any) => `${p.name}<br/><strong>${p.value}</strong> (${p.percent}%)`,
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.8)' } },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'center',
        formatter: [`{val|${addressedPct.value}%}`, `{lbl|addressed}`].join('\n'),
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
// Evaluations bar
// ---------------------------------------------------------------------------

const evalsOption = computed(() => {
  const c = evalCounts.value
  const labels = ['Pass', 'Fail', 'Unverified', 'N/A']
  const counts = [c.pass, c.fail, c.unverified, c.na]
  if (!counts.some((v) => v > 0)) return null
  const colors = [palette.green, palette.rose, palette.amber, palette.slate]
  return {
    tooltip: { trigger: 'axis', ...tooltipStyle, axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'category', data: labels, ...axisStyle, inverse: true },
    series: [{
      type: 'bar',
      data: counts.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 6, 6, 0] } })),
      barMaxWidth: 26,
      label: { show: true, position: 'right', color: 'rgba(255,255,255,0.85)' },
    }],
  }
})
</script>
