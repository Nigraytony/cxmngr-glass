<template>
  <section class="space-y-6 relative">
    <!-- Breadcrumbs -->
    <div>
      <BreadCrumbs
        :items="[{ text: 'Dashboard', to: '/' }]"
        title="Dashboard"
      />
    </div>

    <!-- Top stats row -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <!-- Issues -->
      <RouterLink
        :to="{ name: 'issues' }"
        class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5 text-sky-300/90"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v4m0 4h.01M10.29 3.86l-7.5 12.99A1.5 1.5 0 0 0 4.07 19.5h15.86a1.5 1.5 0 0 0 1.29-2.25l-7.5-12.99a1.5 1.5 0 0 0-2.58 0z"
            /></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">
              Issues
            </div>
          </div>
          <span
            v-if="issuesLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">
          {{ issuesTotal }}
        </div>
        <div class="mt-1 text-xs text-white/70 flex flex-wrap gap-x-2 gap-y-0.5">
          <span>Open: <span class="text-white">{{ issuesOpen }}</span></span>
          <span>Progress: <span class="text-white">{{ issuesProgress }}</span></span>
          <span>Closed: <span class="text-white">{{ issuesClosed }}</span></span>
        </div>
      </RouterLink>

      <!-- Tasks -->
      <RouterLink
        :to="{ name: 'tasks' }"
        class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5 text-amber-300/90"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4.5 5.25A1.5 1.5 0 0 1 6 3.75h12a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"
            /><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="m9 11.25 2.25 2.25 4.5-4.5"
            /></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">
              Tasks
            </div>
          </div>
          <span
            v-if="tasksLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">
          {{ tasksTotal }}
        </div>
        <div class="mt-1 text-xs text-white/70 flex flex-wrap gap-x-2 gap-y-0.5">
          <span>In Progress: <span class="text-white">{{ tasksInProgress }}</span></span>
          <span>Completed: <span class="text-white">{{ tasksCompleted }}</span></span>
          <span>Not Started: <span class="text-white">{{ tasksNotStarted }}</span></span>
        </div>
      </RouterLink>

      <!-- Activities -->
      <RouterLink
        :to="{ name: 'activities' }"
        class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5 text-violet-300/90"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3.75 5.25h16.5M3.75 9.75h16.5m-9 4.5h9m-9 4.5h9"
            /></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">
              Activities
            </div>
          </div>
          <span
            v-if="activitiesLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">
          {{ activitiesTotal }}
        </div>
        <div class="mt-1 text-xs text-white/70">
          Recent work and tasks
        </div>
      </RouterLink>

      <!-- Equipment -->
      <RouterLink
        :to="{ name: 'equipment' }"
        class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5 text-emerald-300/90"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9.53 16.28a6 6 0 1 1 4.95 0l-.7 2.8a1 1 0 0 1-.97.77H11.2a1 1 0 0 1-.97-.77l-.7-2.8z"
            /></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">
              Equipment
            </div>
          </div>
          <span
            v-if="equipmentLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">
          {{ equipmentTotal }}
        </div>
        <div class="mt-1 text-xs text-white/70 flex flex-wrap gap-x-2 gap-y-0.5">
          <span>Mech: <span class="text-white">{{ equipmentMechanical }}</span></span>
          <span>Elec: <span class="text-white">{{ equipmentElectrical }}</span></span>
        </div>
      </RouterLink>

      <!-- Spaces -->
      <RouterLink
        :to="{ name: 'spaces' }"
        class="group rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 transition hover:ring-white/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-5 w-5 text-teal-300/90"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3.75 6.75A1.5 1.5 0 0 1 5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75zM9 9h6v6H9z"
            /></svg>
            <div class="text-xs uppercase tracking-wide text-white/60">
              Spaces
            </div>
          </div>
          <span
            v-if="spacesLoading"
            class="text-xs text-white/60"
          >Loading…</span>
        </div>
        <div class="mt-2 text-2xl font-semibold text-white">
          {{ spacesTotal }}
        </div>
        <div class="mt-1 text-xs text-white/70">
          By type and hierarchy
        </div>
      </RouterLink>
    </div>

    <!-- Main dashboard grid -->
    <ProjectDashboardCharts
      :tasks="filteredTasks"
      :tasks-loading="tasksLoading"
    />

    <!-- Team section -->
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-white">
              Project Team
            </h3>
            <p class="text-xs text-white/60 mt-1">
              Key collaborators helping deliver this project.
            </p>
          </div>
          <RouterLink
            v-if="projectStore.currentProjectId"
            :to="{ name: 'project-settings', params: { id: projectStore.currentProjectId } }"
            class="text-xs font-medium text-white/80 hover:text-white transition"
          >
            Manage
          </RouterLink>
        </div>
        <div v-if="teamPreview.length" class="space-y-3">
          <div
            v-for="member in teamPreview"
            :key="member.email || member.id || member._id || member.phone || member.firstName"
            class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 px-3 py-2 backdrop-blur-sm transition hover:bg-white/8"
          >
            <div class="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-white/10 text-white font-semibold">
              {{ memberInitials(member) }}
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium text-white">
                {{ memberName(member) }}
              </div>
              <div class="text-xs text-white/60">
                {{ memberSubtitle(member) }}
              </div>
            </div>
            <a
              v-if="member.email"
              :href="`mailto:${member.email}`"
              class="text-white/50 hover:text-white/80 transition"
              aria-label="Email team member"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="h-5 w-5"
              ><path
                d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              /><path
                d="m4 7 7.553 4.72a1 1 0 0 0 1.053 0L20 7"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg>
            </a>
          </div>
          <div
            v-if="teamOverflow > 0"
            class="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-white/60"
          >
            +{{ teamOverflow }} more teammates on this project
          </div>
        </div>
        <div
          v-else
          class="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 text-center text-sm text-white/60"
        >
          No team members listed yet. Invite collaborators from project settings.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectDashboardCharts from '../../components/charts/ProjectDashboardCharts.vue'
