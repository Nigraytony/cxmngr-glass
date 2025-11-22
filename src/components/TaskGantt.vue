<template>
  <div>
    <div
      v-if="!ready"
      class="text-white/70"
    >
      Loading Gantt...
    </div>
    <div
      v-else
      ref="ganttRoot"
      style="width:100%; height:600px"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { loadGantt } from '../lib/frappeGanttAdapter'

const props = defineProps({ tasks: { type: Array, default: () => [] } })

const ganttRoot = ref(null)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _ganttInstance = null
const ready = ref(false)

function mapTasks(tasks) {
  return (tasks || []).map(t => ({
     id: String(t.taskId || t._id || t.id || Math.random().toString(36).slice(2,9)),
    name: t.name || t.title || 'Untitled',
    start: t.start ? new Date(t.start) : new Date(),
    end: t.end ? new Date(t.end) : (t.start ? new Date(t.start) : new Date()),
    progress: typeof t.percentComplete === 'number' ? t.percentComplete : 0,
  }))
}

async function createGantt() {
  try {
    const Gantt = await loadGantt()
    const tasks = mapTasks(props.tasks)
    // recreate instance
    if (ganttRoot.value) {
      ganttRoot.value.innerHTML = ''
      _ganttInstance = new Gantt(ganttRoot.value, tasks, {
        on_click: () => { /* noop */ },
        on_date_change: () => { /* noop */ },
        on_progress_change: () => { /* noop */ },
        on_view_change: () => { /* noop */ },
      })
    }
    ready.value = true
  } catch (e) {
    console.error('Failed to load frappe-gantt', e)
    ready.value = false
  }
}

onMounted(() => {
  createGantt()
})

watch(() => props.tasks, (nv) => {
  if (!ganttRoot.value) return
  try {
    const tasks = mapTasks(nv)
    ganttRoot.value.innerHTML = ''
    loadGantt().then(Gantt => {
        _ganttInstance = new Gantt(ganttRoot.value, tasks, {
          on_click: () => { /* noop */ },
          on_date_change: () => { /* noop */ },
          on_progress_change: () => { /* noop */ },
          on_view_change: () => { /* noop */ },
        })
    })
  } catch (e) { console.error(e) }
}, { deep: true })

onBeforeUnmount(() => {
  try {
    if (ganttRoot.value) ganttRoot.value.innerHTML = ''
  } catch (e) {
    /* ignore cleanup errors */
  }
})
</script>

<style scoped>
</style>
