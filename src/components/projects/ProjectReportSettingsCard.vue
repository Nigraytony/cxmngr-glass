<template>
  <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 space-y-4">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div>
        <div class="text-white font-medium">
          Report settings
        </div>
        <div class="text-white/50 text-xs">
          Company short names and the standard issue distribution list, used by the generated reports.
        </div>
      </div>
      <button
        type="button"
        :disabled="saving"
        class="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
        @click="saveSettings"
      >
        {{ saving ? 'Saving…' : 'Save report settings' }}
      </button>
    </div>

    <div>
      <div class="text-white/70 text-sm mb-1.5">
        Company short names <span class="text-white/40 text-xs">("Energy Management Consulting, LLC." → "EMCx")</span>
      </div>
      <div
        v-for="(row, i) in shortNames"
        :key="i"
        class="grid grid-cols-12 gap-2 mb-1.5"
      >
        <input
          v-model="row.full"
          type="text"
          placeholder="Full company name"
          class="col-span-7 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
        >
        <input
          v-model="row.short"
          type="text"
          placeholder="Short"
          class="col-span-4 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
        >
        <button
          type="button"
          class="col-span-1 text-rose-300/80 hover:text-rose-300 text-sm"
          title="Remove"
          @click="shortNames.splice(i, 1)"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-xs"
        @click="shortNames.push({ full: '', short: '' })"
      >
        + Add short name
      </button>
    </div>

    <div>
      <div class="text-white/70 text-sm mb-1.5">
        Standard issue distribution <span class="text-white/40 text-xs">(printed on every issue report, after the assigned party)</span>
      </div>
      <div
        v-for="(row, i) in distribution"
        :key="i"
        class="grid grid-cols-12 gap-2 mb-1.5"
      >
        <input
          v-model="row.name"
          type="text"
          placeholder="Name"
          class="col-span-6 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
        >
        <input
          v-model="row.company"
          type="text"
          placeholder="Company"
          class="col-span-5 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
        >
        <button
          type="button"
          class="col-span-1 text-rose-300/80 hover:text-rose-300 text-sm"
          title="Remove"
          @click="distribution.splice(i, 1)"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-xs"
        @click="distribution.push({ name: '', company: '' })"
      >
        + Add recipient
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Issue report redesign Step 3: edits project.reportSettings
// (companyShortNames map + issueDistribution list). Self-contained save —
// the projects PUT applies partial payloads, so only reportSettings changes.
import { onMounted, ref, watch } from 'vue'
import http from '../../utils/http'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{
  projectId: string
  /** The project's current reportSettings (hydrates the editors). */
  reportSettings?: Record<string, any> | null
}>()

const ui = useUiStore()
const saving = ref(false)
const shortNames = ref<Array<{ full: string; short: string }>>([])
const distribution = ref<Array<{ name: string; company: string }>>([])

function hydrate() {
  const rs = props.reportSettings && typeof props.reportSettings === 'object' ? props.reportSettings : {}
  shortNames.value = Object.entries(rs.companyShortNames || {})
    .map(([full, short]) => ({ full: String(full), short: String(short) }))
  distribution.value = (Array.isArray(rs.issueDistribution) ? rs.issueDistribution : [])
    .map((d: any) => ({ name: String(d?.name || ''), company: String(d?.company || '') }))
}

async function saveSettings() {
  if (!props.projectId || saving.value) return
  saving.value = true
  try {
    const companyShortNames: Record<string, string> = {}
    for (const row of shortNames.value) {
      const full = row.full.trim()
      const short = row.short.trim()
      if (full && short) companyShortNames[full] = short
    }
    const issueDistribution = distribution.value
      .map(r => ({ name: r.name.trim(), company: r.company.trim() }))
      .filter(r => r.name || r.company)
    await http.put(`/api/projects/${props.projectId}`, {
      reportSettings: {
        ...(props.reportSettings && typeof props.reportSettings === 'object' ? props.reportSettings : {}),
        companyShortNames,
        issueDistribution,
      },
    })
    ui.showSuccess('Report settings saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save report settings')
  } finally {
    saving.value = false
  }
}

watch(() => props.reportSettings, hydrate)
onMounted(hydrate)
</script>