import { useIssuesStore } from '../../stores/issues'
import { useActivitiesStore } from '../../stores/activities'
import { useEquipmentStore } from '../../stores/equipment'
import { useSpacesStore } from '../../stores/spaces'
import { useProjectStore } from '../../stores/project'
import http from '../../utils/http'

// Dashboard now driven by live project data via charts component
const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const activitiesStore = useActivitiesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()

const tasks = ref([])
const tasksLoading = ref(false)

async function fetchTasksByProject(projectId) {
  if (!projectId) {
    tasks.value = []
    tasksLoading.value = false
    return
  }
  tasksLoading.value = true
  try {
    const { data } = await http.get('/api/tasks', {
      params: {
        projectId,
        limit: 500,
        deleted: false,
      },
    })
    const items = data && Array.isArray(data.tasks) ? data.tasks : []
    tasks.value = items
  } catch (e) {
    tasks.value = []
  } finally {
    tasksLoading.value = false
  }
}

async function hydrateProject(pid) {
  const projectId = pid ? String(pid) : ''
  if (!projectId) {
    issuesStore.issues = []
    activitiesStore.activities = []
    equipmentStore.items = []
    spacesStore.items = []
    tasks.value = []
    tasksLoading.value = false
    return
  }

  try {
    await Promise.all([
      issuesStore.fetchIssues(projectId).catch(() => {}),
      activitiesStore.fetchActivities(projectId).catch(() => {}),
      equipmentStore.fetchByProject(projectId).catch(() => {}),
      spacesStore.fetchByProject(projectId).catch(() => {}),
      fetchTasksByProject(projectId),
      projectStore.fetchProject(projectId).catch(() => {}),
    ])
  } catch (e) {
    // soft-fail; cards will surface available data
  }
}

onMounted(async () => {
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  try {
    await hydrateProject(pid)
  } catch (e) {
    // ignore
  }
})

watch(() => projectStore.currentProjectId, async (newPid, oldPid) => {
  if (newPid === oldPid) return
  try {
    await hydrateProject(newPid)
  } catch (err) {
    // ignore
  }
})

