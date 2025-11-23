<template>
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
        <label class="block text-white/70 text-sm">Duration</label>
        <input
          v-model.number="task.duration"
          type="number"
          min="0"
          step="1"
          class="w-full px-3 py-2 rounded bg-white/10"
        >
      </div>
      <div>
        <label class="block text-white/70 text-sm">Completion (%)</label>
        <input
          v-model.number="task.percentComplete"
          type="number"
          min="0"
          max="100"
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

    <div class="flex justify-between items-center gap-2 mt-3">
      <div class="text-sm text-white/70">
        Tip: use the Completion field to mark progress
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-2 rounded bg-white/6 text-white"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
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
import { ref, onMounted, watch } from 'vue'
import { http } from '../utils/http'
import { useProjectStore } from '../stores/project'

const props = defineProps({
  id: { type: String, default: null },
  projectId: { type: String, default: null }
})
const emit = defineEmits(['saved', 'cancel'])

const projectStore = useProjectStore()
const task = ref({ name: '', wbs: '', description: '', notes: '', start: '', end: '', projectId: props.projectId || projectStore.currentProjectId, assignee: '', percentComplete: 0, cost: 0, duration: undefined })
const saving = ref(false)

async function load() {
  if (!props.id || props.id === 'new') return
  try {
    const resp = await http.get(`/api/tasks/${props.id}`)
    Object.assign(task.value, resp.data)
  } catch (e) { /* ignore */ }
}

async function save() {
  saving.value = true
  try {
    if (!task.value.projectId && projectStore.currentProjectId) task.value.projectId = projectStore.currentProjectId
    if (!props.id || props.id === 'new') {
      const resp = await http.post('/api/tasks', task.value)
      emit('saved', resp.data)
    } else {
      const resp = await http.patch(`/api/tasks/${props.id}`, task.value)
      emit('saved', resp.data)
    }
  } catch (e) {
    // ignore for now
  } finally { saving.value = false }
}

onMounted(() => load())

watch(() => props.id, async () => { await load() })
</script>

<style scoped>
</style>
