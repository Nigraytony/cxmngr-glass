<template>
  <div class="grid gap-6 sm:grid-cols-2">
    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Items by Status
        </h3>
        <div class="text-xs text-white/60">
          <span v-if="loading">Loading…</span>
          <span v-else>{{ addressedPct }}% addressed</span>
        </div>
      </div>

      <Doughnut
        v-if="itemsStatusChart.datasets[0].data.some((n: any) => Number(n) > 0)"
        :data="itemsStatusChart"
        :options="doughnutOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No progress data
      </div>

      <div class="mt-4 text-xs text-white/60">
        {{ addressedCount }} / {{ totalItems }} items have at least one link
      </div>
    </div>

    <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">
          Evaluations by Status
        </h3>
        <div class="text-xs text-white/60">
          <span v-if="loading">Loading…</span>
          <span v-else>{{ totalEvals }} total</span>
        </div>
      </div>

      <Bar
        v-if="evalStatusChart.datasets[0].data.some((n: any) => Number(n) > 0)"
        :data="evalStatusChart"
        :options="barOptions"
        class="max-h-72"
      />
      <div
        v-else
        class="text-white/60 text-sm"
      >
        No evaluation data
      </div>

      <div class="mt-4 text-xs text-white/60">
        Pass rate: {{ passRatePct }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import type { OprCoverageRow } from '../../stores/oprLinkEvaluations'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{
  items: Array<{ id: string }>
  coverage: Record<string, OprCoverageRow>
  loading?: boolean
}>()

const loading = computed(() => props.loading === true)

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

const itemsStatusChart = computed(() => {
  const c = itemCounts.value
  return {
    labels: ['Pass', 'Fail', 'Unverified', 'N/A', 'Unaddressed'],
    datasets: [{
      data: [c.Pass, c.Fail, c['Unverified'], c['N/A'], c.Unaddressed],
      backgroundColor: ['#34d399', '#fb7185', '#fbbf24', '#94a3b8', '#64748b'],
      borderColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
    }],
  }
})

const evalStatusChart = computed(() => {
  const c = evalCounts.value
  return {
    labels: ['Pass', 'Fail', 'Unverified', 'N/A'],
    datasets: [{
      label: 'Evaluations',
      data: [c.pass, c.fail, c.unverified, c.na],
      backgroundColor: ['#34d399', '#fb7185', '#fbbf24', '#94a3b8'],
      borderRadius: 6,
      borderSkipped: false,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: 'rgba(255,255,255,0.75)' },
    },
  },
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
      ticks: { color: 'rgba(255,255,255,0.70)' },
      grid: { color: 'rgba(255,255,255,0.06)' },
    },
  },
}
</script>