const issuesLoading = computed(() => issuesStore.loading)
const activitiesLoading = computed(() => activitiesStore.loading)
const equipmentLoading = computed(() => equipmentStore.loading)
const spacesLoading = computed(() => spacesStore.loading)

const filteredTasks = computed(() => (tasks.value || []).filter((t) => {
  if (!t) return false
  if (t.deleted === true) return false
  const status = String(t.status || '').toLowerCase()
  if (status === 'deleted') return false
  return true
}))

function normalizeTaskStatusRecord(task) {
  if (!task) return 'Not Started'
  const statusRaw = String(task.status || '').toLowerCase()
  if (statusRaw.includes('block') || statusRaw.includes('hold') || statusRaw.includes('pending')) return 'Blocked'
  if (statusRaw.includes('progress')) return 'In Progress'
  if (statusRaw.includes('complete')) return 'Completed'
  if (statusRaw.includes('start')) return 'Not Started'
  if (statusRaw.includes('cancel')) return 'Blocked'
  const pct = Number(task.percentComplete)
  if (Number.isFinite(pct)) {
    if (pct >= 100) return 'Completed'
    if (pct > 0) return 'In Progress'
    return 'Not Started'
  }
  return 'Not Started'
}

const taskStatusCounts = computed(() => {
  const counts = {
    'Not Started': 0,
    'In Progress': 0,
    'Completed': 0,
    'Blocked': 0,
  }
  for (const task of filteredTasks.value) {
    const key = normalizeTaskStatusRecord(task)
    if (counts[key] == null) counts[key] = 0
    counts[key] += 1
  }
  return counts
})

const tasksTotal = computed(() => filteredTasks.value.length)
const tasksCompleted = computed(() => taskStatusCounts.value['Completed'] || 0)
const tasksInProgress = computed(() => taskStatusCounts.value['In Progress'] || 0)
const tasksNotStarted = computed(() => taskStatusCounts.value['Not Started'] || 0)

const teamMembers = computed(() => {
  const team = projectStore.currentProject && Array.isArray(projectStore.currentProject.team)
    ? projectStore.currentProject.team
    : []
  return team.filter(Boolean)
})

const teamPreview = computed(() => teamMembers.value.slice(0, 6))
const teamOverflow = computed(() => Math.max(0, teamMembers.value.length - teamPreview.value.length))

function memberName(member = {}) {
  const first = member.firstName || member.first_name || ''
  const last = member.lastName || member.last_name || ''
  const name = [first, last].filter(Boolean).join(' ')
  if (name) return name
  if (member.name) return member.name
  if (member.email) return member.email.split('@')[0]
  return 'Team member'
}

function memberSubtitle(member = {}) {
  const role = member.role || member.title || ''
  const company = member.company || ''
  const pieces = [role, company].filter(Boolean)
  if (pieces.length) return pieces.join(' • ')
  if (member.email) return member.email
  return 'Collaborator'
}

function memberInitials(member = {}) {
  const first = member.firstName || member.first_name || ''
  const last = member.lastName || member.last_name || ''
  const name = [first, last].filter(Boolean).join(' ').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (member.email && typeof member.email === 'string') {
    return member.email.slice(0, 2).toUpperCase()
  }
  return 'TM'
}

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
const issuesProgress = computed(() => (issuesStore.issues || []).filter(i => normIssueStatus(i && i.status) === 'In Progress').length)
const issuesClosed = computed(() => (issuesStore.issues || []).filter(i => normIssueStatus(i && i.status) === 'Closed').length)

const activitiesTotal = computed(() => activitiesStore.activities?.length || 0)
const equipmentTotal = computed(() => equipmentStore.items?.length || 0)
const spacesTotal = computed(() => spacesStore.items?.length || 0)

// Mechanical/Electrical based on system field instead of type
const equipmentMechanical = computed(() => (equipmentStore.items || []).filter(e => String(e.system || '').toLowerCase().includes('mech')).length)
const equipmentElectrical = computed(() => (equipmentStore.items || []).filter(e => String(e.system || '').toLowerCase().includes('elec')).length)
</script>
