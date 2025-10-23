<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Activities</h1>
      <RouterLink :to="{ name: 'activity-edit', params: { id: 'new' } }" class="px-3 py-2 rounded-md bg-white/20 text-white border border-white/30 hover:bg-white/30">
        + New Activity
      </RouterLink>
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-white/70 text-sm">Search</label>
  <input v-model="q" type="text" placeholder="Search by name or type" class="px-3 py-2 rounded-md bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-gray-400" />
      </div>
      <div>
        <label class="block text-white/70 text-sm">Project filter</label>
        <select v-model="projectFilter" class="px-3 py-2 rounded-md bg-white/10 text-white border border-white/20">
          <option :value="''">All projects</option>
          <option v-for="p in projects" :key="(p as any)._id || p.id" :value="(p as any)._id || p.id">{{ p.name }}</option>
        </select>
      </div>
      <button @click="refresh()" class="px-3 py-2 rounded-md bg-white/10 text-white border border-white/20">Refresh</button>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="a in filtered" :key="a.id" class="p-4 rounded-xl bg-white/10 border border-white/20 text-white/90">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ a.name }}</h2>
          <RouterLink :to="{ name: 'activity-edit', params: { id: a.id || a._id } }" class="text-sm underline">Edit</RouterLink>
        </div>
        <div class="text-sm text-white/70 mt-1">Type: {{ a.type }}</div>
        <div class="text-xs text-white/60">Start: {{ fmt(a.startDate) }} · End: {{ fmt(a.endDate) }}</div>
        <div class="mt-2 flex -space-x-2">
          <img v-for="(p,idx) in (a.photos || []).slice(0,3)" :key="idx" :src="p.data" class="w-10 h-10 object-cover rounded-md border border-white/20" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useActivitiesStore } from '../../stores/activities'
import { useProjectStore } from '../../stores/project'

const store = useActivitiesStore()
const projectStore = useProjectStore()
const q = ref('')
const projectFilter = ref<string>('')

onMounted(async () => {
  await projectStore.fetchProjects?.()?.catch(() => {})
  await store.fetchActivities().catch(() => {})
  // auto-apply current project filter if set
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  if (pid) projectFilter.value = String(pid)
})

function fmt(d?: string) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch { return String(d) }
}

const projects = computed(() => projectStore.projects || [])

const filtered = computed(() => {
  let list = store.activities
  if (projectFilter.value) {
    list = list.filter((a: any) => String(a.projectId) === String(projectFilter.value)) as any
  }
  if (!q.value) return list
  const s = q.value.toLowerCase()
  return list.filter((a: any) => (a.name || '').toLowerCase().includes(s) || (a.type || '').toLowerCase().includes(s)) as any
})

function refresh() {
  store.fetchActivities(projectFilter.value || undefined)
}
</script>

<style scoped>
</style>
