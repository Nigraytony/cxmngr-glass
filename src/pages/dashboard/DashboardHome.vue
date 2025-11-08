<template>
  <section class="space-y-6 relative">
    <!-- Breadcrumbs -->
    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }]" title="Dashboard" />
    </div>

    <!-- Top stats row -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Issues -->
      <RouterLink :to="{ name: 'issues' }" class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5 text-sky-300/90"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v4m0 4h.01M10.29 3.86l-7.5 12.99A1.5 1.5 0 0 0 4.07 19.5h15.86a1.5 1.5 0 0 0 1.29-2.25l-7.5-12.99a1.5 1.5 0 0 0-2.58 0z"/></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">Issues</div>
          </div>
          <span v-if="issuesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">{{ issuesTotal }}</div>
        <div class="mt-1 text-xs text-white/70">Open: <span class="text-white">{{ issuesOpen }}</span> · Closed: <span class="text-white">{{ issuesClosed }}</span></div>
      </RouterLink>

      <!-- Activities -->
      <RouterLink :to="{ name: 'activities' }" class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5 text-violet-300/90"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 5.25h16.5M3.75 9.75h16.5m-9 4.5h9m-9 4.5h9"/></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">Activities</div>
          </div>
          <span v-if="activitiesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">{{ activitiesTotal }}</div>
        <div class="mt-1 text-xs text-white/70">Recent work and tasks</div>
      </RouterLink>

      <!-- Equipment -->
      <RouterLink :to="{ name: 'equipment' }" class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5 text-emerald-300/90"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.53 16.28a6 6 0 1 1 4.95 0l-.7 2.8a1 1 0 0 1-.97.77H11.2a1 1 0 0 1-.97-.77l-.7-2.8z"/></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">Equipment</div>
          </div>
          <span v-if="equipmentLoading" class="text-xs text-white/60">Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">{{ equipmentTotal }}</div>
        <div class="mt-1 text-xs text-white/70">Mech: <span class="text-white">{{ equipmentMechanical }}</span> · Elec: <span class="text-white">{{ equipmentElectrical }}</span></div>
      </RouterLink>

      <!-- Spaces -->
      <RouterLink :to="{ name: 'spaces' }" class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5 text-teal-300/90"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75A1.5 1.5 0 0 1 5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75zM9 9h6v6H9z"/></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">Spaces</div>
          </div>
          <span v-if="spacesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">{{ spacesTotal }}</div>
        <div class="mt-1 text-xs text-white/70">By type and hierarchy</div>
      </RouterLink>
    </div>

    <!-- Main dashboard grid -->
    <ProjectDashboardCharts />
  </section>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectDashboardCharts from '../../components/charts/ProjectDashboardCharts.vue'
import { useIssuesStore } from '../../stores/issues'
import { useActivitiesStore } from '../../stores/activities'
import { useEquipmentStore } from '../../stores/equipment'
import { useSpacesStore } from '../../stores/spaces'
import { useProjectStore } from '../../stores/project'

// Dashboard now driven by live project data via charts component
const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const activitiesStore = useActivitiesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()

onMounted(async () => {
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  try {
    await Promise.all([
      // Avoid duplicate fetches where possible; idempotent in stores
      issuesStore.issues?.length ? Promise.resolve() : issuesStore.fetchIssues(String(pid)).catch(() => {}),
      activitiesStore.activities?.length ? Promise.resolve() : activitiesStore.fetchActivities(String(pid)).catch(() => {}),
      pid ? (equipmentStore.items?.length ? Promise.resolve() : equipmentStore.fetchByProject(String(pid)).catch(() => {})) : Promise.resolve(),
      pid ? (spacesStore.items?.length ? Promise.resolve() : spacesStore.fetchByProject(String(pid)).catch(() => {})) : Promise.resolve()
    ])
  } catch (e) {
    // Soft-fail; cards will show 0 if not loaded
  }
})

const issuesLoading = computed(() => issuesStore.loading)
const activitiesLoading = computed(() => activitiesStore.loading)
const equipmentLoading = computed(() => equipmentStore.loading)
const spacesLoading = computed(() => spacesStore.loading)

// helper mirroring charts normalization
function normIssueStatus(s) {
  const k = String(s || 'Unknown').toLowerCase()
  if (k.includes('closed') || k.includes('cancel')) return 'Closed'
  if (k.includes('progress')) return 'In Progress'
  if (k.includes('open')) return 'Open'
  return s ? s : 'Unknown'
}

const issuesTotal = computed(() => issuesStore.issues?.length || 0)
const issuesOpen = computed(() => (issuesStore.issues || []).filter(i => normIssueStatus(i && i.status) === 'Open').length)
const issuesClosed = computed(() => (issuesStore.issues || []).filter(i => normIssueStatus(i && i.status) === 'Closed').length)

const activitiesTotal = computed(() => activitiesStore.activities?.length || 0)
const equipmentTotal = computed(() => equipmentStore.items?.length || 0)
const spacesTotal = computed(() => spacesStore.items?.length || 0)

const equipmentMechanical = computed(() => (equipmentStore.items || []).filter(e => String(e.type || '').toLowerCase().includes('mech')).length)
const equipmentElectrical = computed(() => (equipmentStore.items || []).filter(e => String(e.type || '').toLowerCase().includes('elec')).length)
</script>
