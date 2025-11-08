<template>
  <section class="space-y-6 relative">
    <!-- Breadcrumbs -->
    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }]" title="Dashboard" />
    </div>

    <!-- Top stats row -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Issues -->
      <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="text-xs uppercase tracking-wide text-white/60">Issues</div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-white">{{ issuesCount }}</div>
          <span v-if="issuesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
      </div>

      <!-- Activities -->
      <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="text-xs uppercase tracking-wide text-white/60">Activities</div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-white">{{ activitiesCount }}</div>
          <span v-if="activitiesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
      </div>

      <!-- Equipment -->
      <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="text-xs uppercase tracking-wide text-white/60">Equipment</div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-white">{{ equipmentCount }}</div>
          <span v-if="equipmentLoading" class="text-xs text-white/60">Loading…</span>
        </div>
      </div>

      <!-- Spaces -->
      <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="text-xs uppercase tracking-wide text-white/60">Spaces</div>
        <div class="mt-1 flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-white">{{ spacesCount }}</div>
          <span v-if="spacesLoading" class="text-xs text-white/60">Loading…</span>
        </div>
      </div>
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
      issuesStore.items?.length ? Promise.resolve() : issuesStore.fetchIssues(String(pid)).catch(() => {}),
      activitiesStore.items?.length ? Promise.resolve() : activitiesStore.fetchActivities(String(pid)).catch(() => {}),
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

const issuesCount = computed(() => (issuesStore.items ? issuesStore.items.length : 0))
const activitiesCount = computed(() => (activitiesStore.items ? activitiesStore.items.length : 0))
const equipmentCount = computed(() => (equipmentStore.items ? equipmentStore.items.length : 0))
const spacesCount = computed(() => (spacesStore.items ? spacesStore.items.length : 0))
</script>
