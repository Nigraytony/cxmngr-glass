<template>
  <div class="space-y-4">
    <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Tasks', to: '/tasks' }, { text: modeLabel } ]" />

    <div class="p-4 rounded bg-white/6 border border-white/10 text-white">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-white/70 text-sm">Name</label>
          <input
            v-model="task.name"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">WBS</label>
          <input
            v-model="task.wbs"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Assignee</label>
          <input
            v-model="task.assignee"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Cost</label>
          <input
            v-model.number="task.cost"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">Start</label>
          <input
            v-model="task.start"
            type="datetime-local"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div>
          <label class="block text-white/70 text-sm">End</label>
          <input
            v-model="task.end"
            type="datetime-local"
            class="w-full px-3 py-2 rounded bg-white/10"
          >
        </div>
        <div class="col-span-2">
          <label class="block text-white/70 text-sm">Notes</label>
          <textarea
            v-model="task.notes"
            class="w-full px-3 py-2 rounded bg-white/10"
            rows="4"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-3">
        <RouterLink
          to="/tasks"
          class="px-3 py-2 rounded bg-white/6 text-white"
        >
          Cancel
        </RouterLink>
        <button
          class="px-3 py-2 rounded bg-blue-600 text-white"
          @click="save"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { http } from '../../utils/http'
import { useProjectStore } from '../../stores/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const id = route.params.id
const modeLabel = id === 'new' ? 'New Task' : 'Edit Task'
const task = ref({ name: '', wbs: '', description: '', notes: '', start: '', end: '', projectId: projectStore.currentProjectId, assignee: '', percentComplete: 0, cost: 0, duration: undefined })
const saving = ref(false)

async function load() {
  if (!id || id === 'new') return
  try {
    const r = await http.get(`/api/tasks/${id}`)
    Object.assign(task.value, r.data)
  } catch (e) { /* ignore */ }
}

async function save() {
  saving.value = true
  try {
    // ensure projectId
    if (!task.value.projectId && projectStore.currentProjectId) task.value.projectId = projectStore.currentProjectId
    if (id === 'new') {
      await http.post('/api/tasks', task.value)
      router.push({ name: 'tasks' })
    } else {
      await http.patch(`/api/tasks/${id}`, task.value)
      router.push({ name: 'tasks' })
    }
  } catch (e) {
    // ignore for now
  } finally { saving.value = false }
}

onMounted(() => load())
</script>

<style scoped>
</style>
